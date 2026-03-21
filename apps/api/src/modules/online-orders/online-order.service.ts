import { prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';
import { nonborApiService } from '../../services/nonbor.service.js';
import { OrderService } from '../../services/order.service.js';
import { transformNonborOrder, mapNonborStatusToOnlineStatus } from './adapters/nonbor-order.adapter.js';
import type { ReceiveOnlineOrderInput, OnlineOrderSource, OnlineOrderStatus } from './online-order.validator.js';

export class OnlineOrderService {
  /**
   * Yangi online buyurtma qabul qilish (webhook yoki tashqi API orqali)
   */
  static async receiveOnlineOrder(data: {
    source: 'NONBOR' | 'TELEGRAM' | 'WEBSITE' | 'EXTERNAL_API';
    externalId: string;
    rawPayload: any;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    totalAmount: number;
    tenantId: string;
    items?: Array<{
      externalProductId?: string;
      name: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
    }>;
  }) {
    // Dublikat tekshirish
    const existing = await prisma.onlineOrder.findFirst({
      where: {
        externalId: data.externalId,
        source: data.source,
        tenantId: data.tenantId,
      },
    });

    if (existing) {
      // Mavjud buyurtmani qaytarish (idempotent)
      return existing;
    }

    const onlineOrder = await prisma.onlineOrder.create({
      data: {
        source: data.source,
        externalId: data.externalId,
        status: 'RECEIVED',
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        deliveryAddress: data.deliveryAddress || null,
        totalAmount: data.totalAmount,
        rawPayload: data.rawPayload,
        tenantId: data.tenantId,
      },
    });

    return onlineOrder;
  }

  /**
   * Online buyurtmalar ro'yxatini olish (filtrlash bilan)
   */
  static async getOnlineOrders(
    tenantId: string,
    options: {
      source?: OnlineOrderSource;
      status?: OnlineOrderStatus;
      page: number;
      limit: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const { page, limit, source, status, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (source) where.source = source;
    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      prisma.onlineOrder.findMany({
        where,
        include: {
          localOrder: {
            select: { id: true, orderNumber: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.onlineOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * Bitta online buyurtmani ID bo'yicha olish
   */
  static async getOnlineOrderById(id: string, tenantId: string) {
    const order = await prisma.onlineOrder.findUnique({
      where: { id, tenantId },
      include: {
        localOrder: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Online buyurtma topilmadi', 404);
    }

    return order;
  }

  /**
   * Online buyurtmani qabul qilish — mahalliy Order yaratish
   */
  static async acceptOnlineOrder(id: string, tenantId: string) {
    const onlineOrder = await this.getOnlineOrderById(id, tenantId);

    if (onlineOrder.status !== 'RECEIVED') {
      throw new AppError(
        `Bu buyurtmani qabul qilib bo'lmaydi. Joriy holat: ${onlineOrder.status}`,
        400
      );
    }

    // rawPayload dan items olish
    const rawPayload = onlineOrder.rawPayload as any;
    const onlineItems: Array<{ externalProductId?: string; name: string; quantity: number; notes?: string }> = rawPayload?.items || [];
    let mappedItems: Array<{ productId: string; quantity: number; notes?: string }> = [];

    if (onlineItems.length > 0) {
      // Tashqi mahsulot IDlarini mahalliy mahsulotlarga map qilish
      for (const item of onlineItems) {
        // Avval nonborProductId bo'yicha, keyin nomi bo'yicha qidirish
        let localProduct = null;

        if (item.externalProductId) {
          localProduct = await prisma.product.findFirst({
            where: {
              tenantId,
              OR: [
                { nonborProductId: parseInt(item.externalProductId) || undefined },
                { name: { contains: item.name, mode: 'insensitive' } },
              ],
            },
          });
        }

        if (!localProduct) {
          localProduct = await prisma.product.findFirst({
            where: {
              tenantId,
              name: { contains: item.name, mode: 'insensitive' },
            },
          });
        }

        if (localProduct) {
          mappedItems.push({
            productId: localProduct.id,
            quantity: item.quantity,
            notes: item.notes || undefined,
          });
        }
      }
    }

    // Agar hech qanday element map qilinmagan bo'lsa, faqat statusni o'zgartirish
    let localOrder = null;

    if (mappedItems.length > 0) {
      // Mahalliy buyurtma yaratish
      // OrderService.create ni ishlatish uchun DELIVERY tipidagi buyurtma
      const userId = (await prisma.user.findFirst({
        where: { tenantId, role: 'MANAGER' },
        select: { id: true },
      }))?.id;

      if (!userId) {
        throw new AppError('Buyurtma yaratish uchun MANAGER topilmadi', 500);
      }

      // Online buyurtma source mapping
      const sourceMap: Record<string, string> = {
        NONBOR: 'NONBOR_ORDER',
        TELEGRAM: 'TELEGRAM_ORDER',
        WEBSITE: 'WEBSITE_ORDER',
        EXTERNAL_API: 'API_ORDER',
      };

      localOrder = await OrderService.create(
        tenantId,
        {
          source: (sourceMap[onlineOrder.source] || 'API_ORDER') as any,
          type: 'DELIVERY',
          items: mappedItems,
          notes: `Online buyurtma #${onlineOrder.externalId} (${onlineOrder.source})${
            onlineOrder.customerName ? ` - ${onlineOrder.customerName}` : ''
          }${onlineOrder.customerPhone ? ` - ${onlineOrder.customerPhone}` : ''}`,
          address: onlineOrder.deliveryAddress || undefined,
        },
        userId
      );
    }

    // Online buyurtma statusini yangilash
    const updatedOnlineOrder = await prisma.onlineOrder.update({
      where: { id, tenantId },
      data: {
        status: localOrder ? 'MAPPED' : 'ACCEPTED',
        localOrderId: localOrder?.id || null,
        processedAt: new Date(),
      },
      include: {
        localOrder: localOrder
          ? {
              include: {
                items: { include: { product: true } },
              },
            }
          : undefined,
      },
    });

    return updatedOnlineOrder;
  }

  /**
   * Online buyurtmani rad etish
   */
  static async rejectOnlineOrder(id: string, reason: string, tenantId: string) {
    const onlineOrder = await this.getOnlineOrderById(id, tenantId);

    if (onlineOrder.status !== 'RECEIVED') {
      throw new AppError(
        `Bu buyurtmani rad etib bo'lmaydi. Joriy holat: ${onlineOrder.status}`,
        400
      );
    }

    const updatedOrder = await prisma.onlineOrder.update({
      where: { id, tenantId },
      data: {
        status: 'REJECTED',
        errorMessage: reason,
        processedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  /**
   * Online buyurtmani mavjud mahalliy buyurtmaga bog'lash
   */
  static async mapToLocalOrder(onlineOrderId: string, localOrderId: string, tenantId: string) {
    // Online buyurtma mavjudligini tekshirish
    const onlineOrder = await this.getOnlineOrderById(onlineOrderId, tenantId);

    if (onlineOrder.status === 'REJECTED' || onlineOrder.status === 'FAILED') {
      throw new AppError('Rad etilgan yoki bekor qilingan buyurtmani bog\'lab bo\'lmaydi', 400);
    }

    // Mahalliy buyurtma mavjudligini tekshirish
    const localOrder = await prisma.order.findUnique({
      where: { id: localOrderId, tenantId },
    });

    if (!localOrder) {
      throw new AppError('Mahalliy buyurtma topilmadi', 404);
    }

    const updatedOrder = await prisma.onlineOrder.update({
      where: { id: onlineOrderId, tenantId },
      data: {
        status: 'MAPPED',
        localOrderId,
      },
      include: {
        localOrder: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    });

    return updatedOrder;
  }

  /**
   * Online buyurtmalar statistikasi — manba va holat bo'yicha
   */
  static async getOnlineOrderStats(tenantId: string, dateFrom: string, dateTo: string) {
    const where: any = {
      tenantId,
      createdAt: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      },
    };

    // Manba bo'yicha
    const bySource = await prisma.onlineOrder.groupBy({
      by: ['source'],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    // Holat bo'yicha
    const byStatus = await prisma.onlineOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    // Umumiy statistika
    const total = await prisma.onlineOrder.count({ where });

    const totalAmount = await prisma.onlineOrder.aggregate({
      where,
      _sum: { totalAmount: true },
    });

    return {
      total,
      totalAmount: totalAmount._sum.totalAmount || 0,
      bySource: bySource.map((s) => ({
        source: s.source,
        count: s._count.id,
        totalAmount: s._sum.totalAmount || 0,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  /**
   * Nonbor dan buyurtmalarni sinxronlashtirish
   */
  static async syncNonborOrders(tenantId: string) {
    // Tenant sozlamalaridan Nonbor seller ID olish
    const settings = await prisma.settings.findFirst({
      where: { tenantId },
    });

    const sellerId = (settings as any)?.nonborSellerId;

    if (!sellerId) {
      throw new AppError('Nonbor seller ID sozlanmagan. Integratsiya sozlamalarini tekshiring.', 400);
    }

    // Nonbor API dan buyurtmalarni olish
    const nonborOrders = await nonborApiService.getSellerOrders(Number(sellerId));

    let created = 0;
    let skipped = 0;
    let errors: Array<{ externalId: string; error: string }> = [];

    for (const nonborOrder of nonborOrders) {
      try {
        const transformed = transformNonborOrder(nonborOrder);

        // Dublikat tekshirish
        const existing = await prisma.onlineOrder.findFirst({
          where: {
            externalId: transformed.externalId,
            source: 'NONBOR',
            tenantId,
          },
        });

        if (existing) {
          // Mavjud buyurtma statusini yangilash
          const newStatus = mapNonborStatusToOnlineStatus(nonborOrder.state);
          if (existing.status === 'RECEIVED' && newStatus !== 'RECEIVED') {
            await prisma.onlineOrder.update({
              where: { id: existing.id },
              data: { status: newStatus, rawPayload: nonborOrder as any },
            });
          }
          skipped++;
          continue;
        }

        // Yangi OnlineOrder yaratish
        await this.receiveOnlineOrder({
          source: 'NONBOR',
          externalId: transformed.externalId,
          rawPayload: transformed.rawPayload,
          customerName: transformed.customerName,
          customerPhone: transformed.customerPhone,
          deliveryAddress: transformed.deliveryAddress,
          totalAmount: transformed.totalAmount,
          tenantId,
          items: transformed.items,
        });

        created++;
      } catch (error: any) {
        errors.push({
          externalId: String(nonborOrder.id),
          error: error.message || 'Noma\'lum xatolik',
        });
      }
    }

    return {
      total: nonborOrders.length,
      created,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
