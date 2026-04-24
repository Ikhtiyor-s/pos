import { prisma } from '@oshxona/database';

// ==========================================
// REPORT DATA SERVICE
// Raw data aggregation for all report types
// ==========================================

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SalesReportData {
  period: { type: string; from: string; to: string };
  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    totalDiscount: number;
    totalTax: number;
    avgCheck: number;
  };
  bySource: { source: string; count: number; revenue: number }[];
  byType: { type: string; count: number; revenue: number }[];
  byHour: { hour: number; count: number; revenue: number }[];
  byDay: { date: string; count: number; revenue: number }[];
  topProducts: { name: string; category: string; quantity: number; revenue: number }[];
}

export interface FinancialReportData {
  period: { from: string; to: string };
  revenue: { fromOrders: number; otherIncome: number; total: number };
  expenses: { total: number; byCategory: { name: string; amount: number }[] };
  profit: { gross: number; net: number; margin: number };
  cashFlow: { cash: number; card: number; online: number; other: number };
  orderStats: { count: number; avgCheck: number; totalDiscount: number };
}

export interface ProductRatingData {
  period: { from: string; to: string };
  topProducts: {
    rank: number;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    avgPrice: number;
    orderCount: number;
  }[];
  leastSold: {
    rank: number;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface StaffReportData {
  period: { from: string; to: string };
  staff: {
    name: string;
    role: string;
    ordersCount: number;
    completedOrders: number;
    cancelledOrders: number;
    revenue: number;
    avgCheck: number;
  }[];
}

export interface WarehouseReportData {
  generatedAt: string;
  items: {
    name: string;
    sku: string;
    unit: string;
    quantity: number;
    minQuantity: number;
    costPrice: number;
    totalValue: number;
    status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT';
    supplier: string;
  }[];
  summary: {
    totalItems: number;
    okItems: number;
    lowItems: number;
    criticalItems: number;
    outItems: number;
    totalValue: number;
  };
  recentMovements: {
    itemName: string;
    type: string;
    quantity: number;
    date: string;
    notes: string;
  }[];
}

export interface TaxReportData {
  period: { from: string; to: string };
  byVatRate: {
    rate: number;
    orderCount: number;
    taxableAmount: number;
    vatAmount: number;
  }[];
  byMxikCode: {
    mxikCode: string;
    mxikName: string;
    quantity: number;
    revenue: number;
    vatRate: number;
    vatAmount: number;
  }[];
  totals: {
    taxableRevenue: number;
    totalVat: number;
    vatOrders: number;
  };
}

export class ReportDataService {

  // ==========================================
  // SALES REPORT
  // ==========================================

  static async getSalesData(tenantId: string, range: DateRange): Promise<SalesReportData> {
    const where = {
      tenantId,
      status: { in: ['COMPLETED', 'CANCELLED'] as any },
      createdAt: { gte: range.from, lte: range.to },
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true, categoryId: true } } } },
        payments: { where: { status: 'COMPLETED' } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const completed = orders.filter(o => o.status === 'COMPLETED');
    const cancelled = orders.filter(o => o.status === 'CANCELLED');
    const totalRevenue = completed.reduce((s, o) => s + Number(o.total), 0);
    const totalDiscount = completed.reduce((s, o) => s + Number(o.discount), 0);
    const totalTax = completed.reduce((s, o) => s + Number(o.tax), 0);

    // By source
    const sourceMap = new Map<string, { count: number; revenue: number }>();
    for (const o of completed) {
      const src = o.source;
      const cur = sourceMap.get(src) || { count: 0, revenue: 0 };
      sourceMap.set(src, { count: cur.count + 1, revenue: cur.revenue + Number(o.total) });
    }

    // By type
    const typeMap = new Map<string, { count: number; revenue: number }>();
    for (const o of completed) {
      const t = o.type;
      const cur = typeMap.get(t) || { count: 0, revenue: 0 };
      typeMap.set(t, { count: cur.count + 1, revenue: cur.revenue + Number(o.total) });
    }

    // By hour
    const hourMap = new Map<number, { count: number; revenue: number }>();
    for (const o of completed) {
      const h = new Date(o.createdAt).getHours();
      const cur = hourMap.get(h) || { count: 0, revenue: 0 };
      hourMap.set(h, { count: cur.count + 1, revenue: cur.revenue + Number(o.total) });
    }

    // By day
    const dayMap = new Map<string, { count: number; revenue: number }>();
    for (const o of completed) {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      const cur = dayMap.get(d) || { count: 0, revenue: 0 };
      dayMap.set(d, { count: cur.count + 1, revenue: cur.revenue + Number(o.total) });
    }

    // Top products
    const productMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
    for (const o of completed) {
      for (const item of o.items) {
        const key = item.productId;
        const cur = productMap.get(key) || { name: item.product.name, category: item.product.categoryId || '', quantity: 0, revenue: 0 };
        productMap.set(key, {
          ...cur,
          quantity: cur.quantity + item.quantity,
          revenue: cur.revenue + Number(item.total),
        });
      }
    }

    return {
      period: {
        type: 'custom',
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      summary: {
        totalOrders: orders.length,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalRevenue,
        totalDiscount,
        totalTax,
        avgCheck: completed.length > 0 ? totalRevenue / completed.length : 0,
      },
      bySource: Array.from(sourceMap.entries()).map(([source, v]) => ({ source, ...v })),
      byType: Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v })),
      byHour: Array.from(hourMap.entries())
        .map(([hour, v]) => ({ hour, ...v }))
        .sort((a, b) => a.hour - b.hour),
      byDay: Array.from(dayMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20),
    };
  }

  // ==========================================
  // FINANCIAL REPORT
  // ==========================================

  static async getFinancialData(tenantId: string, range: DateRange): Promise<FinancialReportData> {
    const [orders, expenses, otherIncomes, payments] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, status: 'COMPLETED', createdAt: { gte: range.from, lte: range.to } },
        select: { total: true, discount: true, tax: true, subtotal: true },
      }),
      prisma.expense.findMany({
        where: { tenantId, status: 'PAID', paidAt: { gte: range.from, lte: range.to } },
        include: { category: { select: { name: true } } },
      }),
      prisma.income.findMany({
        where: { tenantId, source: { not: 'ORDER' }, createdAt: { gte: range.from, lte: range.to } },
        select: { amount: true, source: true },
      }),
      prisma.payment.findMany({
        where: {
          order: { tenantId },
          status: 'COMPLETED',
          createdAt: { gte: range.from, lte: range.to },
        },
        select: { method: true, amount: true },
      }),
    ]);

    const orderRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const otherIncome = otherIncomes.reduce((s, i) => s + Number(i.amount), 0);
    const totalRevenue = orderRevenue + otherIncome;
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const expenseByCategory = new Map<string, number>();
    for (const e of expenses) {
      const name = e.category.name;
      expenseByCategory.set(name, (expenseByCategory.get(name) || 0) + Number(e.amount));
    }

    const cashFlow = { cash: 0, card: 0, online: 0, other: 0 };
    for (const p of payments) {
      const method = p.method.toLowerCase();
      if (method === 'cash') cashFlow.cash += Number(p.amount);
      else if (method === 'card' || method === 'terminal') cashFlow.card += Number(p.amount);
      else if (method === 'online' || method === 'click' || method === 'payme') cashFlow.online += Number(p.amount);
      else cashFlow.other += Number(p.amount);
    }

    const grossProfit = totalRevenue;
    const netProfit = totalRevenue - totalExpenses;

    return {
      period: {
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      revenue: { fromOrders: orderRevenue, otherIncome, total: totalRevenue },
      expenses: {
        total: totalExpenses,
        byCategory: Array.from(expenseByCategory.entries()).map(([name, amount]) => ({ name, amount })),
      },
      profit: {
        gross: grossProfit,
        net: netProfit,
        margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      },
      cashFlow,
      orderStats: {
        count: orders.length,
        avgCheck: orders.length > 0 ? orderRevenue / orders.length : 0,
        totalDiscount: orders.reduce((s, o) => s + Number(o.discount), 0),
      },
    };
  }

  // ==========================================
  // PRODUCT RATING REPORT
  // ==========================================

  static async getProductRatingData(tenantId: string, range: DateRange): Promise<ProductRatingData> {
    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: range.from, lte: range.to },
        },
      },
      include: {
        product: { select: { name: true, categoryId: true, category: { select: { name: true } } } },
      },
    });

    const productMap = new Map<string, {
      name: string; category: string; quantity: number; revenue: number; orderCount: Set<string>;
    }>();

    for (const item of items) {
      const key = item.productId;
      const cur = productMap.get(key) || {
        name: item.product.name,
        category: (item.product as any).category?.name || '',
        quantity: 0,
        revenue: 0,
        orderCount: new Set<string>(),
      };
      cur.quantity += item.quantity;
      cur.revenue += Number(item.total);
      cur.orderCount.add(item.orderId);
      productMap.set(key, cur);
    }

    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity);

    return {
      period: {
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      topProducts: sorted.slice(0, 50).map((p, i) => ({
        rank: i + 1,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        revenue: p.revenue,
        avgPrice: p.quantity > 0 ? p.revenue / p.quantity : 0,
        orderCount: p.orderCount.size,
      })),
      leastSold: sorted.slice(-20).reverse().map((p, i) => ({
        rank: i + 1,
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        revenue: p.revenue,
      })),
    };
  }

  // ==========================================
  // STAFF REPORT
  // ==========================================

  static async getStaffData(tenantId: string, range: DateRange): Promise<StaffReportData> {
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['COMPLETED', 'CANCELLED'] as any },
        createdAt: { gte: range.from, lte: range.to },
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    const staffMap = new Map<string, {
      name: string; role: string;
      all: number; completed: number; cancelled: number; revenue: number;
    }>();

    for (const o of orders) {
      const key = o.userId;
      const cur = staffMap.get(key) || {
        name: `${o.user.firstName} ${o.user.lastName}`,
        role: o.user.role,
        all: 0, completed: 0, cancelled: 0, revenue: 0,
      };
      cur.all++;
      if (o.status === 'COMPLETED') { cur.completed++; cur.revenue += Number(o.total); }
      else cur.cancelled++;
      staffMap.set(key, cur);
    }

    return {
      period: {
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      staff: Array.from(staffMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map(s => ({
          name: s.name,
          role: s.role,
          ordersCount: s.all,
          completedOrders: s.completed,
          cancelledOrders: s.cancelled,
          revenue: s.revenue,
          avgCheck: s.completed > 0 ? s.revenue / s.completed : 0,
        })),
    };
  }

  // ==========================================
  // WAREHOUSE REPORT
  // ==========================================

  static async getWarehouseData(tenantId: string): Promise<WarehouseReportData> {
    const [items, movements] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { tenantId, isActive: true },
        include: { supplier: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.inventoryTransaction.findMany({
        where: {
          item: { tenantId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        include: { item: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    let ok = 0, low = 0, critical = 0, out = 0, totalValue = 0;

    const reportItems = items.map(item => {
      const qty = Number(item.quantity);
      const min = Number(item.minQuantity);
      const val = qty * Number(item.costPrice);
      totalValue += val;

      let status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT';
      if (qty === 0) { status = 'OUT'; out++; }
      else if (qty <= min * 0.5) { status = 'CRITICAL'; critical++; }
      else if (qty <= min) { status = 'LOW'; low++; }
      else { status = 'OK'; ok++; }

      return {
        name: item.name,
        sku: item.sku || '',
        unit: item.unit,
        quantity: qty,
        minQuantity: min,
        costPrice: Number(item.costPrice),
        totalValue: val,
        status,
        supplier: (item as any).supplier?.name || '',
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      items: reportItems,
      summary: { totalItems: items.length, okItems: ok, lowItems: low, criticalItems: critical, outItems: out, totalValue },
      recentMovements: movements.map(m => ({
        itemName: (m as any).item?.name || '',
        type: m.type,
        quantity: Number(m.quantity),
        date: m.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        notes: m.notes || '',
      })),
    };
  }

  // ==========================================
  // TAX REPORT
  // ==========================================

  static async getTaxData(tenantId: string, range: DateRange): Promise<TaxReportData> {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: range.from, lte: range.to },
        },
      },
      include: {
        product: {
          select: { name: true, mxikCode: true, mxikName: true, mxikVatRate: true },
        },
        order: { select: { id: true } },
      },
    });

    const vatRateMap = new Map<number, { orderCount: Set<string>; taxableAmount: number; vatAmount: number }>();
    const mxikMap = new Map<string, {
      mxikCode: string; mxikName: string; quantity: number; revenue: number; vatRate: number; vatAmount: number;
    }>();

    for (const item of orderItems) {
      const vatRate = (item.product as any).mxikVatRate || 0;
      const revenue = Number(item.total);
      const vatAmount = revenue * (vatRate / (100 + vatRate)); // inclusive VAT

      // By VAT rate
      const cur = vatRateMap.get(vatRate) || { orderCount: new Set(), taxableAmount: 0, vatAmount: 0 };
      cur.orderCount.add(item.order.id);
      cur.taxableAmount += revenue;
      cur.vatAmount += vatAmount;
      vatRateMap.set(vatRate, cur);

      // By MXIK code
      const code = (item.product as any).mxikCode;
      if (code) {
        const mcur = mxikMap.get(code) || {
          mxikCode: code,
          mxikName: (item.product as any).mxikName || code,
          quantity: 0,
          revenue: 0,
          vatRate,
          vatAmount: 0,
        };
        mcur.quantity += item.quantity;
        mcur.revenue += revenue;
        mcur.vatAmount += vatAmount;
        mxikMap.set(code, mcur);
      }
    }

    const totalVat = Array.from(vatRateMap.values()).reduce((s, v) => s + v.vatAmount, 0);
    const taxableRevenue = orderItems.reduce((s, i) => s + Number(i.total), 0);

    return {
      period: {
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      byVatRate: Array.from(vatRateMap.entries()).map(([rate, v]) => ({
        rate,
        orderCount: v.orderCount.size,
        taxableAmount: v.taxableAmount,
        vatAmount: v.vatAmount,
      })).sort((a, b) => b.rate - a.rate),
      byMxikCode: Array.from(mxikMap.values()).sort((a, b) => b.revenue - a.revenue),
      totals: {
        taxableRevenue,
        totalVat,
        vatOrders: new Set(orderItems.map(i => i.order.id)).size,
      },
    };
  }

  // ==========================================
  // DASHBOARD QUICK STATS
  // ==========================================

  static async getDashboardStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrders, topProducts, lowStockCount] = await Promise.all([
      prisma.order.aggregate({
        where: { tenantId, status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { tenantId, status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM inventory_items
        WHERE tenant_id = ${tenantId}
        AND is_active = true
        AND quantity <= min_quantity
      `,
    ]);

    const productIds = topProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, image: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    return {
      today: {
        revenue: Number(todayOrders._sum.total || 0),
        orders: todayOrders._count,
        avgCheck: todayOrders._count > 0
          ? Number(todayOrders._sum.total || 0) / todayOrders._count
          : 0,
      },
      topProducts: topProducts.map(p => ({
        name: productMap.get(p.productId)?.name || 'Unknown',
        image: productMap.get(p.productId)?.image || null,
        quantity: Number(p._sum.quantity || 0),
        revenue: Number(p._sum.total || 0),
      })),
      lowStockCount: Number(lowStockCount[0]?.count || 0),
    };
  }
}
