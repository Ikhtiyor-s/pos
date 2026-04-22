import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// Redis-backed rate limiter — multi-instance safe
// In-memory store ishlamaydi horizontal scaling'da

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  message: string;
}

function createRateLimiter(config: RateLimiterConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${config.keyGenerator(req)}`;
    const windowSec = Math.ceil(config.windowMs / 1000);

    try {
      // MULTI/EXEC — atomik INCR + EXPIRE
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      const count = (results?.[0]?.[1] as number) ?? 1;
      const ttl = (results?.[1]?.[1] as number) ?? windowSec;

      // Yangi key — TTL o'rnatish
      if (ttl === -1) await redis.expire(key, windowSec);

      const resetAt = Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : windowSec);
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count));
      res.setHeader('X-RateLimit-Reset', resetAt);

      if (count > config.maxRequests) {
        logger.warn('Rate limit exceeded', { key, count, ip: req.ip, url: req.originalUrl });
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: config.message,
          retryAfter: ttl > 0 ? ttl : windowSec,
        });
      }

      next();
    } catch (err) {
      // Redis ishlamasa — so'rovni o'tkazib yuboramiz (fail-open)
      logger.error('Rate limiter Redis error', { error: (err as Error).message });
      next();
    }
  };
}

// 200 req / 1 min per IP
export const globalLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 200,
  keyGenerator: (req) => `global:${req.ip}`,
  message: "Juda ko'p so'rov. 1 daqiqadan keyin qayta urinib ko'ring.",
});

// 10 req / 1 min per IP — brute-force himoyasi
export const authLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  keyGenerator: (req) => `auth:${req.ip}`,
  message: "Juda ko'p login urinishi. 1 daqiqadan keyin qayta urinib ko'ring.",
});

// 30 req / 1 min per tenant
export const orderLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
  keyGenerator: (req) => `order:${req.user?.tenantId || req.ip}`,
  message: 'Juda ko\'p buyurtma. Biroz kutib turing.',
});

// 10 req / 1 min per tenant
export const analyticsLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  keyGenerator: (req) => `analytics:${req.user?.tenantId || req.ip}`,
  message: "Analytics so'rovlari cheklangan. Biroz kutib turing.",
});

// 60 req / 1 min per IP
export const webhookLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 60,
  keyGenerator: (req) => `webhook:${req.ip}`,
  message: "Webhook so'rovlari cheklangan.",
});
