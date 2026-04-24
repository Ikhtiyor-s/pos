import { Server } from 'socket.io';
import { prisma, Prisma, TransactionType } from '@oshxona/database';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export class InventoryService {

  // ==========================================
  // CRUD — InventoryItem
  // ==========================================

  static async getAll(tenantId: string, options?: {
    page?: number; limit?: number; search?: string; isActive?: boolean;
  }) {
    const page  = options?.page  || 1;
    const limit = Math.min(options?.limit || 50, 200);
    const skip  = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = { tenantId };
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { sku:  { contains: options.search, mode: 'insensitive' } },
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
    name: string; nameRu?: string; nameEn?: string; sku: string; unit: string;
    quantity?: number; minQuantity?: number; costPrice?: number; supplierId?: string; expiryDate?: string;
  }) {
    const existing = await prisma.inventoryItem.findFirst({ where: { sku: data.sku, tenantId } });
    if (existing) throw new AppError('Bu SKU raqamli mahsulot mavjud', 400, ErrorCode.CONFLICT);

    return prisma.inventoryItem.create({
      data: {
        tenantId,
        name:        data.name,
        nameRu:      data.nameRu,
        nameEn:      data.nameEn,
        sku:         data.sku,
        unit:        data.unit,
        quantity:    data.quantity    || 0,
        minQuantity: data.minQuantity || 0,
        costPrice:   data.costPrice   || 0,
        supplierId:  data.supplierId,
        expiryDate:  data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  static async update(id: string, tenantId: string, data: {
    name?: string; nameRu?: string; nameEn?: string; unit?: string; minQuantity?: number;
    costPrice?: number; supplierId?: string; expiryDate?: string; image?: string; isActive?: boolean;
  }) {
    await this.getById(id, tenantId);
    return prisma.inventoryItem.update({
      where: { id },
      data:  { ...data, expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined },
      include: { supplier: { select: { id: true, name: true } } },
    });
  }

  static async delete(id: string, tenantId: string) {
    await this.getById(id, tenantId);
    await prisma.inventoryItem.delete({ where: { id } });
  }

  // ==========================================
  // TRANSACTIONS (Kirim/Chiqim)
  // ==========================================

  static async addTransaction(tenantId: string, data: {
    itemId: string; type: TransactionType; quantity: number; notes?: string; userId: string;
  }, io?: Server) {
    const item = await this.getById(data.itemId, tenantId);

    if ((data.type === 'OUT' || data.type === 'WASTE') && Number(item.quantity) < data.quantity) {
      throw new AppError('Omborda yetarli miqdor yo\'q', 400, ErrorCode.INVENTORY_INSUFFICIENT);
    }

    const [transaction] = await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          itemId:   data.itemId,
          type:     data.type,
          quantity: data.quantity,
          notes:    data.notes,
          userId:   data.userId,
        },
        include: {
          item: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data:  {
          quantity:
            data.type === 'IN'     ? { increment: data.quantity } :
            data.type === 'ADJUST' ? data.quantity :
                                     { decrement: data.quantity },
        },
      }),
    ]);

    // OUT/WASTE dan keyin alertlarni tekshirish (async, non-blocking)
    if (data.type === 'OUT' || data.type === 'WASTE') {
      import('./inventory.alert-check.js').then(m =>
        m.triggerAlertCheck(tenantId, io).catch(console.error),
      ).catch(() => {
        // Fallback — lazy import ishlamasa skip
      });
    }

    return transaction;
  }

  static async getTransactions(itemId: string, tenantId: string, options?: {
    page?: number; limit?: number;
  }) {
    const page  = options?.page  || 1;
    const limit = options?.limit || 20;
    const skip  = (page - 1) * limit;

    await this.getById(itemId, tenantId);

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where:   { itemId },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryTransaction.count({ where: { itemId } }),
    ]);

    return { transactions, total, page, limit };
  }

  // ==========================================
  // LOW STOCK
  // ==========================================

  static async getLowStock(tenantId: string) {
    return prisma.$queryRaw<any[]>`
      SELECT
        i.id, i.name, i.name_ru AS "nameRu", i.sku, i.unit,
        i.quantity::float, i.min_quantity::float AS "minQuantity",
        i.cost_price::float AS "costPrice", i.is_active AS "isActive",
        i.created_at AS "createdAt", i.updated_at AS "updatedAt",
        s.id AS "supplierId", s.name AS "supplierName"
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.is_active = true
        AND i.tenant_id = ${tenantId}
        AND i.min_quantity > 0
        AND i.quantity <= i.min_quantity
      ORDER BY (i.quantity / NULLIF(i.min_quantity, 0)) ASC
    `;
  }

  // ==========================================
  // ORDER STOCK DEDUCT (CONFIRMED holatida)
  // ==========================================

  static async deductForOrder(orderId: string, userId: string, tenantId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: {
              include: { ingredients: { include: { inventoryItem: true } } },
            },
          },
        },
      },
    });

    if (!order) {
      logger.error('Inventory deduct: order not found', { orderId });
      return;
    }

    type Entry = { itemId: string; amount: number; itemName: string };
    const deductMap = new Map<string, Entry>();

    for (const orderItem of order.items) {
      for (const ing of orderItem.product.ingredients) {
        const needed   = Number(ing.quantity) * orderItem.quantity;
        const available = Number(ing.inventoryItem.quantity);
        const actual   = Math.min(needed, available);
        if (actual <= 0) continue;

        const e = deductMap.get(ing.inventoryItemId);
        if (e) {
          e.amount += actual;
        } else {
          deductMap.set(ing.inventoryItemId, {
            itemId:   ing.inventoryItemId,
            amount:   actual,
            itemName: ing.inventoryItem.name,
          });
        }
      }
    }

    if (!deductMap.size) return;

    await prisma.$transaction(
      [...deductMap.values()].flatMap(({ itemId, amount, itemName }) => [
        prisma.inventoryTransaction.create({
          data: {
            itemId,
            type:     'OUT',
            quantity: amount,
            notes:    `Buyurtma ${order.orderNumber} — ${itemName}`,
            userId,
          },
        }),
        prisma.inventoryItem.update({
          where: { id: itemId },
          data:  { quantity: { decrement: amount } },
        }),
      ]),
    );

    logger.info('Inventory deducted for order', {
      orderId, orderNumber: order.orderNumber, itemsCount: deductMap.size,
    });
  }

  // ==========================================
  // ORDER STOCK RESTORE (CANCELLED holatida)
  // ==========================================

  static async restoreForOrder(orderId: string, userId: string, tenantId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: {
              include: { ingredients: { include: { inventoryItem: true } } },
            },
          },
        },
      },
    });

    if (!order) return;

    type Entry = { itemId: string; amount: number; itemName: string };
    const restoreMap = new Map<string, Entry>();

    for (const orderItem of order.items) {
      for (const ing of orderItem.product.ingredients) {
        const amount = Number(ing.quantity) * orderItem.quantity;
        if (amount <= 0) continue;

        const e = restoreMap.get(ing.inventoryItemId);
        if (e) {
          e.amount += amount;
        } else {
          restoreMap.set(ing.inventoryItemId, {
            itemId:   ing.inventoryItemId,
            amount,
            itemName: ing.inventoryItem.name,
          });
        }
      }
    }

    if (!restoreMap.size) return;

    await prisma.$transaction(
      [...restoreMap.values()].flatMap(({ itemId, amount, itemName }) => [
        prisma.inventoryTransaction.create({
          data: {
            itemId,
            type:     'IN',
            quantity: amount,
            notes:    `Bekor qilingan buyurtma ${order.orderNumber} — ${itemName} qaytarildi`,
            userId,
          },
        }),
        prisma.inventoryItem.update({
          where: { id: itemId },
          data:  { quantity: { increment: amount } },
        }),
      ]),
    );

    logger.info('Inventory restored for cancelled order', {
      orderId, orderNumber: order.orderNumber, itemsCount: restoreMap.size,
    });
  }

  // ==========================================
  // RECIPE (ProductIngredient) MANAGEMENT
  // ==========================================

  static async getProductIngredients(productId: string, tenantId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true },
    });
    if (!product) throw new AppError('Mahsulot topilmadi', 404, ErrorCode.NOT_FOUND);

    const ingredients = await prisma.productIngredient.findMany({
      where: { productId },
      include: {
        inventoryItem: {
          select: { id: true, name: true, sku: true, unit: true, quantity: true, costPrice: true },
        },
      },
      orderBy: { inventoryItem: { name: 'asc' } },
    });

    const costPerUnit = ingredients.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.inventoryItem.costPrice),
      0,
    );

    return { product, ingredients, costPerUnit };
  }

  static async setProductIngredients(productId: string, tenantId: string, items: {
    inventoryItemId: string; quantity: number;
  }[]) {
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new AppError('Mahsulot topilmadi', 404, ErrorCode.NOT_FOUND);

    // Barcha inventoryItemId lar shu tenantga tegishliligini tekshirish
    if (items.length > 0) {
      const ids   = items.map(i => i.inventoryItemId);
      const found = await prisma.inventoryItem.count({ where: { id: { in: ids }, tenantId } });
      if (found !== ids.length) {
        throw new AppError('Ba\'zi ingredientlar topilmadi', 404, ErrorCode.NOT_FOUND);
      }
    }

    await prisma.$transaction([
      prisma.productIngredient.deleteMany({ where: { productId } }),
      ...items.map(item =>
        prisma.productIngredient.create({
          data: { productId, inventoryItemId: item.inventoryItemId, quantity: item.quantity },
        }),
      ),
    ]);

    return this.getProductIngredients(productId, tenantId);
  }

  static async upsertProductIngredient(productId: string, tenantId: string, data: {
    inventoryItemId: string; quantity: number;
  }) {
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new AppError('Mahsulot topilmadi', 404, ErrorCode.NOT_FOUND);

    const invItem = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, tenantId },
    });
    if (!invItem) throw new AppError('Ingredient topilmadi', 404, ErrorCode.NOT_FOUND);

    const existing = await prisma.productIngredient.findFirst({
      where: { productId, inventoryItemId: data.inventoryItemId },
    });

    if (existing) {
      return prisma.productIngredient.update({
        where:   { id: existing.id },
        data:    { quantity: data.quantity },
        include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } } },
      });
    }

    return prisma.productIngredient.create({
      data:    { productId, inventoryItemId: data.inventoryItemId, quantity: data.quantity },
      include: { inventoryItem: { select: { id: true, name: true, sku: true, unit: true } } },
    });
  }

  static async removeProductIngredient(productId: string, inventoryItemId: string, tenantId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new AppError('Mahsulot topilmadi', 404, ErrorCode.NOT_FOUND);

    const ingredient = await prisma.productIngredient.findFirst({
      where: { productId, inventoryItemId },
    });
    if (!ingredient) throw new AppError('Ingredient topilmadi', 404, ErrorCode.NOT_FOUND);

    await prisma.productIngredient.delete({ where: { id: ingredient.id } });
  }
}
