import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  Summary,
} from 'prom-client';

// ============================================================
// REGISTRY — alohida, default registry bilan aralashmasin
// ============================================================

export const metricsRegistry = new Registry();

metricsRegistry.setDefaultLabels({ app: 'oshxona-api' });

// Node.js built-in metrics: CPU, memory, GC, event loop lag
collectDefaultMetrics({ register: metricsRegistry, prefix: 'nodejs_' });

// ============================================================
// HTTP METRICS
// ============================================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'HTTP so\'rovlar soni',
  labelNames: ['method', 'endpoint', 'status_code'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP so\'rov davomiyligi (soniya)',
  labelNames: ['method', 'endpoint', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const httpRequestSizeBytes = new Summary({
  name: 'http_request_size_bytes',
  help: 'HTTP so\'rov hajmi (bayt)',
  labelNames: ['method', 'endpoint'] as const,
  percentiles: [0.5, 0.9, 0.99],
  registers: [metricsRegistry],
});

// ============================================================
// DATABASE METRICS
// ============================================================

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Prisma so\'rov davomiyligi (soniya)',
  labelNames: ['operation', 'model'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const dbQueryErrorsTotal = new Counter({
  name: 'db_query_errors_total',
  help: 'Database so\'rov xatoliklari soni',
  labelNames: ['operation', 'model', 'error_code'] as const,
  registers: [metricsRegistry],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Faol database ulanishlar soni',
  registers: [metricsRegistry],
});

// ============================================================
// REDIS METRICS
// ============================================================

export const redisCacheHitsTotal = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Redis cache hit soni',
  labelNames: ['namespace'] as const,
  registers: [metricsRegistry],
});

export const redisCacheMissesTotal = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Redis cache miss soni',
  labelNames: ['namespace'] as const,
  registers: [metricsRegistry],
});

export const redisHitRatio = new Gauge({
  name: 'redis_hit_ratio',
  help: 'Redis cache hit nisbati (0-1)',
  labelNames: ['namespace'] as const,
  registers: [metricsRegistry],
});

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Redis operatsiya davomiyligi',
  labelNames: ['operation'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [metricsRegistry],
});

// ============================================================
// SOCKET.IO METRICS
// ============================================================

export const socketActiveConnections = new Gauge({
  name: 'socket_io_active_connections',
  help: 'Socket.IO faol ulanishlar soni',
  labelNames: ['tenant_id'] as const,
  registers: [metricsRegistry],
});

export const socketEventsTotal = new Counter({
  name: 'socket_io_events_total',
  help: 'Socket.IO eventlar soni',
  labelNames: ['event', 'direction'] as const,
  registers: [metricsRegistry],
});

// ============================================================
// BUSINESS METRICS
// ============================================================

export const tenantActiveCount = new Gauge({
  name: 'tenant_count_active',
  help: 'Faol tenant (restoran) soni',
  registers: [metricsRegistry],
});

export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Yaratilgan buyurtmalar soni',
  labelNames: ['source', 'type', 'tenant_id'] as const,
  registers: [metricsRegistry],
});

export const ordersCompletedTotal = new Counter({
  name: 'orders_completed_total',
  help: 'Yakunlangan buyurtmalar soni',
  labelNames: ['tenant_id'] as const,
  registers: [metricsRegistry],
});

export const activeOrdersGauge = new Gauge({
  name: 'orders_active_count',
  help: 'Hozirda faol (NEW/CONFIRMED/PREPARING/READY) buyurtmalar',
  labelNames: ['tenant_id'] as const,
  registers: [metricsRegistry],
});

export const orderRevenueTotal = new Counter({
  name: 'order_revenue_total_sum',
  help: 'Jami daromad (so\'m)',
  labelNames: ['tenant_id'] as const,
  registers: [metricsRegistry],
});

// ============================================================
// NONBOR SYNC METRICS
// ============================================================

export const nonborSyncErrorsTotal = new Counter({
  name: 'nonbor_sync_errors_total',
  help: 'Nonbor sinxronizatsiya xatoliklari',
  labelNames: ['error_type', 'tenant_id'] as const,
  registers: [metricsRegistry],
});

export const nonborSyncDuration = new Histogram({
  name: 'nonbor_sync_duration_seconds',
  help: 'Nonbor sinxronizatsiya davomiyligi',
  labelNames: ['operation'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [metricsRegistry],
});

export const nonborSyncLastSuccess = new Gauge({
  name: 'nonbor_sync_last_success_timestamp',
  help: 'Oxirgi muvaffaqiyatli Nonbor sinxronizatsiya unix timestamp',
  labelNames: ['tenant_id'] as const,
  registers: [metricsRegistry],
});

// ============================================================
// SYSTEM METRICS
// ============================================================

export const diskSpaceBytes = new Gauge({
  name: 'disk_space_bytes',
  help: 'Disk maydoni (bayt)',
  labelNames: ['type'] as const, // available | total | used
  registers: [metricsRegistry],
});

// ============================================================
// PRISMA INSTRUMENTATION
// Prisma $on('query') event orqali DB metriclarni yig'ish
// ============================================================

import type { PrismaClient } from '@prisma/client';

export function instrumentPrisma(client: PrismaClient) {
  // @ts-expect-error: Prisma extended client event
  client.$on('query', (e: { query: string; duration: number; target: string }) => {
    // target = "prisma::query" yoki model nomi
    const parts = e.target?.split('::') || [];
    const model = parts[1] || 'unknown';

    // so'rov tipini aniqlash (SELECT, INSERT, UPDATE, DELETE)
    const queryLower = e.query.toLowerCase().trim();
    const operation = queryLower.startsWith('select') ? 'select'
      : queryLower.startsWith('insert') ? 'insert'
      : queryLower.startsWith('update') ? 'update'
      : queryLower.startsWith('delete') ? 'delete'
      : 'other';

    dbQueryDuration.observe(
      { operation, model },
      e.duration / 1000
    );
  });
}

// ============================================================
// REDIS HIT RATIO UPDATER
// ============================================================

const hitCounts: Record<string, number> = {};
const missCounts: Record<string, number> = {};

export function recordRedisHit(namespace = 'default') {
  hitCounts[namespace] = (hitCounts[namespace] || 0) + 1;
  redisCacheHitsTotal.inc({ namespace });
  updateHitRatio(namespace);
}

export function recordRedisMiss(namespace = 'default') {
  missCounts[namespace] = (missCounts[namespace] || 0) + 0;
  redisCacheMissesTotal.inc({ namespace });
  updateHitRatio(namespace);
}

function updateHitRatio(namespace: string) {
  const hits = hitCounts[namespace] || 0;
  const misses = missCounts[namespace] || 0;
  const total = hits + misses;
  redisHitRatio.set({ namespace }, total > 0 ? hits / total : 0);
}

// ============================================================
// TENANT COUNT UPDATER (her 5 daqiqada)
// ============================================================

import { prisma } from '@oshxona/database';

export function startPeriodicCollectors() {
  const collectTenantCount = async () => {
    try {
      const count = await prisma.tenant.count({ where: { isActive: true } });
      tenantActiveCount.set(count);
    } catch { /* silent */ }
  };

  // Darhol bir marta, keyin har 5 daqiqada
  collectTenantCount();
  setInterval(collectTenantCount, 5 * 60 * 1000);

  // Disk space (har 1 daqiqada)
  const collectDiskSpace = async () => {
    try {
      // @ts-ignore — optional package, silently skipped if absent
      const { checkDiskSpace } = await import('check-disk-space').catch(() => ({
        checkDiskSpace: null,
      }));
      if (!checkDiskSpace) return;
      const disk = await checkDiskSpace('/');
      diskSpaceBytes.set({ type: 'total' }, disk.size);
      diskSpaceBytes.set({ type: 'available' }, disk.free);
      diskSpaceBytes.set({ type: 'used' }, disk.size - disk.free);
    } catch { /* check-disk-space yo'q bo'lsa skip */ }
  };

  collectDiskSpace();
  setInterval(collectDiskSpace, 60 * 1000);
}
