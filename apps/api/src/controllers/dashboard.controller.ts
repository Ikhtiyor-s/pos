import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { dashboardQuerySchema } from '../validators/branch.validator.js';
import { successResponse } from '../utils/response.js';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = dashboardQuerySchema.parse(req.query);
      const data = await DashboardService.getDashboard(tenantId, {
        period: query.period,
        branchId: query.branchId,
      });
      return successResponse(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getDailySales(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { period } = dashboardQuerySchema.parse(req.query);
      const data = await DashboardService.getDailySales(tenantId, period);
      return successResponse(res, data);
    } catch (error) {
      next(error);
    }
  }
}
