import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import { SyncService } from './sync.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

// ==========================================
// ZOD SCHEMAS
// ==========================================

const SyncOrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
});

const SyncOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string().min(1),
  source: z.enum(['POS_ORDER', 'WAITER_ORDER', 'QR_ORDER', 'WEBHOOK_ORDER']),
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  status: z.enum(['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED']),
  tableId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  items: z.array(SyncOrderItemSchema).min(1, 'Kamida bitta item kerak'),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  tax: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  deviceId: z.string().min(1),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

const BulkSyncSchema = z.object({
  orders: z.array(SyncOrderSchema).min(1).max(100, 'Bir vaqtda max 100 ta buyurtma'),
});

const OrderStatusSyncSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED']),
  version: z.number().int().nonnegative(),
});

const ItemStatusSyncSchema = z.object({
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
});

const TableStatusSyncSchema = z.object({
  tableId: z.string().uuid(),
  status: z.enum(['FREE', 'OCCUPIED', 'RESERVED', 'CLEANING']),
});

// ==========================================
// CONTROLLER
// ==========================================

export class SyncController {

  // POST /sync/orders — Bulk buyurtma sync
  static async syncOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return errorResponse(res, 'Tenant ID topilmadi', 400);

      const parsed = BulkSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, parsed.error.errors[0]?.message || 'Noto\'g\'ri ma\'lumot', 400);
      }

      const io = req.app.get('io') as Server | undefined;
      const result = await SyncService.bulkSync(tenantId, parsed.data.orders, io);

      return successResponse(res, result, `${result.synced}/${result.total} buyurtma sync qilindi`);
    } catch (error) {
      next(error);
    }
  }

  // POST /sync/order-status
  static async syncOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return errorResponse(res, 'Tenant ID topilmadi', 400);

      const parsed = OrderStatusSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, parsed.error.errors[0]?.message || 'Noto\'g\'ri ma\'lumot', 400);
      }

      const io = req.app.get('io') as Server | undefined;
      const { orderId, status, version } = parsed.data;
      const result = await SyncService.syncOrderStatus(tenantId, orderId, status, version, io);

      const statusCode = result.action === 'conflict' ? 409 : result.success ? 200 : 400;
      return res.status(statusCode).json({ success: result.success, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /sync/item-status
  static async syncItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return errorResponse(res, 'Tenant ID topilmadi', 400);

      const parsed = ItemStatusSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, parsed.error.errors[0]?.message || 'Noto\'g\'ri ma\'lumot', 400);
      }

      const io = req.app.get('io') as Server | undefined;
      const { orderId, itemId, status } = parsed.data;
      const result = await SyncService.syncItemStatus(tenantId, orderId, itemId, status, io);

      return res.status(result.success ? 200 : 400).json({ success: result.success, data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /sync/table-status
  static async syncTableStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return errorResponse(res, 'Tenant ID topilmadi', 400);

      const parsed = TableStatusSyncSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, parsed.error.errors[0]?.message || 'Noto\'g\'ri ma\'lumot', 400);
      }

      const io = req.app.get('io') as Server | undefined;
      const { tableId, status } = parsed.data;
      const result = await SyncService.syncTableStatus(tenantId, tableId, status, io);

      return res.status(result.success ? 200 : 400).json({ success: result.success, data: result });
    } catch (error) {
      next(error);
    }
  }

  // GET /sync/pull?since=ISO_DATE&deviceId=xxx
  static async pullData(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return errorResponse(res, 'Tenant ID topilmadi', 400);

      const since = req.query.since as string | undefined;
      const deviceId = req.query.deviceId as string | undefined;

      if (since) {
        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          return errorResponse(res, 'since parametri noto\'g\'ri format (ISO 8601 kerak)', 400);
        }
      }

      const data = await SyncService.pullData(tenantId, since, deviceId);
      return successResponse(res, data, 'Ma\'lumotlar muvaffaqiyatli yuklandi');
    } catch (error) {
      next(error);
    }
  }

  // GET /sync/health
  static async healthCheck(_req: Request, res: Response, next: NextFunction) {
    try {
      const health = await SyncService.healthCheck();
      return res.status(health.status === 'ok' ? 200 : 503).json(health);
    } catch (error) {
      next(error);
    }
  }
}
