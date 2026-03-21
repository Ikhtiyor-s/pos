import { prisma } from '@oshxona/database';

// ==========================================
// BRANCH ANALYTICS SERVICE
// Filliallar bo'yicha statistika va taqqoslash
// ==========================================

interface BranchStats {
  branchId: string;
  branchName: string;
  address?: string | null;
  isActive: boolean;
  // Revenue
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  // Orders
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  avgOrderValue: number;
  // Staff
  totalStaff: number;
  activeStaff: number;
  // Resources
  totalTables: number;
  occupiedTables: number;
  totalProducts: number;
  // Performance
  completionRate: number;
  cancelRate: number;
  avgProcessingMinutes: number;
}

interface BranchComparison {
  metric: string;
  metricLabel: string;
  branches: Array<{
    branchId: string;
    branchName: string;
    value: number;
    rank: number;
  }>;
  best: { branchId: string; branchName: string; value: number };
  worst: { branchId: string; branchName: string; value: number };
}

interface BranchDashboard {
  totalBranches: number;
  activeBranches: number;
  stats: BranchStats[];
  comparisons: BranchComparison[];
  aggregated: {
    totalRevenue: number;
    totalOrders: number;
    totalStaff: number;
    avgOrderValue: number;
  };
  insights: BranchInsight[];
}

interface BranchInsight {
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'CRITICAL';
  icon: string;
  title: string;
  message: string;
}

export class BranchAnalyticsService {

  // ==========================================
  // ALL BRANCH STATS
  // ==========================================

  async getAllBranchStats(parentTenantId: string): Promise<BranchStats[]> {
    // Parent + barcha aktiv branchlar
    const branches = await prisma.tenant.findMany({
      where: {
        OR: [
          { id: parentTenantId },
          { parentId: parentTenantId, isActive: true },
        ],
      },
      select: { id: true, name: true, address: true, isActive: true },
    });

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: BranchStats[] = [];

    for (const branch of branches) {
      const tid = branch.id;
      const completed = { tenantId: tid, status: { in: ['COMPLETED' as const, 'READY' as const] } };

      const [
        todayOrders, weekOrders, monthOrders,
        allMonthOrders, cancelledOrders,
        staffCount, activeStaff,
        tableCount, occupiedCount, productCount,
      ] = await Promise.all([
        prisma.order.findMany({ where: { ...completed, createdAt: { gte: todayStart } }, select: { total: true } }),
        prisma.order.findMany({ where: { ...completed, createdAt: { gte: weekStart } }, select: { total: true } }),
        prisma.order.findMany({ where: { ...completed, createdAt: { gte: monthStart } }, select: { total: true } }),
        prisma.order.count({ where: { tenantId: tid, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } } }),
        prisma.order.count({ where: { tenantId: tid, createdAt: { gte: monthStart }, status: 'CANCELLED' } }),
        prisma.user.count({ where: { tenantId: tid } }),
        prisma.user.count({ where: { tenantId: tid, isActive: true } }),
        prisma.table.count({ where: { tenantId: tid } }),
        prisma.table.count({ where: { tenantId: tid, status: 'OCCUPIED' } }),
        prisma.product.count({ where: { tenantId: tid, isActive: true } }),
      ]);

      const sum = (arr: { total: any }[]) => arr.reduce((s, o) => s + Number(o.total), 0);

      const todayRev = sum(todayOrders);
      const weekRev = sum(weekOrders);
      const monthRev = sum(monthOrders);
      const monthOrderCount = monthOrders.length;

      const totalMonthWithCancelled = allMonthOrders + cancelledOrders;
      const completionRate = totalMonthWithCancelled > 0
        ? Math.round((allMonthOrders / totalMonthWithCancelled) * 10000) / 100
        : 100;
      const cancelRate = totalMonthWithCancelled > 0
        ? Math.round((cancelledOrders / totalMonthWithCancelled) * 10000) / 100
        : 0;

      // O'rtacha buyurtma bajarish vaqti
      const processingOrders = await prisma.order.findMany({
        where: { tenantId: tid, createdAt: { gte: weekStart }, status: { in: ['COMPLETED', 'READY'] } },
        select: { createdAt: true, updatedAt: true },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
      const procTimes = processingOrders
        .map(o => (o.updatedAt.getTime() - o.createdAt.getTime()) / 60000)
        .filter(t => t > 0 && t < 180);
      const avgProc = procTimes.length > 0 ? procTimes.reduce((a, b) => a + b, 0) / procTimes.length : 0;

      stats.push({
        branchId: tid,
        branchName: branch.name,
        address: branch.address,
        isActive: branch.isActive,
        todayRevenue: Math.round(todayRev),
        weekRevenue: Math.round(weekRev),
        monthRevenue: Math.round(monthRev),
        todayOrders: todayOrders.length,
        weekOrders: weekOrders.length,
        monthOrders: monthOrderCount,
        avgOrderValue: monthOrderCount > 0 ? Math.round(monthRev / monthOrderCount) : 0,
        totalStaff: staffCount,
        activeStaff,
        totalTables: tableCount,
        occupiedTables: occupiedCount,
        totalProducts: productCount,
        completionRate,
        cancelRate,
        avgProcessingMinutes: Math.round(avgProc * 10) / 10,
      });
    }

    return stats.sort((a, b) => b.monthRevenue - a.monthRevenue);
  }

  // ==========================================
  // BRANCH COMPARISON
  // ==========================================

  async compareBranches(parentTenantId: string): Promise<BranchComparison[]> {
    const stats = await this.getAllBranchStats(parentTenantId);
    if (stats.length < 2) return [];

    const metrics: Array<{ key: keyof BranchStats; label: string; higherIsBetter: boolean }> = [
      { key: 'monthRevenue', label: 'Oylik daromad', higherIsBetter: true },
      { key: 'monthOrders', label: 'Oylik buyurtmalar', higherIsBetter: true },
      { key: 'avgOrderValue', label: "O'rtacha chek", higherIsBetter: true },
      { key: 'todayRevenue', label: 'Bugungi daromad', higherIsBetter: true },
      { key: 'completionRate', label: 'Bajarish foizi', higherIsBetter: true },
      { key: 'cancelRate', label: 'Bekor qilish foizi', higherIsBetter: false },
      { key: 'avgProcessingMinutes', label: 'O\'rtacha vaqt (min)', higherIsBetter: false },
      { key: 'activeStaff', label: 'Faol xodimlar', higherIsBetter: true },
    ];

    const comparisons: BranchComparison[] = [];

    for (const metric of metrics) {
      const branches = stats
        .map(s => ({
          branchId: s.branchId,
          branchName: s.branchName,
          value: Number(s[metric.key]) || 0,
          rank: 0,
        }))
        .sort((a, b) => metric.higherIsBetter ? b.value - a.value : a.value - b.value);

      branches.forEach((b, i) => b.rank = i + 1);

      comparisons.push({
        metric: metric.key,
        metricLabel: metric.label,
        branches,
        best: branches[0],
        worst: branches[branches.length - 1],
      });
    }

    return comparisons;
  }

  // ==========================================
  // BRANCH DASHBOARD
  // ==========================================

  async getBranchDashboard(parentTenantId: string): Promise<BranchDashboard> {
    const [stats, comparisons] = await Promise.all([
      this.getAllBranchStats(parentTenantId),
      this.compareBranches(parentTenantId),
    ]);

    const activeBranches = stats.filter(s => s.isActive);

    const aggregated = {
      totalRevenue: stats.reduce((s, b) => s + b.monthRevenue, 0),
      totalOrders: stats.reduce((s, b) => s + b.monthOrders, 0),
      totalStaff: stats.reduce((s, b) => s + b.totalStaff, 0),
      avgOrderValue: 0 as number,
    };
    aggregated.avgOrderValue = aggregated.totalOrders > 0
      ? Math.round(aggregated.totalRevenue / aggregated.totalOrders)
      : 0;

    const insights = this.generateInsights(stats, comparisons);

    return {
      totalBranches: stats.length,
      activeBranches: activeBranches.length,
      stats,
      comparisons,
      aggregated,
      insights,
    };
  }

  // ==========================================
  // SINGLE BRANCH DETAIL
  // ==========================================

  async getBranchDetail(parentTenantId: string, branchId: string) {
    const stats = await this.getAllBranchStats(parentTenantId);
    const branchStats = stats.find(s => s.branchId === branchId);
    if (!branchStats) return null;

    // Oxirgi 7 kun kunlik trend
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const orders = await prisma.order.findMany({
      where: { tenantId: branchId, createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } },
      select: { total: true, createdAt: true, source: true },
    });

    const dailyTrend: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(); date.setDate(date.getDate() - (6 - d));
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = orders.filter(o => o.createdAt.toISOString().split('T')[0] === dateStr);
      dailyTrend.push({
        date: dateStr,
        revenue: Math.round(dayOrders.reduce((s, o) => s + Number(o.total), 0)),
        orders: dayOrders.length,
      });
    }

    // Source breakdown
    const sourceMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of orders) {
      const src = (order as any).source || 'POS_ORDER';
      if (!sourceMap.has(src)) sourceMap.set(src, { orders: 0, revenue: 0 });
      const e = sourceMap.get(src)!;
      e.orders++;
      e.revenue += Number(order.total);
    }

    // Staff
    const staff = await prisma.user.findMany({
      where: { tenantId: branchId, isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    return {
      ...branchStats,
      dailyTrend,
      bySource: Array.from(sourceMap.entries()).map(([source, data]) => ({
        source, ...data, revenue: Math.round(data.revenue),
      })),
      staff,
      rank: stats.findIndex(s => s.branchId === branchId) + 1,
      totalBranches: stats.length,
    };
  }

  // ==========================================
  // AI INSIGHTS
  // ==========================================

  private generateInsights(stats: BranchStats[], comparisons: BranchComparison[]): BranchInsight[] {
    const insights: BranchInsight[] = [];
    if (stats.length < 2) return insights;

    // Best performing branch
    const revenueComp = comparisons.find(c => c.metric === 'monthRevenue');
    if (revenueComp) {
      insights.push({
        type: 'SUCCESS', icon: '🏆',
        title: `Eng yuqori daromad: ${revenueComp.best.branchName}`,
        message: `${revenueComp.best.branchName} oylik ${revenueComp.best.value.toLocaleString()} so'm daromad — 1-o'rin.`,
      });
    }

    // Revenue gap
    if (revenueComp && revenueComp.branches.length >= 2) {
      const best = revenueComp.best.value;
      const worst = revenueComp.worst.value;
      if (best > 0 && worst > 0) {
        const gap = Math.round(((best - worst) / best) * 100);
        if (gap > 50) {
          insights.push({
            type: 'WARNING', icon: '📊',
            title: 'Filliallar orasida katta farq',
            message: `${revenueComp.best.branchName} va ${revenueComp.worst.branchName} orasida daromad farqi ${gap}%. Kam daromadli fillialni tekshiring.`,
          });
        }
      }
    }

    // High cancel rate branches
    const highCancel = stats.filter(s => s.cancelRate > 10 && s.monthOrders > 10);
    if (highCancel.length > 0) {
      for (const branch of highCancel) {
        insights.push({
          type: 'WARNING', icon: '❌',
          title: `${branch.branchName} — bekor qilish ko'p`,
          message: `${branch.branchName} da buyurtmalarning ${branch.cancelRate}% bekor qilinmoqda. Sabab tekshirilsin.`,
        });
      }
    }

    // Slow branches
    const avgComp = comparisons.find(c => c.metric === 'avgProcessingMinutes');
    if (avgComp) {
      const slowBranches = avgComp.branches.filter(b => b.value > 30);
      if (slowBranches.length > 0) {
        insights.push({
          type: 'INFO', icon: '🐌',
          title: 'Sekin filliallar',
          message: `${slowBranches.map(b => b.branchName).join(', ')} — o'rtacha buyurtma bajarish vaqti 30+ daqiqa.`,
        });
      }
    }

    // Understaffed branches (low staff relative to orders)
    for (const branch of stats) {
      if (branch.monthOrders > 0 && branch.activeStaff > 0) {
        const ordersPerStaff = branch.monthOrders / branch.activeStaff;
        if (ordersPerStaff > 200) {
          insights.push({
            type: 'INFO', icon: '👥',
            title: `${branch.branchName} — xodim yetishmaydi`,
            message: `${branch.branchName} da har xodimga ${Math.round(ordersPerStaff)} buyurtma. Qo'shimcha xodim kerak bo'lishi mumkin.`,
          });
        }
      }
    }

    // Zero revenue today
    const noRevenueToday = stats.filter(s => s.isActive && s.todayRevenue === 0 && new Date().getHours() > 12);
    if (noRevenueToday.length > 0) {
      insights.push({
        type: 'CRITICAL', icon: '🚨',
        title: `${noRevenueToday.length} ta fillialda bugun sotuv yo'q`,
        message: `${noRevenueToday.map(b => b.branchName).join(', ')} — tushlikdan keyin ham sotuv boshlanmagan. Holat tekshirilsin.`,
      });
    }

    return insights.sort((a, b) => {
      const p: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUCCESS: 2, INFO: 3 };
      return (p[a.type] ?? 3) - (p[b.type] ?? 3);
    });
  }
}

export const branchAnalyticsService = new BranchAnalyticsService();
