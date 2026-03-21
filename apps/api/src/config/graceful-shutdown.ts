import { Server } from 'http';
import { Server as SocketServer } from 'socket.io';
import { prisma } from '@oshxona/database';
import { rateLimiterStore } from '../middleware/rate-limiter.js';

// ==========================================
// GRACEFUL SHUTDOWN
// SIGTERM/SIGINT signallarida xavfsiz yopish
// ==========================================

let isShuttingDown = false;

export function setupGracefulShutdown(
  httpServer: Server,
  io: SocketServer,
): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[Shutdown] ${signal} received. Graceful shutdown boshlandi...`);

    // 1. Yangi connectionlarni qabul qilmaslik
    httpServer.close(() => {
      console.log('[Shutdown] HTTP server yopildi');
    });

    // 2. Socket.IO ulanishlarni yopish
    io.disconnectSockets(true);
    console.log('[Shutdown] Socket.IO ulanishlar uzildi');

    // 3. Rate limiter tozalash
    rateLimiterStore.destroy();

    // 4. Database ulanishni yopish
    try {
      await prisma.$disconnect();
      console.log('[Shutdown] Database ulanish yopildi');
    } catch (error) {
      console.error('[Shutdown] Database disconnect xatolik:', error);
    }

    console.log('[Shutdown] Graceful shutdown yakunlandi');
    process.exit(0);
  };

  // Signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
    // Don't shutdown — just log
  });

  console.log('[Shutdown] Graceful shutdown handlers registered');
}

// Health check uchun
export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}
