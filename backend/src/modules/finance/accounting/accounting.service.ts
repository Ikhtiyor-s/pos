import { prisma, Prisma } from '@oshxona/database';

// ==========================================
// FINANCIAL ACCOUNTING SERVICE
// Source-separated: POS vs Nonbor vs Online vs boshqa
// ==========================================

// --- Types ---

interface SalesBreakdown {
  source: string;
  sourceLabel: string;
  orders: number;
  grossRevenue: number;
  discounts: number;
  tax: number;
  netRevenue: number;
  avgOrderValue: number;
  refunds: number;
  netAfterRefunds: number;
}

interface RefundSummary {
  totalRefunds: number;
  refundCount: number;
  bySource: Array<{ source: string; count: number; amount: number }>;
  byMethod: Array<{ method: string; count: number; amount: number }>;
}

interface IngredientCostReport {
  totalIngredientCost: number;
  totalPurchaseOrders: number;
  totalWasteCost: number;
  netIngredientCost: number;
  byItem: Array<{
    itemId: string;
    name: string;
    unit: string;
    consumed: number;
    costPerUnit: number;
    totalCost: number;
    wasteCost: number;
    percentOfTotal: number;
  }>;
  bySupplier: Array<{
    supplierId: string;
    name: string;
    totalPurchased: number;
    orderCount: number;
  }>;
}

interface SourceSeparatedPnL {
  period: { from: string; to: string };
  // Revenue
  localPOS: SalesBreakdown;
  nonborOnline: SalesBreakdown;
  otherOnline: SalesBreakdown;
  totalRevenue: {
    gross: number;
    discounts: number;
    tax: number;
    net: number;
    refunds: number;
    netAfterRefunds: number;
  };
  // Costs
  ingredientCost: IngredientCostReport;
  operatingExpenses: {
    total: number;
    byCategory: Array<{ category: string; amount: number; percent: number }>;
  };
  // Profit
  grossProfit: number;
  grossMargin: number;
  operatingProfit: number;
  operatingMargin: number;
  // Comparison
  previousPeriod?: {
    totalRevenue: number;
    grossProfit: number;
    revenueGrowth: number;
    profitGrowth: number;
  };
}

interface FinancialDashboard {
  summary: {
    todayRevenue: number;
    todayExpenses: number;
    todayProfit: number;
    monthRevenue: number;
    monthExpenses: number;
    monthProfit: number;
    outstandingExpenses: number;
    activeCashRegisters: number;
  };
  revenueBySource: SalesBreakdown[];
  refunds: RefundSummary;
  ingredientCost: IngredientCostReport;
  profitAndLoss: SourceSeparatedPnL;
  insights: AccountingInsight[];
}

interface AccountingInsight {
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'CRITICAL';
  icon: string;
  title: string;
  message: string;
}

const SOURCE_LABELS: Record<string, string> = {
  POS_ORDER: 'POS Terminal',
  WAITER_ORDER: 'Ofitsiant',
  QR_ORDER: 'QR Menyu',
  NONBOR_ORDER: 'Nonbor Marketplace',
  TELEGRAM_ORDER: 'Telegram Bot',
  WEBSITE_ORDER: 'Veb-sayt',
  API_ORDER: 'Tashqi API',
};

export class AccountingService {

  // ==========================================
  // 1. SALES BREAKDOWN BY SOURCE
  // ==========================================

  async getSalesBySource(tenantId: string, dateFrom: Date, dateTo: Date): Promise<SalesBreakdown[]> {
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateFrom, lte: dateTo },
        status: { not: 'CANCELLED' },
      },
      select: {
        source: true,
        subtotal: true,
        discount: true,
        tax: true,
        total: true,
      },
    });

    // Refundlarni olish
    const refunds = await prisma.payment.findMany({
      where: {
        order: { tenantId, createdAt: { gte: dateFrom, lte: dateTo } },
        status: 'REFUNDED',
      },
      select: {
        amount: true,
        order: { select: { source: true } },
      },
    });

    const sourceMap = new Map<string, {
      orders: number; gross: number; discounts: number; tax: number; net: number; refunds: number;
    }>();

    for (const order of orders) {
      const src = order.source || 'POS_ORDER';
      if (!sourceMap.has(src)) {
        sourceMap.set(src, { orders: 0, gross: 0, discounts: 0, tax: 0, net: 0, refunds: 0 });
      }
      const e = sourceMap.get(src)!;
      e.orders++;
      e.gross += Number(order.subtotal);
      e.discounts += Number(order.discount);
      e.tax += Number(order.tax);
      e.net += Number(order.total);
    }

    for (const refund of refunds) {
      const src = refund.order?.source || 'POS_ORDER';
      const e = sourceMap.get(src);
      if (e) e.refunds += Number(refund.amount);
    }

    const result: SalesBreakdown[] = [];
    for (const [source, data] of sourceMap) {
      result.push({
        source,
        sourceLabel: SOURCE_LABELS[source] || source,
        orders: data.orders,
        grossRevenue: Math.round(data.gross),
        discounts: Math.round(data.discounts),
        tax: Math.round(data.tax),
        netRevenue: Math.round(data.net),
        avgOrderValue: data.orders > 0 ? Math.round(data.net / data.orders) : 0,
        refunds: Math.round(data.refunds),
        netAfterRefunds: Math.round(data.net - data.refunds),
      });
    }

    return result.sort((a, b) => b.netRevenue - a.netRevenue);
  }

  // ==========================================
  // 2. REFUND SUMMARY
  // ==========================================

  async getRefundSummary(tenantId: string, dateFrom: Date, dateTo: Date): Promise<RefundSummary> {
    const refunds = await prisma.payment.findMany({
      where: {
        order: { tenantId, createdAt: { gte: dateFrom, lte: dateTo } },
        status: 'REFUNDED',
      },
      select: {
        amount: true,
        method: true,
        order: { select: { source: true } },
      },
    });

    const bySource = new Map<string, { count: number; amount: number }>();
    const byMethod = new Map<string, { count: number; amount: number }>();

    for (const refund of refunds) {
      const src = refund.order?.source || 'POS_ORDER';
      if (!bySource.has(src)) bySource.set(src, { count: 0, amount: 0 });
      const se = bySource.get(src)!;
      se.count++;
      se.amount += Number(refund.amount);

      const method = refund.method;
      if (!byMethod.has(method)) byMethod.set(method, { count: 0, amount: 0 });
      const me = byMethod.get(method)!;
      me.count++;
      me.amount += Number(refund.amount);
    }

    return {
      totalRefunds: refunds.reduce((s, r) => s + Number(r.amount), 0),
      refundCount: refunds.length,
      bySource: Array.from(bySource.entries()).map(([source, data]) => ({
        source, ...data, amount: Math.round(data.amount),
      })),
      byMethod: Array.from(byMethod.entries()).map(([method, data]) => ({
        method, ...data, amount: Math.round(data.amount),
      })),
    };
  }

  // ==========================================
  // 3. INGREDIENT COST REPORT
  // ==========================================

  async getIngredientCostReport(tenantId: string, dateFrom: Date, dateTo: Date): Promise<IngredientCostReport> {
    // Inventory tranzaksiyalari (OUT = sarf)
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        item: { tenantId },
        type: 'OUT',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        itemId: true,
        quantity: true,
        item: { select: { id: true, name: true, unit: true, costPrice: true } },
      },
    });

    // Buyurtma ingredient sarfi (OrderItem -> ProductIngredient)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { tenantId, createdAt: { gte: dateFrom, lte: dateTo }, status: { not: 'CANCELLED' } },
        status: { not: 'CANCELLED' },
      },
      select: {
        quantity: true,
        product: {
          select: {
            ingredients: {
              select: {
                inventoryItemId: true,
                quantity: true,
                inventoryItem: { select: { id: true, name: true, unit: true, costPrice: true } },
              },
            },
          },
        },
      },
    });

    // Waste logs
    const wasteLogs = await prisma.wasteLog.findMany({
      where: { tenantId, createdAt: { gte: dateFrom, lte: dateTo } },
      select: { inventoryItemId: true, costAmount: true },
    });

    // Purchase orders (RECEIVED)
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: 'RECEIVED',
        receivedAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        totalAmount: true,
        supplierId: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    // Item bo'yicha hisoblash
    const itemMap = new Map<string, {
      name: string; unit: string; costPerUnit: number; consumed: number; wasteCost: number;
    }>();

    // Tranzaksiya sarflari
    for (const tx of transactions) {
      const id = tx.itemId;
      if (!itemMap.has(id)) {
        itemMap.set(id, {
          name: tx.item.name, unit: tx.item.unit,
          costPerUnit: Number(tx.item.costPrice), consumed: 0, wasteCost: 0,
        });
      }
      itemMap.get(id)!.consumed += Number(tx.quantity);
    }

    // Buyurtma ingredient sarflari
    for (const oi of orderItems) {
      for (const ing of oi.product.ingredients) {
        const id = ing.inventoryItemId;
        if (!itemMap.has(id)) {
          itemMap.set(id, {
            name: ing.inventoryItem.name, unit: ing.inventoryItem.unit,
            costPerUnit: Number(ing.inventoryItem.costPrice), consumed: 0, wasteCost: 0,
          });
        }
        itemMap.get(id)!.consumed += Number(ing.quantity) * oi.quantity;
      }
    }

    // Waste
    for (const wl of wasteLogs) {
      const entry = itemMap.get(wl.inventoryItemId);
      if (entry) entry.wasteCost += Number(wl.costAmount);
    }

    const byItem: IngredientCostReport['byItem'] = [];
    let totalIngredientCost = 0;
    let totalWasteCost = 0;

    for (const [itemId, data] of itemMap) {
      const totalCost = data.consumed * data.costPerUnit;
      totalIngredientCost += totalCost;
      totalWasteCost += data.wasteCost;

      byItem.push({
        itemId,
        name: data.name,
        unit: data.unit,
        consumed: Math.round(data.consumed * 100) / 100,
        costPerUnit: data.costPerUnit,
        totalCost: Math.round(totalCost),
        wasteCost: Math.round(data.wasteCost),
        percentOfTotal: 0, // Will be calculated below
      });
    }

    // Percent
    for (const item of byItem) {
      item.percentOfTotal = totalIngredientCost > 0
        ? Math.round((item.totalCost / totalIngredientCost) * 10000) / 100
        : 0;
    }
    byItem.sort((a, b) => b.totalCost - a.totalCost);

    // Suppliers
    const supplierMap = new Map<string, { name: string; total: number; count: number }>();
    for (const po of purchaseOrders) {
      const sid = po.supplierId;
      if (!supplierMap.has(sid)) {
        supplierMap.set(sid, { name: po.supplier.name, total: 0, count: 0 });
      }
      const e = supplierMap.get(sid)!;
      e.total += Number(po.totalAmount);
      e.count++;
    }

    return {
      totalIngredientCost: Math.round(totalIngredientCost),
      totalPurchaseOrders: purchaseOrders.reduce((s, p) => s + Number(p.totalAmount), 0),
      totalWasteCost: Math.round(totalWasteCost),
      netIngredientCost: Math.round(totalIngredientCost + totalWasteCost),
      byItem,
      bySupplier: Array.from(supplierMap.entries()).map(([supplierId, data]) => ({
        supplierId,
        name: data.name,
        totalPurchased: Math.round(data.total),
        orderCount: data.count,
      })).sort((a, b) => b.totalPurchased - a.totalPurchased),
    };
  }

  // ==========================================
  // 4. SOURCE-SEPARATED P&L
  // ==========================================

  async getSourceSeparatedPnL(tenantId: string, dateFrom: string, dateTo: string): Promise<SourceSeparatedPnL> {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const [salesBySource, refunds, ingredientCost] = await Promise.all([
      this.getSalesBySource(tenantId, from, to),
      this.getRefundSummary(tenantId, from, to),
      this.getIngredientCostReport(tenantId, from, to),
    ]);

    // Group into 3 categories
    const localPOSSources = ['POS_ORDER', 'WAITER_ORDER', 'QR_ORDER'];
    const nonborSources = ['NONBOR_ORDER'];

    const groupSales = (sources: string[]): SalesBreakdown => {
      const matching = salesBySource.filter(s => sources.includes(s.source));
      if (matching.length === 0) {
        return {
          source: sources[0] || 'NONE', sourceLabel: 'N/A',
          orders: 0, grossRevenue: 0, discounts: 0, tax: 0,
          netRevenue: 0, avgOrderValue: 0, refunds: 0, netAfterRefunds: 0,
        };
      }
      const orders = matching.reduce((s, m) => s + m.orders, 0);
      const net = matching.reduce((s, m) => s + m.netRevenue, 0);
      return {
        source: sources.join(','),
        sourceLabel: matching.map(m => m.sourceLabel).join(', '),
        orders,
        grossRevenue: matching.reduce((s, m) => s + m.grossRevenue, 0),
        discounts: matching.reduce((s, m) => s + m.discounts, 0),
        tax: matching.reduce((s, m) => s + m.tax, 0),
        netRevenue: net,
        avgOrderValue: orders > 0 ? Math.round(net / orders) : 0,
        refunds: matching.reduce((s, m) => s + m.refunds, 0),
        netAfterRefunds: matching.reduce((s, m) => s + m.netAfterRefunds, 0),
      };
    };

    const localPOS = groupSales(localPOSSources);
    localPOS.sourceLabel = 'Mahalliy POS (Terminal + Ofitsiant + QR)';

    const nonborOnline = groupSales(nonborSources);
    nonborOnline.sourceLabel = 'Nonbor Marketplace';

    const otherOnlineSources = salesBySource
      .filter(s => !localPOSSources.includes(s.source) && !nonborSources.includes(s.source))
      .map(s => s.source);
    const otherOnline = groupSales(otherOnlineSources);
    otherOnline.sourceLabel = 'Boshqa Online (Telegram, Website, API)';

    const totalNet = localPOS.netAfterRefunds + nonborOnline.netAfterRefunds + otherOnline.netAfterRefunds;

    // Operating expenses
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        createdAt: { gte: from, lte: to },
      },
      include: { category: { select: { name: true } } },
    });

    const expByCat = new Map<string, number>();
    let totalExpenses = 0;
    for (const exp of expenses) {
      const cat = exp.category.name;
      expByCat.set(cat, (expByCat.get(cat) || 0) + Number(exp.amount));
      totalExpenses += Number(exp.amount);
    }

    const grossProfit = totalNet - ingredientCost.netIngredientCost;
    const operatingProfit = grossProfit - totalExpenses;

    // Previous period comparison
    const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
    const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - periodDays);
    const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);

    const prevOrders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo }, status: { not: 'CANCELLED' } },
      select: { total: true, subtotal: true },
    });
    const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);

    const prevExpenses = await prisma.expense.findMany({
      where: { tenantId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: prevFrom, lte: prevTo } },
      select: { amount: true },
    });
    const prevExpTotal = prevExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const prevGrossProfit = prevRevenue - prevExpTotal;

    const pctGrowth = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

    return {
      period: { from: dateFrom, to: dateTo },
      localPOS,
      nonborOnline,
      otherOnline,
      totalRevenue: {
        gross: salesBySource.reduce((s, b) => s + b.grossRevenue, 0),
        discounts: salesBySource.reduce((s, b) => s + b.discounts, 0),
        tax: salesBySource.reduce((s, b) => s + b.tax, 0),
        net: totalNet + refunds.totalRefunds, // before refunds
        refunds: refunds.totalRefunds,
        netAfterRefunds: totalNet,
      },
      ingredientCost,
      operatingExpenses: {
        total: Math.round(totalExpenses),
        byCategory: Array.from(expByCat.entries()).map(([category, amount]) => ({
          category,
          amount: Math.round(amount),
          percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 10000) / 100 : 0,
        })).sort((a, b) => b.amount - a.amount),
      },
      grossProfit: Math.round(grossProfit),
      grossMargin: totalNet > 0 ? Math.round((grossProfit / totalNet) * 10000) / 100 : 0,
      operatingProfit: Math.round(operatingProfit),
      operatingMargin: totalNet > 0 ? Math.round((operatingProfit / totalNet) * 10000) / 100 : 0,
      previousPeriod: {
        totalRevenue: Math.round(prevRevenue),
        grossProfit: Math.round(prevGrossProfit),
        revenueGrowth: pctGrowth(totalNet, prevRevenue),
        profitGrowth: pctGrowth(operatingProfit, prevGrossProfit),
      },
    };
  }

  // ==========================================
  // 5. FINANCIAL DASHBOARD
  // ==========================================

  async getFinancialDashboard(tenantId: string): Promise<FinancialDashboard> {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaySales,
      monthSales,
      todayExpenses,
      monthExpenses,
      outstandingExpenses,
      activeCashRegisters,
      revenueBySource,
      refunds,
      ingredientCost,
      pnl,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: { tenantId, createdAt: { gte: todayStart, lte: todayEnd }, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { tenantId, createdAt: { gte: monthStart }, status: { in: ['APPROVED', 'PAID'] } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { amount: true },
      }),
      prisma.cashRegister.count({ where: { tenantId, closedAt: null } }),
      this.getSalesBySource(tenantId, monthStart, todayEnd),
      this.getRefundSummary(tenantId, monthStart, todayEnd),
      this.getIngredientCostReport(tenantId, monthStart, todayEnd),
      this.getSourceSeparatedPnL(tenantId, monthStart.toISOString(), todayEnd.toISOString()),
    ]);

    const todayRev = Number(todaySales._sum.total || 0);
    const todayExp = Number(todayExpenses._sum.amount || 0);
    const monthRev = Number(monthSales._sum.total || 0);
    const monthExp = Number(monthExpenses._sum.amount || 0);

    const insights = this.generateInsights(pnl, revenueBySource, ingredientCost, refunds);

    return {
      summary: {
        todayRevenue: Math.round(todayRev),
        todayExpenses: Math.round(todayExp),
        todayProfit: Math.round(todayRev - todayExp),
        monthRevenue: Math.round(monthRev),
        monthExpenses: Math.round(monthExp),
        monthProfit: Math.round(monthRev - monthExp),
        outstandingExpenses: Math.round(Number(outstandingExpenses._sum.amount || 0)),
        activeCashRegisters,
      },
      revenueBySource,
      refunds,
      ingredientCost,
      profitAndLoss: pnl,
      insights,
    };
  }

  // ==========================================
  // AI INSIGHTS
  // ==========================================

  private generateInsights(
    pnl: SourceSeparatedPnL,
    salesBySource: SalesBreakdown[],
    ingredientCost: IngredientCostReport,
    refunds: RefundSummary,
  ): AccountingInsight[] {
    const insights: AccountingInsight[] = [];

    // --- Margin health ---
    if (pnl.grossMargin < 40) {
      insights.push({
        type: 'CRITICAL', icon: '🚨',
        title: 'Yalpi margin xavfli darajada past',
        message: `Yalpi margin ${pnl.grossMargin}% — 40% dan past. Ingredient xarajatlari yoki chegirmalarni qayta ko'rib chiqing.`,
      });
    } else if (pnl.grossMargin < 55) {
      insights.push({
        type: 'WARNING', icon: '⚠️',
        title: 'Yalpi margin pastaymoqda',
        message: `Yalpi margin ${pnl.grossMargin}%. Sog'lom restoran uchun 55-70% tavsiya etiladi.`,
      });
    } else {
      insights.push({
        type: 'SUCCESS', icon: '✅',
        title: 'Yalpi margin sog\'lom',
        message: `Yalpi margin ${pnl.grossMargin}% — yaxshi ko'rsatkich.`,
      });
    }

    // --- Revenue growth ---
    if (pnl.previousPeriod) {
      if (pnl.previousPeriod.revenueGrowth > 10) {
        insights.push({
          type: 'SUCCESS', icon: '📈',
          title: 'Daromad o\'sishda',
          message: `Daromad oldingi davrga nisbatan ${pnl.previousPeriod.revenueGrowth}% oshgan.`,
        });
      } else if (pnl.previousPeriod.revenueGrowth < -10) {
        insights.push({
          type: 'WARNING', icon: '📉',
          title: 'Daromad tushgan',
          message: `Daromad oldingi davrga nisbatan ${Math.abs(pnl.previousPeriod.revenueGrowth)}% kamaygan.`,
        });
      }
    }

    // --- Nonbor vs POS comparison ---
    const posRev = pnl.localPOS.netAfterRefunds;
    const nonborRev = pnl.nonborOnline.netAfterRefunds;
    const totalRev = posRev + nonborRev + pnl.otherOnline.netAfterRefunds;

    if (nonborRev > 0 && totalRev > 0) {
      const nonborPercent = Math.round((nonborRev / totalRev) * 100);
      insights.push({
        type: 'INFO', icon: '🛒',
        title: `Nonbor daromad ulushi: ${nonborPercent}%`,
        message: `Nonbor: ${nonborRev.toLocaleString()} so'm (${pnl.nonborOnline.orders} buyurtma), POS: ${posRev.toLocaleString()} so'm (${pnl.localPOS.orders} buyurtma).`,
      });

      // AOV comparison
      if (pnl.nonborOnline.avgOrderValue > 0 && pnl.localPOS.avgOrderValue > 0) {
        const aovDiff = pnl.nonborOnline.avgOrderValue - pnl.localPOS.avgOrderValue;
        if (Math.abs(aovDiff) > 5000) {
          const higher = aovDiff > 0 ? 'Nonbor' : 'POS';
          insights.push({
            type: 'INFO', icon: '💰',
            title: `${higher} da o'rtacha chek yuqoriroq`,
            message: `Nonbor AOV: ${pnl.nonborOnline.avgOrderValue.toLocaleString()} so'm, POS AOV: ${pnl.localPOS.avgOrderValue.toLocaleString()} so'm.`,
          });
        }
      }
    }

    // --- Ingredient cost ratio ---
    if (totalRev > 0) {
      const costRatio = Math.round((ingredientCost.netIngredientCost / totalRev) * 100);
      if (costRatio > 35) {
        insights.push({
          type: 'WARNING', icon: '🥩',
          title: `Ingredient xarajati yuqori (${costRatio}%)`,
          message: `Ingredient xarajati daromadning ${costRatio}% ni tashkil qiladi. 25-35% maqsad. Retseptlarni optimallashtirishni ko'rib chiqing.`,
        });
      }
    }

    // --- Waste ---
    if (ingredientCost.totalWasteCost > 0) {
      const wastePercent = ingredientCost.totalIngredientCost > 0
        ? Math.round((ingredientCost.totalWasteCost / ingredientCost.totalIngredientCost) * 100)
        : 0;
      if (wastePercent > 5) {
        insights.push({
          type: 'WARNING', icon: '🗑️',
          title: `Isrof darajasi yuqori (${wastePercent}%)`,
          message: `Ingredient isrofi ${ingredientCost.totalWasteCost.toLocaleString()} so'm — umumiy ingredient xarajatining ${wastePercent}%. Saqlash va tayyorlash jarayonlarini tekshiring.`,
        });
      }
    }

    // --- Refunds ---
    if (refunds.refundCount > 0 && totalRev > 0) {
      const refundPercent = Math.round((refunds.totalRefunds / totalRev) * 100);
      if (refundPercent > 3) {
        insights.push({
          type: 'WARNING', icon: '↩️',
          title: `Qaytarishlar ko'p (${refundPercent}%)`,
          message: `${refunds.refundCount} ta qaytarish, jami ${refunds.totalRefunds.toLocaleString()} so'm. Sabab tekshirilsin.`,
        });
      }
    }

    // --- Top ingredient cost ---
    if (ingredientCost.byItem.length >= 3) {
      const top3 = ingredientCost.byItem.slice(0, 3);
      const top3Percent = top3.reduce((s, t) => s + t.percentOfTotal, 0);
      insights.push({
        type: 'INFO', icon: '📋',
        title: 'Eng qimmat ingredientlar',
        message: `${top3.map(t => t.name).join(', ')} — ingredient xarajatlarining ${Math.round(top3Percent)}% ni tashkil qiladi.`,
      });
    }

    // --- Operating margin ---
    if (pnl.operatingMargin < 10) {
      insights.push({
        type: 'CRITICAL', icon: '💸',
        title: `Operatsion margin juda past (${pnl.operatingMargin}%)`,
        message: `Operatsion foyda ${pnl.operatingProfit.toLocaleString()} so'm. Xarajatlarni qisqartirish yoki daromadni oshirish talab etiladi.`,
      });
    }

    return insights.sort((a, b) => {
      const p: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUCCESS: 2, INFO: 3 };
      return (p[a.type] ?? 3) - (p[b.type] ?? 3);
    });
  }
}

export const accountingService = new AccountingService();
