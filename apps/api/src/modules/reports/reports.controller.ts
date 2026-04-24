import { Request, Response, NextFunction } from 'express';
import {
  generateReport,
  getReportFile,
  listReports,
  deleteReport,
  type ReportTypeKey,
  type FormatKey,
} from './reports.service.js';
import { ReportDataService } from './report-data.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { AppError } from '../../middleware/errorHandler.js';

// ==========================================
// REPORTS CONTROLLER
// ==========================================

const VALID_TYPES: ReportTypeKey[] = ['sales', 'financial', 'products', 'staff', 'warehouse', 'tax'];
const VALID_FORMATS: FormatKey[] = ['excel', 'pdf', 'csv'];

export class ReportsController {

  // GET /reports/dashboard
  static async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const stats = await ReportDataService.getDashboardStats(tenantId);
      return successResponse(res, stats);
    } catch (e) { next(e); }
  }

  // GET /reports/sales?type=daily&from=...&to=...&format=excel
  // GET /reports/financial?from=...&to=...&format=pdf
  // GET /reports/products?from=...&to=...&format=csv
  // GET /reports/staff?from=...&to=...&format=excel
  // GET /reports/warehouse?format=excel
  // GET /reports/tax?from=...&to=...&format=excel
  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const reportKey = req.params.reportType as ReportTypeKey;
      const formatKey = ((req.query.format as string) || 'excel').toLowerCase() as FormatKey;

      if (!VALID_TYPES.includes(reportKey)) {
        throw new AppError(`Noma'lum hisobot turi: ${reportKey}`, 400);
      }
      if (!VALID_FORMATS.includes(formatKey)) {
        throw new AppError(`Noma'lum format: ${formatKey}. excel, pdf, csv`, 400);
      }

      const params = {
        from: req.query.from as string,
        to: req.query.to as string,
        type: (req.query.type as string) || 'monthly',
        year: req.query.year ? parseInt(req.query.year as string) : undefined,
        month: req.query.month ? parseInt(req.query.month as string) : undefined,
      };

      const { reportId, fileName, mimeType, filePath } = await generateReport(
        tenantId, userId, reportKey, formatKey, params,
      );

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-Report-Id', reportId);
      res.sendFile(filePath, { root: '/' });
    } catch (e) { next(e); }
  }

  // GET /reports/export/:reportId/download
  static async download(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { fileName, mimeType, filePath } = await getReportFile(req.params.reportId, tenantId);

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', mimeType);
      res.sendFile(filePath, { root: '/' });
    } catch (e) { next(e); }
  }

  // GET /reports/history
  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page, limit, type } = req.query;

      const result = await listReports(tenantId, {
        type: type as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return paginatedResponse(res, result.reports, result.page, result.limit, result.total);
    } catch (e) { next(e); }
  }

  // DELETE /reports/export/:reportId
  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await deleteReport(req.params.reportId, tenantId);
      return successResponse(res, null, 'Hisobot o\'chirildi');
    } catch (e) { next(e); }
  }

  // GET /reports/data/:reportType — JSON ma'lumot (eksportsiz)
  static async getData(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reportKey = req.params.reportType as ReportTypeKey;
      const now = new Date();

      const from = req.query.from
        ? new Date(req.query.from as string)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const to = req.query.to
        ? new Date(req.query.to as string)
        : new Date();
      to.setHours(23, 59, 59, 999);
      const range = { from, to };

      let data: any;
      switch (reportKey) {
        case 'sales':     data = await ReportDataService.getSalesData(tenantId, range); break;
        case 'financial': data = await ReportDataService.getFinancialData(tenantId, range); break;
        case 'products':  data = await ReportDataService.getProductRatingData(tenantId, range); break;
        case 'staff':     data = await ReportDataService.getStaffData(tenantId, range); break;
        case 'warehouse': data = await ReportDataService.getWarehouseData(tenantId); break;
        case 'tax':       data = await ReportDataService.getTaxData(tenantId, range); break;
        default: throw new AppError('Noma\'lum hisobot turi', 400);
      }

      return successResponse(res, data);
    } catch (e) { next(e); }
  }
}
