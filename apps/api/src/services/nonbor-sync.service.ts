import { Server } from 'socket.io';
import { prisma, OrderStatus, OrderType } from '@oshxona/database';
import { nonborApiService, type NonborOrder } from './nonbor.service.js';
import { OrderService } from './order.service.js';
import { IntegrationService } from './integration.service.js';
import { logger } from '../utils/logger.js';

// ==========================================
// STATUS MAPPING — barcha 12 ta Nonbor holat
// ==========================================

const NONBOR_TO_LOCAL_STATUS: Record<string, OrderStatus> = {
  PENDING:          OrderStatus.NEW,
  WAITING_PAYMENT:  OrderStatus.NEW,
  CHECKING:         OrderStatus.NEW,
  ACCEPTED:         OrderStatus.CONFIRMED,
  READY:            OrderStatus.READY,
  PAYMENT_EXPIRED:  OrderStatus.CANCELLED,
  ACCEPT_EXPIRED:   OrderStatus.CANCELLED,
  CANCELLED_CLIENT: OrderStatus.CANCELLED,
  CANCELLED_SELLER: OrderStatus.CANCELLED,
  DELIVERING:       OrderStatus.DELIVERING,
  DELIVERED:        OrderStatus.COMPLETED,
  COMPLETED:        OrderStatus.COMPLETED,
};

const LOCAL_TO_NONBOR_STATUS: Partial<
  Record<OrderStatus, 'ACCEPTED' | 'READY' | 'CANCELLED_SELLER' | 'DELIVERED' | 'COMPLETED'>
> = {
  [OrderStatus.CONFIRMED]:  'ACCEPTED',
  [OrderStatus.READY]:      'READY',
  [OrderStatus.COMPLETED]:  'COMPLETED',
  [OrderStatus.CANCELLED]:  'CANCELLED_SELLER',
  [OrderStatus.DELIVERING]: 'DELIVERED',
};

const ACTIVE_NONBOR_STATES = new Set([
  'PENDING', 'WAITING_PAYMENT', 'CHECKING', 'ACCEPTED', 'READY', 'DELIVERING',
]);

// ==========================================
// POLLING INTERVALS
// ==========================================

const POLLING_SLOW   = 60_000; // 60s — webhook faol (fallback)
const POLLING_FAST   = 10_000; // 10s — webhook yo'q
const POLLING_URGENT =  3_000; //  3s — webhook ishlaydi lekin 5 daqiqa kelmagan
const WEBHOOK_SILENT_THRESHOLD = 5 * 60_000; // 5 daqiqa
const BATCH_SYNC_INTERVAL = 5 * 60_000; // 5 daqiqa

// ==========================================
// RETRY QUEUE — exponential backoff
// ==========================================

type RetryType = 'status_sync' | 'accept_order' | 'accept_delivery' | 'batch_product_sync';

interface RetryItem {
  id: string;
  tenantId: string;
  type: RetryType;
  payload: any;
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
}

// Backoff sequence: 1s 2s 4s 8s 16s → 60s
const BACKOFF_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000, 60_000];

function nextDelay(attempts: number): number {
  return BACKOFF_DELAYS[Math.min(attempts, BACKOFF_DELAYS.length - 1)];
}

// ==========================================
// MONITORING STATS
// ==========================================

export interface NonborMonitoringStats {
  isPolling: boolean;
  pollingIntervalSec: number;
  webhookActive: boolean;
  webhookLastAt: string | null;
  webhookSilent: boolean;
  lastSyncAt: string | null;
  lastBatchSyncAt: string | null;
  successCount: number;
  failureCount: number;
  retryQueueSize: number;
  activeTenants: number;
}

// ==========================================
// NONBOR SYNC SERVICE
// ==========================================

class NonborSyncService {
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private batchTimer: ReturnType<typeof setInterval> | null = null;

  private isSyncRunning = false;
  private io: Server | null = null;

  private currentInterval = POLLING_FAST;
  private lastWebhookAt = 0;
  private webhookEverReceived = false;

  private lastSyncAt: Date | null = null;
  private lastBatchSyncAt: Date | null = null;
  private successCount = 0;
  private failureCount = 0;

  private retryQueue: RetryItem[] = [];
  private retryIdCounter = 0;

  // ==========================================
  // PUBLIC API
  // ==========================================

  notifyWebhookReceived() {
    this.lastWebhookAt = Date.now();
    this.webhookEverReceived = true;
    this.scheduleNextPoll(true);
  }

  getMonitoringStats(): NonborMonitoringStats {
    const webhookSilent =
      this.webhookEverReceived && Date.now() - this.lastWebhookAt > WEBHOOK_SILENT_THRESHOLD;

    return {
      isPolling:          this.pollingTimer !== null,
      pollingIntervalSec: this.currentInterval / 1000,
      webhookActive:      this.webhookEverReceived,
      webhookLastAt:      this.lastWebhookAt > 0 ? new Date(this.lastWebhookAt).toISOString() : null,
      webhookSilent,
      lastSyncAt:         this.lastSyncAt?.toISOString() ?? null,
      lastBatchSyncAt:    this.lastBatchSyncAt?.toISOString() ?? null,
      successCount:       this.successCount,
      failureCount:       this.failureCount,
      retryQueueSize:     this.retryQueue.filter(i => i.nextRetryAt <= Date.now() + 60_000).length,
      activeTenants:      0,
    };
  }

  async startPolling(io: Server) {
    this.io = io;

    const enabled = await prisma.settings.count({
      where: { nonborEnabled: true, nonborSellerId: { not: null } },
    });

    if (enabled === 0) {
      logger.info('[Nonbor] Hech qaysi tenantda integratsiya yoqilmagan');
      return;
    }

    const hasActiveWebhooks = await prisma.webhook
      .count({ where: { isActive: true, service: 'nonbor' } })
      .catch(() => 0);

    this.webhookEverReceived = hasActiveWebhooks > 0;
    this.currentInterval = this.webhookEverReceived ? POLLING_SLOW : POLLING_FAST;

    logger.info('[Nonbor] Polling boshlandi', {
      tenants: enabled,
      intervalSec: this.currentInterval / 1000,
      webhooks: hasActiveWebhooks,
    });

    this.scheduleNextPoll(false);

    // Retry processor — har 5 sekundda
    this.retryTimer = setInterval(() => this.processRetryQueue(), 5_000);

    // Batch product sync — har 5 daqiqada
    this.batchTimer = setInterval(() => this.batchSyncAllProducts(), BATCH_SYNC_INTERVAL);
    this.batchSyncAllProducts(); // birinchi marta darhol
  }

  stopPolling() {
    if (this.pollingTimer) { clearTimeout(this.pollingTimer); this.pollingTimer = null; }
    if (this.retryTimer)   { clearInterval(this.retryTimer);  this.retryTimer = null; }
    if (this.batchTimer)   { clearInterval(this.batchTimer);  this.batchTimer = null; }
    logger.info('[Nonbor] Polling to\'xtatildi');
  }

  async restartPolling(io: Server) {
    this.stopPolling();
    await this.startPolling(io);
  }

  async manualSync() {
    logger.info('[Nonbor] Manual sync boshlandi');
    await this.syncOrders();
    logger.info('[Nonbor] Manual sync yakunlandi');
  }

  async manualBatchSync(tenantId: string) {
    const settings = await prisma.settings.findUnique({ where: { tenantId } });
    if (!settings?.nonborEnabled || !settings.nonborSellerId) return { updated: 0, skipped: 0, errors: 0 };
    return this.batchSyncProducts(tenantId, settings.nonborSellerId);
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
        order.id, order.nonborOrderId, nonborState, order.tenantId,
      );
      this.successCount++;
      logger.info('[Nonbor] Status sync', { nonborOrderId: order.nonborOrderId, newState: nonborState });
    } catch (err) {
      this.failureCount++;
      const msg = (err as Error).message;
      logger.error('[Nonbor] Status sync xatolik', { nonborOrderId: order.nonborOrderId, error: msg });
      this.enqueueRetry('status_sync', order.tenantId || '', {
        orderId: order.id, nonborOrderId: order.nonborOrderId, nonborState,
      }, msg);
    }
  }

  // ==========================================
  // SCHEDULING
  // ==========================================

  private scheduleNextPoll(immediate: boolean) {
    if (this.pollingTimer) clearTimeout(this.pollingTimer);
    const delay = immediate ? 0 : this.resolveInterval();
    this.currentInterval = this.resolveInterval();
    this.pollingTimer = setTimeout(async () => {
      await this.syncOrders();
      this.scheduleNextPoll(false);
    }, delay);
  }

  private resolveInterval(): number {
    if (!this.webhookEverReceived) return POLLING_FAST;
    const silent = Date.now() - this.lastWebhookAt > WEBHOOK_SILENT_THRESHOLD;
    if (silent) return POLLING_URGENT; // 3s — webhook borligiga qaramay kelmayapti
    return POLLING_SLOW;              // 60s — webhook yaxshi ishlayapti
  }

  // ==========================================
  // MAIN SYNC
  // ==========================================

  private async syncOrders() {
    if (this.isSyncRunning) return;
    this.isSyncRunning = true;

    try {
      const enabledSettings = await prisma.settings.findMany({
        where: { nonborEnabled: true, nonborSellerId: { not: null } },
      });

      for (const settings of enabledSettings) {
        const tenantId = settings.tenantId;
        try {
          const nonborOrders = await nonborApiService.syncOrdersFromNonbor(tenantId);
          const active = nonborOrders.filter(o => ACTIVE_NONBOR_STATES.has(o.state));

          for (const order of active) {
            try {
              await this.processNonborOrder(order, tenantId);
              this.successCount++;
            } catch (err) {
              this.failureCount++;
              logger.error('[Nonbor] Buyurtma sync xatolik', {
                nonborOrderId: order.id, tenantId, error: (err as Error).message,
              });
            }
          }

          this.lastSyncAt = new Date();
        } catch (err) {
          this.failureCount++;
          logger.error('[Nonbor] Tenant sync xatolik', {
            tenantId, error: (err as Error).message,
          });
        }
      }
    } catch (err) {
      logger.error('[Nonbor] Sync xatolik', { error: (err as Error).message });
    } finally {
      this.isSyncRunning = false;
    }
  }

  // ==========================================
  // ORDER PROCESSING
  // ==========================================

  private async processNonborOrder(nonborOrder: NonborOrder, tenantId: string) {
    const existing = await prisma.order.findFirst({
      where: { nonborOrderId: nonborOrder.id, tenantId },
    });

    if (existing) {
      const expectedStatus = NONBOR_TO_LOCAL_STATUS[nonborOrder.state];
      if (expectedStatus && existing.status !== expectedStatus) {
        await prisma.order.update({
          where: { id: existing.id },
          data: { status: expectedStatus },
        });

        logger.info('[Nonbor] Status yangilandi', {
          nonborOrderId: nonborOrder.id, from: existing.status, to: expectedStatus,
        });

        if (this.io) {
          const updated = await prisma.order.findUnique({
            where: { id: existing.id },
            include: { items: { include: { product: true } }, customer: true },
          });
          const rooms = [`tenant:${tenantId}:kitchen`, `tenant:${tenantId}:pos`, `tenant:${tenantId}:admin`];
          rooms.forEach(r => {
            this.io!.to(r).emit('order:updated', updated);
            this.io!.to(r).emit('nonbor:status', {
              orderId: existing.id,
              nonborOrderId: nonborOrder.id,
              nonborState: nonborOrder.state,
              localStatus: expectedStatus,
            });
          });
        }
      }
      return;
    }

    await this.importNonborOrder(nonborOrder, tenantId);
  }

  private async importNonborOrder(nonborOrder: NonborOrder, tenantId: string) {
    logger.info('[Nonbor] Yangi buyurtma import', { nonborOrderId: nonborOrder.id, tenantId });

    let systemUser = await prisma.user.findFirst({
      where: { tenantId, isActive: true, role: { in: ['MANAGER', 'CASHIER'] } },
    });
    if (!systemUser) systemUser = await prisma.user.findFirst({ where: { tenantId, isActive: true } });
    if (!systemUser) systemUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', isActive: true } });
    if (!systemUser) {
      logger.error('[Nonbor] System user topilmadi', { tenantId });
      return;
    }

    let customerId: string | undefined;
    if (nonborOrder.user?.phone) {
      const raw = nonborOrder.user.phone.replace(/\D/g, '');
      const phone = raw.startsWith('998') ? `+${raw}` : `+998${raw}`;
      let customer = await prisma.customer.findFirst({ where: { phone, tenantId } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone,
            firstName: nonborOrder.user.first_name || undefined,
            lastName:  nonborOrder.user.last_name  || undefined,
            tenantId,
          },
        });
      }
      customerId = customer.id;
    }

    let nonborCategory = await prisma.category.findFirst({ where: { slug: 'nonbor', tenantId } });
    if (!nonborCategory) {
      nonborCategory = await prisma.category.create({
        data: { name: 'Nonbor', slug: 'nonbor', isActive: true, tenantId },
      });
    }

    const orderItems = nonborOrder.items;
    if (!orderItems?.length) {
      logger.warn('[Nonbor] Buyurtmada mahsulot yo\'q', { nonborOrderId: nonborOrder.id });
      return;
    }

    const nonborProductIds = orderItems.map(i => i.product.id);
    const existingProducts = await prisma.product.findMany({
      where: { nonborProductId: { in: nonborProductIds }, tenantId },
    });
    const productMap = new Map(existingProducts.map(p => [p.nonborProductId, p]));

    for (const item of orderItems) {
      if (!productMap.has(item.product.id)) {
        const created = await prisma.product.create({
          data: {
            name:           item.product.name,
            price:          item.product.price,
            categoryId:     nonborCategory.id,
            nonborProductId: item.product.id,
            image:          item.product.images?.[0]?.image || undefined,
            isActive:       true,
            tenantId,
          },
        });
        productMap.set(item.product.id, created);
      }
    }

    let subtotal = 0;
    const localItems = orderItems.map(item => {
      const product = productMap.get(item.product.id)!;
      const price = Number(product.price);
      const total = price * item.quantity;
      subtotal += total;
      return { productId: product.id, quantity: item.quantity, price, total };
    });

    const orderType: OrderType =
      nonborOrder.delivery_method === 'DELIVERY' ? OrderType.DELIVERY : OrderType.TAKEAWAY;

    const orderNumber = await OrderService.generateOrderNumber(tenantId);

    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const taxRate = Number(settings?.taxRate ?? 0);
    const tax   = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const localStatus = NONBOR_TO_LOCAL_STATUS[nonborOrder.state] ?? OrderStatus.NEW;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        type:         orderType,
        status:       localStatus,
        userId:       systemUser.id,
        customerId,
        subtotal,
        discount:     0,
        tax,
        total,
        address: (typeof nonborOrder.delivery === 'object' && nonborOrder.delivery !== null
          ? (nonborOrder.delivery as any).address : undefined) || undefined,
        nonborOrderId:  nonborOrder.id,
        isNonborOrder:  true,
        notes: `Nonbor #${nonborOrder.id} | ${nonborOrder.payment_method}`,
        tenantId,
        items: { create: localItems },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    logger.info('[Nonbor] Buyurtma import qilindi', {
      orderNumber: order.orderNumber, nonborOrderId: nonborOrder.id,
    });

    IntegrationService.dispatchEvent('order:new', order).catch((err: Error) => {
      logger.warn('[Nonbor] IntegrationService dispatch xatolik', { error: err.message });
    });

    // Auto-accept PENDING/CHECKING/WAITING_PAYMENT → ACCEPTED
    if (['CHECKING', 'PENDING', 'WAITING_PAYMENT'].includes(nonborOrder.state)) {
      try {
        await nonborApiService.changeOrderStatus(nonborOrder.id, 'ACCEPTED', tenantId);
        await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED } });
        this.successCount++;
        logger.info('[Nonbor] Avtomatik ACCEPTED', { nonborOrderId: nonborOrder.id });
      } catch (err) {
        this.failureCount++;
        const msg = (err as Error).message;
        logger.error('[Nonbor] ACCEPTED xatolik', { nonborOrderId: nonborOrder.id, error: msg });
        this.enqueueRetry('accept_order', tenantId, { nonborOrderId: nonborOrder.id }, msg);
      }
    }

    // DELIVERY — kuryer qidirish
    if (nonborOrder.delivery_method === 'DELIVERY' && !nonborOrder.state.includes('CANCELLED')) {
      try {
        await nonborApiService.acceptDelivery(nonborOrder.id, tenantId);
        this.successCount++;
        logger.info('[Nonbor] Delivery qabul qilindi', { nonborOrderId: nonborOrder.id });
      } catch (err) {
        this.failureCount++;
        const msg = (err as any)?.response?.data ?? (err as Error).message;
        logger.warn('[Nonbor] Delivery accept', { nonborOrderId: nonborOrder.id, error: msg });
        this.enqueueRetry('accept_delivery', tenantId, { nonborOrderId: nonborOrder.id }, String(msg));
      }
    }

    // Socket.IO emit
    if (this.io) {
      const rooms = [
        `tenant:${tenantId}:kitchen`,
        `tenant:${tenantId}:pos`,
        `tenant:${tenantId}:admin`,
        `tenant:${tenantId}:waiter`,
      ];
      rooms.forEach(r => this.io!.to(r).emit('order:new', order));
    }

    return order;
  }

  // ==========================================
  // BATCH PRODUCT SYNC
  // ==========================================

  private async batchSyncAllProducts() {
    const enabledSettings = await prisma.settings.findMany({
      where: { nonborEnabled: true, nonborSellerId: { not: null } },
    });

    for (const s of enabledSettings) {
      try {
        const result = await this.batchSyncProducts(s.tenantId, s.nonborSellerId!);
        logger.info('[Nonbor] Batch product sync', {
          tenantId: s.tenantId,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
        });
      } catch (err) {
        logger.error('[Nonbor] Batch product sync xatolik', {
          tenantId: s.tenantId, error: (err as Error).message,
        });
      }
    }

    this.lastBatchSyncAt = new Date();
  }

  async batchSyncProducts(tenantId: string, sellerId: number): Promise<{
    updated: number; skipped: number; errors: number;
  }> {
    const nonborProducts = await nonborApiService.getAllSellerProducts(sellerId);

    const ids = nonborProducts.map(p => p.id);
    const existing = await prisma.product.findMany({
      where: { nonborProductId: { in: ids }, tenantId },
      select: { id: true, nonborProductId: true, price: true, isActive: true },
    });
    const byId = new Map(existing.map(p => [p.nonborProductId, p]));

    let updated = 0, skipped = 0, errors = 0;

    for (const np of nonborProducts) {
      const local = byId.get(np.id);
      if (!local) { skipped++; continue; }

      const newPrice    = np.price;
      const newIsActive = np.is_active !== false;
      const priceChanged    = Number(local.price) !== newPrice;
      const activeChanged   = local.isActive !== newIsActive;

      if (!priceChanged && !activeChanged) { skipped++; continue; }

      try {
        await prisma.product.update({
          where: { id: local.id },
          data: {
            ...(priceChanged  ? { price: newPrice }      : {}),
            ...(activeChanged ? { isActive: newIsActive } : {}),
          },
        });
        updated++;

        if (this.io && priceChanged) {
          this.io.to(`tenant:${tenantId}:pos`).emit('product:updated', {
            nonborProductId: np.id,
            price: newPrice,
          });
        }
      } catch (err) {
        errors++;
        logger.error('[Nonbor] Mahsulot yangilash xatolik', {
          nonborProductId: np.id, error: (err as Error).message,
        });
      }
    }

    this.successCount += updated;
    this.failureCount += errors;

    return { updated, skipped, errors };
  }

  // ==========================================
  // RETRY QUEUE — exponential backoff
  // ==========================================

  private enqueueRetry(type: RetryType, tenantId: string, payload: any, error?: string) {
    const id = `retry-${++this.retryIdCounter}-${Date.now()}`;
    const item: RetryItem = {
      id, tenantId, type, payload,
      attempts: 0,
      nextRetryAt: Date.now() + nextDelay(0),
      lastError: error,
    };
    this.retryQueue.push(item);
    logger.info('[Nonbor] Retry queue ga qo\'shildi', { id, type, tenantId });
  }

  private async processRetryQueue() {
    const now = Date.now();
    const due = this.retryQueue.filter(i => i.nextRetryAt <= now);
    if (!due.length) return;

    for (const item of due) {
      try {
        await this.executeRetryItem(item);
        this.retryQueue = this.retryQueue.filter(i => i.id !== item.id);
        this.successCount++;
        logger.info('[Nonbor] Retry muvaffaqiyatli', { id: item.id, type: item.type });
      } catch (err) {
        this.failureCount++;
        item.attempts++;
        item.lastError = (err as Error).message;

        const maxAttempts = BACKOFF_DELAYS.length;
        if (item.attempts >= maxAttempts) {
          logger.error('[Nonbor] Retry limitga yetdi, tashlanmoqda', {
            id: item.id, type: item.type, attempts: item.attempts,
          });
          this.retryQueue = this.retryQueue.filter(i => i.id !== item.id);
        } else {
          item.nextRetryAt = now + nextDelay(item.attempts);
          logger.warn('[Nonbor] Retry qayta rejalashtirildi', {
            id: item.id, type: item.type, nextSec: nextDelay(item.attempts) / 1000,
          });
        }
      }
    }
  }

  private async executeRetryItem(item: RetryItem) {
    const { type, payload, tenantId } = item;

    switch (type) {
      case 'status_sync':
        await nonborApiService.syncOrderStatusToNonbor(
          payload.orderId, payload.nonborOrderId, payload.nonborState, tenantId,
        );
        break;

      case 'accept_order':
        await nonborApiService.changeOrderStatus(payload.nonborOrderId, 'ACCEPTED', tenantId);
        break;

      case 'accept_delivery':
        await nonborApiService.acceptDelivery(payload.nonborOrderId, tenantId);
        break;

      case 'batch_product_sync': {
        const settings = await prisma.settings.findUnique({ where: { tenantId } });
        if (settings?.nonborSellerId) {
          await this.batchSyncProducts(tenantId, settings.nonborSellerId);
        }
        break;
      }

      default:
        throw new Error(`Noma'lum retry turi: ${type}`);
    }
  }
}

export const nonborSyncService = new NonborSyncService();
