import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, Role } from '@oshxona/database';

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

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token topilmadi',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret';

    const decoded = jwt.verify(token, secret) as JwtPayload;

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
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Foydalanuvchi topilmadi',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Hisobingiz bloklangan',
      });
    }

    // Tenant aktiv ekanligini tekshirish
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isActive: true },
      });

      if (!tenant || !tenant.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Tashkilotingiz bloklangan',
        });
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token muddati tugagan',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Yaroqsiz token',
    });
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Avtorizatsiya talab qilinadi',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Sizda bu amalni bajarish huquqi yo\'q',
      });
    }

    next();
  };
}

// Tenant talab qilinadi (SUPER_ADMIN dan tashqari barcha foydalanuvchilar uchun)
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Avtorizatsiya talab qilinadi',
    });
  }

  // SUPER_ADMIN global foydalanuvchi — tenantId talab qilinmaydi
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Tenant talab qilinadi',
    });
  }

  next();
}
