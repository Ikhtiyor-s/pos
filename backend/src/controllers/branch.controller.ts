import { Request, Response, NextFunction } from 'express';
import { BranchService } from '../services/branch.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import {
  createBranchSchema,
  updateBranchSchema,
  branchQuerySchema,
} from '../validators/branch.validator.js';

export class BranchController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = branchQuerySchema.parse(req.query);
      const result = await BranchService.getAll(tenantId, query);
      return paginatedResponse(res, result.branches, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const branch = await BranchService.getById(tenantId, req.params.id);
      return successResponse(res, branch);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createBranchSchema.parse(req.body);
      const result = await BranchService.create(tenantId, data);
      return successResponse(res, result, 'Fillial muvaffaqiyatli yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateBranchSchema.parse(req.body);
      const branch = await BranchService.update(tenantId, req.params.id, data);
      return successResponse(res, branch, 'Fillial yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const branch = await BranchService.toggle(tenantId, req.params.id);
      const msg = branch.isActive ? 'Fillial yoqildi' : 'Fillial o\'chirildi';
      return successResponse(res, branch, msg);
    } catch (error) {
      next(error);
    }
  }
}
