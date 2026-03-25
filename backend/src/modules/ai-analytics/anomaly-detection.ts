import { prisma, OrderStatus } from '@oshxona/database';

// ==========================================
// ANOMALIYA ANIQLASH YORDAMCHI FUNKSIYALAR
// ==========================================

/** Z-score hisoblash */
function zScore(value: number, mean: number, stdDev: number): number {
  return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

/** O'rtacha qiymat */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Standart og'ish */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type AnomalyType = 'SALES_SPIKE' | 'SALES_DROP' | 'UNUSUAL_PRODUCT' | 'INVENTORY_ANOMALY' | 'REVENUE_ANOMALY';

interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  value: number;
  expected: number;
  zScore: number;
  date: Date;
  metadata?: any;
}

// ==========================================
// ANOMALY DETECTION SERVICE
// ==========================================

interface GetAnomaliesOptions {
  dateFrom?: Date;
  dateTo?: Date;
}

export class AnomalyDetectionService {
  /**
   * Sotuv anomaliyalarini aniqlash
   * Agar bugungi sotuv 30 kunlik o'rtachadan >2 standart og'ish bilan farq qilsa — anomaliya
   */
  static async detectSalesAnomalies(tenantId: string, date: Date): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    const targetStart = new Date(date);
    targetStart.setHours(0, 0, 0, 0);
    const targetEnd = new Date(date);
    targetEnd.setHours(23, 59, 59, 999);

    // 30 kunlik tarixiy ma'lumotlar
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalDaily = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint; total: number }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*)::bigint as count,
        COALESCE(SUM(total), 0)::float as total
      FROM orders
      WHERE tenant_id = ${tenantId}
        AND status = 'COMPLETED'
        AND created_at >= ${thirtyDaysAgo}
        AND created_at < ${targetStart}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Bugungi ma'lumotlar
    const todayResult = await prisma.order.aggregate({
      where: {
        tenantId,
        status: OrderStatus.COMPLETED,
        createdAt: { gte: targetStart, lte: targetEnd },
      },
      _sum: { total: true },
      _count: true,
    });

    const todayRevenue = Number(todayResult._sum.total || 0);
    const todayOrders = todayResult._count;

    // Revenue anomaliya tekshirish
    const historicalRevenues = historicalDaily.map((d) => d.total);
    if (historicalRevenues.length >= 7) {
      const revMean = mean(historicalRevenues);
      const revStdDev = stdDev(historicalRevenues);
      const revZScore = zScore(todayRevenue, revMean, revStdDev);

      if (Math.abs(revZScore) > 2) {
        const isSpike = revZScore > 0;
        const severity: AnomalySeverity = Math.abs(revZScore) > 3 ? 'CRITICAL' : 'HIGH';

        anomalies.push({
          type: isSpike ? 'SALES_SPIKE' : 'SALES_DROP',
          severity,
          title: isSpike ? 'Daromad keskin oshdi' : 'Daromad keskin tushdi',
          description: isSpike
            ? `Bugungi daromad (${todayRevenue.toLocaleString()}) o'rtachadan ${Math.abs(revZScore).toFixed(1)} standart og'ish yuqori.`
            : `Bugungi daromad (${todayRevenue.toLocaleString()}) o'rtachadan ${Math.abs(revZScore).toFixed(1)} standart og'ish past.`,
          value: todayRevenue,
          expected: Math.round(revMean),
          zScore: Math.round(revZScore * 100) / 100,
          date,
          metadata: { mean: Math.round(revMean), stdDev: Math.round(revStdDev) },
        });
      }
    }

    // Order count anomaliya tekshirish
    const historicalCounts = historicalDaily.map((d) => Number(d.count));
    if (historicalCounts.length >= 7) {
      const countMean = mean(historicalCounts);
      const countStdDev = stdDev(historicalCounts);
      const countZScore = zScore(todayOrders, countMean, countStdDev);

      if (Math.abs(countZScore) > 2) {
        const isSpike = countZScore > 0;
        const severity: AnomalySeverity = Math.abs(countZScore) > 3 ? 'CRITICAL' : 'HIGH';

        anomalies.push({
          type: isSpike ? 'SALES_SPIKE' : 'SALES_DROP',
          severity,
          title: isSpike ? 'Buyurtmalar soni keskin oshdi' : 'Buyurtmalar soni keskin tushdi',
          description: isSpike
            ? `Bugungi buyurtmalar (${todayOrders}) o'rtachadan ${Math.abs(countZScore).toFixed(1)} standart og'ish yuqori.`
            : `Bugungi buyurtmalar (${todayOrders}) o'rtachadan ${Math.abs(countZScore).toFixed(1)} standart og'ish past.`,
          value: todayOrders,
          expected: Math.round(countMean),
          zScore: Math.round(countZScore * 100) / 100,
          date,
          metadata: { mean: Math.round(countMean), stdDev: Math.round(countStdDev) },
        });
      }
    }

    // Mahsulot anomaliyalari — bugun g'ayrioddiy ko'p sotilgan mahsulotlar
    const todayProductSales = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          tenantId,
          status: OrderStatus.COMPLETED,
          createdAt: { gte: targetStart, lte: targetEnd },
        },
      },
      _sum: { quantity: true, total: true },
    });

    for (const productSale of todayProductSales) {
      const historicalProductSales = await prisma.$queryRaw<
        Array<{ date: Date; qty: number }>
      >`
        SELECT
          DATE(o.created_at) as date,
          COALESCE(SUM(oi.quantity), 0)::float as qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.tenant_id = ${tenantId}
          AND o.status = 'COMPLETED'
          AND o.created_at >= ${thirtyDaysAgo}
          AND o.created_at < ${targetStart}
          AND oi.product_id = ${productSale.productId}
        GROUP BY DATE(o.created_at)
      `;

      const historicalQtys = historicalProductSales.map((h) => h.qty);
      if (historicalQtys.length >= 7) {
        const qtyMean = mean(historicalQtys);
        const qtyStdDev = stdDev(historicalQtys);
        const todayQty = Number(productSale._sum.quantity || 0);
        const qtyZScore = zScore(todayQty, qtyMean, qtyStdDev);

        if (Math.abs(qtyZScore) > 2.5) {
          const product = await prisma.product.findUnique({
            where: { id: productSale.productId },
            select: { name: true },
          });

          anomalies.push({
            type: 'UNUSUAL_PRODUCT',
            severity: Math.abs(qtyZScore) > 3 ? 'HIGH' : 'MEDIUM',
            title: `"${product?.name || 'Noma\'lum'}" g'ayrioddiy sotuv`,
            description: `Bugungi sotuv (${todayQty}) o'rtacha (${Math.round(qtyMean)}) dan ${Math.abs(qtyZScore).toFixed(1)} standart og'ish bilan farq qiladi.`,
            value: todayQty,
            expected: Math.round(qtyMean),
            zScore: Math.round(qtyZScore * 100) / 100,
            date,
            metadata: { productId: productSale.productId, productName: product?.name },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Inventar anomaliyalarini aniqlash — g'ayrioddiy iste'mol naqshlari
   */
  static async detectInventoryAnomalies(tenantId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const now = new Date();

    // So'nggi 7 kunlik va 30 kunlik iste'mol tezligini solishtirish
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentConsumption, historicalConsumption] = await Promise.all([
      // So'nggi 7 kunlik iste'mol
      prisma.$queryRaw<Array<{ item_id: string; total: number }>>`
        SELECT
          item_id,
          COALESCE(SUM(quantity), 0)::float as total
        FROM inventory_transactions
        WHERE type = 'OUT'
          AND created_at >= ${sevenDaysAgo}
          AND item_id IN (
            SELECT id FROM inventory_items WHERE tenant_id = ${tenantId} AND is_active = true
          )
        GROUP BY item_id
      `,

      // 30 kunlik iste'mol (haftalik o'rtacha uchun)
      prisma.$queryRaw<Array<{ item_id: string; total: number }>>`
        SELECT
          item_id,
          COALESCE(SUM(quantity), 0)::float as total
        FROM inventory_transactions
        WHERE type = 'OUT'
          AND created_at >= ${thirtyDaysAgo}
          AND item_id IN (
            SELECT id FROM inventory_items WHERE tenant_id = ${tenantId} AND is_active = true
          )
        GROUP BY item_id
      `,
    ]);

    const historicalMap = new Map(historicalConsumption.map((h) => [h.item_id, h.total]));

    for (const recent of recentConsumption) {
      const historical = historicalMap.get(recent.item_id);
      if (!historical || historical === 0) continue;

      // 30 kunlik haftalik o'rtacha
      const weeklyAvg = (historical / 30) * 7;
      const recentTotal = recent.total;

      // Agar so'nggi hafta iste'mol 30 kunlik haftalik o'rtachadan 2x+ bo'lsa
      if (weeklyAvg > 0) {
        const ratio = recentTotal / weeklyAvg;
        if (ratio > 2 || ratio < 0.3) {
          const item = await prisma.inventoryItem.findUnique({
            where: { id: recent.item_id },
            select: { name: true, unit: true },
          });

          const isHigh = ratio > 2;
          anomalies.push({
            type: 'INVENTORY_ANOMALY',
            severity: ratio > 3 || ratio < 0.15 ? 'HIGH' : 'MEDIUM',
            title: isHigh
              ? `"${item?.name}" iste'moli keskin oshdi`
              : `"${item?.name}" iste'moli keskin tushdi`,
            description: isHigh
              ? `So'nggi haftalik iste'mol (${recentTotal.toFixed(1)} ${item?.unit}) haftalik o'rtachadan (${weeklyAvg.toFixed(1)}) ${ratio.toFixed(1)}x yuqori.`
              : `So'nggi haftalik iste'mol (${recentTotal.toFixed(1)} ${item?.unit}) haftalik o'rtachadan (${weeklyAvg.toFixed(1)}) ${(1 / ratio).toFixed(1)}x past.`,
            value: recentTotal,
            expected: Math.round(weeklyAvg * 100) / 100,
            zScore: Math.round((ratio - 1) * 100) / 100,
            date: now,
            metadata: {
              itemId: recent.item_id,
              itemName: item?.name,
              unit: item?.unit,
              ratio: Math.round(ratio * 100) / 100,
            },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Barcha anomaliyalarni olish (saqlangan snapshotlardan)
   */
  static async getAnomalies(tenantId: string, options: GetAnomaliesOptions) {
    const { dateFrom, dateTo } = options;

    // Avval yangi anomaliyalarni aniqlash
    const now = new Date();
    const targetDate = dateTo || now;

    const [salesAnomalies, inventoryAnomalies] = await Promise.all([
      this.detectSalesAnomalies(tenantId, targetDate),
      this.detectInventoryAnomalies(tenantId),
    ]);

    let allAnomalies = [...salesAnomalies, ...inventoryAnomalies];

    // Sana filtri
    if (dateFrom) {
      allAnomalies = allAnomalies.filter((a) => a.date >= dateFrom);
    }
    if (dateTo) {
      allAnomalies = allAnomalies.filter((a) => a.date <= dateTo);
    }

    // Severity bo'yicha saralash
    const severityOrder: Record<AnomalySeverity, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    allAnomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      total: allAnomalies.length,
      critical: allAnomalies.filter((a) => a.severity === 'CRITICAL').length,
      high: allAnomalies.filter((a) => a.severity === 'HIGH').length,
      medium: allAnomalies.filter((a) => a.severity === 'MEDIUM').length,
      low: allAnomalies.filter((a) => a.severity === 'LOW').length,
      anomalies: allAnomalies,
    };
  }
}
