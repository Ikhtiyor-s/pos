import { prisma, Prisma, PurchaseOrderStatus, AlertSeverity } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

export class WarehouseService {
  // ==========================================
  // PURCHASE ORDERS
  // ==========================================

  static async createPurchaseOrder(data: {
    supplierId: string;
    items: { inventoryItemId: string; quantity: number; unitPrice: number }[];
    expectedAt?: string;
    notes?: string;
    userId: string;
    tenantId: string;
  }) {
    // Yetkazib beruvchi tekshirish
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, tenantId: data.tenantId },
    });

    if (!supplier) {
      throw new AppError('Yetkazib beruvchi topilmadi', 404);
    }

    // Buyurtma raqamini generatsiya qilish
    const orderNumber = await this.generateOrderNumber(data.tenantId);

    // Umumiy summani hisoblash
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        totalAmount,
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : undefined,
        notes: data.notes,
        userId: data.userId,
        tenantId: data.tenantId,
        items: {
          create: data.items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });

    return purchaseOrder;
  }

  static async getPurchaseOrders(
    tenantId: string,
    options: {
      status?: PurchaseOrderStatus;
      supplierId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = { tenantId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.supplierId) {
      where.supplierId = options.supplierId;
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
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
            inventoryItem: {
              select: { id: true, name: true, sku: true, unit: true, quantity: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Xarid buyurtmasi topilmadi', 404);
    }

    return order;
  }

  static async updatePurchaseOrderStatus(
    id: string,
    status: PurchaseOrderStatus,
    tenantId: string
  ) {
    const order = await this.getPurchaseOrderById(id, tenantId);

    // Status o'tish qoidalari
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
      PARTIAL: ['RECEIVED', 'CANCELLED'],
      RECEIVED: [],
      CANCELLED: [],
    };

    const currentStatus = order.status as string;
    if (!allowedTransitions[currentStatus]?.includes(status)) {
      throw new AppError(
        `Statusni ${currentStatus} dan ${status} ga o'zgartirish mumkin emas`,
        400
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...(status === 'RECEIVED' ? { receivedAt: new Date() } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });

    return updated;
  }

  static async receivePurchaseOrder(
    id: string,
    receivedItems: { itemId: string; receivedQty: number }[],
    tenantId: string
  ) {
    const order = await this.getPurchaseOrderById(id, tenantId);

    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new AppError(
        `Bu buyurtma allaqachon ${order.status === 'RECEIVED' ? 'qabul qilingan' : 'bekor qilingan'}`,
        400
      );
    }

    // Tranzaksiya ichida barcha o'zgarishlarni bajarish
    const result = await prisma.$transaction(async (tx) => {
      let allFullyReceived = true;

      for (const received of receivedItems) {
        const orderItem = order.items.find((i) => i.id === received.itemId);
        if (!orderItem) {
          throw new AppError(`Buyurtma elementi topilmadi: ${received.itemId}`, 404);
        }

        const newReceivedQty = Number(orderItem.receivedQty) + received.receivedQty;

        if (newReceivedQty > Number(orderItem.quantity)) {
          throw new AppError(
            `Qabul qilingan miqdor (${newReceivedQty}) buyurtma miqdoridan (${orderItem.quantity}) oshib ketdi: ${orderItem.inventoryItem.name}`,
            400
          );
        }

        // PurchaseOrderItem ni yangilash
        await tx.purchaseOrderItem.update({
          where: { id: received.itemId },
          data: { receivedQty: newReceivedQty },
        });

        // Inventoryga qo'shish
        await tx.inventoryItem.update({
          where: { id: orderItem.inventoryItemId },
          data: {
            quantity: { increment: received.receivedQty },
          },
        });

        // Tranzaksiya yaratish
        await tx.inventoryTransaction.create({
          data: {
            itemId: orderItem.inventoryItemId,
            type: 'IN',
            quantity: received.receivedQty,
            notes: `Xarid buyurtmasi ${order.orderNumber} dan qabul qilindi`,
            userId: order.userId,
          },
        });

        if (newReceivedQty < Number(orderItem.quantity)) {
          allFullyReceived = false;
        }
      }

      // Qabul qilinmagan elementlarni tekshirish
      for (const orderItem of order.items) {
        const received = receivedItems.find((r) => r.itemId === orderItem.id);
        if (!received) {
          const currentReceived = Number(orderItem.receivedQty);
          if (currentReceived < Number(orderItem.quantity)) {
            allFullyReceived = false;
          }
        }
      }

      // Statusni yangilash
      const newStatus: PurchaseOrderStatus = allFullyReceived ? 'RECEIVED' : 'PARTIAL';

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          ...(allFullyReceived ? { receivedAt: new Date() } : {}),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true, unit: true } },
            },
          },
        },
      });

      return updated;
    });

    return result;
  }

  private static async generateOrderNumber(tenantId: string): Promise<string> {
    const lastOrder = await prisma.purchaseOrder.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });

    let nextNum = 1;
    if (lastOrder) {
      const match = lastOrder.orderNumber.match(/PO-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `PO-${String(nextNum).padStart(3, '0')}`;
  }

  // ==========================================
  // STOCK ALERTS
  // ==========================================

  static async getStockAlerts(
    tenantId: string,
    options: {
      isResolved?: boolean;
      severity?: AlertSeverity;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockAlertWhereInput = { tenantId };

    if (options.isResolved !== undefined) {
      where.isResolved = options.isResolved;
    }

    if (options.severity) {
      where.severity = options.severity;
    }

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

  static async checkAndCreateStockAlerts(tenantId: string) {
    // Kam qolgan mahsulotlarni topish (raw query — Prisma field comparison qo'llab-quvvatlamaydi)
    const lowStockItems = await prisma.$queryRaw`
      SELECT id, name, sku, unit, quantity, min_quantity
      FROM inventory_items
      WHERE tenant_id = ${tenantId}
        AND is_active = true
        AND min_quantity > 0
        AND quantity <= min_quantity
    ` as any[];

    const createdAlerts: Awaited<ReturnType<typeof prisma.stockAlert.create>>[] = [];

    for (const item of lowStockItems) {
      const currentQty = Number(item.quantity);
      const minQty = Number(item.min_quantity);

      // Agar hal qilinmagan alert mavjud bo'lsa, yaratmaymiz
      const existingAlert = await prisma.stockAlert.findFirst({
        where: {
          inventoryItemId: item.id,
          tenantId,
          isResolved: false,
        },
      });

      if (existingAlert) continue;

      // Severity aniqlash
      const ratio = currentQty / minQty;
      let severity: AlertSeverity;
      if (currentQty === 0) {
        severity = 'CRITICAL';
      } else if (ratio <= 0.25) {
        severity = 'HIGH';
      } else if (ratio <= 0.5) {
        severity = 'MEDIUM';
      } else {
        severity = 'LOW';
      }

      const alert = await prisma.stockAlert.create({
        data: {
          inventoryItemId: item.id,
          severity,
          currentQty,
          minQty,
          tenantId,
        },
        include: {
          inventoryItem: {
            select: { id: true, name: true, sku: true, unit: true },
          },
        },
      });

      createdAlerts.push(alert);
    }

    return {
      scannedItems: lowStockItems.length,
      createdAlerts: createdAlerts.length,
      alerts: createdAlerts,
    };
  }

  static async resolveStockAlert(id: string, tenantId: string) {
    const alert = await prisma.stockAlert.findFirst({
      where: { id, tenantId },
    });

    if (!alert) {
      throw new AppError('Stock alert topilmadi', 404);
    }

    if (alert.isResolved) {
      throw new AppError('Bu alert allaqachon hal qilingan', 400);
    }

    const updated = await prisma.stockAlert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, sku: true, unit: true },
        },
      },
    });

    return updated;
  }

  // ==========================================
  // WASTE LOGS
  // ==========================================

  static async createWasteLog(data: {
    inventoryItemId: string;
    quantity: number;
    reason: string;
    userId: string;
    tenantId: string;
  }) {
    // Mahsulot mavjudligini tekshirish
    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, tenantId: data.tenantId },
    });

    if (!item) {
      throw new AppError('Ombor mahsuloti topilmadi', 404);
    }

    if (Number(item.quantity) < data.quantity) {
      throw new AppError('Omborda yetarli miqdor yo\'q', 400);
    }

    const costAmount = Number(item.costPrice) * data.quantity;

    // Tranzaksiya ichida waste log yaratish va inventorydan ayirish
    const [wasteLog] = await prisma.$transaction([
      prisma.wasteLog.create({
        data: {
          inventoryItemId: data.inventoryItemId,
          quantity: data.quantity,
          reason: data.reason,
          costAmount,
          userId: data.userId,
          tenantId: data.tenantId,
        },
        include: {
          inventoryItem: {
            select: { id: true, name: true, sku: true, unit: true },
          },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.inventoryItemId },
        data: {
          quantity: { decrement: data.quantity },
        },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId: data.inventoryItemId,
          type: 'WASTE',
          quantity: data.quantity,
          notes: `Yo'qotish: ${data.reason}`,
          userId: data.userId,
        },
      }),
    ]);

    return wasteLog;
  }

  static async getWasteLogs(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WasteLogWhereInput = { tenantId };

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) {
        where.createdAt.gte = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        where.createdAt.lte = new Date(options.dateTo);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.wasteLog.findMany({
        where,
        include: {
          inventoryItem: {
            select: { id: true, name: true, sku: true, unit: true },
          },
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
        createdAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, sku: true, unit: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mahsulot bo'yicha aggregatsiya
    const byItem = new Map<
      string,
      {
        inventoryItemId: string;
        name: string;
        sku: string;
        unit: string;
        totalQuantity: number;
        totalCost: number;
        count: number;
      }
    >();

    let grandTotalQuantity = 0;
    let grandTotalCost = 0;

    for (const log of wasteLogs) {
      const key = log.inventoryItemId;
      const qty = Number(log.quantity);
      const cost = Number(log.costAmount);

      grandTotalQuantity += qty;
      grandTotalCost += cost;

      if (byItem.has(key)) {
        const existing = byItem.get(key)!;
        existing.totalQuantity += qty;
        existing.totalCost += cost;
        existing.count += 1;
      } else {
        byItem.set(key, {
          inventoryItemId: log.inventoryItemId,
          name: log.inventoryItem.name,
          sku: log.inventoryItem.sku,
          unit: log.inventoryItem.unit,
          totalQuantity: qty,
          totalCost: cost,
          count: 1,
        });
      }
    }

    return {
      dateFrom,
      dateTo,
      totalRecords: wasteLogs.length,
      grandTotalCost,
      items: Array.from(byItem.values()).sort((a, b) => b.totalCost - a.totalCost),
    };
  }
}
