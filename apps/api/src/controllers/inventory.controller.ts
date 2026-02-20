import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';

export class InventoryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page, limit, search, isActive } = req.query;

      const result = await InventoryService.getAll(tenantId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        isActive: isActive ? isActive === 'true' : undefined,
      });

      return paginatedResponse(res, result.items, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const item = await InventoryService.getById(req.params.id, tenantId);
      return successResponse(res, item);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const item = await InventoryService.create(tenantId, req.body);
      return successResponse(res, item, 'Ombor mahsuloti yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const item = await InventoryService.update(req.params.id, tenantId, req.body);
      return successResponse(res, item, 'Ombor mahsuloti yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await InventoryService.delete(req.params.id, tenantId);
      return successResponse(res, null, 'Ombor mahsuloti o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const items = await InventoryService.getLowStock(tenantId);
      return successResponse(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async addTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const transaction = await InventoryService.addTransaction(tenantId, {
        ...req.body,
        itemId: req.params.id,
        userId,
      });
      return successResponse(res, transaction, 'Tranzaksiya yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page, limit } = req.query;
      const result = await InventoryService.getTransactions(req.params.id, tenantId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      return paginatedResponse(res, result.transactions, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
}
