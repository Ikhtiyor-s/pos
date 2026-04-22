import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
  message: string;
}

// In-memory fallback — Redis tushib qolganda DDoS himoyasi davom etadi
const fallbackStore = new Map<string, { count: number; resetAt: number }>();

function fallbackCheck(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = fallbackStore.get(key);
  if (!entry || now > entry.resetAt) {
    fallbackStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

// Fallback map'ni har 5 daqiqada tozalash (memory leak oldini olish)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of fallbackStore) {
    if (now > entry.resetAt) fallbackStore.delete(key);
  }
}, 300_000).unref();

function createRateLimiter(config: RateLimiterConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rl:${config.keyGenerator(req)}`;
    const windowSec = Math.ceil(config.windowMs / 1000);

    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const results = await pipeline.exec();

      const count = (results?.[0]?.[1] as number) ?? 1;
      const ttl = (results?.[1]?.[1] as number) ?? windowSec;

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
      // Redis ishlamasa — in-memory fallback bilan cheklaymiz (fail-closed)
      logger.warn('Rate limiter Redis error — using in-memory fallback', {
        error: (err as Error).message,
      });
      if (!fallbackCheck(key, config.maxRequests, config.windowMs)) {
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMITED',
          message: config.message,
          retryAfter: windowSec,
        });
      }
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
