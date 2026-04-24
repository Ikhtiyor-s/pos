import api from './api';

// ==========================================
// REPORTS SERVICE (Frontend)
// ==========================================

export type ReportTypeKey = 'sales' | 'financial' | 'products' | 'staff' | 'warehouse' | 'tax';
export type FormatKey = 'excel' | 'pdf' | 'csv';

export interface DashboardStats {
  today: { revenue: number; orders: number; avgCheck: number };
  topProducts: { name: string; image: string | null; quantity: number; revenue: number }[];
  lowStockCount: number;
}

export interface ReportHistoryItem {
  id: string;
  type: string;
  format: string;
  status: string;
  fileName: string | null;
  fileUrl: string | null;
  params: any;
  expiresAt: string;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}

export interface SalesData {
  period: { type: string; from: string; to: string };
  summary: {
    totalOrders: number; completedOrders: number; cancelledOrders: number;
    totalRevenue: number; totalDiscount: number; totalTax: number; avgCheck: number;
  };
  bySource: { source: string; count: number; revenue: number }[];
  byDay: { date: string; count: number; revenue: number }[];
  topProducts: { name: string; category: string; quantity: number; revenue: number }[];
}

export const ReportsService = {
  getDashboardStats(): Promise<DashboardStats> {
    return api.get('/reports/dashboard').then(r => r.data.data);
  },

  getHistory(params?: { type?: string; page?: number; limit?: number }) {
    return api.get('/reports/export/history', { params }).then(r => r.data);
  },

  getSalesData(params: { from?: string; to?: string; type?: string }): Promise<SalesData> {
    return api.get('/reports/data/sales', { params }).then(r => r.data.data);
  },

  getJsonData(reportType: ReportTypeKey, params: { from?: string; to?: string; type?: string }) {
    return api.get(`/reports/data/${reportType}`, { params }).then(r => r.data.data);
  },

  async downloadReport(
    reportType: ReportTypeKey,
    format: FormatKey,
    params: { from?: string; to?: string; type?: string; year?: number; month?: number },
  ): Promise<void> {
    const res = await api.get(`/reports/${reportType}`, {
      params: { format, ...params },
      responseType: 'blob',
    });

    const reportId = res.headers['x-report-id'];
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const fileName = match ? decodeURIComponent(match[1]) : `report.${format === 'excel' ? 'xlsx' : format}`;

    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    return reportId;
  },

  async reDownload(reportId: string, fileName: string): Promise<void> {
    const res = await api.get(`/reports/export/${reportId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },

  deleteReport(reportId: string) {
    return api.delete(`/reports/export/${reportId}`).then(r => r.data);
  },
};
