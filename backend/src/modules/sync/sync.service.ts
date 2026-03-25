import { prisma, OrderStatus, ItemStatus, TableStatus } from '@oshxona/database';

// ==========================================
// SYNC SERVICE — Backend
// Offline qurilmalardan kelgan ma'lumotlarni qabul qiladi
// Conflict detection + resolution
// ==========================================

interface SyncOrderPayload {
  id: string;            // Client-generated UUID
  orderNumber: string;   // Offline order number (OFF-xxx)
  source: string;
  type: string;
  status: string;
  tableId?: string;
  userId: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
    status: string;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  deviceId: string;
  version: number;
  createdAt: string;
}

interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'conflict' | 'duplicate' | 'error';
  serverId?: string;
  serverVersion?: number;
  message: string;
}

interface BulkSyncResult {
  total: number;
  synced: number;
  conflicts: number;
  duplicates: number;
  errors: number;
  results: Array<{ clientId: string; result: SyncResult }>;
}

export class SyncService {

  // ==========================================
  // SINGLE ORDER SYNC
  // ==========================================

  static async syncOrder(tenantId: string, payload: SyncOrderPayload): Promise<SyncResult> {
    try {
      // 1. Duplicate check — same id or orderNumber
      const existing = await prisma.order.findFirst({
        where: {
          tenantId,
          OR: [
            { id: payload.id },
            { orderNumber: payload.orderNumber },
          ],
        },
        select: { id: true, status: true, updatedAt: true },
      });

      if (existing) {
        // Same ID — check version for conflict
        if (existing.id === payload.id) {
          const serverVersion = existing.updatedAt.getTime();
          if (payload.version < serverVersion) {
            return {
              success: false,
              action: 'conflict',
              serverId: existing.id,
              serverVersion,
              message: 'Server versiyasi yangi. Conflict resolution kerak.',
            };
          }

          // Client yangi — update
          return this.updateExistingOrder(tenantId, existing.id, payload);
        }

        // Same orderNumber but different ID — duplicate from another device
        return {
          success: false,
          action: 'duplicate',
          serverId: existing.id,
          message: `Buyurtma ${payload.orderNumber} allaqachon mavjud.`,
        };
      }

      // 2. Create new order
      return this.createOrderFromSync(tenantId, payload);
    } catch (error: any) {
      return {
        success: false,
        action: 'error',
        message: error.message,
      };
    }
  }

  // ==========================================
  // BULK SYNC — Bir nechta buyurtmani sync qilish
  // ==========================================

  static async bulkSync(tenantId: string, orders: SyncOrderPayload[]): Promise<BulkSyncResult> {
    const results: BulkSyncResult['results'] = [];
    let synced = 0, conflicts = 0, duplicates = 0, errors = 0;

    for (const order of orders) {
      const result = await this.syncOrder(tenantId, order);
      results.push({ clientId: order.id, result });

      switch (result.action) {
        case 'created':
        case 'updated':
          synced++;
          break;
        case 'conflict':
          conflicts++;
          break;
        case 'duplicate':
          duplicates++;
          break;
        default:
          errors++;
      }
    }

    return { total: orders.length, synced, conflicts, duplicates, errors, results };
  }

  // ==========================================
  // SYNC ORDER STATUS UPDATE
  // ==========================================

  static async syncOrderStatus(
    tenantId: string,
    orderId: string,
    status: string,
    version: number,
  ): Promise<SyncResult> {
    const existing = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, status: true, updatedAt: true },
    });

    if (!existing) {
      return { success: false, action: 'error', message: 'Buyurtma topilmadi' };
    }

    const serverVersion = existing.updatedAt.getTime();
    if (version < serverVersion) {
      return {
        success: false,
        action: 'conflict',
        serverId: existing.id,
        serverVersion,
        message: 'Server versiyasi yangi',
      };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
    });

    return { success: true, action: 'updated', serverId: orderId, message: 'Status yangilandi' };
  }

  // ==========================================
  // SYNC ITEM STATUS UPDATE
  // ==========================================

  static async syncItemStatus(
    tenantId: string,
    orderId: string,
    itemId: string,
    status: string,
  ): Promise<SyncResult> {
    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, order: { tenantId } },
    });

    if (!item) {
      return { success: false, action: 'error', message: 'Item topilmadi' };
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: status as ItemStatus },
    });

    return { success: true, action: 'updated', serverId: itemId, message: 'Item status yangilandi' };
  }

  // ==========================================
  // SYNC TABLE STATUS
  // ==========================================

  static async syncTableStatus(tenantId: string, tableId: string, status: string): Promise<SyncResult> {
    const table = await prisma.table.findFirst({
      where: { id: tableId, tenantId },
    });

    if (!table) {
      return { success: false, action: 'error', message: 'Stol topilmadi' };
    }

    await prisma.table.update({
      where: { id: tableId },
      data: { status: status as TableStatus },
    });

    return { success: true, action: 'updated', serverId: tableId, message: 'Stol statusi yangilandi' };
  }

  // ==========================================
  // PULL DATA — Qurilma uchun so'nggi ma'lumotlar
  // ==========================================

  static async pullData(tenantId: string, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);

    const [products, categories, tables, recentOrders, settings] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: { category: true },
      }),
      prisma.category.findMany({
        where: { tenantId, isActive: true },
      }),
      prisma.table.findMany({
        where: { tenantId },
      }),
      prisma.order.findMany({
        where: {
          tenantId,
          updatedAt: { gte: sinceDate },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          table: { select: { number: true, name: true } },
          items: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.settings.findFirst({ where: { tenantId } }),
    ]);

    return {
      products,
      categories,
      tables,
      recentOrders,
      settings,
      syncedAt: new Date().toISOString(),
    };
  }

  // ==========================================
  // HEALTH CHECK — Qurilmalar uchun server tekshirish
  // ==========================================

  static async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    };
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private static async createOrderFromSync(
    tenantId: string,
    payload: SyncOrderPayload,
  ): Promise<SyncResult> {
    // Product narxlarini tekshirish
    const productIds = payload.items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });

    if (products.length !== productIds.length) {
      return { success: false, action: 'error', message: 'Ba\'zi mahsulotlar topilmadi' };
    }

    const order = await prisma.order.create({
      data: {
        id: payload.id, // Client UUID ni saqlaymiz
        tenantId,
        orderNumber: payload.orderNumber,
        source: payload.source as any,
        type: payload.type as any,
        status: payload.status as OrderStatus,
        tableId: payload.tableId || null,
        userId: payload.userId,
        subtotal: payload.subtotal,
        discount: payload.discount,
        tax: payload.tax,
        total: payload.total,
        notes: payload.notes,
        createdAt: new Date(payload.createdAt),
        items: {
          create: payload.items.map(item => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            notes: item.notes,
            status: item.status as ItemStatus,
          })),
        },
      },
    });

    // Table status
    if (payload.tableId && payload.type === 'DINE_IN') {
      await prisma.table.update({
        where: { id: payload.tableId },
        data: { status: 'OCCUPIED' },
      }).catch(() => {});
    }

    return {
      success: true,
      action: 'created',
      serverId: order.id,
      serverVersion: order.updatedAt.getTime(),
      message: 'Buyurtma sync qilindi',
    };
  }

  private static async updateExistingOrder(
    tenantId: string,
    orderId: string,
    payload: SyncOrderPayload,
  ): Promise<SyncResult> {
    const order = await prisma.order.update({
      where: { id: orderId, tenantId },
      data: {
        status: payload.status as OrderStatus,
        notes: payload.notes,
        discount: payload.discount,
        total: payload.total,
      },
    });

    return {
      success: true,
      action: 'updated',
      serverId: order.id,
      serverVersion: order.updatedAt.getTime(),
      message: 'Buyurtma yangilandi',
    };
  }
}
