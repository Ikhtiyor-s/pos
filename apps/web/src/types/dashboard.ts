export type DashboardPeriod = 'today' | 'week' | 'month' | 'year';

export interface DashboardData {
  revenue: {
    total: number;
    averageCheck: number;
  };
  orders: {
    total: number;
    completed: number;
  };
  customers: number;
  employees: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    type: string;
    total: number;
    table?: { id: string; number: number; name?: string } | null;
    user?: { id: string; firstName: string; lastName: string } | null;
    branch: string;
    createdAt: string;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    image?: string | null;
    quantity: number;
    revenue: number;
    orderCount: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  branchRevenues: Array<{
    tenantId: string;
    name: string;
    revenue: number;
    orderCount: number;
  }>;
}

export interface DailySalesData {
  date: string;
  revenue: number;
  orderCount: number;
}
