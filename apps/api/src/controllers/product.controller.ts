import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import {
  createProductSchema,
  updateProductSchema,
  updatePriceSchema,
  bulkToggleSchema,
  bulkPriceUpdateSchema,
} from '../validators/product.validator.js';

export class ProductController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page, limit, categoryId, search, isActive } = req.query;

      const result = await ProductService.getAll(tenantId, {
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
      const tenantId = req.user!.tenantId!;
      const product = await ProductService.getById(tenantId, req.params.id);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createProductSchema.parse(req.body);
      const product = await ProductService.create(tenantId, data);
      return successResponse(res, product, 'Mahsulot yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateProductSchema.parse(req.body);
      const product = await ProductService.update(tenantId, req.params.id, data);
      return successResponse(res, product, 'Mahsulot yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await ProductService.delete(tenantId, req.params.id);
      return successResponse(res, null, 'Mahsulot o\'chirildi');
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

      const imagePath = `/uploads/products/${req.file.filename}`;
      const product = await ProductService.updateImage(tenantId, req.params.id, imagePath);

      return successResponse(res, product, 'Rasm yuklandi');
    } catch (error) {
      next(error);
    }
  }

  static async getByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const product = await ProductService.getByBarcode(tenantId, req.params.barcode);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async getQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await ProductService.generateQRCode(tenantId, req.params.id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async generateBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const product = await ProductService.generateBarcodeForExisting(tenantId, req.params.id);
      return successResponse(res, product, 'Barcode yaratildi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ADMIN: NARX YANGILASH
  // ==========================================

  static async updatePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { price, costPrice } = updatePriceSchema.parse(req.body);
      const product = await ProductService.updatePrice(tenantId, req.params.id, price, costPrice);
      return successResponse(res, product, 'Narx yangilandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ADMIN: YOQISH/O'CHIRISH
  // ==========================================

  static async toggleActive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const product = await ProductService.toggleActive(tenantId, req.params.id);
      const msg = product.isActive ? 'Mahsulot yoqildi' : 'Mahsulot o\'chirildi';
      return successResponse(res, product, msg);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  static async bulkToggle(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { productIds, isActive } = bulkToggleSchema.parse(req.body);
      const result = await ProductService.bulkToggle(tenantId, productIds, isActive);
      return successResponse(res, result, `${result.updated} ta mahsulot yangilandi`);
    } catch (error) {
      next(error);
    }
  }

  static async bulkPriceUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { updates } = bulkPriceUpdateSchema.parse(req.body);
      const results = await ProductService.bulkPriceUpdate(tenantId, updates);
      return successResponse(res, results, `${results.length} ta narx yangilandi`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // QR MENYU / FEATURED
  // ==========================================

  static async getQRMenuProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const products = await ProductService.getQRMenuProducts(tenantId);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  static async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const products = await ProductService.getFeaturedProducts(tenantId);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  static async searchByTag(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const tag = req.params.tag;
      const products = await ProductService.searchByTag(tenantId, tag);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const products = await ProductService.getLowStockProducts(tenantId);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }
}
