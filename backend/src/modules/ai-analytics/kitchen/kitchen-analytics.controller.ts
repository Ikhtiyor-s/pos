import { Request, Response } from 'express';
import { kitchenAnalyticsService } from './kitchen-analytics.service.js';

export class KitchenAnalyticsController {

  // GET /analytics/kitchen/dashboard
  async getDashboard(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      }

      const dashboard = await kitchenAnalyticsService.getKitchenDashboard(tenantId);
      res.json({ success: true, data: dashboard });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/kitchen/cooking-times
  async getCookingTimes(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      }

      const days = parseInt(req.query.days as string) || 30;
      const stats = await kitchenAnalyticsService.getCookingTimeStats(tenantId, days);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/kitchen/hourly-load
  async getHourlyLoad(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      }

      const days = parseInt(req.query.days as string) || 14;
      const load = await kitchenAnalyticsService.getHourlyLoad(tenantId, days);
      res.json({ success: true, data: load });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/kitchen/queue-delays
  async getQueueDelays(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      }

      const days = parseInt(req.query.days as string) || 14;
      const delays = await kitchenAnalyticsService.getQueueDelays(tenantId, days);
      res.json({ success: true, data: delays });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/kitchen/performance
  async getPerformanceScore(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      }

      const score = await kitchenAnalyticsService.calculatePerformanceScore(tenantId);
      res.json({ success: true, data: score });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /analytics/kitchen/insights
  async getInsights(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      }

      const insights = await kitchenAnalyticsService.generateInsights(tenantId);
      res.json({ success: true, data: insights });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const kitchenAnalyticsController = new KitchenAnalyticsController();
