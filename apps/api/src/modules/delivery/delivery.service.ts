import { prisma, Prisma, DeliveryStatus, DriverStatus } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

export class DeliveryService {
  // ==========================================
  // DELIVERY CRUD
  // ==========================================

  static async createDelivery(
    tenantId: string,
    orderId: string,
    data: {
      deliveryAddress: string;
      customerPhone: string;
      pickupAddress?: string;
      distance?: number;
      deliveryFee?: number;
      notes?: string;
    }
  ) {
    // Buyurtma mavjudligini tekshirish
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });

    if (!order) {
      throw new AppError('Buyurtma topilmadi', 404);
    }

    // Allaqachon delivery mavjudligini tekshirish
    const existing = await prisma.delivery.findUnique({
      where: { orderId },
    });

    if (existing) {
      throw new AppError('Bu buyurtma uchun yetkazib berish allaqachon yaratilgan', 409);
    }

    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        deliveryAddress: data.deliveryAddress,
        customerPhone: data.customerPhone,
        pickupAddress: data.pickupAddress,
        distance: data.distance,
        deliveryFee: data.deliveryFee ?? 0,
        notes: data.notes,
        tenantId,
      },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });

    return delivery;
  }

  // ==========================================
  // STATUS TRANSITIONS
  // ==========================================

  static async assignDriver(tenantId: string, deliveryId: string, driverId: string) {
    const delivery = await this.getDeliveryById(tenantId, deliveryId);

    if (delivery.status !== 'PENDING') {
      throw new AppError('Faqat kutilayotgan yetkazib berishga haydovchi tayinlash mumkin', 400);
    }

    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId, isActive: true },
    });

    if (!driver) {
      throw new AppError('Haydovchi topilmadi', 404);
    }

    if (driver.status !== 'AVAILABLE') {
      throw new AppError('Haydovchi hozir band', 400);
    }

    // Haydovchini BUSY qilish
    await prisma.driver.update({
      where: { id: driverId },
      data: { status: 'BUSY' },
    });

    // Taxminiy vaqtni hisoblash (masofaga qarab)
    const distance = delivery.distance ? Number(delivery.distance) : 5;
    const estimatedTime = Math.max(15, Math.round(distance * 5)); // min 15 daqiqa

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        driverId,
        status: 'ASSIGNED',
        estimatedTime,
      },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });
  }

  static async pickUp(tenantId: string, deliveryId: string) {
    const delivery = await this.getDeliveryById(tenantId, deliveryId);

    if (delivery.status !== 'ASSIGNED') {
      throw new AppError('Faqat tayinlangan yetkazib berishni olish mumkin', 400);
    }

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'PICKED_UP',
        pickedUpAt: new Date(),
      },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });
  }

  static async inTransit(tenantId: string, deliveryId: string) {
    const delivery = await this.getDeliveryById(tenantId, deliveryId);

    if (delivery.status !== 'PICKED_UP') {
      throw new AppError('Faqat olingan yetkazib berishni yo\'lda deb belgilash mumkin', 400);
    }

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'IN_TRANSIT' },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });
  }

  static async delivered(tenantId: string, deliveryId: string, rating?: number) {
    const delivery = await this.getDeliveryById(tenantId, deliveryId);

    if (!['PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)) {
      throw new AppError('Bu yetkazib berishni yakunlab bo\'lmaydi', 400);
    }

    // Haqiqiy vaqtni hisoblash
    const createdAt = new Date(delivery.createdAt).getTime();
    const now = Date.now();
    const actualTime = Math.round((now - createdAt) / 60000); // daqiqalarda

    // Haydovchini AVAILABLE qilish
    if (delivery.driverId) {
      await prisma.driver.update({
        where: { id: delivery.driverId },
        data: { status: 'AVAILABLE' },
      });
    }

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        actualTime,
        rating,
      },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });
  }

  static async failed(tenantId: string, deliveryId: string, reason: string) {
    const delivery = await this.getDeliveryById(tenantId, deliveryId);

    if (['DELIVERED', 'FAILED'].includes(delivery.status)) {
      throw new AppError('Bu yetkazib berish allaqachon yakunlangan', 400);
    }

    // Haydovchini AVAILABLE qilish
    if (delivery.driverId) {
      await prisma.driver.update({
        where: { id: delivery.driverId },
        data: { status: 'AVAILABLE' },
      });
    }

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        notes: reason,
      },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });
  }

  // ==========================================
  // QUERIES
  // ==========================================

  static async getActiveDeliveries(tenantId: string) {
    const deliveries = await prisma.delivery.findMany({
      where: {
        tenantId,
        status: { notIn: ['DELIVERED', 'FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });

    return deliveries;
  }

  static async getDriverDeliveries(tenantId: string, driverId: string) {
    const deliveries = await prisma.delivery.findMany({
      where: { tenantId, driverId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
      },
    });

    return deliveries;
  }

  static async getAllDeliveries(
    tenantId: string,
    options: { page?: number; limit?: number }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryWhereInput = { tenantId };

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, total: true } },
          driver: true,
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    return { deliveries, page, limit, total };
  }

  // ==========================================
  // DRIVERS
  // ==========================================

  static async createDriver(
    tenantId: string,
    data: { name: string; phone: string; vehicle?: string }
  ) {
    const driver = await prisma.driver.create({
      data: {
        name: data.name,
        phone: data.phone,
        vehicle: data.vehicle,
        tenantId,
      },
    });

    return driver;
  }

  static async getDrivers(tenantId: string, options: { status?: DriverStatus }) {
    const where: Prisma.DriverWhereInput = { tenantId, isActive: true };

    if (options.status) {
      where.status = options.status;
    }

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    return drivers;
  }

  static async updateDriverStatus(tenantId: string, driverId: string, status: DriverStatus) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, tenantId },
    });

    if (!driver) {
      throw new AppError('Haydovchi topilmadi', 404);
    }

    return prisma.driver.update({
      where: { id: driverId },
      data: { status },
    });
  }

  // ==========================================
  // STATS
  // ==========================================

  static async getDeliveryStats(tenantId: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.DeliveryWhereInput = { tenantId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as any).lte = new Date(dateTo);
    }

    const [total, delivered, failed, allDelivered] = await Promise.all([
      prisma.delivery.count({ where }),
      prisma.delivery.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.delivery.count({ where: { ...where, status: 'FAILED' } }),
      prisma.delivery.findMany({
        where: { ...where, status: 'DELIVERED', actualTime: { not: null } },
        select: { actualTime: true, driverId: true, rating: true },
      }),
    ]);

    // O'rtacha vaqt
    const avgTime = allDelivered.length > 0
      ? Math.round(allDelivered.reduce((sum, d) => sum + (d.actualTime || 0), 0) / allDelivered.length)
      : 0;

    // O'rtacha reyting
    const rated = allDelivered.filter((d) => d.rating);
    const avgRating = rated.length > 0
      ? Number((rated.reduce((sum, d) => sum + (d.rating || 0), 0) / rated.length).toFixed(1))
      : 0;

    // Top haydovchilar
    const driverCounts: Record<string, number> = {};
    allDelivered.forEach((d) => {
      if (d.driverId) {
        driverCounts[d.driverId] = (driverCounts[d.driverId] || 0) + 1;
      }
    });

    const topDriverIds = Object.entries(driverCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const topDrivers = topDriverIds.length > 0
      ? await prisma.driver.findMany({
          where: { id: { in: topDriverIds } },
          select: { id: true, name: true, phone: true },
        })
      : [];

    const topDriversWithCount = topDrivers.map((d) => ({
      ...d,
      deliveryCount: driverCounts[d.id] || 0,
    })).sort((a, b) => b.deliveryCount - a.deliveryCount);

    return {
      total,
      delivered,
      failed,
      completionRate: total > 0 ? Number(((delivered / total) * 100).toFixed(1)) : 0,
      avgDeliveryTime: avgTime,
      avgRating,
      topDrivers: topDriversWithCount,
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  static async getById(tenantId: string, id: string) {
    return this.getDeliveryById(tenantId, id);
  }

  private static async getDeliveryById(tenantId: string, id: string) {
    const delivery = await prisma.delivery.findFirst({
      where: { id, tenantId },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        driver: true,
      },
    });

    if (!delivery) {
      throw new AppError('Yetkazib berish topilmadi', 404);
    }

    return delivery;
  }
}
