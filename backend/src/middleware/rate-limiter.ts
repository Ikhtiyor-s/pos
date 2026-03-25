import { Request, Response, NextFunction } from 'express';

// ==========================================
// RATE LIMITER MIDDLEWARE
// IP va tenant bo'yicha API request cheklash
// express-rate-limit kutubxonasiz — in-memory
// ==========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimiterConfig {
  windowMs: number;      // Vaqt oynasi (ms)
  maxRequests: number;   // Maksimal requestlar soni
  keyGenerator: (req: Request) => string;
  message: string;
}

class RateLimiterStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Har 60 sekundda eskirgan yozuvlarni tozalash
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  increment(key: string, windowMs: number): { count: number; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Yangi oyna
      const newEntry: RateLimitEntry = { count: 1, resetTime: now + windowMs };
      this.store.set(key, newEntry);
      return { count: 1, remaining: 0, resetTime: newEntry.resetTime };
    }

    entry.count++;
    this.store.set(key, entry);
    return { count: entry.count, remaining: Math.max(0, entry.resetTime - now), resetTime: entry.resetTime };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const store = new RateLimiterStore();

function createRateLimiter(config: RateLimiterConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator(req);
    const { count, resetTime } = store.increment(key, config.windowMs);

    // Headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

    if (count > config.maxRequests) {
      return res.status(429).json({
        success: false,
        message: config.message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}

// --- Pre-configured limiters ---

// Global: 200 req / 1 min per IP
export const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  keyGenerator: (req) => `global:${req.ip}`,
  message: 'Juda ko\'p so\'rov. 1 daqiqadan keyin qayta urinib ko\'ring.',
});

// Auth: 10 req / 1 min per IP (brute-force himoyasi)
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => `auth:${req.ip}`,
  message: 'Juda ko\'p login urinishi. 1 daqiqadan keyin qayta urinib ko\'ring.',
});

// Order create: 30 req / 1 min per tenant
export const orderLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: (req) => `order:${req.user?.tenantId || req.ip}`,
  message: 'Juda ko\'p buyurtma. Biroz kutib turing.',
});

// Heavy analytics: 10 req / 1 min per tenant
export const analyticsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => `analytics:${req.user?.tenantId || req.ip}`,
  message: 'Analytics so\'rovlari cheklangan. Biroz kutib turing.',
});

// Webhook: 60 req / 1 min per IP
export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyGenerator: (req) => `webhook:${req.ip}`,
  message: 'Webhook so\'rovlari cheklangan.',
});

export { store as rateLimiterStore };
