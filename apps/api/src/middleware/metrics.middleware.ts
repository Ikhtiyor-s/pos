import { Request, Response, NextFunction, Router } from 'express';
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestSizeBytes,
  metricsRegistry,
} from '../config/metrics.js';

// ============================================================
// ENDPOINT NORMALIZER
// /api/orders/abc-123/items → /api/orders/:id/items
// ============================================================

function normalizeEndpoint(url: string): string {
  return url
    // UUID
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
    // Pure numeric ID
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    // Query string
    .replace(/\?.*$/, '')
    // Bot token (Telegram webhook)
    .replace(/\/\d{9,10}:[A-Za-z0-9_-]{35}/g, '/:botToken')
    // Trim trailing slash
    .replace(/\/$/, '') || '/';
}

// ============================================================
// HTTP METRICS MIDDLEWARE
// ============================================================

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // /metrics va /health so'rovlarini o'lchmaslik
  const skipPaths = ['/metrics', '/health', '/healthz', '/readyz', '/favicon.ico'];
  if (skipPaths.includes(req.path)) return next();

  const startHrTime = process.hrtime.bigint();

  // Request hajmi
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 0) {
    const endpoint = normalizeEndpoint(req.path);
    httpRequestSizeBytes.observe({ method: req.method, endpoint }, contentLength);
  }

  // Response intercept
  const originalEnd = res.end.bind(res);
  res.end = function (...args: Parameters<typeof res.end>) {
    const durationNs = process.hrtime.bigint() - startHrTime;
    const durationSec = Number(durationNs) / 1e9;
    const endpoint = normalizeEndpoint(req.path);
    const statusCode = String(res.statusCode);

    httpRequestsTotal.inc({
      method: req.method,
      endpoint,
      status_code: statusCode,
    });

    httpRequestDuration.observe(
      { method: req.method, endpoint, status_code: statusCode },
      durationSec,
    );

    return originalEnd(...args);
  } as typeof res.end;

  next();
}

// ============================================================
// /metrics ENDPOINT ROUTER
// ============================================================

export function createMetricsRouter(): Router {
  const router = Router();

  router.get('/metrics', async (_req: Request, res: Response) => {
    try {
      const metrics = await metricsRegistry.metrics();
      res.set('Content-Type', metricsRegistry.contentType);
      res.end(metrics);
    } catch (err) {
      res.status(500).end(`# metrics collection error: ${(err as Error).message}`);
    }
  });

  return router;
}
