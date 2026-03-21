import { prisma, OrderStatus } from '@oshxona/database';

// ==========================================
// RECOMMENDATION SERVICE
// ==========================================

export class RecommendationService {
  /**
   * Menyu tavsiyanomalar — margin va ommaboplik asosida qaysi mahsulotlarni targ'ib qilish
   */
  static async getMenuRecommendations(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Barcha faol mahsulotlar va ularning sotuv ma'lumotlari
    const [products, salesData] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          costPrice: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      }),

      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            tenantId,
            status: OrderStatus.COMPLETED,
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true, total: true },
        _count: true,
      }),
    ]);

    const salesMap = new Map(
      salesData.map((s) => [
        s.productId,
        {
          quantity: Number(s._sum.quantity || 0),
          revenue: Number(s._sum.total || 0),
          orderCount: s._count,
        },
      ])
    );

    // Har bir mahsulot uchun metrikalar
    const productMetrics = products.map((product) => {
      const sales = salesMap.get(product.id);
      const price = Number(product.price);
      const costPrice = Number(product.costPrice || 0);
      const margin = costPrice > 0 ? ((price - costPrice) / price) * 100 : 0;
      const quantity = sales?.quantity || 0;
      const revenue = sales?.revenue || 0;
      const profit = costPrice > 0 ? revenue - (costPrice * quantity) : 0;

      return {
        productId: product.id,
        name: product.name,
        category: product.category.name,
        price,
        costPrice,
        margin: Math.round(margin * 100) / 100,
        quantity,
        revenue,
        profit: Math.round(profit),
        orderCount: sales?.orderCount || 0,
      };
    });

    // Eng ko'p sotilgan mahsulotlarni aniqlash
    const maxQuantity = Math.max(...productMetrics.map((p) => p.quantity), 1);
    const maxMargin = Math.max(...productMetrics.map((p) => p.margin), 1);

    // Score hisoblash: margin * 0.5 + popularity * 0.5
    const scored = productMetrics.map((p) => {
      const popularityScore = (p.quantity / maxQuantity) * 100;
      const marginScore = (p.margin / maxMargin) * 100;
      const compositeScore = marginScore * 0.5 + popularityScore * 0.5;

      return { ...p, popularityScore, marginScore, compositeScore };
    });

    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Tavsiyalar yaratish
    const recommendations = [];

    // 1. Yuqori margin + yuqori ommaboplik — "Yulduz mahsulotlar" (targ'ib qiling)
    const stars = scored.filter(
      (p) => p.marginScore > 60 && p.popularityScore > 60
    );
    if (stars.length > 0) {
      recommendations.push({
        type: 'STAR_PRODUCTS',
        title: 'Yulduz mahsulotlar — targ\'ib qiling',
        description: 'Yuqori margin va yuqori ommaboplikka ega. Bu mahsulotlarni faol targ\'ib qilish tavsiya etiladi.',
        products: stars.slice(0, 5).map((p) => ({
          productId: p.productId,
          name: p.name,
          margin: p.margin,
          quantity: p.quantity,
          revenue: p.revenue,
        })),
      });
    }

    // 2. Yuqori margin + past ommaboplik — "Imkoniyatlar" (targ'ib qilib ommabopligini oshiring)
    const opportunities = scored.filter(
      (p) => p.marginScore > 60 && p.popularityScore < 40 && p.costPrice > 0
    );
    if (opportunities.length > 0) {
      recommendations.push({
        type: 'OPPORTUNITY_PRODUCTS',
        title: 'Imkoniyatlar — ommabopligini oshiring',
        description: 'Yuqori margin lekin kam sotilmoqda. Aksiya yoki maxsus takliflar bilan sotuvni oshirish mumkin.',
        products: opportunities.slice(0, 5).map((p) => ({
          productId: p.productId,
          name: p.name,
          margin: p.margin,
          quantity: p.quantity,
          suggestion: 'Aksiya yoki maxsus taklif qo\'shing',
        })),
      });
    }

    // 3. Past margin + yuqori ommaboplik — "Ishchi otlar" (narxni ko'taring yoki xarajatni kamaytiring)
    const workhorses = scored.filter(
      (p) => p.marginScore < 40 && p.popularityScore > 60 && p.costPrice > 0
    );
    if (workhorses.length > 0) {
      recommendations.push({
        type: 'WORKHORSE_PRODUCTS',
        title: 'Ishchi otlar — marginni oshiring',
        description: 'Ko\'p sotiladi lekin margin past. Narxni biroz oshirish yoki xarajatni kamaytirish tavsiya etiladi.',
        products: workhorses.slice(0, 5).map((p) => ({
          productId: p.productId,
          name: p.name,
          margin: p.margin,
          quantity: p.quantity,
          suggestion: `Narxni ${Math.round(p.price * 1.1)} ga oshiring (+10%)`,
        })),
      });
    }

    // 4. Past margin + past ommaboplik — "Muammoli mahsulotlar" (menyudan olib tashlashni ko'rib chiqing)
    const problems = scored.filter(
      (p) => p.marginScore < 30 && p.popularityScore < 20 && p.costPrice > 0
    );
    if (problems.length > 0) {
      recommendations.push({
        type: 'PROBLEM_PRODUCTS',
        title: 'Muammoli mahsulotlar — qayta ko\'rib chiqing',
        description: 'Past margin va kam sotilmoqda. Menyudan olib tashlash yoki retseptni o\'zgartirish tavsiya etiladi.',
        products: problems.slice(0, 5).map((p) => ({
          productId: p.productId,
          name: p.name,
          margin: p.margin,
          quantity: p.quantity,
          suggestion: 'Menyudan olib tashlash yoki qayta ishlashni ko\'rib chiqing',
        })),
      });
    }

    // 5. Hech narsa sotilmagan mahsulotlar
    const unsold = scored.filter((p) => p.quantity === 0);
    if (unsold.length > 0) {
      recommendations.push({
        type: 'UNSOLD_PRODUCTS',
        title: 'Sotilmagan mahsulotlar',
        description: 'So\'nggi 30 kunda hech narsa sotilmagan. Menyudan olib tashlash yoki yangilash tavsiya etiladi.',
        products: unsold.slice(0, 10).map((p) => ({
          productId: p.productId,
          name: p.name,
          category: p.category,
          suggestion: 'Faollashtiring yoki menyudan olib tashlang',
        })),
      });
    }

    return {
      generatedAt: new Date(),
      totalProducts: products.length,
      recommendations,
      topPerformers: scored.slice(0, 10).map((p) => ({
        productId: p.productId,
        name: p.name,
        category: p.category,
        margin: p.margin,
        quantity: p.quantity,
        revenue: p.revenue,
        profit: p.profit,
        score: Math.round(p.compositeScore * 100) / 100,
      })),
    };
  }

  /**
   * Inventar tavsiyanomalar — qayta buyurtma miqdorlarini taklif qilish
   */
  static async getInventoryRecommendations(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [inventoryItems, consumptionData] = await Promise.all([
      prisma.inventoryItem.findMany({
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
      }),

      prisma.$queryRaw<Array<{ item_id: string; total: number; days: number }>>`
        SELECT
          item_id,
          COALESCE(SUM(quantity), 0)::float as total,
          COUNT(DISTINCT DATE(created_at))::int as days
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
      consumptionData.map((c) => [c.item_id, { total: c.total, days: c.days }])
    );

    const recommendations = inventoryItems.map((item) => {
      const consumption = consumptionMap.get(item.id);
      const currentQty = Number(item.quantity);
      const minQty = Number(item.minQuantity);
      const dailyRate = consumption ? consumption.total / 30 : 0;
      const daysUntilMin = dailyRate > 0 ? Math.ceil((currentQty - minQty) / dailyRate) : null;

      // Tavsiya etilgan buyurtma miqdori: 14 kunlik zaxira
      const recommendedOrderQty = dailyRate > 0
        ? Math.ceil(dailyRate * 14) - Math.max(0, currentQty - minQty)
        : 0;

      const urgency = daysUntilMin !== null && daysUntilMin <= 0
        ? 'IMMEDIATE'
        : daysUntilMin !== null && daysUntilMin <= 3
          ? 'URGENT'
          : daysUntilMin !== null && daysUntilMin <= 7
            ? 'SOON'
            : 'NORMAL';

      return {
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        currentQuantity: currentQty,
        minQuantity: minQty,
        dailyConsumptionRate: Math.round(dailyRate * 1000) / 1000,
        daysUntilMinimum: daysUntilMin !== null ? Math.max(0, daysUntilMin) : null,
        recommendedOrderQuantity: Math.max(0, recommendedOrderQty),
        estimatedCost: Math.round(Math.max(0, recommendedOrderQty) * Number(item.costPrice)),
        supplier: item.supplier
          ? { id: item.supplier.id, name: item.supplier.name }
          : null,
        urgency,
      };
    });

    // Shoshilinchlik bo'yicha saralash
    const urgencyOrder: Record<string, number> = {
      IMMEDIATE: 0,
      URGENT: 1,
      SOON: 2,
      NORMAL: 3,
    };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    const needsOrder = recommendations.filter(
      (r) => r.urgency !== 'NORMAL' && r.recommendedOrderQuantity > 0
    );

    return {
      generatedAt: new Date(),
      totalItems: inventoryItems.length,
      summary: {
        immediate: recommendations.filter((r) => r.urgency === 'IMMEDIATE').length,
        urgent: recommendations.filter((r) => r.urgency === 'URGENT').length,
        soon: recommendations.filter((r) => r.urgency === 'SOON').length,
        normal: recommendations.filter((r) => r.urgency === 'NORMAL').length,
        totalEstimatedCost: needsOrder.reduce((sum, r) => sum + r.estimatedCost, 0),
      },
      recommendations: needsOrder,
      allItems: recommendations,
    };
  }

  /**
   * Narx tavsiyanomalar — past/yuqori ishlovchi mahsulotlar uchun narx tuzatish
   */
  static async getPricingRecommendations(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [products, recentSales, previousSales] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          costPrice: true,
          category: { select: { name: true } },
        },
      }),

      // So'nggi 30 kunlik sotuvlar
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            tenantId,
            status: OrderStatus.COMPLETED,
            createdAt: { gte: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true, total: true },
        _count: true,
      }),

      // Oldingi 30 kunlik sotuvlar (trend uchun)
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            tenantId,
            status: OrderStatus.COMPLETED,
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        },
        _sum: { quantity: true, total: true },
        _count: true,
      }),
    ]);

    const recentMap = new Map(
      recentSales.map((s) => [
        s.productId,
        { quantity: Number(s._sum.quantity || 0), revenue: Number(s._sum.total || 0), orders: s._count },
      ])
    );

    const previousMap = new Map(
      previousSales.map((s) => [
        s.productId,
        { quantity: Number(s._sum.quantity || 0), revenue: Number(s._sum.total || 0), orders: s._count },
      ])
    );

    const recommendations = [];

    for (const product of products) {
      const price = Number(product.price);
      const costPrice = Number(product.costPrice || 0);
      const recent = recentMap.get(product.id);
      const previous = previousMap.get(product.id);
      const margin = costPrice > 0 ? ((price - costPrice) / price) * 100 : 0;

      // 1. Juda past margin (< 20%) — narxni oshiring
      if (costPrice > 0 && margin < 20 && recent && recent.quantity > 0) {
        const suggestedPrice = Math.ceil(costPrice / 0.65); // 35% margin uchun
        recommendations.push({
          productId: product.id,
          name: product.name,
          category: product.category.name,
          currentPrice: price,
          costPrice,
          currentMargin: Math.round(margin * 100) / 100,
          suggestedPrice,
          suggestedMargin: Math.round(((suggestedPrice - costPrice) / suggestedPrice) * 10000) / 100,
          reason: 'LOW_MARGIN',
          description: `Margin juda past (${margin.toFixed(1)}%). Narxni ${suggestedPrice.toLocaleString()} ga oshirish tavsiya etiladi.`,
          recentQuantity: recent.quantity,
          trend: previous ? ((recent.quantity - previous.quantity) / Math.max(previous.quantity, 1)) * 100 : 0,
        });
      }

      // 2. Yuqori talab + past narx — narxni oshirish imkoniyati
      if (recent && previous && previous.quantity > 0) {
        const growthRate = (recent.quantity - previous.quantity) / previous.quantity;
        if (growthRate > 0.3 && margin < 50) {
          // 30% dan ortiq o'sish
          const priceIncrease = Math.ceil(price * 1.1); // +10%
          recommendations.push({
            productId: product.id,
            name: product.name,
            category: product.category.name,
            currentPrice: price,
            costPrice,
            currentMargin: Math.round(margin * 100) / 100,
            suggestedPrice: priceIncrease,
            suggestedMargin: costPrice > 0
              ? Math.round(((priceIncrease - costPrice) / priceIncrease) * 10000) / 100
              : 0,
            reason: 'HIGH_DEMAND',
            description: `Talab ${Math.round(growthRate * 100)}% oshdi. Narxni 10% ga oshirish mumkin.`,
            recentQuantity: recent.quantity,
            trend: Math.round(growthRate * 100),
          });
        }
      }

      // 3. Tushayotgan sotuv — narxni kamaytiring yoki aksiya qiling
      if (recent && previous && previous.quantity > 5) {
        const declineRate = (previous.quantity - recent.quantity) / previous.quantity;
        if (declineRate > 0.4 && recent.quantity > 0) {
          // 40% dan ortiq tushish
          const discountPrice = Math.ceil(price * 0.9); // -10%
          recommendations.push({
            productId: product.id,
            name: product.name,
            category: product.category.name,
            currentPrice: price,
            costPrice,
            currentMargin: Math.round(margin * 100) / 100,
            suggestedPrice: discountPrice,
            suggestedMargin: costPrice > 0
              ? Math.round(((discountPrice - costPrice) / discountPrice) * 10000) / 100
              : 0,
            reason: 'DECLINING_SALES',
            description: `Sotuv ${Math.round(declineRate * 100)}% tushdi. Narxni 10% ga kamaytirish yoki aksiya qilish tavsiya etiladi.`,
            recentQuantity: recent.quantity,
            trend: -Math.round(declineRate * 100),
          });
        }
      }
    }

    // Reason bo'yicha guruhlash
    const grouped = {
      lowMargin: recommendations.filter((r) => r.reason === 'LOW_MARGIN'),
      highDemand: recommendations.filter((r) => r.reason === 'HIGH_DEMAND'),
      decliningSales: recommendations.filter((r) => r.reason === 'DECLINING_SALES'),
    };

    return {
      generatedAt: new Date(),
      totalProducts: products.length,
      totalRecommendations: recommendations.length,
      summary: {
        lowMargin: grouped.lowMargin.length,
        highDemand: grouped.highDemand.length,
        decliningSales: grouped.decliningSales.length,
      },
      recommendations: grouped,
    };
  }
}
