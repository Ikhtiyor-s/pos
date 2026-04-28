import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { validateEnv } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import routes from './routes/index.js';
import { strictTenantGuard, loadTenantContext } from './modules/tenant-isolation/tenant-guard.middleware.js';
import { globalLimiter, authLimiter } from './middleware/rate-limiter.js';
import { requestIdMiddleware, requestLogger } from './middleware/request-logger.js';
import { setupSocket } from './config/socket.js';
import { setupGracefulShutdown } from './config/graceful-shutdown.js';
import { healthCheck, livenessCheck, readinessCheck } from './config/health-check.js';
import { realtimeSyncManager } from './modules/order-lifecycle/realtime-sync.js';
import { nonborSyncService } from './services/nonbor-sync.service.js';
import { startWorker } from './integration/index.js';
import { connectRedis } from './config/redis.js';
import { processRetryQueue } from './modules/webhook-provider/webhook-provider.service.js';
import { startReportCrons } from './modules/reports/report-cleanup.cron.js';
import { startTelegramCrons } from './modules/telegram-bot/telegram-bot.cron.js';
import { startLoyaltyCrons } from './modules/loyalty/loyalty.cron.js';
import { startMarkirovkaReportCrons } from './jobs/markirovka-report.cron.js';
import { logger, Sentry } from './utils/logger.js';
import { metricsMiddleware, createMetricsRouter } from './middleware/metrics.middleware.js';
import {
  socketActiveConnections,
  socketEventsTotal,
  startPeriodicCollectors,
} from './config/metrics.js';

const env = validateEnv();

const app = express();

// Nginx / CloudFlare orqasi — req.ip va rate limiter to'g'ri ishlashi uchun
app.set('trust proxy', 1);

const httpServer = createServer(app);

const allowedOrigins = env.CLIENT_URL;

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
});

setupSocket(io);
realtimeSyncManager.initialize(io);
app.set('io', io);

// Socket.IO connection metrics
io.on('connection', (socket) => {
  const tenantId = (socket.handshake.query.tenantId as string) || 'unknown';
  socketActiveConnections.inc({ tenant_id: tenantId });
  socketEventsTotal.inc({ event: 'connection', direction: 'in' });

  socket.on('disconnect', () => {
    socketActiveConnections.dec({ tenant_id: tenantId });
    socketEventsTotal.inc({ event: 'disconnect', direction: 'in' });
  });
});

// ==========================================
// MIDDLEWARE PIPELINE
// ==========================================

// 0. Prometheus metrics (auth yo'q — internal only)
app.use(metricsMiddleware);
app.use(createMetricsRouter());

// 1. Request ID
app.use(requestIdMiddleware);

// 3. Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// 4. CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} ruxsat etilmagan`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  }),
);

// 5. Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 6. Logging
app.use(requestLogger);

// 7. Rate limiting
app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login-pin', authLimiter);

// ==========================================
// STATIC & HEALTH
// ==========================================

app.use('/uploads', express.static('uploads'));

app.get('/health', healthCheck);
app.get('/healthz', livenessCheck);
app.get('/readyz', readinessCheck);

// ==========================================
// API ROUTES
// ==========================================

app.use('/api', strictTenantGuard, loadTenantContext);
app.use('/api', routes);
app.use('/api/v1', routes);

// ==========================================
// ERROR HANDLERS
// ==========================================

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// SERVER START
// ==========================================

const PORT = env.PORT;

async function bootstrap() {
  try {
    await connectRedis();
  } catch (err) {
    logger.warn('Redis ulanmadi — ayrim funksiyalar cheklangan ishlaydi', {
      error: (err as Error).message,
    });
  }

  httpServer.listen(PORT, () => {
    logger.info('Oshxona POS API started', {
      port: PORT,
      env: env.NODE_ENV,
      version: '3.0.0',
    });

    startPeriodicCollectors();
    setupGracefulShutdown(httpServer, io);

    try {
      startWorker();
    } catch (err) {
      logger.error('Integration worker failed to start', { error: (err as Error).message });
    }

    nonborSyncService.startPolling(io).catch((err: Error) => {
      logger.error('Nonbor polling failed to start', { error: err.message });
    });

    startReportCrons();
    startTelegramCrons();
    startLoyaltyCrons();
    startMarkirovkaReportCrons();

    setInterval(() => {
      processRetryQueue().catch((err: Error) => {
        logger.warn('Webhook retry queue xatosi', { error: err.message });
      });
    }, 5 * 60 * 1000);
  });
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', { error: (err as Error).message });
  process.exit(1);
});

export { io };
