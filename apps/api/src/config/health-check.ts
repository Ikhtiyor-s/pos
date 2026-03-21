import { Request, Response } from 'express';
import { prisma } from '@oshxona/database';
import { isServerShuttingDown } from './graceful-shutdown.js';

// ==========================================
// HEALTH CHECK — Production-level
// DB connectivity, uptime, memory usage
// ==========================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latencyMs?: number; error?: string };
    memory: { status: string; usedMB: number; totalMB: number; percentUsed: number };
    server: { status: string; shuttingDown: boolean };
  };
}

export async function healthCheck(_req: Request, res: Response) {
  const checks: HealthStatus['checks'] = {
    database: { status: 'unknown' },
    memory: { status: 'unknown', usedMB: 0, totalMB: 0, percentUsed: 0 },
    server: { status: 'ok', shuttingDown: isServerShuttingDown() },
  };

  let overallStatus: HealthStatus['status'] = 'healthy';

  // --- Database check ---
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    checks.database = {
      status: dbLatency < 1000 ? 'ok' : 'slow',
      latencyMs: dbLatency,
    };

    if (dbLatency > 1000) overallStatus = 'degraded';
  } catch (error: any) {
    checks.database = { status: 'error', error: error.message };
    overallStatus = 'unhealthy';
  }

  // --- Memory check ---
  const mem = process.memoryUsage();
  const usedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const totalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const percentUsed = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  checks.memory = {
    status: percentUsed < 85 ? 'ok' : 'warning',
    usedMB,
    totalMB,
    percentUsed,
  };

  if (percentUsed >= 85) overallStatus = 'degraded';

  // --- Server shutting down ---
  if (isServerShuttingDown()) {
    overallStatus = 'unhealthy';
    checks.server.status = 'shutting_down';
  }

  const health: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: '3.0.0',
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
}

// Lightweight health (k8s liveness probe uchun)
export async function livenessCheck(_req: Request, res: Response) {
  if (isServerShuttingDown()) {
    return res.status(503).json({ status: 'shutting_down' });
  }
  res.json({ status: 'ok' });
}

// DB health (k8s readiness probe uchun)
export async function readinessCheck(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
}
