import { Request, Response, NextFunction } from 'express';

// ==========================================
// REQUEST LOGGER — Production-level logging
// Structured JSON logs with request metadata
// ==========================================

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Response end da log yozish
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      userAgent: req.get('user-agent')?.substring(0, 100),
    };

    // Slow request warning (> 5s)
    if (duration > 5000) {
      console.warn('[SLOW REQUEST]', JSON.stringify(logEntry));
    } else if (res.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logEntry));
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(logEntry));
    }

    return originalEnd.apply(res, args as any);
  } as any;

  next();
}
