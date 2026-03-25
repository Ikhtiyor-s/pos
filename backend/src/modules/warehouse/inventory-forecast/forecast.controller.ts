import { Request, Response } from 'express';
import { inventoryForecastService } from './forecast.service.js';
import { forecastAlertsService } from './forecast-alerts.service.js';

export class InventoryForecastController {

  // GET /warehouse/forecast/dashboard
  async getDashboard(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const dashboard = await inventoryForecastService.getForecastDashboard(tenantId);
      res.json({ success: true, data: dashboard });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /warehouse/forecast/consumption?days=30
  async getConsumption(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const days = parseInt(req.query.days as string) || 30;
      const data = await inventoryForecastService.analyzeConsumption(tenantId, days);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /warehouse/forecast/stockouts
  async getStockoutPredictions(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const predictions = await inventoryForecastService.predictStockouts(tenantId);
      res.json({ success: true, data: predictions });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /warehouse/forecast/purchase-recommendations?days=7
  async getPurchaseRecommendations(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const coverageDays = parseInt(req.query.days as string) || 7;
      const recommendations = await inventoryForecastService.getPurchaseRecommendations(tenantId, coverageDays);
      res.json({ success: true, data: recommendations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /warehouse/forecast/top-ingredients?days=30
  async getTopIngredients(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const days = parseInt(req.query.days as string) || 30;
      const data = await inventoryForecastService.getIngredientUsageRanking(tenantId, days);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /warehouse/forecast/alerts/check — manual trigger
  async checkAlerts(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const result = await forecastAlertsService.checkAndCreateAlerts(tenantId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /warehouse/forecast/alerts
  async getActiveAlerts(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const alerts = await forecastAlertsService.getActiveAlerts(tenantId);
      res.json({ success: true, data: alerts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PATCH /warehouse/forecast/alerts/:id/resolve
  async resolveAlert(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const alert = await forecastAlertsService.resolveAlert(req.params.id, tenantId);
      res.json({ success: true, data: alert });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /warehouse/forecast/alerts/stats
  async getAlertStats(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const stats = await forecastAlertsService.getAlertStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export const inventoryForecastController = new InventoryForecastController();
