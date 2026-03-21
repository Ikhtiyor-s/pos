import { Request, Response } from 'express';
import { branchAnalyticsService } from './branch-analytics.service.js';

export class BranchAnalyticsController {

  // GET /branches/analytics/dashboard
  static async getDashboard(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      const data = await branchAnalyticsService.getBranchDashboard(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /branches/analytics/stats
  static async getAllStats(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      const data = await branchAnalyticsService.getAllBranchStats(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /branches/analytics/compare
  static async compare(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      const data = await branchAnalyticsService.compareBranches(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /branches/analytics/:branchId
  static async getBranchDetail(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      const data = await branchAnalyticsService.getBranchDetail(tenantId, req.params.branchId);
      if (!data) return res.status(404).json({ success: false, message: 'Fillial topilmadi' });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
