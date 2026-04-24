import { Server } from 'socket.io';
import { prisma, Prisma, PurchaseOrderStatus, AlertSeverity } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';
import { StockAlertNotifier } from './stock-alert.notifier.js';

export class WarehouseService {

  // ==========================================
  // SUPPLIERS (Yetkazib beruvchilar)
  // ==========================================

  static async getSuppliers(tenantId: string, options: {
    search?: string; isActive?: boolean; page?: number; limit?: number;
  } = {}) {
    const page  = options.page  || 1;
    const limit = Math.min(options.limit || 50, 200);
    const skip  = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = { tenantId };
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.search) {
      where.OR = [
        { name:  { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.supplier.count({ where }),
    ]);

    return { suppliers, total, page, limit };
  }

  static async getSupplierById(id: string, tenantId: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    });
    if (!supplier) throw new AppError('Yetkazib beruvchi topilmadi', 404);
    const itemCount = await prisma.inventoryItem.count({ where: { supplierId: id } });
    return { ...supplier, itemCount };
  }

  static async createSupplier(tenantId: string, data: {
    name: string; phone?: string; email?: string; address?: string; notes?: string;
  }) {
    return prisma.supplier.create({
      data: { ...data, tenantId },
    });
  }

  static async updateSupplier(id: string, tenantId: string, data: {
    name?: string; phone?: string; email?: string; address?: string; notes?: string; isActive?: boolean;
  }) {
    await this.getSupplierById(id, tenantId);
    return prisma.supplier.update({ where: { id }, data });
  }

  static async deleteSupplier(id: string, tenantId: string) {
    await this.getSupplierById(id, tenantId);
    const itemCount = await prisma.inventoryItem.count({ where: { supplierId: id } });
    if (itemCount > 0) {
      throw new AppError(`Yetkazib beruvchiga ${itemCount} ta mahsulot bog'liq, o'chirish mumkin emas`, 409);
    }
    await prisma.supplier.delete({ where: { id } });
  }

  // ==========================================
  // PURCHASE ORDERS (Xarid buyurtmalari)
  // ==========================================

  static async createPurchaseOrder(data: {
    supplierId: string;
    items: { inventoryItemId: string; quantity: number; unitPrice: number }[];
    expectedAt?: string;
    notes?: string;
    userId: string;
    tenantId: string;
  }) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId: data.tenantId },
    });
    if (!supplier) throw new AppError('Yetkazib beruvchi topilmadi', 404);

    const orderNumber = await this.generateOrderNumber(data.tenantId);
    const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    return prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId:   data.supplierId,
        totalAmount,
        expectedAt:   data.expectedAt ? new Date(data.expectedAt) : undefined,
        notes:        data.notes,
        userId:       data.userId,
        tenantId:     data.tenantId,
        items: {
          create: data.items.map(item => ({
            inventoryItemId: item.inventoryItemId,
            quantity:        item.quantity,
            unitPrice:       item.unitPrice,
            total:           item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user:     { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });
  }

  static async getPurchaseOrders(tenantId: string, options: {
    status?: PurchaseOrderStatus; supplierId?: string; page?: number; limit?: number;
  }) {
    const page  = options.page  || 1;
    const limit = options.limit || 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = { tenantId };
    if (options.status)     where.status     = options.status;
    if (options.supplierId) where.supplierId = options.supplierId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          user:     { select: { id: true, firstName: true, lastName: true } },
          _count:   { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  static async getPurchaseOrderById(id: string, tenantId: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: true, quantity: true } },
          },
        },
      },
    });
    if (!order) throw new AppError('Xarid buyurtmasi topilmadi', 404);
    return order;
  }

  static async updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus, tenantId: string) {
    const order = await this.getPurchaseOrderById(id, tenantId);

    const allowed: Record<string, string[]> = {
      DRAFT:    ['SENT', 'CANCELLED'],
      SENT:     ['PARTIAL', 'RECEIVED', 'CANCELLED'],
      PARTIAL:  ['RECEIVED', 'CANCELLED'],
      RECEIVED: [],
      CANCELLED:[],
    };

    if (!allowed[order.status]?.includes(status)) {
      throw new AppError(`${order.status} → ${status} o'tish mumkin emas`, 400);
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: { status, ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {}) },
      include: {
        supplier: { select: { id: true, name: true } },
        user:     { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });
  }

  static async receivePurchaseOrder(
    id: string,
    receivedItems: { itemId: string; receivedQty: number }[],
    tenantId: string,
    io?: Server,
  ) {
    const order = await this.getPurchaseOrderById(id, tenantId);

    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      throw new AppError(`Buyurtma allaqachon ${order.status}`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      let allFullyReceived = true;

      for (const received of receivedItems) {
        const orderItem = order.items.find(i => i.id === received.itemId);
        if (!orderItem) throw new AppError(`Element topilmadi: ${received.itemId}`, 404);

        const newQty = Number(orderItem.receivedQty) + received.receivedQty;
        if (newQty > Number(orderItem.quantity)) {
          throw new AppError(
            `${orderItem.inventoryItem.name}: qabul miqdori (${newQty}) buyurtmadan (${orderItem.quantity}) ko'p`,
            400,
          );
        }

        await tx.purchaseOrderItem.update({
          where: { id: received.itemId },
          data:  { receivedQty: newQty },
        });

        await tx.inventoryItem.update({
          where: { id: orderItem.inventoryItemId },
          data:  { quantity: { increment: received.receivedQty } },
        });

        await tx.inventoryTransaction.create({
          data: {
            itemId:   orderItem.inventoryItemId,
            type:     'IN',
            quantity: received.receivedQty,
            notes:    `Xarid buyurtmasi ${order.orderNumber}`,
            userId:   order.userId,
          },
        });

        if (newQty < Number(orderItem.quantity)) allFullyReceived = false;
      }

      for (const oi of order.items) {
        const r = receivedItems.find(r => r.itemId === oi.id);
        if (!r && Number(oi.receivedQty) < Number(oi.quantity)) allFullyReceived = false;
      }

      const newStatus: PurchaseOrderStatus = allFullyReceived ? 'RECEIVED' : 'PARTIAL';
      return tx.purchaseOrder.update({
        where: { id },
        data:  { status: newStatus, ...(allFullyReceived ? { receivedAt: new Date() } : {}) },
        include: {
          supplier: { select: { id: true, name: true } },
          user:     { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
            },
          },
        },
      });
    });

    // Yangi zaxira qo'shilganda alertlarni tekshirish
    await this.checkAndNotifyAlerts(tenantId, io);

    return result;
  }

  private static async generateOrderNumber(tenantId: string): Promise<string> {
    const last = await prisma.purchaseOrder.findFirst({
      where:   { tenantId },
      orderBy: { createdAt: 'desc' },
      select:  { orderNumber: true },
    });
    let next = 1;
    if (last) {
      const m = last.orderNumber.match(/PO-(\d+)/);
      if (m) next = parseInt(m[1], 10) + 1;
    }
    return `PO-${String(next).padStart(3, '0')}`;
  }

  // ==========================================
  // STOCK ALERTS
  // ==========================================

  static async getStockAlerts(tenantId: string, options: {
    isResolved?: boolean; severity?: AlertSeverity; page?: number; limit?: number;
  }) {
    const page  = options.page  || 1;
    const limit = options.limit || 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.StockAlertWhereInput = { tenantId };
    if (options.isResolved !== undefined) where.isResolved = options.isResolved;
    if (options.severity)                  where.severity  = options.severity;

    const [alerts, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        include: {
          inventoryItem: {
            select: { id: true, name: true, sku: true, unit: true, quantity: true, minQuantity: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockAlert.count({ where }),
    ]);

    return { alerts, total, page, limit };
  }

  static async checkAndNotifyAlerts(tenantId: string, io?: Server) {
    const result = await this.checkAndCreateStockAlerts(tenantId);
    if (result.alerts.length > 0) {
      await StockAlertNotifier.notify(tenantId, result.alerts as any, io);
    }
    return result;
  }

  static async checkAndCreateStockAlerts(tenantId: string) {
    const lowStockItems = await prisma.$queryRaw<any[]>`
      SELECT id, name, sku, unit, quantity::float, min_quantity::float AS "minQuantity"
      FROM inventory_items
      WHERE tenant_id  = ${tenantId}
        AND is_active  = true
        AND min_quantity > 0
        AND quantity  <= min_quantity
    `;

    const created: any[] = [];

    for (const item of lowStockItems) {
      const existing = await prisma.stockAlert.findFirst({
        where: { inventoryItemId: item.id, tenantId, isResolved: false },
      });
      if (existing) continue;

      const ratio = item.quantity / item.minQuantity;
      const severity: AlertSeverity =
        item.quantity === 0 ? 'CRITICAL' :
        ratio <= 0.25       ? 'HIGH'     :
        ratio <= 0.5        ? 'MEDIUM'   : 'LOW';

      const alert = await prisma.stockAlert.create({
        data: {
          inventoryItemId: item.id,
          severity,
          currentQty: item.quantity,
          minQty:     item.minQuantity,
          tenantId,
        },
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
        },
      });
      created.push(alert);
    }

    return { scannedItems: lowStockItems.length, createdAlerts: created.length, alerts: created };
  }

  static async resolveStockAlert(id: string, tenantId: string) {
    const alert = await prisma.stockAlert.findFirst({ where: { id, tenantId } });
    if (!alert) throw new AppError('Stock alert topilmadi', 404);
    if (alert.isResolved) throw new AppError('Allaqachon hal qilingan', 400);

    return prisma.stockAlert.update({
      where: { id },
      data:  { isResolved: true, resolvedAt: new Date() },
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
      },
    });
  }

  // ==========================================
  // WASTE LOGS (Isrof jurnali)
  // ==========================================

  static async createWasteLog(data: {
    inventoryItemId: string; quantity: number; reason: string; userId: string; tenantId: string;
  }, io?: Server) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, tenantId: data.tenantId },
    });
    if (!item) throw new AppError('Ombor mahsuloti topilmadi', 404);
    if (Number(item.quantity) < data.quantity) throw new AppError('Omborda yetarli miqdor yo\'q', 400);

    const costAmount = Number(item.costPrice) * data.quantity;

    const [wasteLog] = await prisma.$transaction([
      prisma.wasteLog.create({
        data: {
          inventoryItemId: data.inventoryItemId,
          quantity:        data.quantity,
          reason:          data.reason,
          costAmount,
          userId:          data.userId,
          tenantId:        data.tenantId,
        },
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.inventoryItemId },
        data:  { quantity: { decrement: data.quantity } },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId:   data.inventoryItemId,
          type:     'WASTE',
          quantity: data.quantity,
          notes:    `Yo'qotish: ${data.reason}`,
          userId:   data.userId,
        },
      }),
    ]);

    // Isrof qilingandan keyin alertlarni tekshirish
    this.checkAndNotifyAlerts(data.tenantId, io).catch(console.error);

    return wasteLog;
  }

  static async getWasteLogs(tenantId: string, options: {
    page?: number; limit?: number; dateFrom?: string; dateTo?: string;
  }) {
    const page  = options.page  || 1;
    const limit = options.limit || 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.WasteLogWhereInput = { tenantId };
    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo)   where.createdAt.lte = new Date(options.dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        include: {
          inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.wasteLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  static async getWasteReport(tenantId: string, dateFrom: string, dateTo: string) {
    const wasteLogs = await prisma.wasteLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: new Date(dateFrom), lte: new Date(dateTo) },
      },
      include: {
        inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
      },
    });

    const byItem = new Map<string, {
      inventoryItemId: string; name: string; sku: string; unit: string;
      totalQuantity: number; totalCost: number; count: number;
    }>();

    let grandTotalCost = 0;

    for (const log of wasteLogs) {
      const qty  = Number(log.quantity);
      const cost = Number(log.costAmount);
      grandTotalCost += cost;

      const key  = log.inventoryItemId;
      if (byItem.has(key)) {
        const e = byItem.get(key)!;
        e.totalQuantity += qty;
        e.totalCost     += cost;
        e.count         += 1;
      } else {
        byItem.set(key, {
          inventoryItemId: log.inventoryItemId,
          name:  log.inventoryItem.name,
          sku:   log.inventoryItem.sku,
          unit:  log.inventoryItem.unit,
          totalQuantity: qty,
          totalCost:     cost,
          count: 1,
        });
      }
    }

    return {
      dateFrom,
      dateTo,
      totalRecords:  wasteLogs.length,
      grandTotalCost,
      items: Array.from(byItem.values()).sort((a, b) => b.totalCost - a.totalCost),
    };
  }

  // ==========================================
  // OYLIK HISOBOT — Ombor aylanmasi
  // ==========================================

  static async getMonthlyTurnover(tenantId: string, year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0, 23, 59, 59, 999);

    // Barcha tranzaksiyalarni oling
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        item: { tenantId },
        createdAt: { gte: from, lte: to },
      },
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true, costPrice: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mahsulot bo'yicha agregatsiya
    const byItem = new Map<string, {
      itemId: string; name: string; sku: string; unit: string;
      totalIn: number; totalOut: number; totalWaste: number; totalAdjust: number;
      inCost: number; outCost: number; wasteCost: number;
      transactionCount: number;
    }>();

    let totalInCost    = 0;
    let totalOutCost   = 0;
    let totalWasteCost = 0;

    for (const tx of transactions) {
      const qty     = Number(tx.quantity);
      const cost    = Number(tx.item.costPrice) * qty;
      const itemId  = tx.itemId;

      if (!byItem.has(itemId)) {
        byItem.set(itemId, {
          itemId,
          name:  tx.item.name,
          sku:   tx.item.sku,
          unit:  tx.item.unit,
          totalIn: 0, totalOut: 0, totalWaste: 0, totalAdjust: 0,
          inCost: 0, outCost: 0, wasteCost: 0,
          transactionCount: 0,
        });
      }

      const entry = byItem.get(itemId)!;
      entry.transactionCount++;

      switch (tx.type) {
        case 'IN':
          entry.totalIn  += qty;
          entry.inCost   += cost;
          totalInCost    += cost;
          break;
        case 'OUT':
          entry.totalOut  += qty;
          entry.outCost   += cost;
          totalOutCost    += cost;
          break;
        case 'WASTE':
          entry.totalWaste  += qty;
          entry.wasteCost   += cost;
          totalWasteCost    += cost;
          break;
        case 'ADJUST':
          entry.totalAdjust += qty;
          break;
      }
    }

    // Joriy zaxira holati
    const allItems = await prisma.inventoryItem.findMany({
      where:  { tenantId, isActive: true },
      select: { id: true, name: true, sku: true, unit: true, quantity: true, costPrice: true, minQuantity: true },
    });

    const currentStockValue = allItems.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.costPrice),
      0,
    );

    const lowStockItems = allItems.filter(i => Number(i.quantity) <= Number(i.minQuantity) && Number(i.minQuantity) > 0);

    return {
      period: { year, month, from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalTransactions: transactions.length,
        totalInCost,
        totalOutCost,
        totalWasteCost,
        netCost:           totalInCost - totalOutCost - totalWasteCost,
        currentStockValue,
        lowStockCount:     lowStockItems.length,
      },
      byItem: Array.from(byItem.values())
        .sort((a, b) => (b.totalOut + b.totalWaste) - (a.totalOut + a.totalWaste)),
      lowStockItems: lowStockItems.map(i => ({
        id: i.id, name: i.name, sku: i.sku, unit: i.unit,
        quantity: Number(i.quantity), minQuantity: Number(i.minQuantity),
      })),
    };
  }
}
