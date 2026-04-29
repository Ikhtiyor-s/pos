import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { successResponse } from '../utils/response.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  pinLoginSchema,
  setPinSchema,
} from '../validators/auth.validator.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await AuthService.login(data);

      return successResponse(res, result, 'Tizimga muvaffaqiyatli kirdingiz');
    } catch (error) {
      next(error);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerSchema.parse(req.body);
      const result = await AuthService.register(data);

      return successResponse(res, result, 'Ro\'yxatdan muvaffaqiyatli o\'tdingiz', 201);
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshToken(refreshToken);

      return successResponse(res, tokens, 'Token yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      return successResponse(res, null, 'Tizimdan chiqdingiz');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      return successResponse(res, req.user);
    } catch (error) {
      next(error);
    }
  }

  // ============ Nonbor Admin POS login-pin ============
  // Nonbor Admin {username, password, tenantId} formatini qabul qiladi.
  // username → slug@pos.local email ga convert qilinadi.
  static async nonborLoginPin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body as { username?: string; password?: string; tenantId?: string };

      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'username va password kiritilishi shart',
        });
      }

      // Nonbor-admin slug logikasi: username → slug@pos.local
      const slug = username.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
      const email = `${slug}@pos.local`;

      const result = await AuthService.login({ email, password: password.trim() });

      // Nonbor-admin kutgan format: {success, data: {accessToken, refreshToken, user}}
      return res.json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: {
            id: result.user.id,
            name: `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim() || result.user.email,
            firstName: result.user.firstName || '',
            lastName: result.user.lastName || '',
            phone: result.user.phone || '',
            role: result.user.role?.toLowerCase() || 'cashier',
          },
        },
      });
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('noto\'g\'ri') || msg.includes('401')) {
        return res.status(401).json({ detail: msg });
      }
      next(error);
    }
  }

  // ============ PIN ============

  static async loginWithPin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = pinLoginSchema.parse(req.body);
      const result = await AuthService.loginWithPin(data);

      return successResponse(res, result, 'PIN orqali muvaffaqiyatli kirdingiz');
    } catch (error) {
      next(error);
    }
  }

  static async setUserPin(req: Request, res: Response, next: NextFunction) {
    try {
      const { pin } = setPinSchema.parse(req.body);
      const adminTenantId = req.user!.tenantId!;
      await AuthService.setUserPin(req.params.userId, pin, adminTenantId);

      return successResponse(res, null, 'PIN muvaffaqiyatli o\'rnatildi');
    } catch (error) {
      next(error);
    }
  }

  static async removeUserPin(req: Request, res: Response, next: NextFunction) {
    try {
      const adminTenantId = req.user!.tenantId!;
      await AuthService.removeUserPin(req.params.userId, adminTenantId);

      return successResponse(res, null, 'PIN muvaffaqiyatli o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        throw new AppError('Joriy va yangi parol (min 6 belgi) talab qilinadi', 400);
      }
      await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      return successResponse(res, null, 'Parol muvaffaqiyatli o\'zgartirildi');
    } catch (error) {
      next(error);
    }
  }

  // ============ PASSWORD RESET ============

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, phone } = req.body;
      const result = await AuthService.forgotPassword(email, phone);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 6) {
        throw new AppError('Token va yangi parol (min 6 belgi) talab qilinadi', 400);
      }
      const result = await AuthService.resetPassword(token, newPassword);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
