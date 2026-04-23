import crypto from 'crypto';
import { prisma, OrderSource, OrderType, OrderStatus, ItemStatus } from '@oshxona/database';
import { OrderService } from '../../services/order.service.js';
import {
  getByPath, getPlatformConfig, CUSTOM_CONFIG,
  type FieldMapping, type StatusMapping,
} from './webhook-configs.js';

// ==========================================
// PAYLOAD MAPPING
// ==========================================

interface MappedOrder {
  externalId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  notes: string;
  items: Array<{
    externalProductId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export function mapPayload(payload: any, fieldMapping: FieldMapping): MappedOrder {
  const externalId = String(
    getByPath(payload, fieldMapping.orderId) || `ext-${Date.now()}`
  );

  const customerName = String(getByPath(payload, fieldMapping.customerName) || '');
  const customerPhone = String(getByPath(payload, fieldMapping.customerPhone) || '');
  const deliveryAddress = String(getByPath(payload, fieldMapping.deliveryAddress) || '');
  const notes = fieldMapping.notes ? String(getByPath(payload, fieldMapping.notes) || '') : '';

  const rawItems: any[] = getByPath(payload, fieldMapping.items) || [];
  const items = rawItems.map((item: any) => {
    const quantity = Number(getByPath(item, fieldMapping.itemQuantity) || 1);
    const price = Number(getByPath(item, fieldMapping.itemPrice) || 0);
    const total = fieldMapping.itemTotal
      ? Number(getByPath(item, fieldMapping.itemTotal) || price * quantity)
      : price * quantity;

    return {
      externalProductId: String(
        fieldMapping.itemExternalId ? getByPath(item, fieldMapping.itemExternalId) : item.id || ''
      ),
      name: String(getByPath(item, fieldMapping.itemName) || 'Noma\'lum'),
      quantity,
      price,
      total,
    };
  });

  const totalAmount = Number(
    getByPath(payload, fieldMapping.totalAmount)
    || items.reduce((s, i) => s + i.total, 0)
  );

  return { externalId, customerName, customerPhone, deliveryAddress, totalAmount, notes, items };
}

// ==========================================
// SIGNATURE VERIFICATION
// ==========================================

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ==========================================
// PROCESS INCOMING WEBHOOK ORDER
// ==========================================

export async function processWebhookOrder(
  tenantId: string,
  providerId: string,
  providerName: string,
  payload: any,
  fieldMapping: FieldMapping,
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const mapped = mapPayload(payload, fieldMapping);

    // Mavjud buyurtmani tekshirish (duplicate prevention)
    const existing = await (prisma as any).onlineOrder?.findFirst?.({
      where: { source: 'EXTERNAL_API', externalId: mapped.externalId, tenantId },
    });
    if (existing) {
      return { success: true, orderId: existing.localOrderId || undefined };
    }

    // Default user (system) topish
    const systemUser = await prisma.user.findFirst({
      where: { tenantId, role: { in: ['SUPER_ADMIN', 'MANAGER'] } },
      orderBy: { createdAt: 'asc' },
    });

    if (!systemUser) {
      throw new Error(`Tenant ${tenantId} uchun system user topilmadi`);
    }

    // Mahsulotlarni DB dan topish (ism bo'yicha)
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
      status: ItemStatus;
    }> = [];

    for (const item of mapped.items) {
      let product = await prisma.product.findFirst({
        where: {
          tenantId,
          name: { contains: item.name, mode: 'insensitive' },
          isActive: true,
        },
      });

      if (!product) {
        // Ism bo'yicha topilmasa — eng birinchi active productni fallback sifatida ishlatamiz
        product = await prisma.product.findFirst({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (!product) continue;

      const price = item.price > 0 ? item.price : Number(product.price);
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price,
        total: price * item.quantity,
        status: ItemStatus.PENDING,
      });
    }

    if (orderItems.length === 0) {
      throw new Error('Buyurtmada hech qanday mahsulot topilmadi');
    }

    // Order yaratish
    const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const settings = await prisma.settings.findUnique({ where: { tenantId } });
    const prefix = settings?.orderPrefix || 'WH';
    const orderNumber = `${prefix}-${Date.now()}`;

    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        tenantId,
        userId: systemUser.id,
        source: OrderSource.WEBHOOK_ORDER,
        type: OrderType.DELIVERY,
        status: OrderStatus.NEW,
        subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        address: mapped.deliveryAddress || null,
        notes: [
          mapped.notes,
          `Webhook: ${providerName}`,
          mapped.customerName ? `Mijoz: ${mapped.customerName}` : '',
          mapped.customerPhone ? `Tel: ${mapped.customerPhone}` : '',
        ].filter(Boolean).join('\n') || null,
        items: {
          create: orderItems,
        },
      },
    });

    // Customer upsert (agar telefon bo'lsa)
    if (mapped.customerPhone) {
      try {
        await prisma.customer.upsert({
          where: { phone_tenantId: { phone: mapped.customerPhone, tenantId } },
          update: {},
          create: {
            tenantId,
            phone: mapped.customerPhone,
            firstName: mapped.customerName.split(' ')[0] || mapped.customerName,
            lastName: mapped.customerName.split(' ').slice(1).join(' ') || undefined,
          },
        });
      } catch {
        // Customer upsert xatosi kritik emas
      }
    }

    // WebhookRetryQueue record ni resolved deb belgilash (agar retry dan kelsa)
    await prisma.webhookRetryQueue.updateMany({
      where: { providerId, resolved: false },
      data: {},
    });

    return { success: true, orderId: newOrder.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// ==========================================
// RETRY QUEUE
// ==========================================

export async function enqueueRetry(providerId: string, payload: any): Promise<void> {
  const nextRetryAt = new Date(Date.now() + 60_000); // 1 daqiqadan keyin
  await prisma.webhookRetryQueue.create({
    data: { providerId, payload, attempts: 0, maxAttempts: 5, nextRetryAt, resolved: false },
  });
}

export async function processRetryQueue(): Promise<void> {
  const now = new Date();
  const pending = await prisma.webhookRetryQueue.findMany({
    where: { resolved: false, nextRetryAt: { lte: now }, attempts: { lt: 5 } },
    include: { provider: true },
    take: 20,
  });

  for (const item of pending) {
    const provider = item.provider;
    if (!provider.isActive) continue;

    const config = provider.fieldMapping
      ? { fieldMapping: provider.fieldMapping as unknown as FieldMapping, statusMapping: (provider.statusMapping || {}) as unknown as StatusMapping }
      : (getPlatformConfig(provider.providerName) || CUSTOM_CONFIG);

    const result = await processWebhookOrder(
      provider.tenantId,
      provider.id,
      provider.providerName,
      item.payload,
      config.fieldMapping,
    );

    if (result.success) {
      await prisma.webhookRetryQueue.update({
        where: { id: item.id },
        data: { resolved: true, attempts: item.attempts + 1 },
      });
    } else {
      const attempts = item.attempts + 1;
      const backoffMs = Math.pow(2, attempts) * 60_000; // exponential backoff
      await prisma.webhookRetryQueue.update({
        where: { id: item.id },
        data: {
          attempts,
          lastError: result.error,
          nextRetryAt: new Date(Date.now() + backoffMs),
        },
      });
    }
  }
}

// ==========================================
// CRUD HELPERS
// ==========================================

export async function listProviders(tenantId: string) {
  return prisma.webhookProvider.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { retryQueue: true } } },
  });
}

export async function getProvider(tenantId: string, id: string) {
  return prisma.webhookProvider.findFirst({ where: { id, tenantId } });
}

export async function createProvider(tenantId: string, data: {
  providerName: string;
  secret?: string;
  fieldMapping?: any;
  statusMapping?: any;
  notes?: string;
}) {
  return prisma.webhookProvider.create({
    data: {
      tenantId,
      providerName: data.providerName as any,
      secret: data.secret || null,
      fieldMapping: data.fieldMapping || null,
      statusMapping: data.statusMapping || null,
      notes: data.notes || null,
    },
  });
}

export async function updateProvider(id: string, data: {
  isActive?: boolean;
  secret?: string | null;
  fieldMapping?: any;
  statusMapping?: any;
  notes?: string;
}) {
  return prisma.webhookProvider.update({
    where: { id },
    data: {
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.secret !== undefined && { secret: data.secret }),
      ...(data.fieldMapping !== undefined && { fieldMapping: data.fieldMapping }),
      ...(data.statusMapping !== undefined && { statusMapping: data.statusMapping }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

export async function deleteProvider(id: string) {
  return prisma.webhookProvider.delete({ where: { id } });
}

export async function getRetryQueue(providerId: string, resolved?: boolean) {
  return prisma.webhookRetryQueue.findMany({
    where: {
      providerId,
      ...(resolved !== undefined && { resolved }),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
