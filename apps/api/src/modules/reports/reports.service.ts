import fs from 'fs';
import path from 'path';
import { prisma, ReportType, ReportFormat } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';
import { ReportDataService, type DateRange } from './report-data.service.js';
import {
  exportSalesExcel, exportFinancialExcel, exportProductRatingExcel,
  exportStaffExcel, exportWarehouseExcel, exportTaxExcel,
} from './excel-exporter.js';
import {
  exportSalesPdf, exportFinancialPdf, exportProductRatingPdf,
  exportStaffPdf, exportWarehousePdf, exportTaxPdf,
} from './pdf-exporter.js';
import {
  exportSalesCsv, exportFinancialCsv, exportProductRatingCsv,
  exportStaffCsv, exportWarehouseCsv, exportTaxCsv,
} from './csv-exporter.js';

// ==========================================
// REPORTS SERVICE
// Orchestrates data + export + DB persistence
// ==========================================

const UPLOAD_DIR = path.resolve('uploads/reports');
const EXPIRY_DAYS = 30;

function ensureDir(tenantId: string) {
  const dir = path.join(UPLOAD_DIR, tenantId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function expiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + EXPIRY_DAYS);
  return d;
}

const EXT: Record<string, string> = {
  EXCEL: 'xlsx', PDF: 'pdf', CSV: 'csv',
};

const MIME: Record<string, string> = {
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF: 'application/pdf',
  CSV: 'text/csv; charset=utf-8',
};

export type ReportTypeKey = 'sales' | 'financial' | 'products' | 'staff' | 'warehouse' | 'tax';
export type FormatKey = 'excel' | 'pdf' | 'csv';

function resolveType(key: ReportTypeKey, periodType?: string): ReportType {
  if (key === 'sales') {
    if (periodType === 'weekly') return 'SALES_WEEKLY';
    if (periodType === 'monthly') return 'SALES_MONTHLY';
    return 'SALES_DAILY';
  }
  const map: Record<string, ReportType> = {
    financial: 'FINANCIAL',
    products: 'PRODUCT_RATING',
    staff: 'STAFF',
    warehouse: 'WAREHOUSE',
    tax: 'TAX',
  };
  return map[key] || 'SALES_DAILY';
}

function resolveFormat(f: FormatKey): ReportFormat {
  const map: Record<FormatKey, ReportFormat> = {
    excel: 'EXCEL', pdf: 'PDF', csv: 'CSV',
  };
  return map[f] || 'EXCEL';
}

// ==========================================
// GENERATE REPORT
// ==========================================

export async function generateReport(
  tenantId: string,
  userId: string,
  reportKey: ReportTypeKey,
  formatKey: FormatKey,
  params: { from?: string; to?: string; type?: string; year?: number; month?: number },
): Promise<{ reportId: string; fileName: string; mimeType: string; filePath: string }> {

  const format = resolveFormat(formatKey);
  const type = resolveType(reportKey, params.type);

  // Build date range
  const now = new Date();
  let from = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  let to = params.to ? new Date(params.to) : new Date();

  if (!params.from && params.type === 'daily') {
    from = new Date(); from.setHours(0, 0, 0, 0);
    to = new Date(); to.setHours(23, 59, 59, 999);
  } else if (!params.from && params.type === 'weekly') {
    const day = now.getDay() || 7;
    from = new Date(now); from.setDate(from.getDate() - day + 1); from.setHours(0, 0, 0, 0);
    to = new Date(now); to.setHours(23, 59, 59, 999);
  } else if (!params.from && params.type === 'monthly') {
    const year = params.year || now.getFullYear();
    const month = (params.month || now.getMonth() + 1) - 1;
    from = new Date(year, month, 1);
    to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  }

  to.setHours(23, 59, 59, 999);
  const range: DateRange = { from, to };

  // Create DB record (PENDING)
  const record = await prisma.generatedReport.create({
    data: {
      tenantId, userId,
      type, format,
      params: params as any,
      status: 'GENERATING',
      expiresAt: expiresAt(),
    },
  });

  try {
    // Generate data
    let buffer: Buffer;
    let nameBase = '';

    const dateStr = `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;

    switch (reportKey) {
      case 'sales': {
        const data = await ReportDataService.getSalesData(tenantId, range);
        nameBase = `sotuv_${dateStr}`;
        buffer = format === 'EXCEL' ? await exportSalesExcel(data)
               : format === 'PDF'   ? await exportSalesPdf(data)
               : exportSalesCsv(data);
        break;
      }
      case 'financial': {
        const data = await ReportDataService.getFinancialData(tenantId, range);
        nameBase = `moliya_${dateStr}`;
        buffer = format === 'EXCEL' ? await exportFinancialExcel(data)
               : format === 'PDF'   ? await exportFinancialPdf(data)
               : exportFinancialCsv(data);
        break;
      }
      case 'products': {
        const data = await ReportDataService.getProductRatingData(tenantId, range);
        nameBase = `mahsulotlar_${dateStr}`;
        buffer = format === 'EXCEL' ? await exportProductRatingExcel(data)
               : format === 'PDF'   ? await exportProductRatingPdf(data)
               : exportProductRatingCsv(data);
        break;
      }
      case 'staff': {
        const data = await ReportDataService.getStaffData(tenantId, range);
        nameBase = `xodimlar_${dateStr}`;
        buffer = format === 'EXCEL' ? await exportStaffExcel(data)
               : format === 'PDF'   ? await exportStaffPdf(data)
               : exportStaffCsv(data);
        break;
      }
      case 'warehouse': {
        const data = await ReportDataService.getWarehouseData(tenantId);
        nameBase = `ombor_${new Date().toISOString().slice(0, 10)}`;
        buffer = format === 'EXCEL' ? await exportWarehouseExcel(data)
               : format === 'PDF'   ? await exportWarehousePdf(data)
               : exportWarehouseCsv(data);
        break;
      }
      case 'tax': {
        const data = await ReportDataService.getTaxData(tenantId, range);
        nameBase = `soliq_${dateStr}`;
        buffer = format === 'EXCEL' ? await exportTaxExcel(data)
               : format === 'PDF'   ? await exportTaxPdf(data)
               : exportTaxCsv(data);
        break;
      }
      default:
        throw new AppError('Noma\'lum hisobot turi', 400);
    }

    const ext = EXT[format];
    const fileName = `${nameBase}.${ext}`;
    const dir = ensureDir(tenantId);
    const filePath = path.join(dir, `${record.id}.${ext}`);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/reports/${tenantId}/${record.id}.${ext}`;

    await prisma.generatedReport.update({
      where: { id: record.id },
      data: { status: 'DONE', fileUrl, fileName },
    });

    return { reportId: record.id, fileName, mimeType: MIME[format], filePath };

  } catch (err: any) {
    await prisma.generatedReport.update({
      where: { id: record.id },
      data: { status: 'ERROR', error: err?.message || 'Unknown error' },
    });
    throw err;
  }
}

// ==========================================
// GET REPORT FILE
// ==========================================

export async function getReportFile(
  reportId: string,
  tenantId: string,
): Promise<{ fileName: string; mimeType: string; filePath: string }> {
  const record = await prisma.generatedReport.findUnique({ where: { id: reportId } });

  if (!record || record.tenantId !== tenantId) {
    throw new AppError('Hisobot topilmadi', 404);
  }
  if (record.status !== 'DONE' || !record.fileUrl) {
    throw new AppError('Hisobot hali tayyor emas', 400);
  }

  const ext = EXT[record.format];
  const filePath = path.join(UPLOAD_DIR, tenantId, `${record.id}.${ext}`);

  if (!fs.existsSync(filePath)) {
    throw new AppError('Hisobot fayli topilmadi (muddati o\'tgan bo\'lishi mumkin)', 404);
  }

  return {
    fileName: record.fileName || `report.${ext}`,
    mimeType: MIME[record.format],
    filePath,
  };
}

// ==========================================
// LIST REPORTS
// ==========================================

export async function listReports(tenantId: string, options: {
  type?: ReportType; page?: number; limit?: number;
} = {}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const where: any = { tenantId };
  if (options.type) where.type = options.type;

  const [reports, total] = await Promise.all([
    prisma.generatedReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, type: true, format: true, status: true,
        fileName: true, fileUrl: true, params: true,
        expiresAt: true, createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.generatedReport.count({ where }),
  ]);

  return { reports, total, page, limit };
}

// ==========================================
// DELETE REPORT
// ==========================================

export async function deleteReport(reportId: string, tenantId: string): Promise<void> {
  const record = await prisma.generatedReport.findUnique({ where: { id: reportId } });
  if (!record || record.tenantId !== tenantId) throw new AppError('Hisobot topilmadi', 404);

  if (record.fileUrl) {
    const ext = EXT[record.format];
    const filePath = path.join(UPLOAD_DIR, tenantId, `${record.id}.${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.generatedReport.delete({ where: { id: reportId } });
}

// ==========================================
// CLEANUP EXPIRED REPORTS
// ==========================================

export async function cleanupExpiredReports(): Promise<number> {
  const expired = await prisma.generatedReport.findMany({
    where: { expiresAt: { lte: new Date() } },
    select: { id: true, tenantId: true, format: true },
  });

  let deleted = 0;
  for (const r of expired) {
    try {
      const ext = EXT[r.format];
      const filePath = path.join(UPLOAD_DIR, r.tenantId, `${r.id}.${ext}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await prisma.generatedReport.delete({ where: { id: r.id } });
      deleted++;
    } catch (e) {
      console.error(`[Reports] Cleanup error for ${r.id}:`, e);
    }
  }

  if (deleted > 0) console.log(`[Reports] Cleaned up ${deleted} expired reports`);
  return deleted;
}
