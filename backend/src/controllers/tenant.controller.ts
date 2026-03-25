import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service.js';
import {
  createTenantSchema,
  updateTenantSchema,
  tenantQuerySchema,
} from '../validators/tenant.validator.js';
import { successResponse, paginatedResponse, errorResponse } from '../utils/response.js';

export class TenantController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = tenantQuerySchema.parse(req.query);
      const result = await TenantService.getAll(query);
      return paginatedResponse(res, result.tenants, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await TenantService.getById(req.params.id);
      return successResponse(res, tenant);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createTenantSchema.parse(req.body);
      const result = await TenantService.create(data);
      return successResponse(res, result, 'Tenant muvaffaqiyatli yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateTenantSchema.parse(req.body);
      const tenant = await TenantService.update(req.params.id, data);
      return successResponse(res, tenant, 'Tenant muvaffaqiyatli yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await TenantService.toggle(req.params.id);
      return successResponse(
        res,
        tenant,
        tenant.isActive ? 'Tenant yoqildi' : 'Tenant o\'chirildi'
      );
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await TenantService.getStats(req.params.id);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}
