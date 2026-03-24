import { Server } from 'socket.io';
import { prisma, OrderStatus, ItemStatus, OrderType } from '@oshxona/database';
import {
  nonborApiService,
  type NonborOrder,
  type NonborOrderState,
} from './nonbor.service.js';
import { IntegrationService } from './integration.service.js';

// Nonbor → Lokal status mapping
const NONBOR_TO_LOCAL_STATUS: Record<string, OrderStatus> = {
  PENDING: OrderStatus.NEW,
  CHECKING: OrderStatus.NEW,
  ACCEPTED: OrderStatus.CONFIRMED,
  PREPARING: OrderStatus.PREPARING,
  READY: OrderStatus.READY,
  DELIVERING: OrderStatus.DELIVERING,
  DELIVERED: OrderStatus.COMPLETED,
  CANCELLED: OrderStatus.CANCELLED,
};

// Lokal → Nonbor status mapping
const LOCAL_TO_NONBOR_STATUS: Partial<Record<OrderStatus, 'ACCEPTED' | 'READY' | 'CANCELLED' | 'DELIVERED'>> = {
  [OrderStatus.CONFIRMED]: 'ACCEPTED',
  [OrderStatus.READY]: 'READY',
  [OrderStatus.COMPLETED]: 'DELIVERED',
  [OrderStatus.CANCELLED]: 'CANCELLED',
};

// Polling intervallari
const POLLING_FAST = 10000;  // 10s — webhook yo'q bo'lsa
const POLLING_SLOW = 60000;  // 60s — webhook faol bo'lsa (fallback)

class NonborSyncService {
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private io: Server | null = null;
  private currentInterval = POLLING_FAST;
  private lastWebhookTime = 0; // Oxirgi webhook kelgan vaqt

  // Webhook kelganini belgilash (polling ni sekinlashtiradi)
  notifyWebhookReceived() {
    this.lastWebhookTime = Date.now();
    this.adjustPollingInterval();
  }

  // Polling intervalini webhook holatiga qarab moslashtirish
  private adjustPollingInterval() {
    const hasRecentWebhook = Date.now() - this.lastWebhookTime < 5 * 60 * 1000; // 5 daqiqa ichida
    const targetInterval = hasRecentWebhook ? POLLING_SLOW : POLLING_FAST;

    if (targetInterval !== this.currentInterval && this.io) {
      this.currentInterval = targetInterval;
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.syncOrders(), this.currentInterval);
        console.log(`[Nonbor] Polling interval: ${this.currentInterval / 1000}s (webhook ${hasRecentWebhook ? 'faol' : 'yo\'q'})`);
      }
    }
  }

  // Polling boshlash
  async startPolling(io: Server) {
    this.io = io;

    // Barcha tenantlarni tekshirish — nonbor yoqilganlarni topish
    const enabledSettings = await prisma.settings.findMany({
      where: { nonborEnabled: true, nonborSellerId: { not: null } },
    });

    if (enabledSettings.length === 0) {
      console.log('[Nonbor] Hech qaysi tenantda integratsiya yoqilmagan');
      return;
    }

    // Webhook faol bo'lsa sekin polling, aks holda tez
    const hasActiveWebhooks = await prisma.webhook.count({
      where: { isActive: true, service: 'nonbor' },
    });
    this.currentInterval = hasActiveWebhooks > 0 ? POLLING_SLOW : POLLING_FAST;

    console.log(`[Nonbor] Polling boshlandi (${enabledSettings.length} ta tenant, interval: ${this.currentInterval / 1000}s)`);
    this.pollingInterval = setInterval(() => this.syncOrders(), this.currentInterval);

    // Birinchi sync darhol
    this.syncOrders();
  }

  // Pollingni to'xtatish
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('[Nonbor] Polling to\'xtatildi');
  }

  // Pollingni qayta ishga tushirish
  async restartPolling(io: Server) {
    this.stopPolling();
    await this.startPolling(io);
  }

  // Asosiy sync funksiyasi — barcha tenantlar uchun
  async syncOrders() {
    if (this.isPolling) return; // O'zaro to'qnashuvni oldini olish
    this.isPolling = true;

    try {
      const enabledSettings = await prisma.settings.findMany({
        where: { nonborEnabled: true, nonborSellerId: { not: null } },
      });

      for (const settings of enabledSettings) {
        try {
          const tenantId = settings.tenantId;

          // Use the new v2 API method to fetch orders
          const nonborOrders = await nonborApiService.syncOrdersFromNonbor(tenantId);

          // Faqat aktiv buyurtmalarni (PENDING, CHECKING, ACCEPTED, PREPARING, READY)
          const activeOrders = nonborOrders.filter((o) =>
            ['PENDING', 'CHECKING', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.state)
          );

          for (const nonborOrder of activeOrders) {
            try {
              await this.processNonborOrder(nonborOrder, tenantId);
            } catch (err) {
              console.error(`[Nonbor] Buyurtma #${nonborOrder.id} sync xatolik (tenant: ${tenantId}):`, err);
            }
          }
        } catch (err) {
          console.error(`[Nonbor] Tenant ${settings.tenantId} sync xatolik:`, err);
        }
      }
    } catch (err) {
      console.error('[Nonbor] Sync xatolik:', err);
    } finally {
      this.isPolling = false;
    }
  }

  // Bitta Nonbor buyurtmani qayta ishlash
  private async processNonborOrder(nonborOrder: NonborOrder, tenantId: string) {
    // Lokal DB da mavjudmi?
    const existingOrder = await prisma.order.findFirst({
      where: { nonborOrderId: nonborOrder.id, tenantId },
    });

    if (existingOrder) {
      // Status yangilanishini tekshirish (Nonbor → Lokal)
      const expectedLocalStatus = NONBOR_TO_LOCAL_STATUS[nonborOrder.state];
      if (expectedLocalStatus && existingOrder.status !== expectedLocalStatus) {
        // Nonbor tomondan status o'zgargan — lokalni yangilash
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: { status: expectedLocalStatus },
        });
        console.log(`[Nonbor] Status yangilandi: #${nonborOrder.id} → ${expectedLocalStatus}`);

        // Socket event yuborish
        if (this.io) {
          const updatedOrder = await prisma.order.findUnique({
            where: { id: existingOrder.id },
            include: { items: { include: { product: true } }, customer: true },
          });
          this.io.to(`tenant:${tenantId}:kitchen`).emit('order:updated', updatedOrder);
          this.io.to(`tenant:${tenantId}:pos`).emit('order:updated', updatedOrder);
          this.io.to(`tenant:${tenantId}:admin`).emit('order:updated', updatedOrder);
        }
      }
      return;
    }

    // Yangi buyurtma — import qilish
    await this.importNonborOrder(nonborOrder, tenantId);
  }

  // Nonbor buyurtmani lokal DB ga import qilish
  private async importNonborOrder(nonborOrder: NonborOrder, tenantId: string) {
    console.log(`[Nonbor] Yangi buyurtma import: #${nonborOrder.id} (tenant: ${tenantId})`);

    // 1. System user topish — shu tenant uchun MANAGER yoki ADMIN
    let systemUser = await prisma.user.findFirst({
      where: { tenantId, isActive: true, role: { in: ['MANAGER', 'CASHIER'] } },
    });

    // Fallback: shu tenantdagi istalgan aktiv foydalanuvchi
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({
        where: { tenantId, isActive: true },
      });
    }

    // Oxirgi fallback: SUPER_ADMIN (tenantId null)
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
    }

    if (!systemUser) {
      console.error('[Nonbor] System user topilmadi!');
      return;
    }

    // 2. Customer yaratish/topish
    let customerId: string | undefined;
    if (nonborOrder.user?.phone) {
      const phone = nonborOrder.user.phone.replace(/\D/g, '');
      const cleanPhone = phone.startsWith('998') ? `+${phone}` : `+998${phone}`;

      let customer = await prisma.customer.findFirst({
        where: { phone: cleanPhone, tenantId },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone: cleanPhone,
            firstName: nonborOrder.user.first_name || undefined,
            lastName: nonborOrder.user.last_name || undefined,
            tenantId,
          },
        });
      }

      customerId = customer.id;
    }

    // 3. "Nonbor" default kategoriya
    let nonborCategory = await prisma.category.findFirst({
      where: { slug: 'nonbor', tenantId },
    });

    if (!nonborCategory) {
      nonborCategory = await prisma.category.create({
        data: {
          name: 'Nonbor',
          slug: 'nonbor',
          isActive: true,
          tenantId,
        },
      });
    }

    // 4. Mahsulotlarni yaratish/topish va OrderItems tayyorlash
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
    }> = [];

    let subtotal = 0;

    for (const item of nonborOrder.order_item) {
      const nonborProduct = item.product;
      const quantity = item.count || 1;

      // Lokal product topish yoki yaratish
      let product = await prisma.product.findFirst({
        where: { nonborProductId: nonborProduct.id, tenantId },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: nonborProduct.name,
            price: nonborProduct.price,
            categoryId: nonborCategory.id,
            nonborProductId: nonborProduct.id,
            image: nonborProduct.images?.[0]?.image || undefined,
            isActive: true,
            tenantId,
          },
        });
        console.log(`[Nonbor] Yangi mahsulot yaratildi: ${product.name}`);
      }

      const price = Number(product.price);
      const total = price * quantity;
      subtotal += total;

      orderItems.push({
        productId: product.id,
        quantity,
        price,
        total,
      });
    }

    // 5. Order type aniqlash
    const orderType: OrderType =
      nonborOrder.delivery_method === 'DELIVERY'
        ? OrderType.DELIVERY
        : OrderType.TAKEAWAY;

    // 6. Order number yaratish
    const settings = await prisma.settings.findFirst({
      where: { tenantId },
    });
    const prefix = settings?.orderPrefix || 'ORD';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const todayCount = await prisma.order.count({
      where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay } },
    });

    const orderNumber = `${prefix}-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;

    // 7. Tax hisoblash
    const taxRate = Number(settings?.taxRate || 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // 8. Lokal status
    const localStatus = NONBOR_TO_LOCAL_STATUS[nonborOrder.state] || OrderStatus.NEW;

    // 9. Manzil
    const address = nonborOrder.delivery?.address || undefined;

    // 10. Order yaratish
    const order = await prisma.order.create({
      data: {
        orderNumber,
        type: orderType,
        status: localStatus,
        userId: systemUser.id,
        customerId,
        subtotal,
        discount: 0,
        tax,
        total,
        address,
        nonborOrderId: nonborOrder.id,
        isNonborOrder: true,
        notes: `Nonbor #${nonborOrder.id} | ${nonborOrder.payment_method}`,
        tenantId,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    console.log(`[Nonbor] Buyurtma import qilindi: ${order.orderNumber} (Nonbor #${nonborOrder.id})`);

    // Integration Hub — barcha integratsiyalarga event dispatch
    IntegrationService.dispatchEvent('order:new', order).catch(console.error);

    // 11. PENDING/CHECKING statusli buyurtmani avtomatik ACCEPTED qilish
    if (nonborOrder.state === 'CHECKING' || nonborOrder.state === 'PENDING') {
      try {
        await nonborApiService.changeOrderStatus(nonborOrder.id, 'ACCEPTED', tenantId);
        // Lokal statusni ham CONFIRMED qilish
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED },
        });
        console.log(`[Nonbor] Buyurtma #${nonborOrder.id} avtomatik ACCEPTED qilindi`);
      } catch (err) {
        console.error(`[Nonbor] ACCEPTED qilishda xatolik:`, err);
      }
    }

    // 12. DELIVERY buyurtma uchun avtomatik kuryer qidirish
    if (nonborOrder.delivery_method === 'DELIVERY' && nonborOrder.state !== 'CANCELLED') {
      try {
        await nonborApiService.acceptDelivery(nonborOrder.id, tenantId);
        console.log(`[Nonbor] Buyurtma #${nonborOrder.id} uchun yetkazish boshlandi`);
      } catch (err) {
        // Delivery already accepted or not available — not critical
        console.warn(`[Nonbor] Delivery accept: #${nonborOrder.id}`, (err as any)?.response?.data || (err as any)?.message);
      }
    }

    // 13. Socket.IO event — tenant-scoped rooms
    if (this.io) {
      this.io.to(`tenant:${tenantId}:kitchen`).emit('order:new', order);
      this.io.to(`tenant:${tenantId}:pos`).emit('order:new', order);
      this.io.to(`tenant:${tenantId}:admin`).emit('order:new', order);
      this.io.to(`tenant:${tenantId}:waiter`).emit('order:new', order);
    }

    return order;
  }

  // Lokal status o'zgarganda Nonborga sync
  async syncStatusToNonbor(order: {
    id: string;
    status: OrderStatus;
    nonborOrderId: number | null;
    isNonborOrder: boolean;
    tenantId?: string;
  }) {
    if (!order.isNonborOrder || !order.nonborOrderId) return;

    const nonborState = LOCAL_TO_NONBOR_STATUS[order.status];
    if (!nonborState) return;

    try {
      await nonborApiService.syncOrderStatusToNonbor(
        order.id,
        order.nonborOrderId,
        nonborState,
        order.tenantId
      );
      console.log(
        `[Nonbor] Status sync: Buyurtma #${order.nonborOrderId} → ${nonborState}`
      );
    } catch (err) {
      console.error(
        `[Nonbor] Status sync xatolik (order #${order.nonborOrderId}):`,
        err
      );
    }
  }

  // Manual sync trigger
  async manualSync() {
    console.log('[Nonbor] Manual sync boshlandi...');
    await this.syncOrders();
    console.log('[Nonbor] Manual sync yakunlandi');
  }

  // Sync products from local POS to Nonbor
  async syncProducts(tenantId: string) {
    console.log(`[Nonbor] Mahsulotlar sync boshlandi (tenant: ${tenantId})...`);
    const result = await nonborApiService.syncProductsToNonbor(tenantId);
    console.log(`[Nonbor] Mahsulotlar sync yakunlandi: ${result.created} yaratildi, ${result.updated} yangilandi, ${result.errors.length} xatolik`);
    return result;
  }
}

export const nonborSyncService = new NonborSyncService();
