import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service.js';
import { successResponse } from '../utils/response.js';
import { createCategorySchema, updateCategorySchema } from '../validators/product.validator.js';

export class CategoryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const includeProducts = req.query.includeProducts === 'true';
      const categories = await CategoryService.getAll(tenantId, includeProducts);
      return successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const category = await CategoryService.getById(tenantId, req.params.id);
      return successResponse(res, category);
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const category = await CategoryService.getBySlug(tenantId, req.params.slug);
      return successResponse(res, category);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createCategorySchema.parse(req.body);
      const category = await CategoryService.create(tenantId, data);
      return successResponse(res, category, 'Kategoriya yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateCategorySchema.parse(req.body);
      const category = await CategoryService.update(tenantId, req.params.id, data);
      return successResponse(res, category, 'Kategoriya yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await CategoryService.delete(tenantId, req.params.id);
      return successResponse(res, null, 'Kategoriya o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Rasm yuklanmadi',
        });
      }

      const imagePath = `/uploads/categories/${req.file.filename}`;
      const category = await CategoryService.updateImage(tenantId, req.params.id, imagePath);

      return successResponse(res, category, 'Rasm yuklandi');
    } catch (error) {
      next(error);
    }
  }
}
