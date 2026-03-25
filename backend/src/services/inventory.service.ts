import { prisma, Prisma, TransactionType } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';

export class InventoryService {
  static async getAll(tenantId: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = { tenantId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { sku: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
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
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new AppError('Ombor mahsuloti topilmadi', 404);
    }

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
    // sku + tenantId unique constraint
    const existing = await prisma.inventoryItem.findFirst({
      where: { sku: data.sku, tenantId },
    });

    if (existing) {
      throw new AppError('Bu SKU raqamli mahsulot mavjud', 400);
    }

    const item = await prisma.inventoryItem.create({
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
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return item;
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

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return item;
  }

  static async delete(id: string, tenantId: string) {
    await this.getById(id, tenantId);
    await prisma.inventoryItem.delete({ where: { id } });
  }

  // Ombor tranzaksiyasi - kirim/chiqim/tuzatish
  static async addTransaction(tenantId: string, data: {
    itemId: string;
    type: TransactionType;
    quantity: number;
    notes?: string;
    userId: string;
  }) {
    const item = await this.getById(data.itemId, tenantId);

    // Chiqim yoki yo'qotishda miqdor yetarli bo'lishi kerak
    if ((data.type === 'OUT' || data.type === 'WASTE') && Number(item.quantity) < data.quantity) {
      throw new AppError('Omborda yetarli miqdor yo\'q', 400);
    }

    // Tranzaksiya yaratish va miqdorni yangilash
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
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          quantity: data.type === 'IN'
            ? { increment: data.quantity }
            : data.type === 'ADJUST'
              ? data.quantity
              : { decrement: data.quantity },
        },
      }),
    ]);

    return transaction;
  }

  // Kam qolgan mahsulotlar (quantity <= minQuantity)
  static async getLowStock(tenantId: string) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        isActive: true,
        minQuantity: { gt: 0 },
        quantity: { lte: prisma.inventoryItem.fields?.minQuantity as any },
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    // Prisma da field comparison to'g'ridan-to'g'ri qo'llab-quvvatlanmaydi
    // Shuning uchun raw query ishlatamiz
    const lowStockItems = await prisma.$queryRaw`
      SELECT i.*, s.name as supplier_name
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.is_active = true
        AND i.tenant_id = ${tenantId}
        AND i.min_quantity > 0
        AND i.quantity <= i.min_quantity
      ORDER BY i.quantity ASC
    ` as any[];

    return lowStockItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      nameRu: item.name_ru,
      sku: item.sku,
      unit: item.unit,
      quantity: Number(item.quantity),
      minQuantity: Number(item.min_quantity),
      costPrice: Number(item.cost_price),
      isActive: item.is_active,
      supplierName: item.supplier_name,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  // Buyurtma yakunlanganda ingredientlarni avtomatik kamaytirish
  static async deductForOrder(orderId: string, userId: string, tenantId: string) {
    // 1. Buyurtma items ni olish
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: {
          include: {
            product: {
              include: {
                ingredients: {
                  include: {
                    inventoryItem: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      console.error(`[Inventory] Buyurtma topilmadi: ${orderId}`);
      return;
    }

    // 2. Har bir mahsulot uchun ingredientlarni kamaytirish
    for (const orderItem of order.items) {
      const ingredients = orderItem.product.ingredients;
      if (!ingredients || ingredients.length === 0) continue;

      for (const ingredient of ingredients) {
        const deductAmount = Number(ingredient.quantity) * orderItem.quantity;
        const currentQty = Number(ingredient.inventoryItem.quantity);

        if (currentQty < deductAmount) {
          console.warn(
            `[Inventory] Yetarli emas: ${ingredient.inventoryItem.name} (kerak: ${deductAmount}, bor: ${currentQty})`
          );
        }

        const actualDeduct = Math.min(deductAmount, currentQty);
        if (actualDeduct <= 0) continue;

        // Tranzaksiya yaratish va miqdorni kamaytirish
        await prisma.$transaction([
          prisma.inventoryTransaction.create({
            data: {
              itemId: ingredient.inventoryItemId,
              type: 'OUT',
              quantity: actualDeduct,
              notes: `Buyurtma ${order.orderNumber} — ${orderItem.product.name} x${orderItem.quantity}`,
              userId,
            },
          }),
          prisma.inventoryItem.update({
            where: { id: ingredient.inventoryItemId },
            data: {
              quantity: { decrement: actualDeduct },
            },
          }),
        ]);
      }
    }

    console.log(`[Inventory] Buyurtma ${order.orderNumber} uchun ingredientlar kamaytildi`);
  }

  // Tranzaksiya tarixi
  static async getTransactions(itemId: string, tenantId: string, options?: {
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // Avval item tenantga tegishliligini tekshirish
    await this.getById(itemId, tenantId);

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { itemId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryTransaction.count({ where: { itemId } }),
    ]);

    return { transactions, total, page, limit };
  }
}
