import { prisma } from '@oshxona/database';

// ==========================================
// SUPER ADMIN SERVICE
// Global statistikalar — FAQAT SUPER_ADMIN uchun
// Alohida tenant data sini ko'rmaydi, faqat aggregated
// ==========================================

interface GlobalStats {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    withSubscription: number;
  };
  orders: {
    todayTotal: number;
    todayRevenue: number;
    weekTotal: number;
    weekRevenue: number;
    monthTotal: number;
    monthRevenue: number;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  system: {
    totalProducts: number;
    totalTables: number;
    totalCategories: number;
  };
}

interface TenantOverview {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  // Aggregated data — individual order/product data YO'Q
  stats: {
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    totalTables: number;
    branchCount: number;
    hasActiveSubscription: boolean;
  };
}

interface TenantPerformanceRanking {
  tenantId: string;
  tenantName: string;
  monthRevenue: number;
  monthOrders: number;
  avgOrderValue: number;
  rank: number;
}

export class SuperAdminService {

  // ==========================================
  // GLOBAL STATISTICS — aggregated only
  // ==========================================

  static async getGlobalStats(): Promise<GlobalStats> {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      tenantTotal, tenantActive,
      subCount,
      todayOrders, weekOrders, monthOrders,
      userTotal, userActive, usersByRole,
      productCount, tableCount, categoryCount,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.table.count(),
      prisma.category.count({ where: { isActive: true } }),
    ]);

    return {
      tenants: {
        total: tenantTotal,
        active: tenantActive,
        inactive: tenantTotal - tenantActive,
        withSubscription: subCount,
      },
      orders: {
        todayTotal: todayOrders._count,
        todayRevenue: Math.round(Number(todayOrders._sum.total || 0)),
        weekTotal: weekOrders._count,
        weekRevenue: Math.round(Number(weekOrders._sum.total || 0)),
        monthTotal: monthOrders._count,
        monthRevenue: Math.round(Number(monthOrders._sum.total || 0)),
      },
      users: {
        total: userTotal,
        active: userActive,
        byRole: Object.fromEntries(usersByRole.map(r => [r.role, r._count])),
      },
      system: {
        totalProducts: productCount,
        totalTables: tableCount,
        totalCategories: categoryCount,
      },
    };
  }

  // ==========================================
  // TENANT OVERVIEW — aggregated per tenant
  // Individual order/product data siz
  // ==========================================

  static async getTenantOverviews(options: {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ tenants: TenantOverview[]; total: number }> {
    const { page, limit, search, isActive } = options;

    const where: any = { parentId: null }; // Faqat parent tenantlar
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const [rawTenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              orders: true,
              products: true,
              tables: true,
              children: true,
            },
          },
          subscription: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    // Aggregated revenue per tenant (privacy — faqat summa)
    const tenantIds = rawTenants.map(t => t.id);
    const revenueByTenant = await prisma.order.groupBy({
      by: ['tenantId'],
      where: { tenantId: { in: tenantIds }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    });
    const revenueMap = new Map(
      revenueByTenant.map(r => [r.tenantId, Math.round(Number(r._sum.total || 0))])
    );

    const tenants: TenantOverview[] = rawTenants.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      stats: {
        totalUsers: t._count.users,
        totalOrders: t._count.orders,
        totalRevenue: revenueMap.get(t.id) || 0,
        totalProducts: t._count.products,
        totalTables: t._count.tables,
        branchCount: t._count.children,
        hasActiveSubscription: t.subscription?.status === 'ACTIVE',
      },
    }));

    return { tenants, total };
  }

  // ==========================================
  // PERFORMANCE RANKING — aggregated
  // ==========================================

  static async getTenantPerformanceRanking(): Promise<TenantPerformanceRanking[]> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const tenants = await prisma.tenant.findMany({
      where: { parentId: null, isActive: true },
      select: { id: true, name: true },
    });

    const orderStats = await prisma.order.groupBy({
      by: ['tenantId'],
      where: {
        tenantId: { in: tenants.map(t => t.id) },
        createdAt: { gte: monthStart },
        status: { not: 'CANCELLED' },
      },
      _count: true,
      _sum: { total: true },
    });

    const statsMap = new Map(
      orderStats.map(s => [s.tenantId, { count: s._count, revenue: Number(s._sum.total || 0) }])
    );

    const rankings: TenantPerformanceRanking[] = tenants
      .map(t => {
        const stats = statsMap.get(t.id) || { count: 0, revenue: 0 };
        return {
          tenantId: t.id,
          tenantName: t.name,
          monthRevenue: Math.round(stats.revenue),
          monthOrders: stats.count,
          avgOrderValue: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
          rank: 0,
        };
      })
      .sort((a, b) => b.monthRevenue - a.monthRevenue);

    rankings.forEach((r, i) => r.rank = i + 1);
    return rankings;
  }
}
