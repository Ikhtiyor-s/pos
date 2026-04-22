import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.startTime = Date.now();
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const originalEnd = res.end.bind(res);

  res.end = function (...args: Parameters<typeof res.end>) {
    const duration = Date.now() - req.startTime;
    const log = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ua: req.get('user-agent')?.substring(0, 120),
    };

    if (duration > 3000) {
      logger.warn('Slow request', log);
    } else if (res.statusCode >= 500) {
      logger.error('Request error', log);
    } else if (res.statusCode >= 400) {
      logger.warn('Request warning', log);
    } else {
      logger.info('Request', log);
    }

    return originalEnd(...args);
  } as typeof res.end;

  next();
}
