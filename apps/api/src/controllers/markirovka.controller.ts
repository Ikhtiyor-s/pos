import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';
import { MarkirovkaService } from '../services/markirovka.service.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  receiveProductSchema,
  batchReceiveSchema,
  reportSaleSchema,
  getProductsQuerySchema,
  getBatchesQuerySchema,
  getLogsQuerySchema,
  dailyReportQuerySchema,
} from '../validators/markirovka.validator.js';

// ==========================================
// MARKIROVKA CONTROLLER
// Base: /api/markirovka
// ==========================================

export class MarkirovkaController {

  // ──────────────────────────────────────────
  // POST /markirovka/verify/:code
  // Kodni davlat serverida tekshirish
  // Roles: CASHIER, WAREHOUSE, MANAGER, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const markCode = req.params.code?.trim();

      if (!markCode || markCode.length < 20) {
        return errorResponse(res, 'Markirovka kodi kamida 20 belgidan iborat bo\'lishi kerak', 400);
      }

      logger.info('Markirovka verify so\'rovi', { markCode: markCode.slice(0, 8) + '***', tenantId });

      const result = await MarkirovkaService.verifyCode(markCode, tenantId);

      if (result.status === 'QUEUED') {
        return res.status(202).json({
          success: true,
          data:    { valid: false, queued: true, status: 'QUEUED' },
          message: 'Internet mavjud emas — tekshiruv navbatga qo\'shildi',
        });
      }

      if (!result.valid) {
        return successResponse(
          res,
          { valid: false, status: result.status, raw: result.raw },
          'Markirovka kodi davlat serverida tasdiqlanmadi',
        );
      }

      return successResponse(res, {
        valid:            true,
        gtin:             result.gtin,
        serialNumber:     result.serialNumber,
        productName:      result.productName,
        expiryDate:       result.expiryDate,
        manufacturerName: result.manufacturerName,
        status:           result.status,
      }, 'Markirovka kodi tasdiqlandi');
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // POST /markirovka/receive
  // Bitta markirovka mahsulotini qabul qilish
  // Roles: WAREHOUSE, MANAGER, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const body     = receiveProductSchema.parse(req.body);

      logger.info('Markirovka receive so\'rovi', { markCode: body.markCode.slice(0, 8) + '***', tenantId });

      await MarkirovkaService.receiveProduct({
        markCode:      body.markCode,
        batchNumber:   body.batchNumber,
        importerTin:   body.importerTin,
        tenantId,
        productId:     body.productId,
        supplierId:    body.supplierId,
        invoiceNumber: body.invoiceNumber,
        expiryDate:    body.expiryDate ? new Date(body.expiryDate) : undefined,
      });

      const saved = await prisma.markirovkaProduct.findUnique({
        where:   { markCode: body.markCode },
        include: { product: { select: { id: true, name: true, sku: true } } },
      });

      return successResponse(res, saved, 'Markirovka mahsuloti muvaffaqiyatli qabul qilindi', 201);
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // POST /markirovka/batch-receive
  // Bir vaqtda ko'p markirovka mahsulotlarini qabul qilish
  // Roles: WAREHOUSE, MANAGER, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async batchReceive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId    = req.user!.tenantId!;
      const { items }   = batchReceiveSchema.parse(req.body);

      logger.info('Markirovka batch-receive so\'rovi', { count: items.length, tenantId });

      const receiveOptions = items.map((item) => ({
        markCode:      item.markCode,
        batchNumber:   item.batchNumber,
        importerTin:   item.importerTin,
        tenantId,
        productId:     item.productId,
        supplierId:    item.supplierId,
        invoiceNumber: item.invoiceNumber,
        expiryDate:    item.expiryDate ? new Date(item.expiryDate) : undefined,
      }));

      const results      = await MarkirovkaService.batchReceive(receiveOptions);
      const successCount = results.filter((r) => r.success).length;
      const failedCount  = results.length - successCount;

      const statusCode = failedCount === results.length ? 422  // barchasi xato
                       : failedCount > 0              ? 207  // qisman muvaffaqiyat
                       : 201;                                 // barchasi muvaffaqiyatli

      return res.status(statusCode).json({
        success: successCount > 0,
        data:    { results, summary: { total: items.length, success: successCount, failed: failedCount } },
        message: `${successCount}/${items.length} ta mahsulot qabul qilindi`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // POST /markirovka/sell
  // Sotilganligini davlat serveriga xabar qilish
  // Roles: CASHIER, MANAGER, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async sell(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId   = req.user!.id;
      const body     = reportSaleSchema.parse(req.body);

      logger.info('Markirovka sell so\'rovi', { markCode: body.markCode.slice(0, 8) + '***', orderId: body.orderId, tenantId });

      // Sotishdan oldin tekshirish
      const check = await MarkirovkaService.checkBeforeSell(body.markCode, tenantId);
      if (!check.valid) {
        return errorResponse(res, check.reason ?? 'Markirovka kodi sotish uchun yaroqli emas', 409);
      }

      await MarkirovkaService.reportSale({
        markCode:      body.markCode,
        orderId:       body.orderId,
        price:         body.price,
        receiptNumber: body.receiptNumber,
        tenantId,
        soldByUserId:  userId,
      });

      const updated = await prisma.markirovkaProduct.findUnique({
        where: { markCode: body.markCode },
      });

      return successResponse(res, updated, 'Sotuv muvaffaqiyatli davlat serveriga xabar qilindi');
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // GET /markirovka/check/:code
  // Sotishdan oldin tez tekshirish (kassir skaneri uchun)
  // Roles: CASHIER, MANAGER, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async checkBeforeSell(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const markCode = req.params.code?.trim();

      if (!markCode || markCode.length < 20) {
        return errorResponse(res, 'Markirovka kodi kamida 20 belgidan iborat bo\'lishi kerak', 400);
      }

      const result = await MarkirovkaService.checkBeforeSell(markCode, tenantId);

      // 200 qaytariladi — valid yoki emas ham muvaffaqiyatli javob
      // Kassir bu javobga qarab harakat qiladi
      return successResponse(res, {
        valid:   result.valid,
        reason:  result.reason  ?? null,
        product: result.product ?? null,
      });
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // GET /markirovka/expired
  // Muddati o'tgan mahsulotlar ro'yxati
  // Roles: WAREHOUSE, MANAGER, ACCOUNTANT, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async getExpired(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const products = await MarkirovkaService.getExpiredProducts(tenantId);
      return successResponse(res, products);
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // GET /markirovka/report/daily
  // Kunlik markirovka hisoboti
  // Query: ?date=2024-01-15  (ixtiyoriy, default: bugun)
  // Roles: MANAGER, ACCOUNTANT, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async getDailyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId   = req.user!.tenantId!;
      const { date }   = dailyReportQuerySchema.parse(req.query);
      const report     = await MarkirovkaService.getDailyReport(tenantId, date);
      return successResponse(res, report);
    } catch (error) {
      next(error);
    }
  }

  // ──────────────────────────────────────────
  // GET /markirovka/trace/:serial
  // Serial raqam bo'yicha mahsulot tarixini ko'rish
  // Roles: MANAGER, WAREHOUSE, ACCOUNTANT, SUPER_ADMIN
  // ──────────────────────────────────────────

  static async traceBySerial(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId     = req.user!.tenantId!;
      const serialNumber = req.params.serial?.trim();

      if (!serialNumber) {
        return errorResponse(res, 'Serial raqam kiritilishi shart', 400);
      }

      const trace = await MarkirovkaService.traceBySerial(serialNumber, tenantId);
      return successResponse(res, trace);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // QO'SHIMCHA ENDPOINTLAR (ro'yxat, filter, boshqaruv)
  // ==========================================

  // GET /markirovka/products  — paginated mahsulotlar
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getProductsQuerySchema.parse(req.query);

      const where: Record<string, unknown> = { tenantId };
      if (query.status)      where.status      = query.status;
      if (query.gtin)        where.gtin        = query.gtin;
      if (query.batchNumber) where.batchNumber = query.batchNumber;
      if (query.productId)   where.productId   = query.productId;
      if (query.search) {
        where.OR = [
          { markCode:     { contains: query.search, mode: 'insensitive' } },
          { serialNumber: { contains: query.search, mode: 'insensitive' } },
          { gtin:         { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const skip  = (query.page - 1) * query.limit;
      const [total, products] = await Promise.all([
        prisma.markirovkaProduct.count({ where }),
        prisma.markirovkaProduct.findMany({
          where,
          include: { product: { select: { id: true, name: true, sku: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
      ]);

      return paginatedResponse(res, products, query.page, query.limit, total);
    } catch (error) {
      next(error);
    }
  }

  // GET /markirovka/products/:markCode  — bitta mahsulot
  static async getProductByMarkCode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const product  = await prisma.markirovkaProduct.findFirst({
        where:   { markCode: req.params.markCode, tenantId },
        include: { product: { select: { id: true, name: true, sku: true, barcode: true, image: true } } },
      });

      if (!product) throw new AppError('Markirovka kodi topilmadi', 404, ErrorCode.NOT_FOUND);
      return successResponse(res, product);
    } catch (error) {
      next(error);
    }
  }

  // GET /markirovka/batches  — paginated partiyalar
  static async getBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getBatchesQuerySchema.parse(req.query);

      const where: Record<string, unknown> = { tenantId };
      if (query.productId)   where.productId   = query.productId;
      if (query.supplierId)  where.supplierId  = query.supplierId;
      if (query.batchNumber) where.batchNumber = { contains: query.batchNumber, mode: 'insensitive' };

      const skip  = (query.page - 1) * query.limit;
      const [total, batches] = await Promise.all([
        prisma.markirovkaBatch.count({ where }),
        prisma.markirovkaBatch.findMany({
          where,
          include: {
            product:  { select: { id: true, name: true, sku: true } },
            supplier: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { receivedAt: 'desc' },
          skip,
          take: query.limit,
        }),
      ]);

      return paginatedResponse(res, batches, query.page, query.limit, total);
    } catch (error) {
      next(error);
    }
  }

  // GET /markirovka/logs  — audit log
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getLogsQuerySchema.parse(req.query);

      const where: Record<string, unknown> = { tenantId };
      if (query.action)   where.action   = query.action;
      if (query.status)   where.status   = query.status;
      if (query.markCode) where.markCode = { contains: query.markCode, mode: 'insensitive' };

      const skip  = (query.page - 1) * query.limit;
      const [total, logs] = await Promise.all([
        prisma.markirovkaLog.count({ where }),
        prisma.markirovkaLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: query.limit,
        }),
      ]);

      return paginatedResponse(res, logs, query.page, query.limit, total);
    } catch (error) {
      next(error);
    }
  }

  // GET /markirovka/stats  — umumiy statistika
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const stats    = await MarkirovkaService.getStats(tenantId);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  // POST /markirovka/queue/process  — offline queue ni qo'lda ishlatish
  static async processQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MarkirovkaService.processOfflineQueue();
      return successResponse(
        res,
        result,
        `Queue ishlandi: ${result.processed} muvaffaqiyatli, ${result.failed} xato`,
      );
    } catch (error) {
      next(error);
    }
  }
}
