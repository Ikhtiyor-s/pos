import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import routes from './routes/index.js';
import { strictTenantGuard, loadTenantContext } from './modules/tenant-isolation/tenant-guard.middleware.js';
import { globalLimiter, authLimiter } from './middleware/rate-limiter.js';
import { requestLogger } from './middleware/request-logger.js';
import { setupSocket } from './config/socket.js';
import { setupGracefulShutdown } from './config/graceful-shutdown.js';
import { healthCheck, livenessCheck, readinessCheck } from './config/health-check.js';
import { realtimeSyncManager } from './modules/order-lifecycle/realtime-sync.js';
import { nonborSyncService } from './services/nonbor-sync.service.js';
import { startWorker } from './integration/index.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const allowedOrigins = process.env.CLIENT_URL?.split(',') || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
  'http://localhost:5181',
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Setup socket handlers
setupSocket(io);

// Initialize realtime sync manager with Socket.IO
realtimeSyncManager.initialize(io);

// Make io available to routes
app.set('io', io);

// ==========================================
// MIDDLEWARE PIPELINE (order matters!)
// ==========================================

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Logging
if (process.env.NODE_ENV === 'production') {
  app.use(requestLogger);
} else {
  app.use(morgan('dev'));
}

// 5. Global rate limiting
app.use('/api', globalLimiter);

// 6. Auth endpoint rate limiting (brute-force himoyasi)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/login-pin', authLimiter);

// ==========================================
// STATIC & HEALTH
// ==========================================

app.use('/uploads', express.static('uploads'));

// Health checks — production-level with DB ping
app.get('/health', healthCheck);
app.get('/healthz', livenessCheck);    // k8s liveness
app.get('/readyz', readinessCheck);     // k8s readiness

// ==========================================
// API ROUTES (versioned)
// ==========================================

// Strict Tenant Isolation — barcha API requestlarda
app.use('/api', strictTenantGuard, loadTenantContext);

// v1 Routes (current) — /api va /api/v1 ikkalasi ham ishlaydi
app.use('/api', routes);
app.use('/api/v1', routes);

// ==========================================
// ERROR HANDLERS
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// SERVER START
// ==========================================

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║     🍽️  OSHXONA POS SaaS API v3.0.0                   ║
  ╠═══════════════════════════════════════════════════════╣
  ║  🚀 Server:     http://localhost:${PORT}                    ║
  ║  📡 Socket.IO:  Connected                              ║
  ║  🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(12)}                    ║
  ║  🔒 Rate Limit:  200 req/min                            ║
  ║  🏥 Health:      /health, /healthz, /readyz              ║
  ║  📦 API:         /api/v1/*                               ║
  ╚═══════════════════════════════════════════════════════╝
  `);

  // Graceful shutdown handlers
  setupGracefulShutdown(httpServer, io);

  // Integration Core worker
  try {
    startWorker();
  } catch (err) {
    console.error('[Integration] Worker boshlashda xatolik:', err);
  }

  // Nonbor polling
  nonborSyncService.startPolling(io).catch((err) => {
    console.error('[Nonbor] Polling boshlashda xatolik:', err);
  });
});

export { io };
