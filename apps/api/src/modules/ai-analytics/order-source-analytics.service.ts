import { prisma } from '@oshxona/database';

// ==========================================
// ORDER SOURCE ANALYTICS SERVICE
// ==========================================

interface SourceStats {
  source: string;
  orderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
  percentOfOrders: number;
  percentOfRevenue: number;
  completedCount: number;
  cancelledCount: number;
  cancelRate: number;
}

interface SourceTrend {
  date: string;
  sources: Record<string, { orders: number; revenue: number }>;
}

interface SourceComparison {
  source: string;
  thisWeek: { orders: number; revenue: number };
  lastWeek: { orders: number; revenue: number };
  orderGrowth: number;
  revenueGrowth: number;
}

interface SourceDashboard {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    uniqueSources: number;
    topSource: string;
    fastestGrowingSource: string;
  };
  bySource: SourceStats[];
  dailyTrends: SourceTrend[];
  weeklyComparison: SourceComparison[];
  hourlyBySource: Array<{
    hour: number;
    sources: Record<string, number>;
    total: number;
  }>;
  insights: SourceInsight[];
}

interface SourceInsight {
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'CRITICAL';
  icon: string;
  title: string;
  message: string;
}

export class OrderSourceAnalyticsService {

  // ==========================================
  // SOURCE BREAKDOWN
  // ==========================================

  async getSourceStats(tenantId: string, days: number = 30): Promise<SourceStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: {
        source: true,
        total: true,
        status: true,
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Source bo'yicha guruhlash
    const sourceMap = new Map<string, {
      count: number;
      revenue: number;
      completed: number;
      cancelled: number;
    }>();

    for (const order of orders) {
      const source = order.source || 'POS_ORDER';
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { count: 0, revenue: 0, completed: 0, cancelled: 0 });
      }
      const entry = sourceMap.get(source)!;
      entry.count++;
      if (order.status !== 'CANCELLED') {
        entry.revenue += Number(order.total);
      }
      if (order.status === 'COMPLETED') entry.completed++;
      if (order.status === 'CANCELLED') entry.cancelled++;
    }

    const stats: SourceStats[] = [];
    for (const [source, data] of sourceMap) {
      stats.push({
        source,
        orderCount: data.count,
        totalRevenue: Math.round(data.revenue),
        avgOrderValue: data.count > 0 ? Math.round(data.revenue / (data.count - data.cancelled)) : 0,
        percentOfOrders: totalOrders > 0 ? Math.round((data.count / totalOrders) * 10000) / 100 : 0,
        percentOfRevenue: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 10000) / 100 : 0,
        completedCount: data.completed,
        cancelledCount: data.cancelled,
        cancelRate: data.count > 0 ? Math.round((data.cancelled / data.count) * 10000) / 100 : 0,
      });
    }

    return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  // ==========================================
  // DAILY TRENDS BY SOURCE
  // ==========================================

  async getDailyTrends(tenantId: string, days: number = 14): Promise<SourceTrend[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: {
        source: true,
        total: true,
        createdAt: true,
      },
    });

    const trendMap = new Map<string, Map<string, { orders: number; revenue: number }>>();

    for (const order of orders) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      const source = order.source || 'POS_ORDER';

      if (!trendMap.has(dateStr)) trendMap.set(dateStr, new Map());
      const dayMap = trendMap.get(dateStr)!;
      if (!dayMap.has(source)) dayMap.set(source, { orders: 0, revenue: 0 });
      const entry = dayMap.get(source)!;
      entry.orders++;
      entry.revenue += Number(order.total);
    }

    const trends: SourceTrend[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - d));
      const dateStr = date.toISOString().split('T')[0];
      const dayMap = trendMap.get(dateStr) || new Map();

      const sources: Record<string, { orders: number; revenue: number }> = {};
      for (const [source, data] of dayMap) {
        sources[source] = { orders: data.orders, revenue: Math.round(data.revenue) };
      }

      trends.push({ date: dateStr, sources });
    }

    return trends;
  }

  // ==========================================
  // WEEKLY COMPARISON
  // ==========================================

  async getWeeklyComparison(tenantId: string): Promise<SourceComparison[]> {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const [thisWeekOrders, lastWeekOrders] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: thisWeekStart }, status: { not: 'CANCELLED' } },
        select: { source: true, total: true },
      }),
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: lastWeekStart, lt: thisWeekStart }, status: { not: 'CANCELLED' } },
        select: { source: true, total: true },
      }),
    ]);

    const aggregate = (orders: typeof thisWeekOrders) => {
      const map = new Map<string, { orders: number; revenue: number }>();
      for (const o of orders) {
        const src = o.source || 'POS_ORDER';
        if (!map.has(src)) map.set(src, { orders: 0, revenue: 0 });
        const e = map.get(src)!;
        e.orders++;
        e.revenue += Number(o.total);
      }
      return map;
    };

    const thisWeek = aggregate(thisWeekOrders);
    const lastWeek = aggregate(lastWeekOrders);

    const allSources = new Set([...thisWeek.keys(), ...lastWeek.keys()]);
    const comparisons: SourceComparison[] = [];

    for (const source of allSources) {
      const tw = thisWeek.get(source) || { orders: 0, revenue: 0 };
      const lw = lastWeek.get(source) || { orders: 0, revenue: 0 };

      comparisons.push({
        source,
        thisWeek: { orders: tw.orders, revenue: Math.round(tw.revenue) },
        lastWeek: { orders: lw.orders, revenue: Math.round(lw.revenue) },
        orderGrowth: lw.orders > 0 ? Math.round(((tw.orders - lw.orders) / lw.orders) * 100) : tw.orders > 0 ? 100 : 0,
        revenueGrowth: lw.revenue > 0 ? Math.round(((tw.revenue - lw.revenue) / lw.revenue) * 100) : tw.revenue > 0 ? 100 : 0,
      });
    }

    return comparisons.sort((a, b) => b.thisWeek.revenue - a.thisWeek.revenue);
  }

  // ==========================================
  // HOURLY DISTRIBUTION BY SOURCE
  // ==========================================

  async getHourlyBySource(tenantId: string, days: number = 14): Promise<Array<{ hour: number; sources: Record<string, number>; total: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      select: { source: true, createdAt: true },
    });

    const hourMap = new Map<number, Map<string, number>>();
    for (let h = 0; h < 24; h++) hourMap.set(h, new Map());

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const source = order.source || 'POS_ORDER';
      const sourceMap = hourMap.get(hour)!;
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    }

    const result: Array<{ hour: number; sources: Record<string, number>; total: number }> = [];
    for (const [hour, sourceMap] of hourMap) {
      const sources: Record<string, number> = {};
      let total = 0;
      for (const [source, count] of sourceMap) {
        sources[source] = count;
        total += count;
      }
      result.push({ hour, sources, total });
    }

    return result;
  }

  // ==========================================
  // FULL DASHBOARD
  // ==========================================

  async getSourceDashboard(tenantId: string): Promise<SourceDashboard> {
    const [bySource, dailyTrends, weeklyComparison, hourlyBySource] = await Promise.all([
      this.getSourceStats(tenantId, 30),
      this.getDailyTrends(tenantId, 14),
      this.getWeeklyComparison(tenantId),
      this.getHourlyBySource(tenantId, 14),
    ]);

    const totalOrders = bySource.reduce((s, b) => s + b.orderCount, 0);
    const totalRevenue = bySource.reduce((s, b) => s + b.totalRevenue, 0);
    const topSource = bySource.length > 0 ? bySource[0].source : 'POS_ORDER';

    // Eng tez o'sayotgan source
    const fastestGrowing = weeklyComparison
      .filter(c => c.thisWeek.orders >= 3)
      .sort((a, b) => b.orderGrowth - a.orderGrowth)[0];

    const insights = this.generateInsights(bySource, weeklyComparison, hourlyBySource);

    return {
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        uniqueSources: bySource.length,
        topSource,
        fastestGrowingSource: fastestGrowing?.source || topSource,
      },
      bySource,
      dailyTrends,
      weeklyComparison,
      hourlyBySource,
      insights,
    };
  }

  // ==========================================
  // AI INSIGHTS
  // ==========================================

  private generateInsights(
    bySource: SourceStats[],
    weeklyComparison: SourceComparison[],
    hourlyBySource: Array<{ hour: number; sources: Record<string, number>; total: number }>,
  ): SourceInsight[] {
    const insights: SourceInsight[] = [];

    // --- Dominant source ---
    if (bySource.length > 0 && bySource[0].percentOfOrders > 70) {
      const label = this.sourceLabel(bySource[0].source);
      insights.push({
        type: 'INFO',
        icon: '📊',
        title: `${label} asosiy sotuv kanali`,
        message: `${label} barcha buyurtmalarning ${bySource[0].percentOfOrders}% ni tashkil qiladi. Boshqa kanallarni rivojlantirish imkoniyatlari mavjud.`,
      });
    }

    // --- Fast growing source ---
    const growing = weeklyComparison.filter(c => c.orderGrowth > 30 && c.thisWeek.orders >= 5);
    for (const g of growing.slice(0, 2)) {
      const label = this.sourceLabel(g.source);
      insights.push({
        type: 'SUCCESS',
        icon: '🚀',
        title: `${label} tezkor o'sishda`,
        message: `${label} buyurtmalari o'tgan haftaga nisbatan ${g.orderGrowth}% oshgan (${g.lastWeek.orders} → ${g.thisWeek.orders}).`,
      });
    }

    // --- Declining source ---
    const declining = weeklyComparison.filter(c => c.orderGrowth < -30 && c.lastWeek.orders >= 5);
    for (const d of declining.slice(0, 2)) {
      const label = this.sourceLabel(d.source);
      insights.push({
        type: 'WARNING',
        icon: '📉',
        title: `${label} pasayishda`,
        message: `${label} buyurtmalari ${Math.abs(d.orderGrowth)}% kamaygan. Sabab tekshirilsin.`,
      });
    }

    // --- High cancel rate ---
    const highCancel = bySource.filter(s => s.cancelRate > 15 && s.orderCount >= 10);
    for (const hc of highCancel) {
      const label = this.sourceLabel(hc.source);
      insights.push({
        type: 'WARNING',
        icon: '❌',
        title: `${label} da yuqori bekor qilish`,
        message: `${label} buyurtmalarining ${hc.cancelRate}% bekor qilingan (${hc.cancelledCount}/${hc.orderCount}). Sifatni tekshiring.`,
      });
    }

    // --- Online channels contribution ---
    const onlineSources = bySource.filter(s =>
      ['NONBOR_ORDER', 'TELEGRAM_ORDER', 'WEBSITE_ORDER', 'QR_ORDER'].includes(s.source)
    );
    const onlineRevenue = onlineSources.reduce((s, o) => s + o.totalRevenue, 0);
    const totalRevenue = bySource.reduce((s, o) => s + o.totalRevenue, 0);
    if (onlineRevenue > 0 && totalRevenue > 0) {
      const onlinePercent = Math.round((onlineRevenue / totalRevenue) * 100);
      insights.push({
        type: onlinePercent > 20 ? 'SUCCESS' : 'INFO',
        icon: '🌐',
        title: 'Online kanallar ulushi',
        message: `Online buyurtmalar (Nonbor, Telegram, QR, Website) jami daromadning ${onlinePercent}% ni tashkil qiladi (${onlineRevenue.toLocaleString()} so'm).`,
      });
    }

    // --- Evening QR/online peak ---
    const eveningOnline = hourlyBySource
      .filter(h => h.hour >= 18 && h.hour <= 21)
      .reduce((sum, h) => {
        const onlineCount = Object.entries(h.sources)
          .filter(([src]) => ['QR_ORDER', 'NONBOR_ORDER', 'TELEGRAM_ORDER'].includes(src))
          .reduce((s, [, count]) => s + count, 0);
        return sum + onlineCount;
      }, 0);

    const totalEvening = hourlyBySource
      .filter(h => h.hour >= 18 && h.hour <= 21)
      .reduce((sum, h) => sum + h.total, 0);

    if (eveningOnline > 0 && totalEvening > 0) {
      const eveningOnlinePercent = Math.round((eveningOnline / totalEvening) * 100);
      if (eveningOnlinePercent > 25) {
        insights.push({
          type: 'INFO',
          icon: '🌙',
          title: 'Kechki online buyurtmalar',
          message: `18:00-21:00 orasida online buyurtmalar ${eveningOnlinePercent}% ni tashkil qiladi. Bu vaqtda yetkazib berish resurslarini kuchaytiring.`,
        });
      }
    }

    // --- Average order value comparison ---
    if (bySource.length >= 2) {
      const sorted = [...bySource].sort((a, b) => b.avgOrderValue - a.avgOrderValue);
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      if (highest.avgOrderValue > lowest.avgOrderValue * 1.5) {
        insights.push({
          type: 'INFO',
          icon: '💰',
          title: 'O\'rtacha chek farqi',
          message: `${this.sourceLabel(highest.source)} o'rtacha chek ${highest.avgOrderValue.toLocaleString()} so'm, ${this.sourceLabel(lowest.source)} esa ${lowest.avgOrderValue.toLocaleString()} so'm. ${this.sourceLabel(lowest.source)} da upsell strategiyasini qo'llang.`,
        });
      }
    }

    return insights;
  }

  private sourceLabel(source: string): string {
    const labels: Record<string, string> = {
      POS_ORDER: 'POS Terminal',
      WAITER_ORDER: 'Ofitsiant',
      QR_ORDER: 'QR Menyu',
      NONBOR_ORDER: 'Nonbor',
      TELEGRAM_ORDER: 'Telegram',
      WEBSITE_ORDER: 'Veb-sayt',
      API_ORDER: 'Tashqi API',
    };
    return labels[source] || source;
  }
}

export const orderSourceAnalyticsService = new OrderSourceAnalyticsService();
