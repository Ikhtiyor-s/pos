import { prisma, OrderStatus, SnapshotType } from '@oshxona/database';

// ==========================================
// ANALYTICS SERVICE
// ==========================================

interface GetSnapshotsOptions {
  type?: SnapshotType;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  limit: number;
}

export class AnalyticsService {
  /**
   * Kunlik snapshot yaratish — buyurtmalar, daromad, top mahsulotlar, to'lov usullari
   */
  static async createDailySnapshot(tenantId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dateFilter = { gte: dayStart, lte: dayEnd };
    const completedFilter = {
      tenantId,
      status: OrderStatus.COMPLETED,
      createdAt: dateFilter,
    };

    // Parallel so'rovlar
    const [
      revenueResult,
      orderCount,
      cancelledCount,
      topProducts,
      paymentBreakdown,
      ordersByType,
      ordersByHour,
    ] = await Promise.all([
      // Umumiy daromad
      prisma.order.aggregate({
        where: completedFilter,
        _sum: { total: true, discount: true, tax: true },
        _avg: { total: true },
        _min: { total: true },
        _max: { total: true },
      }),

      // Buyurtmalar soni
      prisma.order.count({ where: completedFilter }),

      // Bekor qilingan buyurtmalar
      prisma.order.count({
        where: { tenantId, status: OrderStatus.CANCELLED, createdAt: dateFilter },
      }),

      // Top mahsulotlar
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: completedFilter,
        },
        _sum: { quantity: true, total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 20,
      }),

      // To'lov usullari bo'yicha taqsimot
      prisma.payment.groupBy({
        by: ['method'],
        where: {
          order: completedFilter,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Buyurtma turi bo'yicha
      prisma.order.groupBy({
        by: ['type'],
        where: completedFilter,
        _sum: { total: true },
        _count: true,
      }),

      // Soatlik taqsimot (raw query)
      prisma.$queryRaw<Array<{ hour: number; count: bigint; total: number }>>`
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*)::bigint as count,
          COALESCE(SUM(total), 0)::float as total
        FROM orders
        WHERE tenant_id = ${tenantId}
          AND status = 'COMPLETED'
          AND created_at >= ${dayStart}
          AND created_at <= ${dayEnd}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour ASC
      `,
    ]);

    // Top products uchun nomlarni olish
    const productIds = topProducts.map((tp) => tp.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, price: true, costPrice: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const snapshotData = {
      revenue: {
        total: Number(revenueResult._sum.total || 0),
        average: Math.round(Number(revenueResult._avg.total || 0)),
        min: Number(revenueResult._min.total || 0),
        max: Number(revenueResult._max.total || 0),
        discount: Number(revenueResult._sum.discount || 0),
        tax: Number(revenueResult._sum.tax || 0),
      },
      orders: {
        completed: orderCount,
        cancelled: cancelledCount,
        total: orderCount + cancelledCount,
      },
      topProducts: topProducts.map((tp) => {
        const product = productMap.get(tp.productId);
        return {
          productId: tp.productId,
          name: product?.name || 'Noma\'lum',
          quantity: Number(tp._sum.quantity || 0),
          revenue: Number(tp._sum.total || 0),
          costPrice: Number(product?.costPrice || 0),
          orderCount: tp._count,
        };
      }),
      paymentBreakdown: paymentBreakdown.map((pb) => ({
        method: pb.method,
        amount: Number(pb._sum.amount || 0),
        count: pb._count,
      })),
      ordersByType: ordersByType.map((ot) => ({
        type: ot.type,
        revenue: Number(ot._sum.total || 0),
        count: ot._count,
      })),
      hourlyDistribution: ordersByHour.map((oh) => ({
        hour: oh.hour,
        count: Number(oh.count),
        revenue: oh.total,
      })),
    };

    // Insight yaratish
    const insights = AnalyticsService.generateInsights(snapshotData);

    // Snapshotni saqlash (upsert — bir kun uchun bitta)
    const snapshot = await prisma.analyticsSnapshot.upsert({
      where: {
        tenantId_type_periodDate: {
          tenantId,
          type: 'DAILY_SALES',
          periodDate: dayStart,
        },
      },
      update: {
        data: snapshotData,
        insights,
      },
      create: {
        tenantId,
        type: 'DAILY_SALES',
        periodDate: dayStart,
        data: snapshotData,
        insights,
      },
    });

    return snapshot;
  }

  /**
   * Snapshotlar ro'yxatini olish
   */
  static async getSnapshots(tenantId: string, options: GetSnapshotsOptions) {
    const { type, dateFrom, dateTo, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (type) {
      where.type = type;
    }

    if (dateFrom || dateTo) {
      where.periodDate = {};
      if (dateFrom) where.periodDate.gte = dateFrom;
      if (dateTo) where.periodDate.lte = dateTo;
    }

    const [snapshots, total] = await Promise.all([
      prisma.analyticsSnapshot.findMany({
        where,
        orderBy: { periodDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.analyticsSnapshot.count({ where }),
    ]);

    return {
      data: snapshots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Dashboard uchun to'liq analytics
   */
  static async getDashboardAnalytics(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const completedBase = { tenantId, status: OrderStatus.COMPLETED };

    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      todayOrders,
      weekOrders,
      monthOrders,
      activeProducts,
      lowStockItems,
      recentSnapshots,
      recentForecasts,
    ] = await Promise.all([
      // Bugungi daromad
      prisma.order.aggregate({
        where: { ...completedBase, createdAt: { gte: todayStart } },
        _sum: { total: true },
        _avg: { total: true },
      }),

      // Haftalik daromad
      prisma.order.aggregate({
        where: { ...completedBase, createdAt: { gte: weekAgo } },
        _sum: { total: true },
      }),

      // Oylik daromad
      prisma.order.aggregate({
        where: { ...completedBase, createdAt: { gte: monthAgo } },
        _sum: { total: true },
      }),

      // Bugungi buyurtmalar
      prisma.order.count({
        where: { ...completedBase, createdAt: { gte: todayStart } },
      }),

      // Haftalik buyurtmalar
      prisma.order.count({
        where: { ...completedBase, createdAt: { gte: weekAgo } },
      }),

      // Oylik buyurtmalar
      prisma.order.count({
        where: { ...completedBase, createdAt: { gte: monthAgo } },
      }),

      // Faol mahsulotlar soni
      prisma.product.count({ where: { tenantId, isActive: true } }),

      // Kam qolgan inventar
      prisma.$queryRaw<Array<{ id: string; name: string; quantity: number; min_quantity: number }>>`
        SELECT id, name, quantity::float, min_quantity::float
        FROM inventory_items
        WHERE tenant_id = ${tenantId}
          AND is_active = true
          AND quantity <= min_quantity
        ORDER BY (quantity / NULLIF(min_quantity, 0)) ASC
        LIMIT 10
      `,

      // So'nggi snapshotlar
      prisma.analyticsSnapshot.findMany({
        where: { tenantId },
        orderBy: { periodDate: 'desc' },
        take: 7,
      }),

      // So'nggi bashoratlar
      prisma.forecast.findMany({
        where: { tenantId, targetDate: { gte: todayStart } },
        orderBy: { targetDate: 'asc' },
        take: 7,
      }),
    ]);

    // O'tgan hafta bilan solishtirish
    const prevWeekStart = new Date(weekAgo);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekRevenue = await prisma.order.aggregate({
      where: {
        ...completedBase,
        createdAt: { gte: prevWeekStart, lt: weekAgo },
      },
      _sum: { total: true },
    });

    const currentWeekTotal = Number(weekRevenue._sum.total || 0);
    const prevWeekTotal = Number(prevWeekRevenue._sum.total || 0);
    const weekGrowth = prevWeekTotal > 0
      ? ((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 100
      : 0;

    return {
      today: {
        revenue: Number(todayRevenue._sum.total || 0),
        averageCheck: Math.round(Number(todayRevenue._avg.total || 0)),
        orders: todayOrders,
      },
      week: {
        revenue: currentWeekTotal,
        orders: weekOrders,
        growth: Math.round(weekGrowth * 100) / 100,
      },
      month: {
        revenue: Number(monthRevenue._sum.total || 0),
        orders: monthOrders,
        dailyAverage: Math.round(Number(monthRevenue._sum.total || 0) / 30),
      },
      inventory: {
        activeProducts,
        lowStockItems: lowStockItems.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          minQuantity: item.min_quantity,
        })),
      },
      recentSnapshots: recentSnapshots.map((s) => ({
        id: s.id,
        type: s.type,
        periodDate: s.periodDate,
        insights: s.insights,
      })),
      recentForecasts: recentForecasts.map((f) => ({
        id: f.id,
        type: f.type,
        targetDate: f.targetDate,
        predictedValue: Number(f.predictedValue),
        confidence: Number(f.confidence),
        actualValue: f.actualValue ? Number(f.actualValue) : null,
      })),
    };
  }

  /**
   * Snapshot ma'lumotlaridan insight yaratish
   */
  private static generateInsights(data: any): string {
    const insights: string[] = [];

    // Daromad bo'yicha
    if (data.revenue.total > 0) {
      insights.push(
        `Kunlik daromad: ${data.revenue.total.toLocaleString()} so'm. O'rtacha chek: ${data.revenue.average.toLocaleString()} so'm.`
      );
    } else {
      insights.push('Bugun hech qanday yakunlangan buyurtma yo\'q.');
    }

    // Top mahsulot
    if (data.topProducts.length > 0) {
      const top = data.topProducts[0];
      insights.push(
        `Eng ko'p sotilgan mahsulot: ${top.name} (${top.quantity} dona, ${top.revenue.toLocaleString()} so'm).`
      );
    }

    // To'lov usullari
    if (data.paymentBreakdown.length > 0) {
      const cashPayment = data.paymentBreakdown.find((p: any) => p.method === 'CASH');
      const cardPayment = data.paymentBreakdown.find((p: any) => p.method === 'CARD');
      if (cashPayment && cardPayment) {
        const cashPercent = Math.round((cashPayment.amount / data.revenue.total) * 100);
        insights.push(`Naqd to'lov: ${cashPercent}%, Karta: ${100 - cashPercent}%.`);
      }
    }

    // Bekor qilishlar
    if (data.orders.cancelled > 0) {
      const cancelRate = Math.round((data.orders.cancelled / data.orders.total) * 100);
      insights.push(
        `Bekor qilingan buyurtmalar: ${data.orders.cancelled} ta (${cancelRate}%).`
      );
    }

    // Eng faol soat
    if (data.hourlyDistribution.length > 0) {
      const peakHour = data.hourlyDistribution.reduce(
        (max: any, h: any) => (h.revenue > max.revenue ? h : max),
        data.hourlyDistribution[0]
      );
      insights.push(`Eng faol soat: ${peakHour.hour}:00 (${peakHour.count} buyurtma).`);
    }

    return insights.join(' ');
  }
}
