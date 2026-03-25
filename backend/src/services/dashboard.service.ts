import { prisma, OrderStatus } from '@oshxona/database';
import { BranchService } from './branch.service.js';

type Period = 'today' | 'week' | 'month' | 'year';

export class DashboardService {
  // Sana oralig'ini hisoblash
  private static getDateRange(period: Period) {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end: now };
  }

  // Asosiy dashboard ma'lumotlari
  static async getDashboard(tenantId: string, options?: {
    period?: Period;
    branchId?: string;
  }) {
    const period = options?.period || 'today';
    const { start, end } = this.getDateRange(period);

    // Qaysi tenant(lar) uchun query qilish
    let tenantIds: string[];
    if (options?.branchId) {
      tenantIds = [options.branchId];
    } else {
      tenantIds = await BranchService.getAllTenantIds(tenantId);
    }

    const dateFilter = { gte: start, lte: end };
    const completedFilter = {
      tenantId: { in: tenantIds },
      status: OrderStatus.COMPLETED,
      createdAt: dateFilter,
    };
    const allOrdersFilter = {
      tenantId: { in: tenantIds },
      createdAt: dateFilter,
    };

    // Parallel so'rovlar
    const [
      revenueResult,
      orderCount,
      completedOrderCount,
      recentOrders,
      topProducts,
      ordersByStatus,
      branchRevenues,
      customerCount,
      employeeCount,
    ] = await Promise.all([
      // 1. Umumiy daromad (COMPLETED buyurtmalar)
      prisma.order.aggregate({
        where: completedFilter,
        _sum: { total: true },
        _avg: { total: true },
      }),

      // 2. Umumiy buyurtma soni
      prisma.order.count({ where: allOrdersFilter }),

      // 3. Yakunlangan buyurtma soni
      prisma.order.count({ where: completedFilter }),

      // 4. So'nggi buyurtmalar
      prisma.order.findMany({
        where: allOrdersFilter,
        include: {
          table: { select: { id: true, number: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 5. Top mahsulotlar
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            tenantId: { in: tenantIds },
            status: OrderStatus.COMPLETED,
            createdAt: dateFilter,
          },
        },
        _sum: { quantity: true, total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),

      // 6. Buyurtmalar status bo'yicha
      prisma.order.groupBy({
        by: ['status'],
        where: allOrdersFilter,
        _count: true,
      }),

      // 7. Filliallar bo'yicha daromad (faqat multi-branch)
      tenantIds.length > 1
        ? prisma.order.groupBy({
            by: ['tenantId'],
            where: completedFilter,
            _sum: { total: true },
            _count: true,
          })
        : Promise.resolve([]),

      // 8. Mijozlar soni
      prisma.customer.count({ where: { tenantId: { in: tenantIds } } }),

      // 9. Xodimlar soni
      prisma.user.count({ where: { tenantId: { in: tenantIds }, isActive: true } }),
    ]);

    // Top products uchun mahsulot nomlarini olish
    const productIds = topProducts.map((tp) => tp.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, image: true, price: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Branch nomlari
    let branchRevenueData: Array<{ tenantId: string; name: string; revenue: number; orderCount: number }> = [];
    if (tenantIds.length > 1 && Array.isArray(branchRevenues) && branchRevenues.length > 0) {
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(tenants.map((t) => [t.id, t.name]));

      branchRevenueData = branchRevenues.map((br) => ({
        tenantId: br.tenantId,
        name: nameMap.get(br.tenantId) || '',
        revenue: Number(br._sum.total || 0),
        orderCount: br._count,
      }));
    }

    return {
      revenue: {
        total: Number(revenueResult._sum.total || 0),
        averageCheck: Math.round(Number(revenueResult._avg.total || 0)),
      },
      orders: {
        total: orderCount,
        completed: completedOrderCount,
      },
      customers: customerCount,
      employees: employeeCount,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        type: o.type,
        total: Number(o.total),
        table: o.table,
        user: o.user,
        branch: o.tenant?.name || '',
        createdAt: o.createdAt,
      })),
      topProducts: topProducts.map((tp) => {
        const product = productMap.get(tp.productId);
        return {
          productId: tp.productId,
          name: product?.name || 'Noma\'lum',
          image: product?.image,
          quantity: tp._sum.quantity || 0,
          revenue: Number(tp._sum.total || 0),
          orderCount: tp._count,
        };
      }),
      ordersByStatus: ordersByStatus.map((os) => ({
        status: os.status,
        count: os._count,
      })),
      branchRevenues: branchRevenueData,
    };
  }

  // Kunlik sotuv grafigi
  static async getDailySales(tenantId: string, period: Period = 'week') {
    const tenantIds = await BranchService.getAllTenantIds(tenantId);
    const { start, end } = this.getDateRange(period);

    const dailySales = await prisma.$queryRaw<Array<{ date: Date; total: number; count: bigint }>>`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(total), 0)::float as total,
        COUNT(*)::bigint as count
      FROM orders
      WHERE tenant_id = ANY(${tenantIds}::text[])
        AND status = 'COMPLETED'
        AND created_at >= ${start}
        AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return dailySales.map((ds) => ({
      date: ds.date,
      revenue: ds.total,
      orderCount: Number(ds.count),
    }));
  }
}
