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
import { logger } from './utils/logger.js';

const env = validateEnv();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = env.CLIENT_URL;

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  // Ping interval oshirish — unnecessary disconnects kamaytirish
  pingInterval: 25000,
  pingTimeout: 20000,
});

setupSocket(io);
realtimeSyncManager.initialize(io);
app.set('io', io);

// ==========================================
// MIDDLEWARE PIPELINE
// ==========================================

// 1. Request ID — eng birinchi, barcha loglar uchun
app.use(requestIdMiddleware);

// 2. Security headers — Content-Security-Policy, HSTS, etc.
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

// 3. CORS
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

// 4. Request parsing — 10mb limit (file uploads uchun multer ishlatiladi)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Logging
app.use(requestLogger);

// 6. Rate limiting
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
// ERROR HANDLERS (oxirda bo'lishi shart)
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// SERVER START
// ==========================================

const PORT = env.PORT;

async function bootstrap() {
  // Redis'ga ulanish
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

    // Webhook retry queue — har 5 daqiqada
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
