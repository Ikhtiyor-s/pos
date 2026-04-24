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

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Rasm yuklanmadi' });
      }
      const imagePath = `/uploads/inventory/${req.file.filename}`;
      const item = await InventoryService.update(req.params.id, tenantId, { image: imagePath });
      return successResponse(res, item, 'Rasm yuklandi');
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
        page:  page  ? parseInt(page  as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      return paginatedResponse(res, result.transactions, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // RECIPE (ProductIngredient)
  // ==========================================

  static async getProductIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result   = await InventoryService.getProductIngredients(req.params.productId, tenantId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async setProductIngredients(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const items    = req.body.ingredients as { inventoryItemId: string; quantity: number }[];
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'ingredients [] massiv bo\'lishi kerak' });
      }
      const result = await InventoryService.setProductIngredients(req.params.productId, tenantId, items);
      return successResponse(res, result, 'Retsept saqlandi');
    } catch (error) {
      next(error);
    }
  }

  static async upsertProductIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { inventoryItemId, quantity } = req.body;
      if (!inventoryItemId || !quantity) {
        return res.status(400).json({ success: false, message: 'inventoryItemId va quantity kerak' });
      }
      const result = await InventoryService.upsertProductIngredient(
        req.params.productId, tenantId, { inventoryItemId, quantity: Number(quantity) },
      );
      return successResponse(res, result, 'Ingredient saqlandi');
    } catch (error) {
      next(error);
    }
  }

  static async removeProductIngredient(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await InventoryService.removeProductIngredient(
        req.params.productId, req.params.inventoryItemId, tenantId,
      );
      return successResponse(res, null, 'Ingredient o\'chirildi');
    } catch (error) {
      next(error);
    }
  }
}
