import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { ForecastingService } from './forecasting.service.js';
import { AnomalyDetectionService } from './anomaly-detection.js';
import { RecommendationService } from './recommendation.service.js';
import {
  getSnapshotsSchema,
  createSnapshotSchema,
  getForecastsSchema,
  generateForecastSchema,
  getAnomaliesSchema,
  detectAnomaliesSchema,
} from './analytics.validator.js';

// ==========================================
// ANALYTICS CONTROLLER
// ==========================================

export class AnalyticsController {
  // ---- DASHBOARD ----

  static async getDashboardAnalytics(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const data = await AnalyticsService.getDashboardAnalytics(tenantId);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Dashboard analytics xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Dashboard ma\'lumotlarini olishda xatolik',
        error: error.message,
      });
    }
  }

  // ---- SNAPSHOTS ----

  static async getSnapshots(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = getSnapshotsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = await AnalyticsService.getSnapshots(tenantId, parsed.data);

      return res.json({ success: true, ...data });
    } catch (error: any) {
      console.error('Snapshots xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Snapshotlarni olishda xatolik',
        error: error.message,
      });
    }
  }

  static async createDailySnapshot(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = createSnapshotSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const snapshot = await AnalyticsService.createDailySnapshot(tenantId, parsed.data.date!);

      return res.status(201).json({
        success: true,
        message: 'Kunlik snapshot yaratildi',
        data: snapshot,
      });
    } catch (error: any) {
      console.error('Snapshot yaratish xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Snapshot yaratishda xatolik',
        error: error.message,
      });
    }
  }

  // ---- FORECASTS ----

  static async getForecasts(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = getForecastsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = await ForecastingService.getForecasts(tenantId, parsed.data);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Forecasts xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Bashoratlarni olishda xatolik',
        error: error.message,
      });
    }
  }

  static async generateDemandForecast(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = generateForecastSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const forecast = await ForecastingService.generateDemandForecast(
        tenantId,
        parsed.data.targetDate
      );

      return res.status(201).json({
        success: true,
        message: 'Talab bashorati yaratildi',
        data: forecast,
      });
    } catch (error: any) {
      console.error('Demand forecast xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Talab bashoratini yaratishda xatolik',
        error: error.message,
      });
    }
  }

  static async generateRevenueForecast(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = generateForecastSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const forecast = await ForecastingService.generateRevenueForecast(
        tenantId,
        parsed.data.targetDate
      );

      return res.status(201).json({
        success: true,
        message: 'Daromad bashorati yaratildi',
        data: forecast,
      });
    } catch (error: any) {
      console.error('Revenue forecast xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Daromad bashoratini yaratishda xatolik',
        error: error.message,
      });
    }
  }

  static async generateInventoryForecast(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const forecast = await ForecastingService.generateInventoryForecast(tenantId);

      return res.status(201).json({
        success: true,
        message: 'Inventar bashorati yaratildi',
        data: forecast,
      });
    } catch (error: any) {
      console.error('Inventory forecast xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Inventar bashoratini yaratishda xatolik',
        error: error.message,
      });
    }
  }

  static async evaluateForecasts(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const data = await ForecastingService.evaluateForecasts(tenantId);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Forecast evaluation xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Bashorat baholashda xatolik',
        error: error.message,
      });
    }
  }

  // ---- ANOMALIES ----

  static async getAnomalies(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = getAnomaliesSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = await AnomalyDetectionService.getAnomalies(tenantId, parsed.data);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Anomalies xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Anomaliyalarni olishda xatolik',
        error: error.message,
      });
    }
  }

  static async detectAnomalies(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const parsed = detectAnomaliesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Noto\'g\'ri parametrlar',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const [salesAnomalies, inventoryAnomalies] = await Promise.all([
        AnomalyDetectionService.detectSalesAnomalies(tenantId, parsed.data.date!),
        AnomalyDetectionService.detectInventoryAnomalies(tenantId),
      ]);

      const allAnomalies = [...salesAnomalies, ...inventoryAnomalies];

      return res.json({
        success: true,
        message: `${allAnomalies.length} ta anomaliya aniqlandi`,
        data: {
          total: allAnomalies.length,
          sales: salesAnomalies,
          inventory: inventoryAnomalies,
        },
      });
    } catch (error: any) {
      console.error('Anomaly detection xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Anomaliya aniqlashda xatolik',
        error: error.message,
      });
    }
  }

  // ---- RECOMMENDATIONS ----

  static async getMenuRecommendations(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const data = await RecommendationService.getMenuRecommendations(tenantId);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Menu recommendations xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Menyu tavsiyalarini olishda xatolik',
        error: error.message,
      });
    }
  }

  static async getInventoryRecommendations(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const data = await RecommendationService.getInventoryRecommendations(tenantId);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Inventory recommendations xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Inventar tavsiyalarini olishda xatolik',
        error: error.message,
      });
    }
  }

  static async getPricingRecommendations(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        return res.status(400).json({ success: false, message: 'Tenant topilmadi' });
      }

      const data = await RecommendationService.getPricingRecommendations(tenantId);

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('Pricing recommendations xatosi:', error);
      return res.status(500).json({
        success: false,
        message: 'Narx tavsiyalarini olishda xatolik',
        error: error.message,
      });
    }
  }
}
