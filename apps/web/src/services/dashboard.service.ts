import api from '@/lib/api';
import type { DashboardData, DashboardPeriod, DailySalesData } from '@/types/dashboard';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const dashboardService = {
  async getDashboard(period: DashboardPeriod = 'today', branchId?: string): Promise<DashboardData> {
    const params: Record<string, string> = { period };
    if (branchId) params.branchId = branchId;
    const res = await api.get<ApiResponse<DashboardData>>('/dashboard', { params });
    return res.data.data;
  },

  async getDailySales(period: DashboardPeriod = 'week'): Promise<DailySalesData[]> {
    const res = await api.get<ApiResponse<DailySalesData[]>>('/dashboard/daily-sales', {
      params: { period },
    });
    return res.data.data;
  },
};
