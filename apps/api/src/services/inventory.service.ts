import { prisma, Prisma, TransactionType } from '@oshxona/database';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class InventoryService {
  static async getAll(tenantId: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = { tenantId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { sku: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  static async getById(id: string, tenantId: string) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!item) throw new AppError('Ombor mahsuloti topilmadi', 404, ErrorCode.NOT_FOUND);
    return item;
  }

  static async create(tenantId: string, data: {
    name: string;
    nameRu?: string;
    nameEn?: string;
    sku: string;
    unit: string;
    quantity?: number;
    minQuantity?: number;
    costPrice?: number;
    supplierId?: string;
    expiryDate?: string;
  }) {
    const existing = await prisma.inventoryItem.findFirst({ where: { sku: data.sku, tenantId } });
    if (existing) throw new AppError('Bu SKU raqamli mahsulot mavjud', 400, ErrorCode.CONFLICT);

    return prisma.inventoryItem.create({
      data: {
        tenantId,
        name: data.name,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        sku: data.sku,
        unit: data.unit,
        quantity: data.quantity || 0,
        minQuantity: data.minQuantity || 0,
        costPrice: data.costPrice || 0,
        supplierId: data.supplierId,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  static async update(id: string, tenantId: string, data: {
    name?: string;
    nameRu?: string;
    nameEn?: string;
    unit?: string;
    minQuantity?: number;
    costPrice?: number;
    supplierId?: string;
    expiryDate?: string;
    image?: string;
    isActive?: boolean;
  }) {
    await this.getById(id, tenantId);
    return prisma.inventoryItem.update({
      where: { id },
      data: { ...data, expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  static async delete(id: string, tenantId: string) {
    await this.getById(id, tenantId);
    await prisma.inventoryItem.delete({ where: { id } });
  }

  static async addTransaction(tenantId: string, data: {
    itemId: string;
    type: TransactionType;
    quantity: number;
    notes?: string;
    userId: string;
  }) {
    const item = await this.getById(data.itemId, tenantId);

    if ((data.type === 'OUT' || data.type === 'WASTE') && Number(item.quantity) < data.quantity) {
      throw new AppError("Omborda yetarli miqdor yo'q", 400, ErrorCode.INVENTORY_INSUFFICIENT);
    }

    const [transaction] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          itemId: data.itemId,
          type: data.type,
          quantity: data.quantity,
          notes: data.notes,
          userId: data.userId,
        },
        include: {
          item: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          quantity:
            data.type === 'IN'
              ? { increment: data.quantity }
              : data.type === 'ADJUST'
                ? data.quantity
                : { decrement: data.quantity },
        },
      }),
    ]);

    return transaction;
  }

  // Faqat raw query — Prisma field comparison qo'llab-quvvatlamaydi
  static async getLowStock(tenantId: string) {
    const lowStockItems = await prisma.$queryRaw<any[]>`
      SELECT
        i.id, i.name, i.name_ru as "nameRu", i.sku, i.unit,
        i.quantity::float, i.min_quantity::float as "minQuantity",
        i.cost_price::float as "costPrice", i.is_active as "isActive",
        i.created_at as "createdAt", i.updated_at as "updatedAt",
        s.id as "supplierId", s.name as "supplierName"
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.is_active = true
        AND i.tenant_id = ${tenantId}
        AND i.min_quantity > 0
        AND i.quantity <= i.min_quantity
      ORDER BY (i.quantity / NULLIF(i.min_quantity, 0)) ASC
    `;

    return lowStockItems;
  }

  // Buyurtma yakunlanganda ingredientlarni batch transaksiyada kamaytirish
  // N+1 loop o'rniga bitta $transaction ichida barchasi bajariladi
  static async deductForOrder(orderId: string, userId: string, tenantId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: {
              include: {
                ingredients: { include: { inventoryItem: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      logger.error('Inventory deduct: order not found', { orderId });
      return;
    }

    type DeductEntry = { itemId: string; amount: number; itemName: string };
    const deductMap = new Map<string, DeductEntry>();

    for (const orderItem of order.items) {
      for (const ingredient of orderItem.product.ingredients) {
        const needed = Number(ingredient.quantity) * orderItem.quantity;
        const available = Number(ingredient.inventoryItem.quantity);
        const actual = Math.min(needed, available);

        if (actual <= 0) continue;

        if (deductMap.has(ingredient.inventoryItemId)) {
          deductMap.get(ingredient.inventoryItemId)!.amount += actual;
        } else {
          deductMap.set(ingredient.inventoryItemId, {
            itemId: ingredient.inventoryItemId,
            amount: actual,
            itemName: ingredient.inventoryItem.name,
          });
        }
      }
    }

    if (deductMap.size === 0) return;

    // Bitta transaksiyada barchani bajarish — N+1 yo'q
    await prisma.$transaction(
      [...deductMap.values()].flatMap(({ itemId, amount, itemName }) => [
        prisma.inventoryTransaction.create({
          data: {
            itemId,
            type: 'OUT',
            quantity: amount,
            notes: `Buyurtma ${order.orderNumber} — ${itemName}`,
            userId,
          },
        }),
        prisma.inventoryItem.update({
          where: { id: itemId },
          data: { quantity: { decrement: amount } },
        }),
      ]),
    );

    logger.info('Inventory deducted for order', {
      orderId,
      orderNumber: order.orderNumber,
      itemsCount: deductMap.size,
    });
  }

  static async getTransactions(itemId: string, tenantId: string, options?: {
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    await this.getById(itemId, tenantId);

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { itemId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryTransaction.count({ where: { itemId } }),
    ]);

    return { transactions, total, page, limit };
  }
}
