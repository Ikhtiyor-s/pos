import { Request, Response, NextFunction } from 'express';
import { WarehouseService } from './warehouse.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  createPurchaseOrderSchema,
  getPurchaseOrdersQuerySchema,
  updatePurchaseOrderStatusSchema,
  receivePurchaseOrderSchema,
  getStockAlertsQuerySchema,
  createWasteLogSchema,
  getWasteLogsQuerySchema,
  getWasteReportQuerySchema,
} from './warehouse.validator.js';

export class WarehouseController {
  // ==========================================
  // PURCHASE ORDERS
  // ==========================================

  static async getPurchaseOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getPurchaseOrdersQuerySchema.parse(req.query);

      const result = await WarehouseService.getPurchaseOrders(tenantId, query);

      return paginatedResponse(res, result.orders, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const order = await WarehouseService.getPurchaseOrderById(req.params.id, tenantId);
      return successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  static async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const data = createPurchaseOrderSchema.parse(req.body);

      const order = await WarehouseService.createPurchaseOrder({
        ...data,
        userId,
        tenantId,
      });

      return successResponse(res, order, 'Xarid buyurtmasi yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updatePurchaseOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updatePurchaseOrderStatusSchema.parse(req.body);

      const order = await WarehouseService.updatePurchaseOrderStatus(
        req.params.id,
        status,
        tenantId
      );

      return successResponse(res, order, 'Buyurtma statusi yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async receivePurchaseOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { receivedItems } = receivePurchaseOrderSchema.parse(req.body);

      const order = await WarehouseService.receivePurchaseOrder(
        req.params.id,
        receivedItems,
        tenantId
      );

      return successResponse(res, order, 'Mahsulotlar qabul qilindi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // STOCK ALERTS
  // ==========================================

  static async getStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getStockAlertsQuerySchema.parse(req.query);

      const result = await WarehouseService.getStockAlerts(tenantId, {
        ...query,
        severity: query.severity as any,
      });

      return paginatedResponse(res, result.alerts, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async checkStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await WarehouseService.checkAndCreateStockAlerts(tenantId);
      return successResponse(res, result, `${result.createdAlerts} ta yangi alert yaratildi`);
    } catch (error) {
      next(error);
    }
  }

  static async resolveStockAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const alert = await WarehouseService.resolveStockAlert(req.params.id, tenantId);
      return successResponse(res, alert, 'Alert hal qilindi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // WASTE LOGS
  // ==========================================

  static async getWasteLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getWasteLogsQuerySchema.parse(req.query);

      const result = await WarehouseService.getWasteLogs(tenantId, query);

      return paginatedResponse(res, result.logs, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async createWasteLog(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const data = createWasteLogSchema.parse(req.body);

      const log = await WarehouseService.createWasteLog({
        ...data,
        userId,
        tenantId,
      });

      return successResponse(res, log, 'Yo\'qotish qayd etildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getWasteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { dateFrom, dateTo } = getWasteReportQuerySchema.parse(req.query);

      const report = await WarehouseService.getWasteReport(tenantId, dateFrom, dateTo);

      return successResponse(res, report);
    } catch (error) {
      next(error);
    }
  }
}
