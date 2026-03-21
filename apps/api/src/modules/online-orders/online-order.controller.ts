import { Request, Response, NextFunction } from 'express';
import { OnlineOrderService } from './online-order.service.js';
import { transformNonborOrder } from './adapters/nonbor-order.adapter.js';
import { transformTelegramOrder } from './adapters/telegram-order.adapter.js';
import { transformExternalApiOrder } from './adapters/external-api.adapter.js';
import {
  receiveOnlineOrderSchema,
  rejectOnlineOrderSchema,
  mapToLocalOrderSchema,
  listOnlineOrdersQuerySchema,
  onlineOrderStatsQuerySchema,
} from './online-order.validator.js';

export class OnlineOrderController {
  /**
   * GET / — Online buyurtmalar ro'yxati
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = listOnlineOrdersQuerySchema.parse(req.query);

      const result = await OnlineOrderService.getOnlineOrders(tenantId, query);

      return res.json({
        success: true,
        data: result.orders,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /stats — Statistika
   */
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { dateFrom, dateTo } = onlineOrderStatsQuerySchema.parse(req.query);

      const stats = await OnlineOrderService.getOnlineOrderStats(tenantId, dateFrom, dateTo);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id — Bitta online buyurtma
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const order = await OnlineOrderService.getOnlineOrderById(req.params.id, tenantId);

      return res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST / — Yangi online buyurtma qabul qilish (webhook / external API)
   */
  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      // tenantId header yoki body dan olinishi mumkin
      const tenantId = req.user?.tenantId || req.body.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'tenantId kiritilishi shart',
        });
      }

      let orderData: any;
      const source = req.body.source;

      // Manbaga qarab adapterdan foydalanish
      switch (source) {
        case 'NONBOR': {
          const transformed = transformNonborOrder(req.body.rawPayload || req.body);
          orderData = { ...transformed, source: 'NONBOR' as const, tenantId };
          break;
        }
        case 'TELEGRAM': {
          const transformed = transformTelegramOrder(req.body.rawPayload || req.body);
          orderData = { ...transformed, source: 'TELEGRAM' as const, tenantId };
          break;
        }
        case 'EXTERNAL_API': {
          const transformed = transformExternalApiOrder(req.body.rawPayload || req.body);
          orderData = { ...transformed, source: 'EXTERNAL_API' as const, tenantId };
          break;
        }
        case 'WEBSITE':
        default: {
          // Umumiy format — to'g'ridan-to'g'ri validatsiya
          const validated = receiveOnlineOrderSchema.parse(req.body);
          orderData = { ...validated, tenantId };
          break;
        }
      }

      const order = await OnlineOrderService.receiveOnlineOrder(orderData);

      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/accept — Online buyurtmani qabul qilish
   */
  static async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const order = await OnlineOrderService.acceptOnlineOrder(req.params.id, tenantId);

      return res.json({
        success: true,
        data: order,
        message: 'Online buyurtma qabul qilindi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/reject — Online buyurtmani rad etish
   */
  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { reason } = rejectOnlineOrderSchema.parse(req.body);

      const order = await OnlineOrderService.rejectOnlineOrder(req.params.id, reason, tenantId);

      return res.json({
        success: true,
        data: order,
        message: 'Online buyurtma rad etildi',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /sync/nonbor — Nonbor buyurtmalarni sinxronlashtirish
   */
  static async syncNonbor(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await OnlineOrderService.syncNonborOrders(tenantId);

      return res.json({
        success: true,
        data: result,
        message: `Nonbor sinxronizatsiya: ${result.created} ta yangi, ${result.skipped} ta mavjud`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /:id/map — Mahalliy buyurtmaga bog'lash
   */
  static async mapToLocal(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { localOrderId } = mapToLocalOrderSchema.parse(req.body);

      const order = await OnlineOrderService.mapToLocalOrder(req.params.id, localOrderId, tenantId);

      return res.json({
        success: true,
        data: order,
        message: 'Online buyurtma mahalliy buyurtmaga bog\'landi',
      });
    } catch (error) {
      next(error);
    }
  }
}
