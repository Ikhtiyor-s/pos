import { prisma, OrderStatus, ItemStatus, TableStatus, OrderSource, OrderType } from '@oshxona/database';
import { Server } from 'socket.io';

// ==========================================
// TYPES
// ==========================================

export interface SyncOrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: string;
}

export interface SyncOrderPayload {
  id: string;
  orderNumber: string;
  source: string;
  type: string;
  status: string;
  tableId?: string;
  userId: string;
  items: SyncOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  deviceId: string;
  version: number;
  createdAt: string;
}

export interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'conflict' | 'duplicate' | 'skipped' | 'error';
  serverId?: string;
  serverVersion?: number;
  conflictData?: any;
  message: string;
}

export interface BulkSyncResult {
  total: number;
  synced: number;
  conflicts: number;
  duplicates: number;
  errors: number;
  results: Array<{ clientId: string; result: SyncResult }>;
}

// ==========================================
// SYNC SERVICE
// ==========================================

export class SyncService {

  // ==========================================
  // SINGLE ORDER SYNC
  // ==========================================

  static async syncOrder(
    tenantId: string,
    payload: SyncOrderPayload,
    io?: Server,
  ): Promise<SyncResult> {
    try {
      const existing = await prisma.order.findFirst({
        where: {
          tenantId,
          OR: [
            { id: payload.id },
            { orderNumber: payload.orderNumber },
          ],
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          items: { select: { id: true, status: true } },
        },
      });

      if (existing) {
        if (existing.id === payload.id) {
          const serverVersion = existing.updatedAt.getTime();

          // Client version eski → conflict
          if (payload.version < serverVersion) {
            const serverOrder = await prisma.order.findUnique({
              where: { id: existing.id },
              include: { items: { include: { product: { select: { id: true, name: true } } } } },
            });
            return {
              success: false,
              action: 'conflict',
              serverId: existing.id,
              serverVersion,
              conflictData: serverOrder,
              message: 'Conflict: server versiyasi yangi. Client ma\'lumotni yangilashi kerak.',
            };
          }

          // Client yangi — update
          return this.updateExistingOrder(tenantId, existing.id, payload, io);
        }

        // Boshqa qurilmadan xuddi shu orderNumber
        return {
          success: false,
          action: 'duplicate',
          serverId: existing.id,
          message: `Buyurtma ${payload.orderNumber} allaqachon mavjud.`,
        };
      }

      return this.createOrderFromSync(tenantId, payload, io);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, action: 'error', message };
    }
  }

  // ==========================================
  // BULK SYNC
  // ==========================================

  static async bulkSync(
    tenantId: string,
    orders: SyncOrderPayload[],
    io?: Server,
  ): Promise<BulkSyncResult> {
    const results: BulkSyncResult['results'] = [];
    let synced = 0, conflicts = 0, duplicates = 0, errors = 0;

    for (const order of orders) {
      const result = await this.syncOrder(tenantId, order, io);
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
        case 'error':
          errors++;
          break;
      }
    }

    // Bulk sync natijasini broadcast qilish
    if (io && synced > 0) {
      io.to(`tenant:${tenantId}:pos`).emit('sync:completed', {
        tenantId,
        synced,
        conflicts,
        timestamp: new Date().toISOString(),
      });
    }

    return { total: orders.length, synced, conflicts, duplicates, errors, results };
  }

  // ==========================================
  // ORDER STATUS SYNC
  // ==========================================

  static async syncOrderStatus(
    tenantId: string,
    orderId: string,
    status: string,
    version: number,
    io?: Server,
  ): Promise<SyncResult> {
    const existing = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, status: true, updatedAt: true },
    });

    if (!existing) {
      return { success: false, action: 'error', message: 'Buyurtma topilmadi' };
    }

    const serverVersion = existing.updatedAt.getTime();
    if (version < serverVersion && existing.status !== status) {
      return {
        success: false,
        action: 'conflict',
        serverId: existing.id,
        serverVersion,
        conflictData: { currentStatus: existing.status },
        message: 'Status konflikti: server versiyasi yangi',
      };
    }

    // Idempotent — agar status bir xil bo'lsa skip
    if (existing.status === status) {
      return { success: true, action: 'skipped', serverId: orderId, message: 'Status allaqachon bir xil' };
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
    });

    if (io) {
      io.to(`tenant:${tenantId}:pos`).emit('order:status', { orderId, status });
      io.to(`tenant:${tenantId}:kitchen`).emit('order:status', { orderId, status });
    }

    return {
      success: true,
      action: 'updated',
      serverId: orderId,
      serverVersion: updated.updatedAt.getTime(),
      message: 'Status yangilandi',
    };
  }

  // ==========================================
  // ITEM STATUS SYNC
  // ==========================================

  static async syncItemStatus(
    tenantId: string,
    orderId: string,
    itemId: string,
    status: string,
    io?: Server,
  ): Promise<SyncResult> {
    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, order: { tenantId, id: orderId } },
    });

    if (!item) {
      return { success: false, action: 'error', message: 'Item topilmadi' };
    }

    if (item.status === status) {
      return { success: true, action: 'skipped', serverId: itemId, message: 'Status bir xil' };
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: status as ItemStatus },
    });

    if (io) {
      io.to(`tenant:${tenantId}:kitchen`).emit('item:status', { orderId, itemId, status });
    }

    return { success: true, action: 'updated', serverId: itemId, message: 'Item status yangilandi' };
  }

  // ==========================================
  // TABLE STATUS SYNC
  // ==========================================

  static async syncTableStatus(
    tenantId: string,
    tableId: string,
    status: string,
    io?: Server,
  ): Promise<SyncResult> {
    const table = await prisma.table.findFirst({
      where: { id: tableId, tenantId },
    });

    if (!table) {
      return { success: false, action: 'error', message: 'Stol topilmadi' };
    }

    if (table.status === status) {
      return { success: true, action: 'skipped', serverId: tableId, message: 'Status bir xil' };
    }

    await prisma.table.update({
      where: { id: tableId },
      data: { status: status as TableStatus },
    });

    if (io) {
      io.to(`tenant:${tenantId}:pos`).emit('table:status', { tableId, status });
    }

    return { success: true, action: 'updated', serverId: tableId, message: 'Stol statusi yangilandi' };
  }

  // ==========================================
  // PULL DATA
  // ==========================================

  static async pullData(tenantId: string, since?: string, deviceId?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);

    const [products, categories, tables, recentOrders, settings] = await Promise.all([
      prisma.product.findMany({
        where: {
          tenantId,
          isActive: true,
          updatedAt: since ? { gte: sinceDate } : undefined,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.category.findMany({
        where: {
          tenantId,
          isActive: true,
          updatedAt: since ? { gte: sinceDate } : undefined,
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.table.findMany({
        where: { tenantId, isActive: true },
        orderBy: { number: 'asc' },
      }),
      prisma.order.findMany({
        where: {
          tenantId,
          updatedAt: { gte: sinceDate },
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
        },
        include: {
          table: { select: { number: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
          payments: { select: { method: true, amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.settings.findUnique({ where: { tenantId } }),
    ]);

    return {
      products,
      categories,
      tables,
      recentOrders,
      settings,
      deviceId,
      syncedAt: new Date().toISOString(),
      counts: {
        products: products.length,
        categories: categories.length,
        tables: tables.length,
        activeOrders: recentOrders.length,
      },
    };
  }

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  static async healthCheck() {
    const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    return {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'error',
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
    io?: Server,
  ): Promise<SyncResult> {
    // Mahsulotlarni tekshirish
    const productIds = [...new Set(payload.items.map(i => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: { id: true, price: true },
    });

    const productMap = new Map(products.map(p => [p.id, p]));
    const missingIds = productIds.filter(id => !productMap.has(id));
    if (missingIds.length > 0) {
      return {
        success: false,
        action: 'error',
        message: `Mahsulotlar topilmadi: ${missingIds.join(', ')}`,
      };
    }

    // Prisma transaction — atomik yaratish
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          id: payload.id,
          tenantId,
          orderNumber: payload.orderNumber,
          source: payload.source as OrderSource,
          type: payload.type as OrderType,
          status: payload.status as OrderStatus,
          tableId: payload.tableId || null,
          userId: payload.userId,
          subtotal: payload.subtotal,
          discount: payload.discount,
          tax: payload.tax,
          total: payload.total,
          notes: payload.notes || null,
          createdAt: new Date(payload.createdAt),
          items: {
            create: payload.items.map(item => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              notes: item.notes || null,
              status: item.status as ItemStatus,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true } } } },
          table: { select: { number: true, name: true } },
        },
      });

      // Stol statusini yangilash
      if (payload.tableId && payload.type === 'DINE_IN') {
        await tx.table.updateMany({
          where: { id: payload.tableId, tenantId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      return created;
    });

    // Socket.IO broadcast
    if (io) {
      io.to(`tenant:${tenantId}:pos`).emit('order:new', order);
      io.to(`tenant:${tenantId}:kitchen`).emit('order:new', order);
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
    io?: Server,
  ): Promise<SyncResult> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: payload.status as OrderStatus,
        notes: payload.notes || null,
        discount: payload.discount,
        total: payload.total,
      },
    });

    if (io) {
      io.to(`tenant:${tenantId}:pos`).emit('order:updated', { id: orderId });
    }

    return {
      success: true,
      action: 'updated',
      serverId: order.id,
      serverVersion: order.updatedAt.getTime(),
      message: 'Buyurtma yangilandi',
    };
  }
}
