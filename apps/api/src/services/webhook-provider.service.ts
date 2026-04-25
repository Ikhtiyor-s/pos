// ==========================================
// WEBHOOK PROVIDER SERVICE — Universal delivery platform handler
//
// Qo'llab-quvvatlanadigan platformalar: Yandex Eats, Express 24, Delivery Club
//
// Integratsiya (webhook.controller.ts da):
//   case 'yandex-eats':
//   case 'express24':
//   case 'delivery-club':
//     result = await webhookProviderService.handleIncoming(service, payload, tenantId, req);
//     break;
// ==========================================

import crypto from 'crypto';
import { Server } from 'socket.io';
import { Request } from 'express';
import { prisma, OrderStatus, OrderType } from '@oshxona/database';
import {
  getProvider,
  isSupportedProvider,
  type DeliveryPlatform,
  type WebhookProviderConfig,
  type ProviderFieldMap,
} from '../config/webhook-providers.js';
import { OrderService } from './order.service.js';
import { logger } from '../utils/logger.js';

// ==========================================
// TYPES
// ==========================================

export interface NormalizedOrderItem {
  name:     string;
  quantity: number;
  price:    number;
  total:    number;
}

export interface NormalizedOrder {
  externalOrderId: string;
  platform:        DeliveryPlatform;
  status?:         string;
  items:           NormalizedOrderItem[];
  customerPhone?:  string;
  customerName?:   string;
  deliveryAddress?: string;
  totalAmount?:    number;
  paymentMethod?:  string;
  notes?:          string;
}

export interface ProviderHandleResult {
  processed: boolean;
  action:    string;
  orderId?:  string;
  reason?:   string;
}

// ==========================================
// DOT-PATH ACCESSOR
// ==========================================

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur !== null && cur !== undefined && typeof cur === 'object') {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function getString(obj: unknown, path: string | undefined): string | undefined {
  if (!path) return undefined;
  const v = getPath(obj, path);
  return v !== null && v !== undefined ? String(v) : undefined;
}

function getNumber(obj: unknown, path: string | undefined): number | undefined {
  if (!path) return undefined;
  const v = getPath(obj, path);
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function getArray(obj: unknown, path: string | undefined): unknown[] {
  if (!path) return [];
  const v = getPath(obj, path);
  return Array.isArray(v) ? v : [];
}

// ==========================================
// NORMALIZE PAYLOAD
// ==========================================

function normalizePayload(
  platform: DeliveryPlatform,
  fieldMap: ProviderFieldMap,
  payload:  unknown,
): NormalizedOrder {
  const rawItems = getArray(payload, fieldMap.items);

  const items: NormalizedOrderItem[] = rawItems.map(raw => {
    const name     = getString(raw, fieldMap.itemName)  ?? 'Mahsulot';
    const quantity = getNumber(raw, fieldMap.itemQty)   ?? 1;
    const price    = getNumber(raw, fieldMap.itemPrice) ?? 0;
    return { name, quantity, price, total: price * quantity };
  });

  return {
    externalOrderId: getString(payload, fieldMap.externalOrderId) ?? String(Date.now()),
    platform,
    status:          getString(payload, fieldMap.status),
    items,
    customerPhone:   getString(payload, fieldMap.customerPhone),
    customerName:    getString(payload, fieldMap.customerName),
    deliveryAddress: getString(payload, fieldMap.deliveryAddress),
    totalAmount:     getNumber(payload, fieldMap.totalAmount),
    paymentMethod:   getString(payload, fieldMap.paymentMethod),
    notes:           getString(payload, fieldMap.notes),
  };
}

// ==========================================
// WEBHOOK PROVIDER SERVICE
// ==========================================

class WebhookProviderService {

  // ──────────────────────────────────────────
  // isSupportedProvider
  // ──────────────────────────────────────────

  isSupported(service: string): boolean {
    return isSupportedProvider(service);
  }

  // ──────────────────────────────────────────
  // Signature verifikatsiyasi
  // ──────────────────────────────────────────

  verifySignature(
    service:   string,
    rawBody:   string,
    signature: string,
    secret:    string,
  ): boolean {
    const provider = getProvider(service);
    if (!provider?.signatureHeader) return true;

    const algo = provider.signatureAlgorithm ?? 'hmac-sha256';
    const hmacAlgo = algo === 'hmac-sha1' ? 'sha1' : 'sha256';

    const expected = crypto
      .createHmac(hmacAlgo, secret)
      .update(rawBody)
      .digest('hex');

    const clean = (s: string) => s.replace(/^sha\d+=/, '');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(clean(expected), 'hex'),
        Buffer.from(clean(signature), 'hex'),
      );
    } catch {
      return false;
    }
  }

  // ──────────────────────────────────────────
  // Asosiy handler
  // ──────────────────────────────────────────

  async handleIncoming(
    service:  string,
    payload:  unknown,
    tenantId: string,
    req:      Request,
  ): Promise<ProviderHandleResult> {
    const provider = getProvider(service);
    if (!provider) {
      return { processed: false, action: 'noop', reason: `Noma'lum provider: ${service}` };
    }

    const eventType = getString(payload, provider.newOrderEventField) ?? '';

    if (provider.newOrderEventValues.includes(eventType)) {
      return this.handleNewOrder(provider, payload, tenantId, req);
    }

    if (provider.statusEventValues?.includes(eventType)) {
      return this.handleStatusUpdate(provider, payload, tenantId, req);
    }

    logger.info('[WebhookProvider] Noma\'lum event, skip', {
      service, eventType, tenantId,
    });
    return { processed: false, action: 'unknown_event', reason: `event: ${eventType}` };
  }

  // ──────────────────────────────────────────
  // Yangi buyurtma
  // ──────────────────────────────────────────

  private async handleNewOrder(
    provider: WebhookProviderConfig,
    payload:  unknown,
    tenantId: string,
    req:      Request,
  ): Promise<ProviderHandleResult> {
    const io = req.app.get('io') as Server | undefined;
    const normalized = normalizePayload(provider.name, provider.fieldMap, payload);

    // Duplicate tekshirish
    const existing = await prisma.order.findFirst({
      where: {
        notes:    { contains: `${provider.displayName} #${normalized.externalOrderId}` },
        tenantId,
      },
      select: { id: true },
    });
    if (existing) {
      return { processed: false, action: 'duplicate', orderId: existing.id };
    }

    // Tenant settings
    const settings = await prisma.settings.findUnique({ where: { tenantId } });
    const taxRate   = Number(settings?.taxRate ?? 0);

    // System user
    let user = await prisma.user.findFirst({
      where: { tenantId, isActive: true, role: { in: ['MANAGER', 'CASHIER'] } },
    });
    if (!user) {
      user = await prisma.user.findFirst({ where: { tenantId, isActive: true } });
    }
    if (!user) {
      logger.error('[WebhookProvider] System user topilmadi', { tenantId });
      return { processed: false, action: 'no_system_user' };
    }

    // Mijoz
    let customerId: string | undefined;
    if (normalized.customerPhone) {
      const raw   = normalized.customerPhone.replace(/\D/g, '');
      const phone = raw.startsWith('998') ? `+${raw}` : raw.length >= 9 ? `+998${raw.slice(-9)}` : raw;
      let customer = await prisma.customer.findFirst({ where: { phone, tenantId } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            phone,
            firstName: normalized.customerName?.split(' ')[0] || undefined,
            lastName:  normalized.customerName?.split(' ').slice(1).join(' ') || undefined,
            tenantId,
          },
        });
      }
      customerId = customer.id;
    }

    // Kategoriya
    const slug = provider.name;
    let category = await prisma.category.findFirst({ where: { slug, tenantId } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: provider.displayName, slug, isActive: true, tenantId },
      });
    }

    // Mahsulotlar
    const orderItems: Array<{ productId: string; quantity: number; price: number; total: number }> = [];
    let subtotal = 0;

    for (const item of normalized.items) {
      const productName = `[${provider.displayName}] ${item.name}`;
      let product = await prisma.product.findFirst({
        where: { name: productName, tenantId },
        select: { id: true, price: true },
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            name:       productName,
            price:      item.price,
            categoryId: category.id,
            isActive:   true,
            tenantId,
          },
        });
      }
      const price = item.price || Number(product.price);
      const total = price * item.quantity;
      subtotal   += total;
      orderItems.push({ productId: product.id, quantity: item.quantity, price, total });
    }

    if (!orderItems.length) {
      return { processed: false, action: 'no_items' };
    }

    const tax   = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const orderNumber = await OrderService.generateOrderNumber(tenantId);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        type:      OrderType.DELIVERY,
        status:    OrderStatus.NEW,
        userId:    user.id,
        customerId,
        subtotal,
        discount:  0,
        tax,
        total,
        address:   normalized.deliveryAddress || undefined,
        notes:     [
          `${provider.displayName} #${normalized.externalOrderId}`,
          normalized.paymentMethod,
          normalized.notes,
        ].filter(Boolean).join(' | '),
        tenantId,
        items: { create: orderItems },
      },
      include: {
        items:    { include: { product: true } },
        customer: true,
      },
    });

    logger.info('[WebhookProvider] Yangi buyurtma yaratildi', {
      platform: provider.name,
      externalId: normalized.externalOrderId,
      orderNumber: order.orderNumber,
      tenantId,
    });

    if (io) {
      const rooms = [
        `tenant:${tenantId}:kitchen`,
        `tenant:${tenantId}:pos`,
        `tenant:${tenantId}:admin`,
      ];
      rooms.forEach(r => io.to(r).emit('order:new', order));
    }

    return { processed: true, action: 'order_created', orderId: order.id };
  }

  // ──────────────────────────────────────────
  // Status yangilash
  // ──────────────────────────────────────────

  private async handleStatusUpdate(
    provider: WebhookProviderConfig,
    payload:  unknown,
    tenantId: string,
    req:      Request,
  ): Promise<ProviderHandleResult> {
    const io         = req.app.get('io') as Server | undefined;
    const normalized = normalizePayload(provider.name, provider.fieldMap, payload);

    if (!normalized.externalOrderId || !normalized.status) {
      return { processed: false, action: 'missing_fields' };
    }

    const order = await prisma.order.findFirst({
      where: {
        notes:    { contains: `${provider.displayName} #${normalized.externalOrderId}` },
        tenantId,
      },
      select: { id: true, status: true },
    });
    if (!order) return { processed: false, action: 'order_not_found' };

    const statusKey = provider.statusMap?.[normalized.status];
    if (!statusKey) return { processed: false, action: 'unknown_status' };

    const newStatus = OrderStatus[statusKey as keyof typeof OrderStatus];
    if (!newStatus || order.status === newStatus) {
      return { processed: false, action: 'no_change' };
    }

    await prisma.order.update({
      where: { id: order.id },
      data:  { status: newStatus },
    });

    if (io) {
      io.to(tenantId).emit('order:status', { orderId: order.id, status: newStatus });
    }

    logger.info('[WebhookProvider] Status yangilandi', {
      platform: provider.name,
      orderId: order.id,
      newStatus,
    });

    return { processed: true, action: 'status_updated', orderId: order.id };
  }
}

export const webhookProviderService = new WebhookProviderService();
