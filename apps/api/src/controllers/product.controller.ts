import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validator.js';

export class ProductController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, categoryId, search, isActive } = req.query;

      const result = await ProductService.getAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        categoryId: categoryId as string,
        search: search as string,
        isActive: isActive ? isActive === 'true' : undefined,
      });

      return paginatedResponse(
        res,
        result.products,
        result.page,
        result.limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getById(req.params.id);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await ProductService.create(data);
      return successResponse(res, product, 'Mahsulot yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateProductSchema.parse(req.body);
      const product = await ProductService.update(req.params.id, data);
      return successResponse(res, product, 'Mahsulot yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.delete(req.params.id);
      return successResponse(res, null, 'Mahsulot o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Rasm yuklanmadi',
        });
      }

      const imagePath = `/uploads/products/${req.file.filename}`;
      const product = await ProductService.updateImage(req.params.id, imagePath);

      return successResponse(res, product, 'Rasm yuklandi');
    } catch (error) {
      next(error);
    }
  }
}
