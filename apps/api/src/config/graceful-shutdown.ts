import { Server } from 'http';
import { Server as SocketServer } from 'socket.io';
import { prisma } from '@oshxona/database';
import { disconnectRedis } from './redis.js';
import { logger } from '../utils/logger.js';

const SHUTDOWN_TIMEOUT_MS = 30_000;

let isShuttingDown = false;

export function setupGracefulShutdown(httpServer: Server, io: SocketServer): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Graceful shutdown started', { signal });

    // Majburiy to'xtatish — 30s timeout
    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timeout — force exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    // 1. Yangi connectionlarni to'xtatish
    httpServer.close(() => logger.info('HTTP server closed'));

    // 2. Socket.IO yopish
    io.disconnectSockets(true);
    logger.info('Socket.IO connections closed');

    // 3. Redis yopish
    try {
      await disconnectRedis();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.error('Redis disconnect error', { error: (err as Error).message });
    }

    // 4. Database yopish
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Database disconnect error', { error: (err as Error).message });
    }

    logger.info('Graceful shutdown complete');
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
  });

  logger.info('Graceful shutdown handlers registered');
}

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}
