import { prisma } from '@oshxona/database';
import { Decimal } from '@prisma/client/runtime/library';

// ==========================================
// KITCHEN PERFORMANCE ANALYTICS SERVICE
// ==========================================

interface CookingTimeStats {
  productId: string;
  productName: string;
  categoryName: string;
  avgCookingMinutes: number;
  minCookingMinutes: number;
  maxCookingMinutes: number;
  totalOrdered: number;
  stdDevMinutes: number;
}

interface HourlyLoad {
  hour: number;
  orderCount: number;
  itemCount: number;
  avgWaitMinutes: number;
  loadLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'OVERLOADED';
}

interface QueueDelay {
  hour: number;
  avgDelayMinutes: number;
  maxDelayMinutes: number;
  ordersDelayed: number;
  totalOrders: number;
  delayRate: number;
}

interface KitchenPerformanceScore {
  overall: number; // 0-100
  speed: number;
  consistency: number;
  throughput: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface KitchenInsight {
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'CRITICAL';
  icon: string;
  title: string;
  message: string;
  metric?: string;
  value?: number;
}

interface KitchenDashboard {
  avgCookingMinutes: number;
  totalOrdersToday: number;
  completedOrdersToday: number;
  activeOrdersNow: number;
  performanceScore: KitchenPerformanceScore;
  slowDishes: CookingTimeStats[];
  fastDishes: CookingTimeStats[];
  hourlyLoad: HourlyLoad[];
  queueDelays: QueueDelay[];
  insights: KitchenInsight[];
  peakHours: { start: number; end: number; avgOrders: number }[];
  comparisonWithLastWeek: {
    avgCookingChange: number;
    orderCountChange: number;
    performanceChange: number;
  };
}

export class KitchenAnalyticsService {

  // ==========================================
  // COOKING TIME ANALYSIS
  // ==========================================

  async getCookingTimeStats(tenantId: string, days: number = 30): Promise<CookingTimeStats[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // OrderItem: createdAt = buyurtma berilgan vaqt, updatedAt = oxirgi status o'zgarish
    // READY statusidagi itemlar uchun: cookingTime = updatedAt - createdAt
    const items = await prisma.orderItem.findMany({
      where: {
        order: { tenantId, createdAt: { gte: since } },
        status: { in: ['READY', 'SERVED'] },
      },
      select: {
        productId: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    // Mahsulot bo'yicha guruhlash
    const productMap = new Map<string, {
      name: string;
      category: string;
      times: number[];
    }>();

    for (const item of items) {
      const cookingMs = item.updatedAt.getTime() - item.createdAt.getTime();
      const cookingMin = cookingMs / 60000;

      // 0 dan kam yoki 180 minutdan ko'p bo'lsa — noise
      if (cookingMin <= 0 || cookingMin > 180) continue;

      const key = item.productId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          name: item.product.name,
          category: item.product.category?.name || 'Boshqa',
          times: [],
        });
      }
      productMap.get(key)!.times.push(cookingMin);
    }

    const stats: CookingTimeStats[] = [];
    for (const [productId, data] of productMap) {
      const times = data.times;
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      stats.push({
        productId,
        productName: data.name,
        categoryName: data.category,
        avgCookingMinutes: Math.round(avg * 10) / 10,
        minCookingMinutes: Math.round(min * 10) / 10,
        maxCookingMinutes: Math.round(max * 10) / 10,
        totalOrdered: times.length,
        stdDevMinutes: Math.round(stdDev * 10) / 10,
      });
    }

    return stats.sort((a, b) => b.avgCookingMinutes - a.avgCookingMinutes);
  }

  // ==========================================
  // BUSIEST HOURS ANALYSIS
  // ==========================================

  async getHourlyLoad(tenantId: string, days: number = 14): Promise<HourlyLoad[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
        status: { not: 'CANCELLED' },
      },
      select: {
        createdAt: true,
        updatedAt: true,
        items: { select: { id: true } },
      },
    });

    // Soat bo'yicha guruhlash
    const hourMap = new Map<number, { orders: number; items: number; waitTimes: number[] }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { orders: 0, items: 0, waitTimes: [] });
    }

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const entry = hourMap.get(hour)!;
      entry.orders++;
      entry.items += order.items.length;
      const waitMs = order.updatedAt.getTime() - order.createdAt.getTime();
      const waitMin = waitMs / 60000;
      if (waitMin > 0 && waitMin < 180) {
        entry.waitTimes.push(waitMin);
      }
    }

    // O'rtacha kunlik buyurtma soni
    const avgDivisor = Math.max(days, 1);
    const allOrderCounts = Array.from(hourMap.values()).map(h => h.orders / avgDivisor);
    const maxAvgOrders = Math.max(...allOrderCounts, 1);

    const hourlyLoad: HourlyLoad[] = [];
    for (const [hour, data] of hourMap) {
      const avgPerDay = data.orders / avgDivisor;
      const avgWait = data.waitTimes.length > 0
        ? data.waitTimes.reduce((a, b) => a + b, 0) / data.waitTimes.length
        : 0;

      const loadRatio = avgPerDay / maxAvgOrders;
      let loadLevel: HourlyLoad['loadLevel'];
      if (loadRatio >= 0.85) loadLevel = 'OVERLOADED';
      else if (loadRatio >= 0.6) loadLevel = 'HIGH';
      else if (loadRatio >= 0.3) loadLevel = 'MEDIUM';
      else loadLevel = 'LOW';

      hourlyLoad.push({
        hour,
        orderCount: data.orders,
        itemCount: data.items,
        avgWaitMinutes: Math.round(avgWait * 10) / 10,
        loadLevel,
      });
    }

    return hourlyLoad;
  }

  // ==========================================
  // ORDER QUEUE DELAY ANALYSIS
  // ==========================================

  async getQueueDelays(tenantId: string, days: number = 14): Promise<QueueDelay[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Barcha buyurtmalarni olish
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
        status: { in: ['COMPLETED', 'READY', 'PREPARING'] },
      },
      select: {
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    });

    const DELAY_THRESHOLD_MIN = 20; // 20 minutdan oshsa "kechikkan"

    const hourMap = new Map<number, { delays: number[]; total: number }>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, { delays: [], total: 0 });
    }

    for (const order of orders) {
      const hour = order.createdAt.getHours();
      const entry = hourMap.get(hour)!;
      entry.total++;

      const processMin = (order.updatedAt.getTime() - order.createdAt.getTime()) / 60000;
      if (processMin > 0 && processMin < 180) {
        entry.delays.push(processMin);
      }
    }

    const result: QueueDelay[] = [];
    for (const [hour, data] of hourMap) {
      if (data.total === 0) {
        result.push({ hour, avgDelayMinutes: 0, maxDelayMinutes: 0, ordersDelayed: 0, totalOrders: 0, delayRate: 0 });
        continue;
      }

      const avg = data.delays.length > 0 ? data.delays.reduce((a, b) => a + b, 0) / data.delays.length : 0;
      const max = data.delays.length > 0 ? Math.max(...data.delays) : 0;
      const delayed = data.delays.filter(d => d > DELAY_THRESHOLD_MIN).length;

      result.push({
        hour,
        avgDelayMinutes: Math.round(avg * 10) / 10,
        maxDelayMinutes: Math.round(max * 10) / 10,
        ordersDelayed: delayed,
        totalOrders: data.total,
        delayRate: Math.round((delayed / data.total) * 100) / 100,
      });
    }

    return result;
  }

  // ==========================================
  // PERFORMANCE SCORE CALCULATION
  // ==========================================

  async calculatePerformanceScore(tenantId: string): Promise<KitchenPerformanceScore> {
    const cookingStats = await this.getCookingTimeStats(tenantId, 7);
    const hourlyLoad = await this.getHourlyLoad(tenantId, 7);
    const queueDelays = await this.getQueueDelays(tenantId, 7);

    // --- SPEED SCORE (0-100) ---
    // O'rtacha tayyorlanish vaqti 15 min = 100 ball, 45+ min = 0 ball
    const allAvgTimes = cookingStats.map(s => s.avgCookingMinutes);
    const globalAvgTime = allAvgTimes.length > 0
      ? allAvgTimes.reduce((a, b) => a + b, 0) / allAvgTimes.length
      : 15;
    const speed = Math.max(0, Math.min(100, Math.round(100 - ((globalAvgTime - 15) / 30) * 100)));

    // --- CONSISTENCY SCORE (0-100) ---
    // StdDev past bo'lsa yaxshi — kam o'zgaruvchanlik
    const allStdDevs = cookingStats.filter(s => s.totalOrdered >= 3).map(s => s.stdDevMinutes);
    const avgStdDev = allStdDevs.length > 0
      ? allStdDevs.reduce((a, b) => a + b, 0) / allStdDevs.length
      : 5;
    const consistency = Math.max(0, Math.min(100, Math.round(100 - (avgStdDev / 15) * 100)));

    // --- THROUGHPUT SCORE (0-100) ---
    // Kechikkan buyurtmalar foizi kam bo'lsa yaxshi
    const totalOrders = queueDelays.reduce((sum, d) => sum + d.totalOrders, 0);
    const totalDelayed = queueDelays.reduce((sum, d) => sum + d.ordersDelayed, 0);
    const delayRate = totalOrders > 0 ? totalDelayed / totalOrders : 0;
    const throughput = Math.max(0, Math.min(100, Math.round((1 - delayRate) * 100)));

    // --- OVERALL ---
    const overall = Math.round(speed * 0.4 + consistency * 0.25 + throughput * 0.35);

    let grade: KitchenPerformanceScore['grade'];
    if (overall >= 85) grade = 'A';
    else if (overall >= 70) grade = 'B';
    else if (overall >= 55) grade = 'C';
    else if (overall >= 40) grade = 'D';
    else grade = 'F';

    return { overall, speed, consistency, throughput, grade };
  }

  // ==========================================
  // AI INSIGHTS GENERATION
  // ==========================================

  async generateInsights(tenantId: string): Promise<KitchenInsight[]> {
    const insights: KitchenInsight[] = [];

    const cookingStats = await this.getCookingTimeStats(tenantId, 14);
    const hourlyLoad = await this.getHourlyLoad(tenantId, 14);
    const queueDelays = await this.getQueueDelays(tenantId, 14);
    const performance = await this.calculatePerformanceScore(tenantId);

    // --- 1. OVERLOADED HOURS ---
    const overloadedHours = hourlyLoad.filter(h => h.loadLevel === 'OVERLOADED');
    if (overloadedHours.length > 0) {
      const sortedOverloaded = overloadedHours.sort((a, b) => a.hour - b.hour);
      const ranges = this.groupConsecutiveHours(sortedOverloaded.map(h => h.hour));

      for (const range of ranges) {
        insights.push({
          type: 'CRITICAL',
          icon: '🔥',
          title: 'Oshxona haddan tashqari band',
          message: `Oshxona ${this.formatHour(range.start)} — ${this.formatHour(range.end + 1)} orasida haddan tashqari yuklanadi. Qo'shimcha oshpaz yollash yoki menyu optimallashtirish tavsiya etiladi.`,
          metric: 'peak_hours',
          value: range.end - range.start + 1,
        });
      }
    }

    // --- 2. HIGH LOAD HOURS ---
    const highHours = hourlyLoad.filter(h => h.loadLevel === 'HIGH');
    if (highHours.length > 0 && overloadedHours.length === 0) {
      const ranges = this.groupConsecutiveHours(highHours.sort((a, b) => a.hour - b.hour).map(h => h.hour));
      for (const range of ranges) {
        insights.push({
          type: 'WARNING',
          icon: '⚠️',
          title: 'Yuqori yuklanish soatlari',
          message: `${this.formatHour(range.start)} — ${this.formatHour(range.end + 1)} orasida buyurtmalar ko'p. Oldindan tayyorgarlik ko'ring.`,
          metric: 'high_load_hours',
        });
      }
    }

    // --- 3. SLOW DISHES ---
    const globalAvg = cookingStats.length > 0
      ? cookingStats.reduce((s, c) => s + c.avgCookingMinutes, 0) / cookingStats.length
      : 15;

    const slowDishes = cookingStats.filter(s => s.avgCookingMinutes > globalAvg * 1.5 && s.totalOrdered >= 5);
    for (const dish of slowDishes.slice(0, 3)) {
      insights.push({
        type: 'WARNING',
        icon: '🐌',
        title: `${dish.productName} sekin tayyorlanmoqda`,
        message: `${dish.productName} o'rtacha ${dish.avgCookingMinutes} daqiqa tayyorlanadi — bu umumiy o'rtachadan ${Math.round((dish.avgCookingMinutes / globalAvg - 1) * 100)}% ko'p. Retsept yoki tayyorlash jarayonini tekshiring.`,
        metric: 'cooking_time',
        value: dish.avgCookingMinutes,
      });
    }

    // --- 4. FAST DISHES ---
    const fastDishes = cookingStats.filter(s => s.avgCookingMinutes < globalAvg * 0.5 && s.totalOrdered >= 5);
    if (fastDishes.length > 0) {
      insights.push({
        type: 'SUCCESS',
        icon: '⚡',
        title: 'Tez tayyorlanadigan taomlar',
        message: `${fastDishes.map(d => d.productName).join(', ')} — eng tez tayyorlanadigan taomlar. Band vaqtlarda ularni tavsiya qilish mumkin.`,
        metric: 'fast_dishes',
        value: fastDishes.length,
      });
    }

    // --- 5. INCONSISTENT DISHES ---
    const inconsistent = cookingStats.filter(s => s.stdDevMinutes > s.avgCookingMinutes * 0.5 && s.totalOrdered >= 5);
    for (const dish of inconsistent.slice(0, 2)) {
      insights.push({
        type: 'WARNING',
        icon: '📊',
        title: `${dish.productName} tayyorlanish vaqti beqaror`,
        message: `${dish.productName} ba'zan ${dish.minCookingMinutes} daqiqada, ba'zan ${dish.maxCookingMinutes} daqiqada tayyorlanadi. Standartlashtirish tavsiya etiladi.`,
        metric: 'inconsistency',
        value: dish.stdDevMinutes,
      });
    }

    // --- 6. HIGH DELAY HOURS ---
    const highDelayHours = queueDelays.filter(d => d.delayRate > 0.3 && d.totalOrders > 5);
    if (highDelayHours.length > 0) {
      const worstHour = highDelayHours.sort((a, b) => b.delayRate - a.delayRate)[0];
      insights.push({
        type: 'CRITICAL',
        icon: '⏰',
        title: 'Navbat kechikishlari yuqori',
        message: `${this.formatHour(worstHour.hour)} da buyurtmalarning ${Math.round(worstHour.delayRate * 100)}% kechikadi. O'rtacha kutish vaqti ${worstHour.avgDelayMinutes} daqiqa.`,
        metric: 'delay_rate',
        value: worstHour.delayRate,
      });
    }

    // --- 7. PERFORMANCE GRADE ---
    if (performance.grade === 'A') {
      insights.push({
        type: 'SUCCESS',
        icon: '🏆',
        title: 'Ajoyib ish ko\'rsatkichlari!',
        message: `Oshxona samaradorligi ${performance.overall}/100 ball. Tezlik, barqarorlik va sig'im darajasi yuqori.`,
        metric: 'performance',
        value: performance.overall,
      });
    } else if (performance.grade === 'D' || performance.grade === 'F') {
      insights.push({
        type: 'CRITICAL',
        icon: '📉',
        title: 'Ish ko\'rsatkichlari past',
        message: `Oshxona samaradorligi ${performance.overall}/100. Tezlik: ${performance.speed}, Barqarorlik: ${performance.consistency}, Sig'im: ${performance.throughput}. Shoshilinch choralar ko'ring.`,
        metric: 'performance',
        value: performance.overall,
      });
    }

    // --- 8. LOW ACTIVITY OPTIMIZATION ---
    const lowHours = hourlyLoad.filter(h => h.loadLevel === 'LOW' && h.orderCount > 0);
    if (lowHours.length > 10) {
      insights.push({
        type: 'INFO',
        icon: '💡',
        title: 'Kam band vaqtlardan foydalaning',
        message: `Kunning ${lowHours.length} soatida yuklanish past. Bu vaqtlarda tayyorgarlik ishlari, tozalash yoki ingredient tayyorlash mumkin.`,
      });
    }

    return insights.sort((a, b) => {
      const priority: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2, SUCCESS: 3 };
      return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
    });
  }

  // ==========================================
  // FULL KITCHEN DASHBOARD
  // ==========================================

  async getKitchenDashboard(tenantId: string): Promise<KitchenDashboard> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Bugungi buyurtmalar
    const [todayOrders, activeOrders] = await Promise.all([
      prisma.order.count({
        where: { tenantId, createdAt: { gte: today }, status: { not: 'CANCELLED' } },
      }),
      prisma.order.count({
        where: { tenantId, status: { in: ['NEW', 'CONFIRMED', 'PREPARING'] } },
      }),
    ]);

    const completedToday = await prisma.order.count({
      where: { tenantId, createdAt: { gte: today }, status: { in: ['COMPLETED', 'READY'] } },
    });

    // Parallel data fetch
    const [cookingStats, hourlyLoad, queueDelays, performance, insights] = await Promise.all([
      this.getCookingTimeStats(tenantId, 14),
      this.getHourlyLoad(tenantId, 14),
      this.getQueueDelays(tenantId, 14),
      this.calculatePerformanceScore(tenantId),
      this.generateInsights(tenantId),
    ]);

    // O'rtacha tayyorlanish vaqti
    const avgCooking = cookingStats.length > 0
      ? cookingStats.reduce((s, c) => s + c.avgCookingMinutes * c.totalOrdered, 0) /
        cookingStats.reduce((s, c) => s + c.totalOrdered, 0)
      : 0;

    // Sekin va tez taomlar
    const slowDishes = cookingStats.slice(0, 5);
    const fastDishes = [...cookingStats].sort((a, b) => a.avgCookingMinutes - b.avgCookingMinutes).slice(0, 5);

    // Eng band soatlar
    const peakHours = this.findPeakHours(hourlyLoad);

    // Hafta oldingi taqqoslash
    const comparison = await this.getWeeklyComparison(tenantId);

    return {
      avgCookingMinutes: Math.round(avgCooking * 10) / 10,
      totalOrdersToday: todayOrders,
      completedOrdersToday: completedToday,
      activeOrdersNow: activeOrders,
      performanceScore: performance,
      slowDishes,
      fastDishes,
      hourlyLoad,
      queueDelays,
      insights,
      peakHours,
      comparisonWithLastWeek: comparison,
    };
  }

  // ==========================================
  // WEEKLY COMPARISON
  // ==========================================

  private async getWeeklyComparison(tenantId: string) {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const [thisWeekOrders, lastWeekOrders] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: thisWeekStart }, status: { not: 'CANCELLED' } },
        select: { createdAt: true, updatedAt: true },
      }),
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: lastWeekStart, lt: thisWeekStart }, status: { not: 'CANCELLED' } },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

    const avgTime = (orders: typeof thisWeekOrders) => {
      const times = orders.map(o => (o.updatedAt.getTime() - o.createdAt.getTime()) / 60000).filter(t => t > 0 && t < 180);
      return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    };

    const thisAvg = avgTime(thisWeekOrders);
    const lastAvg = avgTime(lastWeekOrders);

    return {
      avgCookingChange: lastAvg > 0 ? Math.round(((thisAvg - lastAvg) / lastAvg) * 100) : 0,
      orderCountChange: lastWeekOrders.length > 0 ? Math.round(((thisWeekOrders.length - lastWeekOrders.length) / lastWeekOrders.length) * 100) : 0,
      performanceChange: 0, // Will be calculated from snapshots
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private formatHour(h: number): string {
    return `${String(h % 24).padStart(2, '0')}:00`;
  }

  private groupConsecutiveHours(hours: number[]): { start: number; end: number }[] {
    if (hours.length === 0) return [];
    const ranges: { start: number; end: number }[] = [];
    let start = hours[0];
    let end = hours[0];

    for (let i = 1; i < hours.length; i++) {
      if (hours[i] === end + 1) {
        end = hours[i];
      } else {
        ranges.push({ start, end });
        start = hours[i];
        end = hours[i];
      }
    }
    ranges.push({ start, end });
    return ranges;
  }

  private findPeakHours(hourlyLoad: HourlyLoad[]): { start: number; end: number; avgOrders: number }[] {
    const busyHours = hourlyLoad
      .filter(h => h.loadLevel === 'HIGH' || h.loadLevel === 'OVERLOADED')
      .sort((a, b) => a.hour - b.hour);

    if (busyHours.length === 0) return [];

    const ranges = this.groupConsecutiveHours(busyHours.map(h => h.hour));
    return ranges.map(r => {
      const hoursInRange = busyHours.filter(h => h.hour >= r.start && h.hour <= r.end);
      const avgOrders = Math.round(hoursInRange.reduce((s, h) => s + h.orderCount, 0) / hoursInRange.length);
      return { start: r.start, end: r.end, avgOrders };
    });
  }
}

export const kitchenAnalyticsService = new KitchenAnalyticsService();
