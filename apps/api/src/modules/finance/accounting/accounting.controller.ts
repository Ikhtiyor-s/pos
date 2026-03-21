import { Request, Response } from 'express';
import { accountingService } from './accounting.service.js';

export class AccountingController {

  // GET /finance/accounting/dashboard
  static async getDashboard(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });
      const data = await accountingService.getFinancialDashboard(tenantId);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /finance/accounting/sales-by-source?dateFrom=&dateTo=
  static async getSalesBySource(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();

      const data = await accountingService.getSalesBySource(tenantId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /finance/accounting/refunds?dateFrom=&dateTo=
  static async getRefunds(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();

      const data = await accountingService.getRefundSummary(tenantId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /finance/accounting/ingredient-cost?dateFrom=&dateTo=
  static async getIngredientCost(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : new Date();

      const data = await accountingService.getIngredientCostReport(tenantId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /finance/accounting/pnl?dateFrom=&dateTo=
  static async getProfitAndLoss(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const dateFrom = req.query.dateFrom as string || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const dateTo = req.query.dateTo as string || new Date().toISOString();

      const data = await accountingService.getSourceSeparatedPnL(tenantId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
