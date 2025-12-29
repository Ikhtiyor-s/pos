import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, Role } from '@oshxona/database';

interface JwtPayload {
  userId: string;
  role: Role;
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

    req.user = user;
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
