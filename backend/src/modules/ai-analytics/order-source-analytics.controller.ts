import { Request, Response } from 'express';
import { orderSourceAnalyticsService } from './order-source-analytics.service.js';

export class OrderSourceAnalyticsController {

  // GET /analytics/sources/dashboard
  static async getDashboard(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const data = await orderSourceAnalyticsService.getSourceDashboard(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/sources/stats?days=30
  static async getStats(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const days = parseInt(req.query.days as string) || 30;
      const data = await orderSourceAnalyticsService.getSourceStats(tenantId, days);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/sources/trends?days=14
  static async getTrends(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const days = parseInt(req.query.days as string) || 14;
      const data = await orderSourceAnalyticsService.getDailyTrends(tenantId, days);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/sources/comparison
  static async getComparison(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const data = await orderSourceAnalyticsService.getWeeklyComparison(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/sources/hourly
  static async getHourly(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const days = parseInt(req.query.days as string) || 14;
      const data = await orderSourceAnalyticsService.getHourlyBySource(tenantId, days);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
