import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, Role } from '@oshxona/database';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface JwtPayload {
  userId: string;
  role: Role;
  tenantId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        firstName: string;
        lastName: string;
        tenantId: string | null;
      };
    }
  }
}

const USER_CACHE_TTL = 60; // seconds

async function getCachedUser(userId: string) {
  try {
    const cached = await redis.get(`auth:user:${userId}`);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis mavjud bo'lmasa — DB ga tushamiz
  }
  return null;
}

async function setCachedUser(userId: string, user: object) {
  try {
    await redis.setex(`auth:user:${userId}`, USER_CACHE_TTL, JSON.stringify(user));
  } catch {
    // Ignore Redis errors
  }
}

export async function invalidateUserCache(userId: string) {
  try {
    await redis.del(`auth:user:${userId}`);
  } catch {
    // Ignore
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Token topilmadi' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    logger.error('JWT_SECRET not configured');
    return res.status(500).json({ success: false, code: 'INTERNAL', message: 'Server konfiguratsiya xatosi' });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // 1. Redis cache dan tekshirish
    const cached = await getCachedUser(decoded.userId);
    if (cached) {
      req.user = cached;
      return next();
    }

    // 2. DB dan foydalanuvchi + tenant bir so'rovda
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        tenantId: true,
        tenant: { select: { isActive: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Foydalanuvchi topilmadi' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Hisobingiz bloklangan' });
    }

    if (user.tenant && !user.tenant.isActive) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Tashkilotingiz bloklangan' });
    }

    const { tenant: _, ...userWithoutTenant } = user;
    req.user = userWithoutTenant;

    // Cache ga saqlash (tenant ma'lumotini chiqarib)
    await setCachedUser(decoded.userId, userWithoutTenant);

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Token muddati tugagan' });
    }
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Yaroqsiz token' });
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Avtorizatsiya talab qilinadi' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: "Sizda bu amalni bajarish huquqi yo'q" });
    }
    next();
  };
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Avtorizatsiya talab qilinadi' });
  }
  if (req.user.role === 'SUPER_ADMIN') return next();
  if (!req.user.tenantId) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Tenant talab qilinadi' });
  }
  next();
}
