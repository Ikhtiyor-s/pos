import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
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
}
