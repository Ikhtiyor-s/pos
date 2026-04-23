import { prisma, OrderStatus, ForecastType } from '@oshxona/database';

// ==========================================
// FORECASTING YORDAMCHI FUNKSIYALAR
// ==========================================

/** Simple Moving Average */
function movingAverage(values: number[], window: number): number {
  const slice = values.slice(-window);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Weighted Moving Average — so'nggi ma'lumotlar ko'proq og'irlikka ega */
function weightedMovingAverage(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const weights = values.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  return values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
}

/** Oddiy chiziqli regressiya — trend aniqlash */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/** Ishonch darajasini hisoblash (0-100) */
function calculateConfidence(values: number[], predicted: number): number {
  if (values.length < 7) return 30; // Kam ma'lumot — past ishonch

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Kam o'zgaruvchanlik = yuqori ishonch
  const cv = mean > 0 ? stdDev / mean : 1; // Coefficient of variation
  let confidence = Math.max(20, Math.min(95, 90 - cv * 100));

  // Ma'lumotlar soni bo'yicha tuzatish
  if (values.length >= 28) confidence = Math.min(confidence + 10, 95);
  else if (values.length >= 14) confidence = Math.min(confidence + 5, 90);

  return Math.round(confidence * 100) / 100;
}

// ==========================================
// FORECASTING SERVICE
// ==========================================

interface GetForecastsOptions {
  type?: ForecastType;
  dateFrom?: Date;
  dateTo?: Date;
}

export class ForecastingService {
  /**
   * So'nggi N kunlik ma'lumotlarni olish
   */
  private static async getDailyData(
    tenantId: string,
    days: number,
    beforeDate?: Date
  ): Promise<Array<{ date: Date; orderCount: number; revenue: number }>> {
    const endDate = beforeDate || new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const dailyData = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint; total: number }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::bigint as count,
        COALESCE(SUM(total), 0)::float as total
      FROM orders
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Barcha kunlarni to'ldirish (bo'sh kunlarga 0 qo'yish)
    const result: Array<{ date: Date; orderCount: number; revenue: number }> = [];
    const dataMap = new Map(
      dailyData.map((d) => [
        new Date(d.date).toISOString().split('T')[0],
        { orderCount: Number(d.count), revenue: d.total },
      ])
    );

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const data = dataMap.get(key);
      result.push({
        date: d,
        orderCount: data?.orderCount || 0,
        revenue: data?.revenue || 0,
      });
    }

    return result;
  }

  /**
   * Talab bashorati — keyingi kun uchun buyurtma soni
   */
  static async generateDemandForecast(tenantId: string, targetDate: Date) {
    const historicalData = await this.getDailyData(tenantId, 30, targetDate);
    const orderCounts = historicalData.map((d) => d.orderCount);

    // Hafta kuni bo'yicha tahlil (shu hafta kuniga mos kunlarni ajratish)
    const targetDay = targetDate.getDay();
    const sameDayValues = historicalData
      .filter((d) => d.date.getDay() === targetDay)
      .map((d) => d.orderCount);

    // Bir necha usulni birlashtirish
    const sma7 = movingAverage(orderCounts, 7);
    const sma14 = movingAverage(orderCounts, 14);
    const wma = weightedMovingAverage(orderCounts);
    const { slope, intercept } = linearRegression(orderCounts);
    const trendPrediction = Math.max(0, intercept + slope * orderCounts.length);
    const sameDayAvg = sameDayValues.length > 0
      ? sameDayValues.reduce((a, b) => a + b, 0) / sameDayValues.length
      : sma7;

    // Og'irlikli kombinatsiya
    const predicted = Math.round(
      wma * 0.3 + sma7 * 0.2 + trendPrediction * 0.2 + sameDayAvg * 0.3
    );

    const confidence = calculateConfidence(orderCounts, predicted);

    const metadata = {
      method: 'weighted_ensemble',
      components: {
        sma7: Math.round(sma7 * 100) / 100,
        sma14: Math.round(sma14 * 100) / 100,
        wma: Math.round(wma * 100) / 100,
        trend: Math.round(trendPrediction * 100) / 100,
        sameDayAvg: Math.round(sameDayAvg * 100) / 100,
      },
      dataPoints: orderCounts.length,
      targetDayOfWeek: targetDay,
    };

    // Bashoratni saqlash
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);

    const forecast = await prisma.forecast.upsert({
      where: {
        tenantId_type_targetDate: {
          tenantId,
          type: 'DEMAND',
          targetDate: targetDateStart,
        },
      },
      update: {
        predictedValue: predicted,
        confidence,
        metadata,
      },
      create: {
        tenantId,
        type: 'DEMAND',
        targetDate: targetDateStart,
        predictedValue: predicted,
        confidence,
        metadata,
      },
    });

    return forecast;
  }

  /**
   * Daromad bashorati — keyingi kun uchun
   */
  static async generateRevenueForecast(tenantId: string, targetDate: Date) {
    const historicalData = await this.getDailyData(tenantId, 30, targetDate);
    const revenues = historicalData.map((d) => d.revenue);

    const targetDay = targetDate.getDay();
    const sameDayValues = historicalData
      .filter((d) => d.date.getDay() === targetDay)
      .map((d) => d.revenue);

    const sma7 = movingAverage(revenues, 7);
    const wma = weightedMovingAverage(revenues);
    const { slope, intercept } = linearRegression(revenues);
    const trendPrediction = Math.max(0, intercept + slope * revenues.length);
    const sameDayAvg = sameDayValues.length > 0
      ? sameDayValues.reduce((a, b) => a + b, 0) / sameDayValues.length
      : sma7;

    const predicted = Math.round(
      wma * 0.3 + sma7 * 0.2 + trendPrediction * 0.2 + sameDayAvg * 0.3
    );

    const confidence = calculateConfidence(revenues, predicted);

    const metadata = {
      method: 'weighted_ensemble',
      components: {
        sma7: Math.round(sma7),
        wma: Math.round(wma),
        trend: Math.round(trendPrediction),
        sameDayAvg: Math.round(sameDayAvg),
      },
      dataPoints: revenues.length,
    };

    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);

    const forecast = await prisma.forecast.upsert({
      where: {
        tenantId_type_targetDate: {
          tenantId,
          type: 'REVENUE',
          targetDate: targetDateStart,
        },
      },
      update: {
        predictedValue: predicted,
        confidence,
        metadata,
      },
      create: {
        tenantId,
        type: 'REVENUE',
        targetDate: targetDateStart,
        predictedValue: predicted,
        confidence,
        metadata,
      },
    });

    return forecast;
  }

  /**
   * Inventar bashorati — mahsulotlar qachon tugashi
   */
  static async generateInventoryForecast(tenantId: string) {
    // So'nggi 30 kunlik iste'mol tezligini hisoblash
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [inventoryItems, consumptionData] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          quantity: true,
          minQuantity: true,
          unit: true,
          costPrice: true,
        },
      }),

      // Har bir mahsulotning 30 kunlik iste'moli
      prisma.$queryRaw<Array<{ item_id: string; total_consumed: number; days_active: number }>>`
        SELECT
          item_id,
          COALESCE(SUM(quantity), 0)::float as total_consumed,
          COUNT(DISTINCT DATE(created_at))::int as days_active
        FROM inventory_transactions
        WHERE type = 'OUT'
          AND created_at >= ${thirtyDaysAgo}
          AND item_id IN (
            SELECT id FROM inventory_items WHERE tenant_id = ${tenantId} AND is_active = true
          )
        GROUP BY item_id
      `,
    ]);

    const consumptionMap = new Map(
      consumptionData.map((c) => [
        c.item_id,
        {
          totalConsumed: c.total_consumed,
          daysActive: c.days_active,
          dailyRate: c.days_active > 0 ? c.total_consumed / 30 : 0,
        },
      ])
    );

    const forecasts = inventoryItems.map((item) => {
      const consumption = consumptionMap.get(item.id);
      const currentQty = Number(item.quantity);
      const dailyRate = consumption?.dailyRate || 0;
      const daysUntilEmpty = dailyRate > 0 ? Math.ceil(currentQty / dailyRate) : null;
      const daysUntilMin = dailyRate > 0
        ? Math.ceil((currentQty - Number(item.minQuantity)) / dailyRate)
        : null;

      const runOutDate = daysUntilEmpty !== null
        ? new Date(Date.now() + daysUntilEmpty * 24 * 60 * 60 * 1000)
        : null;

      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        currentQuantity: currentQty,
        minQuantity: Number(item.minQuantity),
        dailyConsumptionRate: Math.round(dailyRate * 1000) / 1000,
        daysUntilEmpty,
        daysUntilMinimum: daysUntilMin !== null ? Math.max(0, daysUntilMin) : null,
        estimatedRunOutDate: runOutDate,
        status: daysUntilMin !== null && daysUntilMin <= 0
          ? 'CRITICAL'
          : daysUntilMin !== null && daysUntilMin <= 3
            ? 'WARNING'
            : daysUntilMin !== null && daysUntilMin <= 7
              ? 'LOW'
              : 'OK',
        costPrice: Number(item.costPrice),
      };
    });

    // Natijani forecast jadvaliga saqlash (umumiy sifatida)
    const targetDateStart = new Date();
    targetDateStart.setHours(0, 0, 0, 0);

    const criticalCount = forecasts.filter((f) => f.status === 'CRITICAL').length;
    const warningCount = forecasts.filter((f) => f.status === 'WARNING').length;

    await prisma.forecast.upsert({
      where: {
        tenantId_type_targetDate: {
          tenantId,
          type: 'INVENTORY',
          targetDate: targetDateStart,
        },
      },
      update: {
        predictedValue: criticalCount,
        confidence: 75,
        metadata: { items: forecasts, summary: { critical: criticalCount, warning: warningCount } },
      },
      create: {
        tenantId,
        type: 'INVENTORY',
        targetDate: targetDateStart,
        predictedValue: criticalCount,
        confidence: 75,
        metadata: { items: forecasts, summary: { critical: criticalCount, warning: warningCount } },
      },
    });

    return {
      generatedAt: new Date(),
      totalItems: forecasts.length,
      summary: {
        critical: criticalCount,
        warning: warningCount,
        low: forecasts.filter((f) => f.status === 'LOW').length,
        ok: forecasts.filter((f) => f.status === 'OK').length,
      },
      items: forecasts.sort((a, b) => {
        const order: Record<string, number> = { CRITICAL: 0, WARNING: 1, LOW: 2, OK: 3 };
        return (order[a.status] || 3) - (order[b.status] || 3);
      }),
    };
  }

  /**
   * Bashoratlar ro'yxati
   */
  static async getForecasts(tenantId: string, options: GetForecastsOptions) {
    const where: any = { tenantId };

    if (options.type) {
      where.type = options.type;
    }

    if (options.dateFrom || options.dateTo) {
      where.targetDate = {};
      if (options.dateFrom) where.targetDate.gte = options.dateFrom;
      if (options.dateTo) where.targetDate.lte = options.dateTo;
    }

    const forecasts = await prisma.forecast.findMany({
      where,
      orderBy: { targetDate: 'desc' },
      take: 100,
    });

    return forecasts.map((f) => ({
      id: f.id,
      type: f.type,
      targetDate: f.targetDate,
      predictedValue: Number(f.predictedValue),
      actualValue: f.actualValue ? Number(f.actualValue) : null,
      confidence: Number(f.confidence),
      metadata: f.metadata,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Bashorat aniqligini baholash — o'tgan bashoratlarni haqiqiy natijalar bilan solishtirish
   */
  static async evaluateForecasts(tenantId: string) {
    // O'tgan bashoratlarni olish (actualValue mavjud yoki sanasi o'tgan)
    const now = new Date();
    const pastForecasts = await prisma.forecast.findMany({
      where: {
        tenantId,
        targetDate: { lt: now },
        type: { in: ['DEMAND', 'REVENUE'] },
      },
      orderBy: { targetDate: 'desc' },
      take: 60,
    });

    const results: Array<{
      id: string; type: any; targetDate: Date; predicted: number;
      actual: number | null; error: number | null; errorPercent: number | null;
      accuracy: number | null; confidence: number;
    }> = [];

    for (const forecast of pastForecasts) {
      let actualValue = forecast.actualValue ? Number(forecast.actualValue) : null;

      // Agar haqiqiy qiymat yo'q bo'lsa — hisoblash
      if (actualValue === null) {
        const dayStart = new Date(forecast.targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(forecast.targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        if (forecast.type === 'DEMAND') {
          const count = await prisma.order.count({
            where: {
              tenantId,
              status: OrderStatus.COMPLETED,
              createdAt: { gte: dayStart, lte: dayEnd },
            },
          });
          actualValue = count;
        } else if (forecast.type === 'REVENUE') {
          const result = await prisma.order.aggregate({
            where: {
              tenantId,
              status: OrderStatus.COMPLETED,
              createdAt: { gte: dayStart, lte: dayEnd },
            },
            _sum: { total: true },
          });
          actualValue = Number(result._sum.total || 0);
        }

        // Haqiqiy qiymatni saqlash
        if (actualValue !== null) {
          await prisma.forecast.update({
            where: { id: forecast.id },
            data: { actualValue },
          });
        }
      }

      const predicted = Number(forecast.predictedValue);
      const error = actualValue !== null ? Math.abs(predicted - actualValue) : null;
      const errorPercent = actualValue !== null && actualValue > 0
        ? Math.round((error! / actualValue) * 10000) / 100
        : null;
      const accuracy = errorPercent !== null ? Math.max(0, 100 - errorPercent) : null;

      results.push({
        id: forecast.id,
        type: forecast.type,
        targetDate: forecast.targetDate,
        predicted,
        actual: actualValue,
        error,
        errorPercent,
        accuracy,
        confidence: Number(forecast.confidence),
      });
    }

    // Umumiy statistika
    const evaluated = results.filter((r) => r.accuracy !== null);
    const avgAccuracy = evaluated.length > 0
      ? Math.round(
          (evaluated.reduce((sum, r) => sum + r.accuracy!, 0) / evaluated.length) * 100
        ) / 100
      : null;

    const demandResults = evaluated.filter((r) => r.type === 'DEMAND');
    const revenueResults = evaluated.filter((r) => r.type === 'REVENUE');

    const demandAccuracy = demandResults.length > 0
      ? Math.round(
          (demandResults.reduce((sum, r) => sum + r.accuracy!, 0) / demandResults.length) * 100
        ) / 100
      : null;

    const revenueAccuracy = revenueResults.length > 0
      ? Math.round(
          (revenueResults.reduce((sum, r) => sum + r.accuracy!, 0) / revenueResults.length) * 100
        ) / 100
      : null;

    return {
      summary: {
        totalForecasts: results.length,
        evaluatedCount: evaluated.length,
        overallAccuracy: avgAccuracy,
        demandAccuracy,
        revenueAccuracy,
      },
      forecasts: results,
    };
  }
}
