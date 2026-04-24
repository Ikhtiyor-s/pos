import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
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
}
