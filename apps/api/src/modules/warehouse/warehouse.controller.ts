import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { prisma } from '@oshxona/database';
import { WarehouseService } from './warehouse.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  createPurchaseOrderSchema, getPurchaseOrdersQuerySchema,
  updatePurchaseOrderStatusSchema, receivePurchaseOrderSchema,
  getStockAlertsQuerySchema, createWasteLogSchema, getWasteLogsQuerySchema,
  getWasteReportQuerySchema, createSupplierSchema, updateSupplierSchema,
  getSuppliersQuerySchema, monthlyTurnoverQuerySchema,
} from './warehouse.validator.js';

export class WarehouseController {

  // ==========================================
  // SUPPLIERS
  // ==========================================

  static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getSuppliersQuerySchema.parse(req.query);
      const result   = await WarehouseService.getSuppliers(tenantId, query);
      return paginatedResponse(res, result.suppliers, result.page, result.limit, result.total);
    } catch (e) { next(e); }
  }

  static async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const supplier = await WarehouseService.getSupplierById(req.params.id, tenantId);
      return successResponse(res, supplier);
    } catch (e) { next(e); }
  }

  static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data     = createSupplierSchema.parse(req.body);
      const supplier = await WarehouseService.createSupplier(tenantId, data);
      return successResponse(res, supplier, 'Yetkazib beruvchi yaratildi', 201);
    } catch (e) { next(e); }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data     = updateSupplierSchema.parse(req.body);
      const supplier = await WarehouseService.updateSupplier(req.params.id, tenantId, data);
      return successResponse(res, supplier, 'Yetkazib beruvchi yangilandi');
    } catch (e) { next(e); }
  }

  static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await WarehouseService.deleteSupplier(req.params.id, tenantId);
      return successResponse(res, null, 'Yetkazib beruvchi o\'chirildi');
    } catch (e) { next(e); }
  }

  // ==========================================
  // PURCHASE ORDERS
  // ==========================================

  static async getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getPurchaseOrdersQuerySchema.parse(req.query);
      const result   = await WarehouseService.getPurchaseOrders(tenantId, query);
      return paginatedResponse(res, result.orders, result.page, result.limit, result.total);
    } catch (e) { next(e); }
  }

  static async getPurchaseOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const order    = await WarehouseService.getPurchaseOrderById(req.params.id, tenantId);
      return successResponse(res, order);
    } catch (e) { next(e); }
  }

  static async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId   = req.user!.id;
      const data     = createPurchaseOrderSchema.parse(req.body);
      const order    = await WarehouseService.createPurchaseOrder({ ...data, userId, tenantId });
      return successResponse(res, order, 'Xarid buyurtmasi yaratildi', 201);
    } catch (e) { next(e); }
  }

  static async updatePurchaseOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updatePurchaseOrderStatusSchema.parse(req.body);
      const order      = await WarehouseService.updatePurchaseOrderStatus(req.params.id, status, tenantId);
      return successResponse(res, order, 'Buyurtma statusi yangilandi');
    } catch (e) { next(e); }
  }

  static async receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId     = req.user!.tenantId!;
      const { receivedItems } = receivePurchaseOrderSchema.parse(req.body);
      const io           = req.app.get('io') as Server | undefined;
      const order        = await WarehouseService.receivePurchaseOrder(req.params.id, receivedItems, tenantId, io);
      return successResponse(res, order, 'Mahsulotlar qabul qilindi');
    } catch (e) { next(e); }
  }

  // ==========================================
  // STOCK ALERTS
  // ==========================================

  static async getStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getStockAlertsQuerySchema.parse(req.query);
      const result   = await WarehouseService.getStockAlerts(tenantId, { ...query, severity: query.severity as any });
      return paginatedResponse(res, result.alerts, result.page, result.limit, result.total);
    } catch (e) { next(e); }
  }

  static async checkStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const io       = req.app.get('io') as Server | undefined;
      const result   = await WarehouseService.checkAndNotifyAlerts(tenantId, io);
      return successResponse(res, result, `${result.createdAlerts} ta yangi alert yaratildi`);
    } catch (e) { next(e); }
  }

  static async resolveStockAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const alert    = await WarehouseService.resolveStockAlert(req.params.id, tenantId);
      return successResponse(res, alert, 'Alert hal qilindi');
    } catch (e) { next(e); }
  }

  // ==========================================
  // WASTE LOGS
  // ==========================================

  static async getWasteLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query    = getWasteLogsQuerySchema.parse(req.query);
      const result   = await WarehouseService.getWasteLogs(tenantId, query);
      return paginatedResponse(res, result.logs, result.page, result.limit, result.total);
    } catch (e) { next(e); }
  }

  static async createWasteLog(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId   = req.user!.id;
      const data     = createWasteLogSchema.parse(req.body);
      const io       = req.app.get('io') as Server | undefined;
      const log      = await WarehouseService.createWasteLog({ ...data, userId, tenantId }, io);
      return successResponse(res, log, 'Yo\'qotish qayd etildi', 201);
    } catch (e) { next(e); }
  }

  static async getWasteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId          = req.user!.tenantId!;
      const { dateFrom, dateTo } = getWasteReportQuerySchema.parse(req.query);
      const report            = await WarehouseService.getWasteReport(tenantId, dateFrom, dateTo);
      return successResponse(res, report);
    } catch (e) { next(e); }
  }

  // ==========================================
  // OYLIK HISOBOT
  // ==========================================

  static async getMonthlyTurnover(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId     = req.user!.tenantId!;
      const { year, month } = monthlyTurnoverQuerySchema.parse(req.query);
      const report       = await WarehouseService.getMonthlyTurnover(tenantId, year, month);
      return successResponse(res, report, `${year}-${String(month).padStart(2, '0')} ombor aylanmasi`);
    } catch (e) { next(e); }
  }

  // ==========================================
  // BARCODE SCAN — qabul qilish
  // ==========================================

  // GET /warehouse/scan/:barcode — mahsulotni barcod bo'yicha qidirish
  static async scanLookup(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { barcode } = req.params;

      const product = await prisma.product.findFirst({
        where: { barcode, tenantId },
        include: { category: { select: { id: true, name: true } } },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Barcode topilmadi: ${barcode}`,
          barcode,
        });
      }

      // Ombordan joriy miqdorni ham olish
      const invItem = await prisma.inventoryItem.findFirst({
        where: { sku: product.barcode || product.id, tenantId },
        select: { id: true, quantity: true, unit: true, costPrice: true },
      });

      return successResponse(res, {
        product: {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
          image: product.image,
          category: product.category,
          stockQuantity: product.stockQuantity,
        },
        inventory: invItem ?? null,
      });
    } catch (e) { next(e); }
  }

  // POST /warehouse/scan-receive — barcode scan → ombor kirim
  static async scanReceive(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId   = req.user!.id;
      const {
        barcode,
        quantity,
        note,
        costPrice,
        supplierId,
      } = req.body as {
        barcode:     string;
        quantity:    number;
        note?:       string;
        costPrice?:  number;
        supplierId?: string;
      };

      if (!barcode?.trim()) {
        return res.status(400).json({ success: false, message: 'Barcode kiritilishi shart' });
      }
      if (!quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Miqdor 0 dan katta bo\'lishi kerak' });
      }

      // 1. Mahsulotni barcode bo'yicha topish
      const product = await prisma.product.findFirst({
        where: { barcode: barcode.trim(), tenantId },
        include: { category: { select: { id: true, name: true } } },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Barcode topilmadi: ${barcode}. Avval mahsulotga barcode biriktiring.`,
          barcode,
        });
      }

      // 2. Product.stockQuantity yangilash
      await prisma.product.update({
        where: { id: product.id },
        data:  { stockQuantity: (product.stockQuantity ?? 0) + quantity },
      });

      // 3. InventoryItem topish yoki yaratish
      const sku = product.barcode || product.id;
      let invItem = await prisma.inventoryItem.findFirst({ where: { sku, tenantId } });

      if (invItem) {
        invItem = await prisma.inventoryItem.update({
          where: { id: invItem.id },
          data:  {
            quantity:  { increment: quantity },
            ...(costPrice != null ? { costPrice } : {}),
            ...(supplierId ? { supplierId } : {}),
          },
        });
      } else {
        invItem = await prisma.inventoryItem.create({
          data: {
            name:       product.name,
            sku,
            unit:       'dona',
            quantity,
            costPrice:  costPrice ?? product.price,
            supplierId: supplierId ?? null,
            tenantId,
          },
        });
      }

      // 4. Tranzaksiya yozish
      await prisma.inventoryTransaction.create({
        data: {
          itemId:   invItem.id,
          type:     'IN',
          quantity,
          notes:    note || `Barcode scan: ${barcode}`,
          userId,
        },
      });

      return successResponse(res, {
        product: {
          id:            product.id,
          name:          product.name,
          barcode:       product.barcode,
          category:      product.category,
          image:         product.image,
          stockQuantity: (product.stockQuantity ?? 0) + quantity,
        },
        received:       quantity,
        inventoryTotal: Number(invItem.quantity),
      }, `${product.name} — ${quantity} ta qabul qilindi`);
    } catch (e) { next(e); }
  }
}
