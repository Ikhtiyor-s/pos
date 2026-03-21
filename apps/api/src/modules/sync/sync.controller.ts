import { Request, Response } from 'express';
import { SyncService } from './sync.service.js';

export class SyncController {

  // POST /sync/orders — Bitta yoki ko'p buyurtmani sync qilish
  static async syncOrders(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const { orders } = req.body;
      if (!orders || !Array.isArray(orders)) {
        return res.status(400).json({ success: false, message: 'orders array kerak' });
      }

      const result = await SyncService.bulkSync(tenantId, orders);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /sync/order-status — Order status sync
  static async syncOrderStatus(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const { orderId, status, version } = req.body;
      const result = await SyncService.syncOrderStatus(tenantId, orderId, status, version);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /sync/item-status — Item status sync
  static async syncItemStatus(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const { orderId, itemId, status } = req.body;
      const result = await SyncService.syncItemStatus(tenantId, orderId, itemId, status);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /sync/table-status — Table status sync
  static async syncTableStatus(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const { tableId, status } = req.body;
      const result = await SyncService.syncTableStatus(tenantId, tableId, status);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /sync/pull?since=ISO_DATE — So'nggi ma'lumotlarni olish
  static async pullData(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const since = req.query.since as string;
      const data = await SyncService.pullData(tenantId, since);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /sync/health — Server health check
  static async healthCheck(_req: Request, res: Response) {
    const health = await SyncService.healthCheck();
    res.json(health);
  }
}
