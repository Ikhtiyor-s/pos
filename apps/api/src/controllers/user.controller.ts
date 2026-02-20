import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { successResponse } from '../utils/response.js';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Email formati noto\'g\'ri'),
  phone: z.string().optional(),
  firstName: z.string().min(1, 'Ism kiritilishi shart'),
  lastName: z.string().optional(),
  role: z.enum(['CASHIER', 'WAITER', 'CHEF', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE']),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['CASHIER', 'WAITER', 'CHEF', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE']).optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export class UserController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { search, role } = req.query;
      const users = await UserService.getAll(tenantId, {
        search: search as string,
        role: role as string,
      });
      return successResponse(res, users);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const user = await UserService.getById(tenantId, req.params.id);
      return successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createUserSchema.parse(req.body);
      const user = await UserService.create(tenantId, data);
      return successResponse(res, user, 'Xodim yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateUserSchema.parse(req.body);
      const user = await UserService.update(tenantId, req.params.id, data);
      return successResponse(res, user, 'Xodim yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await UserService.delete(tenantId, req.params.id);
      return successResponse(res, null, 'Xodim o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  static async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const user = await UserService.toggleActive(tenantId, req.params.id);
      return successResponse(res, user, user.isActive ? 'Xodim faollashtirildi' : 'Xodim nofaol qilindi');
    } catch (error) {
      next(error);
    }
  }
}
