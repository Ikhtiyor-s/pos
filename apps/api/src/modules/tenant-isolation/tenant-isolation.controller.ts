import { Request, Response } from 'express';
import { SuperAdminService } from './super-admin.service.js';
import { TenantAuditService } from './tenant-audit.service.js';
import { getTenantId } from './tenant-guard.middleware.js';

export class TenantIsolationController {

  // ==========================================
  // SUPER ADMIN — GLOBAL STATS
  // ==========================================

  // GET /admin/global-stats
  static async getGlobalStats(req: Request, res: Response) {
    try {
      const data = await SuperAdminService.getGlobalStats();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /admin/tenants
  static async getTenantOverviews(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const isActive = req.query.isActive !== undefined
        ? req.query.isActive === 'true'
        : undefined;

      const data = await SuperAdminService.getTenantOverviews({ page, limit, search, isActive });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /admin/performance-ranking
  static async getPerformanceRanking(req: Request, res: Response) {
    try {
      const data = await SuperAdminService.getTenantPerformanceRanking();
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ==========================================
  // SECURITY AUDIT
  // ==========================================

  // GET /admin/security
  static async getSecurityDashboard(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const data = await TenantAuditService.getSecurityDashboard(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /admin/audit-logs
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const tenantId = getTenantId(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const data = await TenantAuditService.getSecurityEvents(tenantId, {
        action: req.query.action as any,
        severity: req.query.severity as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        page,
        limit,
      });
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
