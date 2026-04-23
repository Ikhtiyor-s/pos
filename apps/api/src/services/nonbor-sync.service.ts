import { Server } from 'socket.io';
import { prisma, OrderStatus, OrderType } from '@oshxona/database';
import {
  nonborApiService,
  type NonborOrder,
} from './nonbor.service.js';
import { OrderService } from './order.service.js';
import { IntegrationService } from './integration.service.js';
import { logger } from '../utils/logger.js';

// Nonbor → Lokal status mapping (barcha 12 ta holat)
const NONBOR_TO_LOCAL_STATUS: Record<string, OrderStatus> = {
  PENDING: OrderStatus.NEW,
  WAITING_PAYMENT: OrderStatus.NEW,
  CHECKING: OrderStatus.NEW,
  ACCEPTED: OrderStatus.CONFIRMED,
  READY: OrderStatus.READY,
  PAYMENT_EXPIRED: OrderStatus.CANCELLED,
  ACCEPT_EXPIRED: OrderStatus.CANCELLED,
  CANCELLED_CLIENT: OrderStatus.CANCELLED,
  CANCELLED_SELLER: OrderStatus.CANCELLED,
  DELIVERING: OrderStatus.DELIVERING,
  DELIVERED: OrderStatus.COMPLETED,
  COMPLETED: OrderStatus.COMPLETED,
};

// Lokal → Nonbor status mapping (faqat biz push qila oladigan holatlar)
const LOCAL_TO_NONBOR_STATUS: Partial<
  Record<OrderStatus, 'ACCEPTED' | 'READY' | 'CANCELLED_SELLER' | 'DELIVERED' | 'COMPLETED'>
> = {
  [OrderStatus.CONFIRMED]: 'ACCEPTED',
  [OrderStatus.READY]: 'READY',
  [OrderStatus.COMPLETED]: 'COMPLETED',
  [OrderStatus.CANCELLED]: 'CANCELLED_SELLER',
};

// Aktiv (terminal bo'lmagan) nonbor holatlari
const ACTIVE_NONBOR_STATES = new Set([
  'PENDING',
  'WAITING_PAYMENT',
  'CHECKING',
  'ACCEPTED',
  'READY',
  'DELIVERING',
]);

const POLLING_FAST = 10000; // 10s — webhook yo'q bo'lsa
const POLLING_SLOW = 60000; // 60s — webhook faol bo'lsa (fallback)

class NonborSyncService {
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private io: Server | null = null;
  private currentInterval = POLLING_FAST;
  private lastWebhookTime = 0;

  notifyWebhookReceived() {
    this.lastWebhookTime = Date.now();
    this.adjustPollingInterval();
  }

  private adjustPollingInterval() {
    const hasRecentWebhook = Date.now() - this.lastWebhookTime < 5 * 60 * 1000;
    const targetInterval = hasRecentWebhook ? POLLING_SLOW : POLLING_FAST;

    if (targetInterval !== this.currentInterval && this.io) {
      this.currentInterval = targetInterval;
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.syncOrders(), this.currentInterval);
        logger.info('[Nonbor] Polling interval o\'zgartirildi', {
          intervalSec: this.currentInterval / 1000,
          webhookActive: hasRecentWebhook,
        });
      }
    }
  }

  async startPolling(io: Server) {
    this.io = io;

    const enabledSettings = await prisma.settings.findMany({
      where: { nonborEnabled: true, nonborSellerId: { not: null } },
    });

    if (enabledSettings.length === 0) {
      logger.info('[Nonbor] Hech qaysi tenantda integratsiya yoqilmagan');
      return;
    }

    const hasActiveWebhooks = await prisma.webhook.count({
      where: { isActive: true, service: 'nonbor' },
    });
    this.currentInterval = hasActiveWebhooks > 0 ? POLLING_SLOW : POLLING_FAST;

    logger.info('[Nonbor] Polling boshlandi', {
      tenants: enabledSettings.length,
      intervalSec: this.currentInterval / 1000,
    });
    this.pollingInterval = setInterval(() => this.syncOrders(), this.currentInterval);
    this.syncOrders();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    logger.info('[Nonbor] Polling to\'xtatildi');
  }

  async restartPolling(io: Server) {
    this.stopPolling();
    await this.startPolling(io);
  }

  async syncOrders() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const enabledSettings = await prisma.settings.findMany({
        where: { nonborEnabled: true, nonborSellerId: { not: null } },
      });

      for (const settings of enabledSettings) {
        try {
          const tenantId = settings.tenantId;
          const nonborOrders = await nonborApiService.syncOrdersFromNonbor(tenantId);

          const activeOrders = nonborOrders.filter((o) => ACTIVE_NONBOR_STATES.has(o.state));

          for (const nonborOrder of activeOrders) {
            try {
              await this.processNonborOrder(nonborOrder, tenantId);
            } catch (err) {
              logger.error('[Nonbor] Buyurtma sync xatolik', {
                nonborOrderId: nonborOrder.id,
                tenantId,
                error: (err as Error).message,
              });
            }
          }
        } catch (err) {
          logger.error('[Nonbor] Tenant sync xatolik', {
            tenantId: settings.tenantId,
            error: (err as Error).message,
          });
        }
      }
    } catch (err) {
      logger.error('[Nonbor] Sync xatolik', { error: (err as Error).message });
    } finally {
      this.isPolling = false;
    }
  }

  private async processNonborOrder(nonborOrder: NonborOrder, tenantId: string) {
    const existingOrder = await prisma.order.findFirst({
      where: { nonborOrderId: nonborOrder.id, tenantId },
    });

    if (existingOrder) {
      const expectedLocalStatus = NONBOR_TO_LOCAL_STATUS[nonborOrder.state];
      if (expectedLocalStatus && existingOrder.status !== expectedLocalStatus) {
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: { status: expectedLocalStatus },
        });
        logger.info('[Nonbor] Status yangilandi', {
          nonborOrderId: nonborOrder.id,
          newStatus: expectedLocalStatus,
        });

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

    await this.importNonborOrder(nonborOrder, tenantId);
  }

  private async importNonborOrder(nonborOrder: NonborOrder, tenantId: string) {
    logger.info('[Nonbor] Yangi buyurtma import', {
      nonborOrderId: nonborOrder.id,
      tenantId,
    });

    // 1. System user topish
    let systemUser = await prisma.user.findFirst({
      where: { tenantId, isActive: true, role: { in: ['MANAGER', 'CASHIER'] } },
    });
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({ where: { tenantId, isActive: true } });
    }
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', isActive: true } });
    }
    if (!systemUser) {
      logger.error('[Nonbor] System user topilmadi', { tenantId });
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

    // 3. "Nonbor" default kategoriya — topish yoki yaratish
    let nonborCategory = await prisma.category.findFirst({
      where: { slug: 'nonbor', tenantId },
    });
    if (!nonborCategory) {
      nonborCategory = await prisma.category.create({
        data: { name: 'Nonbor', slug: 'nonbor', isActive: true, tenantId },
      });
    }

    // 4. Mahsulotlarni batch lookup bilan topish (N+1 yo'q)
    const orderItems = nonborOrder.items;
    if (!orderItems?.length) {
      logger.warn('[Nonbor] Buyurtmada mahsulot yo\'q', { nonborOrderId: nonborOrder.id });
      return;
    }

    const nonborProductIds = orderItems.map((i) => i.product.id);

    // Bitta query bilan barcha mavjud mahsulotlarni topish
    const existingProducts = await prisma.product.findMany({
      where: { nonborProductId: { in: nonborProductIds }, tenantId },
    });
    const productByNonborId = new Map(existingProducts.map((p) => [p.nonborProductId, p]));

    // Topilmagan mahsulotlarni yaratish
    for (const item of orderItems) {
      if (!productByNonborId.has(item.product.id)) {
        const created = await prisma.product.create({
          data: {
            name: item.product.name,
            price: item.product.price,
            categoryId: nonborCategory.id,
            nonborProductId: item.product.id,
            image: item.product.images?.[0]?.image || undefined,
            isActive: true,
            tenantId,
          },
        });
        productByNonborId.set(item.product.id, created);
        logger.info('[Nonbor] Yangi mahsulot yaratildi', { name: created.name });
      }
    }

    // OrderItems va subtotal hisoblash
    const localOrderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
    }> = [];
    let subtotal = 0;

    for (const item of orderItems) {
      const product = productByNonborId.get(item.product.id)!;
      const quantity = item.quantity;
      const price = Number(product.price);
      const total = price * quantity;
      subtotal += total;
      localOrderItems.push({ productId: product.id, quantity, price, total });
    }

    // 5. Order type
    const orderType: OrderType =
      nonborOrder.delivery_method === 'DELIVERY' ? OrderType.DELIVERY : OrderType.TAKEAWAY;

    // 6. Order number — Redis atomik INCR (race condition yo'q)
    const orderNumber = await OrderService.generateOrderNumber(tenantId);

    // 7. Tax hisoblash
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const taxRate = Number(settings?.taxRate || 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    // 8. Lokal status
    const localStatus = NONBOR_TO_LOCAL_STATUS[nonborOrder.state] ?? OrderStatus.NEW;

    // 9. Order yaratish
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
        address: (typeof nonborOrder.delivery === 'object' && nonborOrder.delivery !== null ? nonborOrder.delivery.address : undefined) || undefined,
        nonborOrderId: nonborOrder.id,
        isNonborOrder: true,
        notes: `Nonbor #${nonborOrder.id} | ${nonborOrder.payment_method}`,
        tenantId,
        items: { create: localOrderItems },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    logger.info('[Nonbor] Buyurtma import qilindi', {
      orderNumber: order.orderNumber,
      nonborOrderId: nonborOrder.id,
    });

    IntegrationService.dispatchEvent('order:new', order).catch((err: Error) => {
      logger.warn('[Nonbor] IntegrationService dispatch xatolik', { error: err.message });
    });

    // 10. PENDING/CHECKING/WAITING_PAYMENT → avtomatik ACCEPTED qilish
    if (['CHECKING', 'PENDING', 'WAITING_PAYMENT'].includes(nonborOrder.state)) {
      try {
        await nonborApiService.changeOrderStatus(nonborOrder.id, 'ACCEPTED', tenantId);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED },
        });
        logger.info('[Nonbor] Buyurtma avtomatik ACCEPTED qilindi', {
          nonborOrderId: nonborOrder.id,
        });
      } catch (err) {
        logger.error('[Nonbor] ACCEPTED qilishda xatolik', {
          nonborOrderId: nonborOrder.id,
          error: (err as Error).message,
        });
      }
    }

    // 11. DELIVERY buyurtma — kuryer qidirish
    if (nonborOrder.delivery_method === 'DELIVERY' && !nonborOrder.state.includes('CANCELLED')) {
      try {
        await nonborApiService.acceptDelivery(nonborOrder.id, tenantId);
        logger.info('[Nonbor] Delivery qabul qilindi', { nonborOrderId: nonborOrder.id });
      } catch (err) {
        logger.warn('[Nonbor] Delivery accept', {
          nonborOrderId: nonborOrder.id,
          error: (err as any)?.response?.data || (err as Error).message,
        });
      }
    }

    // 12. Socket.IO event
    if (this.io) {
      this.io.to(`tenant:${tenantId}:kitchen`).emit('order:new', order);
      this.io.to(`tenant:${tenantId}:pos`).emit('order:new', order);
      this.io.to(`tenant:${tenantId}:admin`).emit('order:new', order);
      this.io.to(`tenant:${tenantId}:waiter`).emit('order:new', order);
    }

    return order;
  }

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
        order.tenantId,
      );
      logger.info('[Nonbor] Status sync', {
        nonborOrderId: order.nonborOrderId,
        newState: nonborState,
      });
    } catch (err) {
      logger.error('[Nonbor] Status sync xatolik', {
        nonborOrderId: order.nonborOrderId,
        error: (err as Error).message,
      });
    }
  }

  async manualSync() {
    logger.info('[Nonbor] Manual sync boshlandi');
    await this.syncOrders();
    logger.info('[Nonbor] Manual sync yakunlandi');
  }

  async syncProducts(tenantId: string) {
    logger.info('[Nonbor] Mahsulotlar sync boshlandi', { tenantId });
    const result = await nonborApiService.syncProductsToNonbor(tenantId);
    logger.info('[Nonbor] Mahsulotlar sync yakunlandi', {
      created: result.created,
      updated: result.updated,
      errors: result.errors.length,
    });
    return result;
  }
}

export const nonborSyncService = new NonborSyncService();
