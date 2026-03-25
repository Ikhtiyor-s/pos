import { prisma, Prisma, NotificationType, NotificationChannel } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

interface CreateNotificationData {
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Prisma.JsonValue;
  userId?: string;
  tenantId: string;
}

interface GetNotificationsOptions {
  userId?: string;
  isRead?: boolean;
  type?: NotificationType;
  page: number;
  limit: number;
}

interface StockLowItem {
  id: string;
  name: string;
  currentQty: number;
  minQty: number;
}

interface OnlineOrderData {
  source: string;
  externalId: string;
  customerName: string;
  totalAmount: number;
}

export class NotificationService {
  /**
   * Yangi bildirishnoma yaratish
   */
  static async createNotification(data: CreateNotificationData) {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        channel: data.channel,
        title: data.title,
        body: data.body,
        data: data.data ?? Prisma.DbNull,
        userId: data.userId,
        tenantId: data.tenantId,
      },
    });

    return notification;
  }

  /**
   * Bildirishnomalar ro'yxatini olish (pagination + filter)
   */
  static async getNotifications(tenantId: string, options: GetNotificationsOptions) {
    const { userId, isRead, type, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { tenantId };

    if (userId) {
      where.OR = [
        { userId },
        { userId: null }, // Umumiy tenant bildirishnomalar
      ];
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total, page, limit };
  }

  /**
   * Bildirishnomani o'qilgan deb belgilash
   */
  static async markAsRead(id: string, tenantId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      throw new AppError('Bildirishnoma topilmadi', 404);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Barcha bildirishnomalarni o'qilgan deb belgilash
   */
  static async markAllAsRead(userId: string, tenantId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        tenantId,
        OR: [
          { userId },
          { userId: null },
        ],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  /**
   * O'qilmagan bildirishnomalar sonini olish
   */
  static async getUnreadCount(userId: string, tenantId: string) {
    const count = await prisma.notification.count({
      where: {
        tenantId,
        OR: [
          { userId },
          { userId: null },
        ],
        isRead: false,
      },
    });

    return { count };
  }

  /**
   * Eski bildirishnomalarni o'chirish
   */
  static async deleteOldNotifications(tenantId: string, daysOld: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        tenantId,
        createdAt: { lt: cutoffDate },
      },
    });

    return { deleted: result.count };
  }

  /**
   * Ombor kam qolgan mahsulot haqida bildirishnoma
   * Socket.IO orqali real-time yuboradi
   */
  static async sendStockLowAlert(
    tenantId: string,
    item: StockLowItem,
    io?: any
  ) {
    const notification = await NotificationService.createNotification({
      type: 'STOCK_LOW',
      channel: 'IN_APP',
      title: 'Omborda kam qolgan mahsulot',
      body: `"${item.name}" mahsulotidan ${item.currentQty} dona qoldi (min: ${item.minQty})`,
      data: {
        itemId: item.id,
        itemName: item.name,
        currentQty: item.currentQty,
        minQty: item.minQty,
      },
      tenantId,
    });

    // Socket.IO orqali real-time bildirishnoma yuborish
    if (io) {
      io.to(`tenant:${tenantId}:admin`).emit('notification:new', notification);
    }

    return notification;
  }

  /**
   * Online buyurtma haqida bildirishnoma
   * Socket.IO orqali real-time yuboradi
   */
  static async sendOnlineOrderAlert(
    tenantId: string,
    order: OnlineOrderData,
    io?: any
  ) {
    const notification = await NotificationService.createNotification({
      type: 'ORDER_ONLINE',
      channel: 'IN_APP',
      title: `Yangi online buyurtma (${order.source})`,
      body: `${order.customerName} — ${order.totalAmount.toLocaleString()} so'm (ID: ${order.externalId})`,
      data: {
        source: order.source,
        externalId: order.externalId,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
      },
      tenantId,
    });

    // Socket.IO orqali real-time bildirishnoma yuborish
    if (io) {
      io.to(`tenant:${tenantId}:admin`).emit('notification:new', notification);
    }

    return notification;
  }

  /**
   * Bildirishnoma sozlamalarini olish
   */
  static async getSettings(tenantId: string) {
    let settings = await prisma.notificationSetting.findUnique({
      where: { tenantId },
    });

    // Agar sozlamalar mavjud bo'lmasa, default yaratish
    if (!settings) {
      settings = await prisma.notificationSetting.create({
        data: { tenantId },
      });
    }

    return settings;
  }

  /**
   * Bildirishnoma sozlamalarini yangilash
   */
  static async updateSettings(
    tenantId: string,
    data: {
      stockLowEnabled?: boolean;
      stockLowChannels?: string[];
      orderNewEnabled?: boolean;
      orderNewChannels?: string[];
      onlineOrderEnabled?: boolean;
      onlineOrderChannels?: string[];
      expenseEnabled?: boolean;
      expenseChannels?: string[];
    }
  ) {
    const settings = await prisma.notificationSetting.upsert({
      where: { tenantId },
      update: data,
      create: {
        tenantId,
        ...data,
      },
    });

    return settings;
  }
}
