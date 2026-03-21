import { prisma } from '@oshxona/database';

// ==========================================
// ADVANCED ANALYTICS DASHBOARD SERVICE
// ==========================================

// --- Types ---

interface RevenueMetrics {
  today: { revenue: number; orders: number; growth: number };
  thisWeek: { revenue: number; orders: number; growth: number };
  thisMonth: { revenue: number; orders: number; growth: number };
  avgOrderValue: number;
  avgOrderValueGrowth: number;
}

interface ProfitableDish {
  productId: string;
  name: string;
  category: string;
  image?: string | null;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: number;
  unitsSold: number;
  avgPrice: number;
  rank: number;
}

interface TableTurnover {
  tableId: string;
  tableNumber: number;
  tableName: string;
  totalOrders: number;
  avgOccupancyMinutes: number;
  turnoversPerDay: number;
  revenuePerHour: number;
  totalRevenue: number;
  efficiency: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface StaffProductivity {
  userId: string;
  name: string;
  role: string;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgProcessingMinutes: number;
  completionRate: number;
  cancelRate: number;
  workingDays: number;
  ordersPerDay: number;
  revenuePerDay: number;
  performanceScore: number;
}

interface SalesChartPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

interface CategorySales {
  categoryId: string;
  categoryName: string;
  revenue: number;
  quantity: number;
  percentOfRevenue: number;
  percentOfQuantity: number;
  avgPrice: number;
  topProduct: string;
}

interface PeakHourData {
  hour: number;
  label: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  intensity: number; // 0-100
}

interface DashboardInsight {
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'CRITICAL';
  icon: string;
  title: string;
  message: string;
  metric?: string;
  value?: number;
}

interface AdvancedDashboard {
  revenue: RevenueMetrics;
  profitableDishes: ProfitableDish[];
  leastProfitableDishes: ProfitableDish[];
  tableTurnover: TableTurnover[];
  staffProductivity: StaffProductivity[];
  charts: {
    dailySales: SalesChartPoint[];
    weeklySales: SalesChartPoint[];
    monthlySales: SalesChartPoint[];
    categorySales: CategorySales[];
    peakHours: PeakHourData[];
  };
  insights: DashboardInsight[];
}

export class AdvancedDashboardService {

  // ==========================================
  // FULL DASHBOARD
  // ==========================================

  async getDashboard(tenantId: string): Promise<AdvancedDashboard> {
    const [
      revenue,
      profitableDishes,
      tableTurnover,
      staffProductivity,
      dailySales,
      weeklySales,
      monthlySales,
      categorySales,
      peakHours,
    ] = await Promise.all([
      this.getRevenueMetrics(tenantId),
      this.getProfitableDishes(tenantId, 30),
      this.getTableTurnover(tenantId, 14),
      this.getStaffProductivity(tenantId, 30),
      this.getDailySalesChart(tenantId, 30),
      this.getWeeklySalesChart(tenantId, 12),
      this.getMonthlySalesChart(tenantId, 12),
      this.getCategorySales(tenantId, 30),
      this.getPeakHours(tenantId, 14),
    ]);

    const leastProfitable = [...profitableDishes]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 5);

    const insights = this.generateInsights(
      revenue, profitableDishes, tableTurnover, staffProductivity, peakHours, categorySales
    );

    return {
      revenue,
      profitableDishes: profitableDishes.slice(0, 10),
      leastProfitableDishes: leastProfitable,
      tableTurnover,
      staffProductivity,
      charts: {
        dailySales,
        weeklySales,
        monthlySales,
        categorySales,
        peakHours,
      },
      insights,
    };
  }

  // ==========================================
  // 1. REVENUE METRICS
  // ==========================================

  async getRevenueMetrics(tenantId: string): Promise<RevenueMetrics> {
    const now = new Date();

    // Today
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // This week (Mon-Sun)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const completedFilter = { tenantId, status: { in: ['COMPLETED' as const, 'READY' as const] } };

    const [todayOrders, yesterdayOrders, weekOrders, lastWeekOrders, monthOrders, lastMonthOrders] = await Promise.all([
      prisma.order.findMany({ where: { ...completedFilter, createdAt: { gte: todayStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { ...completedFilter, createdAt: { gte: yesterdayStart, lt: todayStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { ...completedFilter, createdAt: { gte: weekStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { ...completedFilter, createdAt: { gte: lastWeekStart, lt: weekStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { ...completedFilter, createdAt: { gte: monthStart } }, select: { total: true } }),
      prisma.order.findMany({ where: { ...completedFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, select: { total: true } }),
    ]);

    const sum = (orders: { total: any }[]) => orders.reduce((s, o) => s + Number(o.total), 0);
    const avg = (orders: { total: any }[]) => orders.length > 0 ? sum(orders) / orders.length : 0;
    const growth = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

    const todayRev = sum(todayOrders);
    const yesterdayRev = sum(yesterdayOrders);
    const weekRev = sum(weekOrders);
    const lastWeekRev = sum(lastWeekOrders);
    const monthRev = sum(monthOrders);
    const lastMonthRev = sum(lastMonthOrders);

    const currentAOV = avg([...todayOrders, ...weekOrders]);
    const previousAOV = avg([...yesterdayOrders, ...lastWeekOrders]);

    return {
      today: { revenue: Math.round(todayRev), orders: todayOrders.length, growth: growth(todayRev, yesterdayRev) },
      thisWeek: { revenue: Math.round(weekRev), orders: weekOrders.length, growth: growth(weekRev, lastWeekRev) },
      thisMonth: { revenue: Math.round(monthRev), orders: monthOrders.length, growth: growth(monthRev, lastMonthRev) },
      avgOrderValue: Math.round(currentAOV),
      avgOrderValueGrowth: growth(currentAOV, previousAOV),
    };
  }

  // ==========================================
  // 2. MOST PROFITABLE DISHES
  // ==========================================

  async getProfitableDishes(tenantId: string, days: number): Promise<ProfitableDish[]> {
    const since = new Date(); since.setDate(since.getDate() - days);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        status: { not: 'CANCELLED' },
      },
      select: {
        productId: true,
        quantity: true,
        price: true,
        total: true,
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            costPrice: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const productMap = new Map<string, {
      name: string; category: string; image: string | null;
      revenue: number; cost: number; units: number; prices: number[];
    }>();

    for (const item of orderItems) {
      const pid = item.productId;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          name: item.product.name,
          category: item.product.category?.name || 'Boshqa',
          image: item.product.image,
          revenue: 0, cost: 0, units: 0, prices: [],
        });
      }
      const entry = productMap.get(pid)!;
      entry.revenue += Number(item.total);
      entry.cost += Number(item.product.costPrice || 0) * item.quantity;
      entry.units += item.quantity;
      entry.prices.push(Number(item.price));
    }

    const dishes: ProfitableDish[] = [];
    for (const [productId, data] of productMap) {
      const profit = data.revenue - data.cost;
      const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
      const avgPrice = data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0;

      dishes.push({
        productId,
        name: data.name,
        category: data.category,
        image: data.image,
        totalRevenue: Math.round(data.revenue),
        totalCost: Math.round(data.cost),
        profit: Math.round(profit),
        margin: Math.round(margin * 10) / 10,
        unitsSold: data.units,
        avgPrice: Math.round(avgPrice),
        rank: 0,
      });
    }

    dishes.sort((a, b) => b.profit - a.profit);
    dishes.forEach((d, i) => d.rank = i + 1);
    return dishes;
  }

  // ==========================================
  // 3. TABLE TURNOVER RATE
  // ==========================================

  async getTableTurnover(tenantId: string, days: number): Promise<TableTurnover[]> {
    const since = new Date(); since.setDate(since.getDate() - days);

    const tables = await prisma.table.findMany({
      where: { tenantId },
      select: { id: true, number: true, name: true },
    });

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        type: 'DINE_IN',
        tableId: { not: null },
        createdAt: { gte: since },
        status: { not: 'CANCELLED' },
      },
      select: {
        tableId: true,
        total: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tableMap = new Map<string, {
      orders: number; revenue: number; occupancyMinutes: number[];
    }>();

    for (const table of tables) {
      tableMap.set(table.id, { orders: 0, revenue: 0, occupancyMinutes: [] });
    }

    for (const order of orders) {
      if (!order.tableId) continue;
      const entry = tableMap.get(order.tableId);
      if (!entry) continue;

      entry.orders++;
      entry.revenue += Number(order.total);

      const occupancy = (order.updatedAt.getTime() - order.createdAt.getTime()) / 60000;
      if (occupancy > 0 && occupancy < 300) {
        entry.occupancyMinutes.push(occupancy);
      }
    }

    const result: TableTurnover[] = [];
    for (const table of tables) {
      const data = tableMap.get(table.id)!;

      const avgOccupancy = data.occupancyMinutes.length > 0
        ? data.occupancyMinutes.reduce((a, b) => a + b, 0) / data.occupancyMinutes.length
        : 0;

      const turnoversPerDay = data.orders / Math.max(days, 1);
      const totalHours = data.occupancyMinutes.reduce((a, b) => a + b, 0) / 60;
      const revenuePerHour = totalHours > 0 ? data.revenue / totalHours : 0;

      let efficiency: TableTurnover['efficiency'];
      if (turnoversPerDay >= 4) efficiency = 'HIGH';
      else if (turnoversPerDay >= 2) efficiency = 'MEDIUM';
      else efficiency = 'LOW';

      result.push({
        tableId: table.id,
        tableNumber: table.number,
        tableName: table.name || `Stol ${table.number}`,
        totalOrders: data.orders,
        avgOccupancyMinutes: Math.round(avgOccupancy),
        turnoversPerDay: Math.round(turnoversPerDay * 10) / 10,
        revenuePerHour: Math.round(revenuePerHour),
        totalRevenue: Math.round(data.revenue),
        efficiency,
      });
    }

    return result.sort((a, b) => b.turnoversPerDay - a.turnoversPerDay);
  }

  // ==========================================
  // 4. STAFF PRODUCTIVITY
  // ==========================================

  async getStaffProductivity(tenantId: string, days: number): Promise<StaffProductivity[]> {
    const since = new Date(); since.setDate(since.getDate() - days);

    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: {
        userId: true,
        total: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const userMap = new Map<string, {
      total: number; revenue: number; completed: number; cancelled: number;
      processingTimes: number[]; activeDates: Set<string>;
    }>();

    for (const user of users) {
      userMap.set(user.id, { total: 0, revenue: 0, completed: 0, cancelled: 0, processingTimes: [], activeDates: new Set() });
    }

    for (const order of orders) {
      const entry = userMap.get(order.userId);
      if (!entry) continue;

      entry.total++;
      entry.activeDates.add(order.createdAt.toISOString().split('T')[0]);

      if (order.status === 'CANCELLED') {
        entry.cancelled++;
      } else {
        entry.revenue += Number(order.total);
        if (order.status === 'COMPLETED' || order.status === 'READY') {
          entry.completed++;
          const procTime = (order.updatedAt.getTime() - order.createdAt.getTime()) / 60000;
          if (procTime > 0 && procTime < 300) entry.processingTimes.push(procTime);
        }
      }
    }

    const result: StaffProductivity[] = [];
    for (const user of users) {
      const data = userMap.get(user.id)!;
      if (data.total === 0) continue;

      const workingDays = data.activeDates.size;
      const avgProcessing = data.processingTimes.length > 0
        ? data.processingTimes.reduce((a, b) => a + b, 0) / data.processingTimes.length
        : 0;

      const completionRate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
      const cancelRate = data.total > 0 ? (data.cancelled / data.total) * 100 : 0;
      const ordersPerDay = workingDays > 0 ? data.total / workingDays : 0;
      const revenuePerDay = workingDays > 0 ? data.revenue / workingDays : 0;

      // Performance score: completionRate(40%) + speed(30%) + revenue(30%)
      const speedScore = avgProcessing > 0 ? Math.max(0, Math.min(100, 100 - ((avgProcessing - 10) / 40) * 100)) : 50;
      const revenueScore = Math.min(100, (revenuePerDay / 3000000) * 100); // 3M/day = 100
      const performanceScore = Math.round(completionRate * 0.4 + speedScore * 0.3 + revenueScore * 0.3);

      result.push({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        totalOrders: data.total,
        totalRevenue: Math.round(data.revenue),
        avgOrderValue: data.completed > 0 ? Math.round(data.revenue / data.completed) : 0,
        avgProcessingMinutes: Math.round(avgProcessing * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        cancelRate: Math.round(cancelRate * 10) / 10,
        workingDays,
        ordersPerDay: Math.round(ordersPerDay * 10) / 10,
        revenuePerDay: Math.round(revenuePerDay),
        performanceScore,
      });
    }

    return result.sort((a, b) => b.performanceScore - a.performanceScore);
  }

  // ==========================================
  // 5. DAILY SALES CHART (last N days)
  // ==========================================

  async getDailySalesChart(tenantId: string, days: number): Promise<SalesChartPoint[]> {
    const since = new Date(); since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    });

    const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
    const dayMap = new Map<string, { revenue: number; orders: number }>();

    for (let d = 0; d < days; d++) {
      const date = new Date(); date.setDate(date.getDate() - (days - 1 - d));
      const key = date.toISOString().split('T')[0];
      dayMap.set(key, { revenue: 0, orders: 0 });
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      const entry = dayMap.get(key);
      if (entry) {
        entry.revenue += Number(order.total);
        entry.orders++;
      }
    }

    const result: SalesChartPoint[] = [];
    for (const [dateStr, data] of dayMap) {
      const date = new Date(dateStr);
      const dayName = dayNames[date.getDay()];
      const label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${dayName}`;

      result.push({
        date: dateStr,
        label,
        revenue: Math.round(data.revenue),
        orders: data.orders,
        avgOrderValue: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
      });
    }

    return result;
  }

  // ==========================================
  // 6. WEEKLY SALES CHART (last N weeks)
  // ==========================================

  async getWeeklySalesChart(tenantId: string, weeks: number): Promise<SalesChartPoint[]> {
    const since = new Date(); since.setDate(since.getDate() - weeks * 7);

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    });

    const result: SalesChartPoint[] = [];

    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - (weeks - w) * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

      const weekOrders = orders.filter(o => o.createdAt >= weekStart && o.createdAt < weekEnd);
      const revenue = weekOrders.reduce((s, o) => s + Number(o.total), 0);

      result.push({
        date: weekStart.toISOString().split('T')[0],
        label: `${String(weekStart.getDate()).padStart(2, '0')}/${String(weekStart.getMonth() + 1).padStart(2, '0')} - ${String(weekEnd.getDate()).padStart(2, '0')}/${String(weekEnd.getMonth() + 1).padStart(2, '0')}`,
        revenue: Math.round(revenue),
        orders: weekOrders.length,
        avgOrderValue: weekOrders.length > 0 ? Math.round(revenue / weekOrders.length) : 0,
      });
    }

    return result;
  }

  // ==========================================
  // 7. MONTHLY SALES CHART (last N months)
  // ==========================================

  async getMonthlySalesChart(tenantId: string, months: number): Promise<SalesChartPoint[]> {
    const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const result: SalesChartPoint[] = [];

    for (let m = months - 1; m >= 0; m--) {
      const date = new Date();
      date.setMonth(date.getMonth() - m);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const orders = await prisma.order.findMany({
        where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd }, status: { not: 'CANCELLED' } },
        select: { total: true },
      });

      const revenue = orders.reduce((s, o) => s + Number(o.total), 0);

      result.push({
        date: monthStart.toISOString().split('T')[0],
        label: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
        revenue: Math.round(revenue),
        orders: orders.length,
        avgOrderValue: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
      });
    }

    return result;
  }

  // ==========================================
  // 8. CATEGORY SALES BREAKDOWN
  // ==========================================

  async getCategorySales(tenantId: string, days: number): Promise<CategorySales[]> {
    const since = new Date(); since.setDate(since.getDate() - days);

    const items = await prisma.orderItem.findMany({
      where: {
        order: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        status: { not: 'CANCELLED' },
      },
      select: {
        quantity: true,
        total: true,
        price: true,
        product: {
          select: {
            name: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const catMap = new Map<string, {
      name: string; revenue: number; quantity: number;
      prices: number[]; products: Map<string, number>;
    }>();

    for (const item of items) {
      const catId = item.product.categoryId || 'uncategorized';
      const catName = item.product.category?.name || 'Boshqa';

      if (!catMap.has(catId)) {
        catMap.set(catId, { name: catName, revenue: 0, quantity: 0, prices: [], products: new Map() });
      }
      const entry = catMap.get(catId)!;
      entry.revenue += Number(item.total);
      entry.quantity += item.quantity;
      entry.prices.push(Number(item.price));

      const pName = item.product.name;
      entry.products.set(pName, (entry.products.get(pName) || 0) + item.quantity);
    }

    const totalRevenue = Array.from(catMap.values()).reduce((s, c) => s + c.revenue, 0);
    const totalQuantity = Array.from(catMap.values()).reduce((s, c) => s + c.quantity, 0);

    const result: CategorySales[] = [];
    for (const [categoryId, data] of catMap) {
      // Eng ko'p sotilgan mahsulot
      let topProduct = '';
      let topCount = 0;
      for (const [name, count] of data.products) {
        if (count > topCount) { topProduct = name; topCount = count; }
      }

      result.push({
        categoryId,
        categoryName: data.name,
        revenue: Math.round(data.revenue),
        quantity: data.quantity,
        percentOfRevenue: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
        percentOfQuantity: totalQuantity > 0 ? Math.round((data.quantity / totalQuantity) * 10000) / 100 : 0,
        avgPrice: data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : 0,
        topProduct,
      });
    }

    return result.sort((a, b) => b.revenue - a.revenue);
  }

  // ==========================================
  // 9. PEAK HOURS
  // ==========================================

  async getPeakHours(tenantId: string, days: number): Promise<PeakHourData[]> {
    const since = new Date(); since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true },
    });

    const hourMap = new Map<number, { orders: number; revenue: number }>();
    for (let h = 0; h < 24; h++) hourMap.set(h, { orders: 0, revenue: 0 });

    for (const order of orders) {
      const h = order.createdAt.getHours();
      const entry = hourMap.get(h)!;
      entry.orders++;
      entry.revenue += Number(order.total);
    }

    const maxOrders = Math.max(...Array.from(hourMap.values()).map(v => v.orders), 1);

    const result: PeakHourData[] = [];
    for (const [hour, data] of hourMap) {
      result.push({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        orders: data.orders,
        revenue: Math.round(data.revenue),
        avgOrderValue: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
        intensity: Math.round((data.orders / maxOrders) * 100),
      });
    }

    return result;
  }

  // ==========================================
  // AI INSIGHTS
  // ==========================================

  private generateInsights(
    revenue: RevenueMetrics,
    dishes: ProfitableDish[],
    tables: TableTurnover[],
    staff: StaffProductivity[],
    peakHours: PeakHourData[],
    categories: CategorySales[],
  ): DashboardInsight[] {
    const insights: DashboardInsight[] = [];

    // --- Revenue trends ---
    if (revenue.today.growth > 20) {
      insights.push({ type: 'SUCCESS', icon: '📈', title: 'Bugun daromad yuqori', message: `Bugungi daromad kechagiga nisbatan ${revenue.today.growth}% oshgan (${revenue.today.revenue.toLocaleString()} so'm).` });
    } else if (revenue.today.growth < -20) {
      insights.push({ type: 'WARNING', icon: '📉', title: 'Bugungi daromad past', message: `Bugungi daromad kechagiga nisbatan ${Math.abs(revenue.today.growth)}% kamaygan. Marketing harakatlarini kuchaytiring.` });
    }

    if (revenue.thisWeek.growth > 15) {
      insights.push({ type: 'SUCCESS', icon: '🎯', title: 'Haftalik o\'sish', message: `Bu hafta o'tgan haftaga nisbatan ${revenue.thisWeek.growth}% ko'proq daromad (${revenue.thisWeek.revenue.toLocaleString()} so'm).` });
    }

    // --- AOV ---
    if (revenue.avgOrderValueGrowth > 10) {
      insights.push({ type: 'SUCCESS', icon: '💰', title: "O'rtacha chek oshgan", message: `O'rtacha chek ${revenue.avgOrderValue.toLocaleString()} so'm ga yetdi (+${revenue.avgOrderValueGrowth}%). Upsell strategiyasi ishlayapti.` });
    } else if (revenue.avgOrderValueGrowth < -10) {
      insights.push({ type: 'WARNING', icon: '💸', title: "O'rtacha chek tushgan", message: `O'rtacha chek ${Math.abs(revenue.avgOrderValueGrowth)}% kamaygan. Combo taklif yoki qo'shimcha mahsulot tavsiyalarini kuchaytiring.` });
    }

    // --- Low margin dishes ---
    const lowMargin = dishes.filter(d => d.margin < 30 && d.unitsSold > 10);
    if (lowMargin.length > 0) {
      insights.push({
        type: 'WARNING', icon: '⚠️',
        title: `${lowMargin.length} ta taom margini past`,
        message: `${lowMargin.slice(0, 3).map(d => `${d.name} (${d.margin}%)`).join(', ')} — narxni ko'tarish yoki ingredient xarajatini kamaytirish kerak.`,
      });
    }

    // --- Top profitable dish ---
    if (dishes.length > 0) {
      const top = dishes[0];
      insights.push({
        type: 'INFO', icon: '⭐',
        title: `Eng foydali taom: ${top.name}`,
        message: `${top.name} — ${top.profit.toLocaleString()} so'm sof foyda, ${top.margin}% margin, ${top.unitsSold} dona sotilgan.`,
      });
    }

    // --- Table efficiency ---
    const lowTables = tables.filter(t => t.efficiency === 'LOW' && t.totalOrders > 0);
    if (lowTables.length > 0) {
      insights.push({
        type: 'INFO', icon: '🪑',
        title: `${lowTables.length} ta stol samaradorligi past`,
        message: `${lowTables.slice(0, 3).map(t => t.tableName).join(', ')} kuniga o'rtacha ${lowTables[0].turnoversPerDay} marta aylanadi. Joylashuvni optimallashtirishni ko'rib chiqing.`,
      });
    }

    // --- Top staff ---
    if (staff.length > 0) {
      const topStaff = staff[0];
      insights.push({
        type: 'SUCCESS', icon: '🏆',
        title: `Eng samarali xodim: ${topStaff.name}`,
        message: `${topStaff.name} — kuniga ${topStaff.ordersPerDay} buyurtma, ${topStaff.revenuePerDay.toLocaleString()} so'm daromad, ${topStaff.performanceScore} ball.`,
      });
    }

    // --- Peak hours ---
    const peakHs = peakHours.filter(h => h.intensity >= 80);
    if (peakHs.length > 0) {
      const peakLabels = peakHs.map(h => h.label).join(', ');
      insights.push({
        type: 'INFO', icon: '🕐',
        title: 'Eng band soatlar',
        message: `${peakLabels} — eng ko'p buyurtma soatlari. Bu vaqtlarda to'liq tayyor bo'ling.`,
      });
    }

    // --- Category dominance ---
    if (categories.length > 0 && categories[0].percentOfRevenue > 50) {
      insights.push({
        type: 'INFO', icon: '🍽️',
        title: `${categories[0].categoryName} — asosiy kategoriya`,
        message: `${categories[0].categoryName} daromadning ${categories[0].percentOfRevenue}% ni beradi. Boshqa kategoriyalarni ham rivojlantiring.`,
      });
    }

    return insights.sort((a, b) => {
      const p: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUCCESS: 2, INFO: 3 };
      return (p[a.type] ?? 3) - (p[b.type] ?? 3);
    });
  }
}

export const advancedDashboardService = new AdvancedDashboardService();
