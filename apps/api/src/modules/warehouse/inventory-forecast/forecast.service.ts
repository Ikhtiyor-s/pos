import { prisma } from '@oshxona/database';
import { Decimal } from '@prisma/client/runtime/library';

// ==========================================
// AI INVENTORY FORECASTING SERVICE
// ==========================================

interface ConsumptionHistory {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  dailyConsumption: number[];       // Oxirgi N kun uchun kunlik sarflar
  avgDailyConsumption: number;       // O'rtacha kunlik sarf
  weightedDailyConsumption: number;  // Og'irlikli o'rtacha (yangi kunlar og'irroq)
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendPercent: number;              // Trend foizi (+/- %)
  weekdayPattern: number[];          // Hafta kunlari bo'yicha sarf (0=Dush, 6=Yak)
}

interface StockoutPrediction {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  currentQuantity: number;
  minQuantity: number;
  avgDailyConsumption: number;
  daysUntilStockout: number;
  daysUntilMinLevel: number;
  stockoutDate: string;
  minLevelDate: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK';
  insight: string;
}

interface PurchaseRecommendation {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  currentQuantity: number;
  suggestedQuantity: number;
  estimatedCost: number;
  costPrice: number;
  reason: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  coverageDays: number;
  supplier?: { id: string; name: string };
}

interface IngredientUsageRank {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  totalConsumed: number;
  avgDaily: number;
  totalCost: number;
  topProducts: { name: string; quantityPerUnit: number; orderCount: number }[];
  percentOfTotalCost: number;
}

interface InventoryForecastDashboard {
  summary: {
    totalItems: number;
    criticalItems: number;
    highRiskItems: number;
    healthyItems: number;
    totalInventoryValue: number;
    estimatedWeeklyCost: number;
  };
  stockoutPredictions: StockoutPrediction[];
  topUsedIngredients: IngredientUsageRank[];
  purchaseRecommendations: PurchaseRecommendation[];
  insights: ForecastInsight[];
  consumptionTrends: ConsumptionHistory[];
}

interface ForecastInsight {
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  icon: string;
  title: string;
  message: string;
  itemId?: string;
  metric?: string;
  value?: number;
}

export class InventoryForecastService {

  // ==========================================
  // 1. CONSUMPTION HISTORY ANALYSIS
  // ==========================================

  async analyzeConsumption(tenantId: string, days: number = 30): Promise<ConsumptionHistory[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Barcha aktiv inventory itemlarni olish
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, unit: true },
    });

    // OUT tranzaksiyalarni olish (sarf)
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        item: { tenantId },
        type: 'OUT',
        createdAt: { gte: since },
      },
      select: {
        itemId: true,
        quantity: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mahsulot buyurtmalari orqali ingredient sarfi (ProductIngredient)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        status: { not: 'CANCELLED' },
      },
      select: {
        quantity: true,
        createdAt: true,
        product: {
          select: {
            ingredients: {
              select: {
                inventoryItemId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    // Item bo'yicha kunlik sarf hisoblash
    const itemDailyMap = new Map<string, Map<string, number>>(); // itemId -> dateStr -> qty

    // Tranzaksiyalardan
    for (const tx of transactions) {
      const dateStr = tx.createdAt.toISOString().split('T')[0];
      if (!itemDailyMap.has(tx.itemId)) itemDailyMap.set(tx.itemId, new Map());
      const dayMap = itemDailyMap.get(tx.itemId)!;
      dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + Number(tx.quantity));
    }

    // Buyurtma ingredientlaridan
    for (const oi of orderItems) {
      const dateStr = oi.createdAt.toISOString().split('T')[0];
      for (const ing of oi.product.ingredients) {
        const consumed = Number(ing.quantity) * oi.quantity;
        if (!itemDailyMap.has(ing.inventoryItemId)) itemDailyMap.set(ing.inventoryItemId, new Map());
        const dayMap = itemDailyMap.get(ing.inventoryItemId)!;
        dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + consumed);
      }
    }

    const results: ConsumptionHistory[] = [];

    for (const item of items) {
      const dayMap = itemDailyMap.get(item.id);
      if (!dayMap || dayMap.size === 0) continue;

      // Oxirgi N kunni to'ldirish (0 lar bilan)
      const dailyConsumption: number[] = [];
      const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
      const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

      for (let d = 0; d < days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - d));
        const dateStr = date.toISOString().split('T')[0];
        const qty = dayMap.get(dateStr) || 0;
        dailyConsumption.push(Math.round(qty * 1000) / 1000);

        const weekday = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0=Mon
        weekdayTotals[weekday] += qty;
        weekdayCounts[weekday]++;
      }

      // O'rtacha kunlik sarf
      const nonZeroDays = dailyConsumption.filter(d => d > 0);
      const avgDaily = nonZeroDays.length > 0
        ? nonZeroDays.reduce((a, b) => a + b, 0) / days
        : 0;

      // Og'irlikli o'rtacha (oxirgi kunlar og'irroq)
      const weightedDaily = this.weightedMovingAverage(dailyConsumption);

      // Trend — birinchi yarmi vs ikkinchi yarmi
      const half = Math.floor(dailyConsumption.length / 2);
      const firstHalf = dailyConsumption.slice(0, half);
      const secondHalf = dailyConsumption.slice(half);
      const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
      const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

      let trendDirection: ConsumptionHistory['trendDirection'] = 'STABLE';
      let trendPercent = 0;
      if (avgFirst > 0) {
        trendPercent = Math.round(((avgSecond - avgFirst) / avgFirst) * 100);
        if (trendPercent > 10) trendDirection = 'INCREASING';
        else if (trendPercent < -10) trendDirection = 'DECREASING';
      }

      // Hafta kunlari bo'yicha o'rtacha
      const weekdayPattern = weekdayTotals.map((total, i) =>
        weekdayCounts[i] > 0 ? Math.round((total / weekdayCounts[i]) * 100) / 100 : 0
      );

      results.push({
        inventoryItemId: item.id,
        itemName: item.name,
        unit: item.unit,
        dailyConsumption,
        avgDailyConsumption: Math.round(avgDaily * 100) / 100,
        weightedDailyConsumption: Math.round(weightedDaily * 100) / 100,
        trendDirection,
        trendPercent,
        weekdayPattern,
      });
    }

    return results.sort((a, b) => b.avgDailyConsumption - a.avgDailyConsumption);
  }

  // ==========================================
  // 2. STOCKOUT PREDICTION
  // ==========================================

  async predictStockouts(tenantId: string): Promise<StockoutPrediction[]> {
    const consumption = await this.analyzeConsumption(tenantId, 30);

    const items = await prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        quantity: true,
        minQuantity: true,
      },
    });

    const itemMap = new Map(items.map(i => [i.id, i]));
    const predictions: StockoutPrediction[] = [];

    for (const cons of consumption) {
      const item = itemMap.get(cons.inventoryItemId);
      if (!item) continue;

      const currentQty = Number(item.quantity);
      const minQty = Number(item.minQuantity);

      // Trend ni hisobga olib bashorat qilish
      // Agar trend ortayotgan bo'lsa — og'irlikli o'rtachani ishlatamiz
      const dailyRate = cons.trendDirection === 'INCREASING'
        ? cons.weightedDailyConsumption
        : cons.avgDailyConsumption;

      let daysUntilStockout: number;
      let daysUntilMinLevel: number;

      if (dailyRate <= 0) {
        daysUntilStockout = 999;
        daysUntilMinLevel = 999;
      } else {
        daysUntilStockout = Math.floor(currentQty / dailyRate);
        daysUntilMinLevel = Math.floor(Math.max(0, currentQty - minQty) / dailyRate);
      }

      // Sanalar
      const stockoutDate = new Date();
      stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
      const minLevelDate = new Date();
      minLevelDate.setDate(minLevelDate.getDate() + daysUntilMinLevel);

      // Urgency
      let urgency: StockoutPrediction['urgency'];
      if (currentQty <= 0 || daysUntilStockout <= 1) urgency = 'CRITICAL';
      else if (daysUntilMinLevel <= 2) urgency = 'HIGH';
      else if (daysUntilMinLevel <= 5) urgency = 'MEDIUM';
      else if (daysUntilMinLevel <= 10) urgency = 'LOW';
      else urgency = 'OK';

      // Insight generatsiya
      const insight = this.generateStockoutInsight(cons, currentQty, daysUntilStockout, daysUntilMinLevel);

      predictions.push({
        inventoryItemId: cons.inventoryItemId,
        itemName: cons.itemName,
        unit: cons.unit,
        currentQuantity: Math.round(currentQty * 100) / 100,
        minQuantity: Math.round(minQty * 100) / 100,
        avgDailyConsumption: cons.avgDailyConsumption,
        daysUntilStockout,
        daysUntilMinLevel,
        stockoutDate: stockoutDate.toISOString().split('T')[0],
        minLevelDate: minLevelDate.toISOString().split('T')[0],
        urgency,
        insight,
      });
    }

    // Urgency bo'yicha tartiblash
    const urgencyOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, OK: 4 };
    return predictions.sort((a, b) => (urgencyOrder[a.urgency] ?? 4) - (urgencyOrder[b.urgency] ?? 4));
  }

  // ==========================================
  // 3. PURCHASE RECOMMENDATIONS
  // ==========================================

  async getPurchaseRecommendations(tenantId: string, coverageDays: number = 7): Promise<PurchaseRecommendation[]> {
    const predictions = await this.predictStockouts(tenantId);

    const items = await prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        quantity: true,
        minQuantity: true,
        costPrice: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    const itemMap = new Map(items.map(i => [i.id, i]));
    const recommendations: PurchaseRecommendation[] = [];

    for (const pred of predictions) {
      if (pred.urgency === 'OK') continue;

      const item = itemMap.get(pred.inventoryItemId);
      if (!item) continue;

      const currentQty = Number(item.quantity);
      const minQty = Number(item.minQuantity);
      const costPrice = Number(item.costPrice);

      // Tavsiya etilgan miqdor = (kunlik sarf * qoplash kunlari) + min_zaxira - joriy_zaxira
      const neededQty = (pred.avgDailyConsumption * coverageDays) + minQty - currentQty;
      const suggestedQty = Math.max(0, Math.ceil(neededQty * 10) / 10);

      if (suggestedQty <= 0) continue;

      let reason: string;
      if (pred.urgency === 'CRITICAL') {
        reason = `${pred.itemName} tugagan yoki 1 kun ichida tugaydi. Zudlik bilan ${suggestedQty} ${item.unit} xarid qiling.`;
      } else if (pred.urgency === 'HIGH') {
        reason = `${pred.itemName} ${pred.daysUntilMinLevel} kun ichida minimal darajaga tushadi. ${coverageDays} kunlik zaxira uchun ${suggestedQty} ${item.unit} kerak.`;
      } else if (pred.urgency === 'MEDIUM') {
        reason = `${pred.itemName} ${pred.daysUntilStockout} kunda tugaydi. Oldindan ${suggestedQty} ${item.unit} buyurtma bering.`;
      } else {
        reason = `${pred.itemName} zaxirasi ${pred.daysUntilStockout} kunga yetadi. Rejalashtirilgan xarid: ${suggestedQty} ${item.unit}.`;
      }

      recommendations.push({
        inventoryItemId: pred.inventoryItemId,
        itemName: pred.itemName,
        unit: item.unit,
        currentQuantity: currentQty,
        suggestedQuantity: suggestedQty,
        estimatedCost: Math.round(suggestedQty * costPrice),
        costPrice,
        reason,
        urgency: pred.urgency as PurchaseRecommendation['urgency'],
        coverageDays,
        supplier: item.supplier ? { id: item.supplier.id, name: item.supplier.name } : undefined,
      });
    }

    return recommendations;
  }

  // ==========================================
  // 4. MOST USED INGREDIENTS RANKING
  // ==========================================

  async getIngredientUsageRanking(tenantId: string, days: number = 30): Promise<IngredientUsageRank[]> {
    const consumption = await this.analyzeConsumption(tenantId, days);

    const items = await prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        costPrice: true,
        ingredients: {
          select: {
            quantity: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    // Oxirgi N kunlik buyurtma itemlari (mahsulot bo'yicha soni)
    const since = new Date();
    since.setDate(since.getDate() - days);
    const orderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { tenantId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
        status: { not: 'CANCELLED' },
      },
      _sum: { quantity: true },
    });

    const orderCountMap = new Map(orderItems.map(oi => [oi.productId, oi._sum.quantity || 0]));
    const itemMap = new Map(items.map(i => [i.id, i]));

    const totalCostAll = consumption.reduce((sum, c) => {
      const item = itemMap.get(c.inventoryItemId);
      return sum + (c.avgDailyConsumption * days * Number(item?.costPrice || 0));
    }, 0);

    const rankings: IngredientUsageRank[] = [];

    for (const cons of consumption) {
      const item = itemMap.get(cons.inventoryItemId);
      if (!item) continue;

      const totalConsumed = cons.avgDailyConsumption * days;
      const costPrice = Number(item.costPrice);
      const totalCost = Math.round(totalConsumed * costPrice);

      const topProducts = item.ingredients.map(ing => {
        const productOrderCount = orderCountMap.get(ing.product.name) || 0;
        return {
          name: ing.product.name,
          quantityPerUnit: Number(ing.quantity),
          orderCount: productOrderCount,
        };
      }).sort((a, b) => b.orderCount - a.orderCount).slice(0, 5);

      rankings.push({
        inventoryItemId: cons.inventoryItemId,
        itemName: cons.itemName,
        unit: item.unit,
        totalConsumed: Math.round(totalConsumed * 100) / 100,
        avgDaily: cons.avgDailyConsumption,
        totalCost,
        topProducts,
        percentOfTotalCost: totalCostAll > 0 ? Math.round((totalCost / totalCostAll) * 10000) / 100 : 0,
      });
    }

    return rankings.sort((a, b) => b.totalCost - a.totalCost);
  }

  // ==========================================
  // 5. FULL DASHBOARD
  // ==========================================

  async getForecastDashboard(tenantId: string): Promise<InventoryForecastDashboard> {
    const [predictions, topUsed, recommendations, consumption] = await Promise.all([
      this.predictStockouts(tenantId),
      this.getIngredientUsageRanking(tenantId, 30),
      this.getPurchaseRecommendations(tenantId, 7),
      this.analyzeConsumption(tenantId, 30),
    ]);

    // Umumiy statistika
    const totalItems = predictions.length;
    const criticalItems = predictions.filter(p => p.urgency === 'CRITICAL').length;
    const highRiskItems = predictions.filter(p => p.urgency === 'HIGH').length;
    const healthyItems = predictions.filter(p => p.urgency === 'OK').length;

    // Inventar qiymati
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true },
      select: { quantity: true, costPrice: true },
    });
    const totalInventoryValue = inventoryItems.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.costPrice), 0
    );

    // Haftalik taxminiy xarajat
    const estimatedWeeklyCost = topUsed.reduce((sum, u) => sum + (u.avgDaily * 7 * (u.totalCost / Math.max(u.totalConsumed, 1))), 0);

    // AI Insights
    const insights = this.generateForecastInsights(predictions, topUsed, recommendations, consumption);

    return {
      summary: {
        totalItems,
        criticalItems,
        highRiskItems,
        healthyItems,
        totalInventoryValue: Math.round(totalInventoryValue),
        estimatedWeeklyCost: Math.round(estimatedWeeklyCost),
      },
      stockoutPredictions: predictions.filter(p => p.urgency !== 'OK'),
      topUsedIngredients: topUsed.slice(0, 10),
      purchaseRecommendations: recommendations,
      insights,
      consumptionTrends: consumption.slice(0, 15),
    };
  }

  // ==========================================
  // AI INSIGHTS
  // ==========================================

  private generateForecastInsights(
    predictions: StockoutPrediction[],
    topUsed: IngredientUsageRank[],
    recommendations: PurchaseRecommendation[],
    consumption: ConsumptionHistory[],
  ): ForecastInsight[] {
    const insights: ForecastInsight[] = [];

    // --- Critical stockouts ---
    const critical = predictions.filter(p => p.urgency === 'CRITICAL');
    if (critical.length > 0) {
      for (const item of critical.slice(0, 3)) {
        insights.push({
          type: 'CRITICAL',
          icon: '🚨',
          title: `${item.itemName} tugayapti!`,
          message: item.insight,
          itemId: item.inventoryItemId,
          metric: 'days_until_stockout',
          value: item.daysUntilStockout,
        });
      }
    }

    // --- High risk items ---
    const highRisk = predictions.filter(p => p.urgency === 'HIGH');
    if (highRisk.length > 0) {
      insights.push({
        type: 'WARNING',
        icon: '⚠️',
        title: `${highRisk.length} ta mahsulot tez orada tugaydi`,
        message: `${highRisk.map(h => h.itemName).join(', ')} — ${highRisk[0].daysUntilMinLevel}-${highRisk[highRisk.length - 1].daysUntilMinLevel} kun ichida minimal darajaga tushadi.`,
        metric: 'high_risk_count',
        value: highRisk.length,
      });
    }

    // --- Increasing consumption trend ---
    const increasing = consumption.filter(c => c.trendDirection === 'INCREASING' && c.trendPercent > 20);
    if (increasing.length > 0) {
      for (const item of increasing.slice(0, 2)) {
        insights.push({
          type: 'WARNING',
          icon: '📈',
          title: `${item.itemName} sarfi ortmoqda`,
          message: `${item.itemName} sarfi oxirgi 2 haftada ${item.trendPercent}% oshgan. Xarid rejasini yangilang.`,
          itemId: item.inventoryItemId,
          metric: 'trend_percent',
          value: item.trendPercent,
        });
      }
    }

    // --- Decreasing consumption (potential waste or menu change) ---
    const decreasing = consumption.filter(c => c.trendDirection === 'DECREASING' && c.trendPercent < -30);
    if (decreasing.length > 0) {
      insights.push({
        type: 'INFO',
        icon: '📉',
        title: `${decreasing.length} ta ingredient sarfi kamaygan`,
        message: `${decreasing.map(d => d.itemName).join(', ')} sarfi sezilarli kamaygan. Menyu o'zgarganmi yoki ortiqcha zaxira bormi — tekshiring.`,
        metric: 'decreasing_count',
        value: decreasing.length,
      });
    }

    // --- Top cost ingredients ---
    if (topUsed.length >= 3) {
      const top3 = topUsed.slice(0, 3);
      const top3Percent = top3.reduce((s, t) => s + t.percentOfTotalCost, 0);
      insights.push({
        type: 'INFO',
        icon: '💰',
        title: 'Eng qimmat ingredientlar',
        message: `${top3.map(t => t.itemName).join(', ')} — jami ingredient xarajatlarining ${Math.round(top3Percent)}% ni tashkil qiladi. Narx optimizatsiyasi mumkin.`,
        metric: 'top3_cost_percent',
        value: top3Percent,
      });
    }

    // --- Weekend pattern ---
    const weekendHeavy = consumption.filter(c => {
      const weekdayAvg = c.weekdayPattern.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const weekendAvg = (c.weekdayPattern[5] + c.weekdayPattern[6]) / 2;
      return weekendAvg > weekdayAvg * 1.5 && c.avgDailyConsumption > 0;
    });
    if (weekendHeavy.length > 0) {
      insights.push({
        type: 'INFO',
        icon: '📅',
        title: 'Dam olish kunlari sarfi ko\'proq',
        message: `${weekendHeavy.slice(0, 3).map(w => w.itemName).join(', ')} dam olish kunlari 50%+ ko'proq sarflanadi. Juma kuni qo'shimcha zaxira tayyorlang.`,
        metric: 'weekend_heavy_count',
        value: weekendHeavy.length,
      });
    }

    // --- Total purchase cost ---
    const totalPurchaseCost = recommendations.reduce((s, r) => s + r.estimatedCost, 0);
    if (totalPurchaseCost > 0) {
      insights.push({
        type: 'INFO',
        icon: '🛒',
        title: 'Haftalik xarid byudjeti',
        message: `Barcha tavsiyalarni bajarish uchun taxminan ${totalPurchaseCost.toLocaleString()} so'm kerak bo'ladi.`,
        metric: 'weekly_purchase_budget',
        value: totalPurchaseCost,
      });
    }

    // --- All healthy ---
    if (critical.length === 0 && highRisk.length === 0) {
      insights.push({
        type: 'SUCCESS',
        icon: '✅',
        title: 'Zaxiralar yetarli',
        message: 'Barcha ingredientlar yetarli darajada. Hozircha shoshilinch xarid kerak emas.',
      });
    }

    return insights.sort((a, b) => {
      const priority: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2, SUCCESS: 3 };
      return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
    });
  }

  // ==========================================
  // STOCKOUT INSIGHT TEXT
  // ==========================================

  private generateStockoutInsight(
    cons: ConsumptionHistory,
    currentQty: number,
    daysUntilStockout: number,
    daysUntilMinLevel: number,
  ): string {
    if (currentQty <= 0) {
      return `${cons.itemName} tugagan! Zudlik bilan xarid qiling.`;
    }

    if (daysUntilStockout <= 1) {
      return `${cons.itemName} bugun tugaydi (joriy: ${currentQty} ${cons.unit}, kunlik sarf: ${cons.avgDailyConsumption} ${cons.unit}).`;
    }

    if (daysUntilStockout <= 2) {
      return `${cons.itemName} joriy sotuv asosida ${daysUntilStockout} kun ichida tugaydi.`;
    }

    if (daysUntilMinLevel <= 3) {
      return `${cons.itemName} ${daysUntilMinLevel} kun ichida minimal darajaga tushadi. Hozirdan buyurtma bering.`;
    }

    const trendNote = cons.trendDirection === 'INCREASING'
      ? ` Sarf ${cons.trendPercent}% ortgan — haqiqiy tugash vaqti tezroq bo'lishi mumkin.`
      : '';

    return `${cons.itemName} taxminan ${daysUntilStockout} kunga yetadi (kunlik: ~${cons.avgDailyConsumption} ${cons.unit}).${trendNote}`;
  }

  // ==========================================
  // MATH HELPERS
  // ==========================================

  private weightedMovingAverage(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < n; i++) {
      const weight = i + 1; // Yangi kunlar og'irroq
      weightedSum += values[i] * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}

export const inventoryForecastService = new InventoryForecastService();
