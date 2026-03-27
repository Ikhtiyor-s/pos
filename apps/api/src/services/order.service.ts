import { prisma, Prisma, OrderStatus, ItemStatus, TableStatus } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import { CreateOrderInput, UpdateOrderInput, OrderItemInput } from '../validators/order.validator.js';
import { InventoryService } from './inventory.service.js';

export class OrderService {
  static async generateOrderNumber(tenantId: string): Promise<string> {
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const prefix = settings?.orderPrefix || 'ORD';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

    // Count today's orders
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const todayOrdersCount = await prisma.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const orderNum = String(todayOrdersCount + 1).padStart(4, '0');
    return `${prefix}-${dateStr}-${orderNum}`;
  }

  static async getAll(tenantId: string, options?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    type?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    source?: string;
    tableId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { tenantId };

    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;
    if (options?.source) where.source = options.source as any;
    if (options?.tableId) where.tableId = options.tableId;
    if (options?.userId) where.userId = options.userId;

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) where.createdAt.gte = options.startDate;
      if (options?.endDate) where.createdAt.lte = options.endDate;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          table: { select: { id: true, number: true, name: true } },
          customer: { select: { id: true, phone: true, firstName: true, lastName: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, image: true } },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  static async getById(tenantId: string, id: string) {
    const order = await prisma.order.findUnique({
      where: { id, tenantId },
      include: {
        table: true,
        customer: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Buyurtma topilmadi', 404);
    }

    return order;
  }

  static async getKitchenOrders(tenantId: string) {
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: {
          in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PREPARING],
        },
      },
      include: {
        table: { select: { id: true, number: true, name: true } },
        items: {
          where: {
            status: {
              in: [ItemStatus.PENDING, ItemStatus.PREPARING],
            },
          },
          include: {
            product: { select: { id: true, name: true, cookingTime: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return orders.filter((order) => order.items.length > 0);
  }

  static async create(tenantId: string, data: CreateOrderInput, userId: string) {
    // Validate table
    if (data.tableId) {
      const table = await prisma.table.findUnique({
        where: { id: data.tableId, tenantId },
      });

      if (!table) {
        throw new AppError('Stol topilmadi', 404);
      }

      if (table.status === TableStatus.OCCUPIED) {
        // Check if there's an active order for this table
        const activeOrder = await prisma.order.findFirst({
          where: {
            tenantId,
            tableId: data.tableId,
            status: {
              notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
            },
          },
        });

        if (activeOrder) {
          throw new AppError('Bu stolda faol buyurtma mavjud', 400);
        }
      }
    }

    // Get products and calculate totals
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });

    if (products.length !== productIds.length) {
      throw new AppError('Ba\'zi mahsulotlar topilmadi', 404);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
    }> = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const price = Number(product.price);
      const total = price * item.quantity;
      subtotal += total;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price,
        total,
        notes: item.notes,
      });
    }

    // Calculate discount
    let discount = data.discount || 0;
    if (data.discountPercent) {
      discount = subtotal * (data.discountPercent / 100);
    }

    // Get tax rate
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const taxRate = Number(settings?.taxRate || 0);
    const tax = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + tax;

    // Generate order number
    const orderNumber = await this.generateOrderNumber(tenantId);

    // Transaction — buyurtma + stol yangilash atomik bo'lishi kerak
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
          orderNumber,
          source: data.source as any || 'POS_ORDER',
          type: data.type,
          status: OrderStatus.NEW,
          tableId: data.tableId,
          customerId: data.customerId,
          userId,
          subtotal,
          discount,
          discountPercent: data.discountPercent,
          tax,
          total,
          notes: data.notes,
          address: data.address,
          items: {
            create: orderItems,
          },
        },
        include: {
          table: true,
          customer: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Update table status if DINE_IN
      if (data.tableId && data.type === 'DINE_IN') {
        await tx.table.update({
          where: { id: data.tableId, tenantId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      return created;
    });

    return order;
  }

  static async updateStatus(tenantId: string, id: string, status: OrderStatus) {
    const order = await this.getById(tenantId, id);

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      NEW: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.DELIVERING, OrderStatus.COMPLETED],
      DELIVERING: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      throw new AppError(
        `Buyurtma holatini ${order.status} dan ${status} ga o'zgartirish mumkin emas`,
        400
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id, tenantId },
      data: { status },
      include: {
        table: true,
        items: { include: { product: true } },
      },
    }) as any; // nonborOrderId, isNonborOrder ham qaytadi

    // Buyurtma yakunlanganda ingredientlarni avtomatik kamaytirish
    if (status === OrderStatus.COMPLETED) {
      InventoryService.deductForOrder(id, order.userId, tenantId).catch((err) =>
        console.error('[Inventory] Deduct xatolik:', err)
      );
    }

    // Free table if order completed or cancelled
    if (
      (status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) &&
      order.tableId
    ) {
      await prisma.table.update({
        where: { id: order.tableId, tenantId },
        data: { status: TableStatus.CLEANING },
      });
    }

    return updatedOrder;
  }

  static async updateItemStatus(tenantId: string, orderId: string, itemId: string, status: ItemStatus) {
    const order = await this.getById(tenantId, orderId);
    const item = order.items.find((i) => i.id === itemId);

    if (!item) {
      throw new AppError('Buyurtma elementi topilmadi', 404);
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { product: true },
    });

    // Check if all items are ready
    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    const allReady = allItems.every(
      (i) => i.status === ItemStatus.READY || i.status === ItemStatus.SERVED
    );

    if (allReady && order.status === OrderStatus.PREPARING) {
      await prisma.order.update({
        where: { id: orderId, tenantId },
        data: { status: OrderStatus.READY },
      });
    }

    return updatedItem;
  }

  static async addItems(tenantId: string, orderId: string, items: OrderItemInput[]) {
    const order = await this.getById(tenantId, orderId);

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new AppError('Yakunlangan buyurtmaga element qo\'shib bo\'lmaydi', 400);
    }

    // Get products
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    let addedTotal = 0;
    const orderItems: Array<{
      orderId: string;
      productId: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const price = Number(product.price);
      const total = price * item.quantity;
      addedTotal += total;

      orderItems.push({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price,
        total,
        notes: item.notes,
      });
    }

    // Create new items
    await prisma.orderItem.createMany({
      data: orderItems,
    });

    // Recalculate totals
    const newSubtotal = Number(order.subtotal) + addedTotal;
    const discountPercent = Number(order.discountPercent || 0);
    const discount = discountPercent > 0 ? newSubtotal * (discountPercent / 100) : Number(order.discount);

    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const taxRate = Number(settings?.taxRate || 0);
    const tax = (newSubtotal - discount) * (taxRate / 100);
    const total = newSubtotal - discount + tax;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId, tenantId },
      data: {
        subtotal: newSubtotal,
        discount,
        tax,
        total,
      },
      include: {
        table: true,
        items: { include: { product: true } },
      },
    });

    return updatedOrder;
  }

  static async updateItemQuantity(tenantId: string, orderId: string, itemId: string, quantity: number) {
    const order = await this.getById(tenantId, orderId);
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new AppError('Yakunlangan buyurtmani o\'zgartirib bo\'lmaydi', 400);
    }

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new AppError('Element topilmadi', 404);

    if (quantity <= 0) {
      await prisma.orderItem.delete({ where: { id: itemId } });
    } else {
      const price = Number(item.price);
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { quantity, total: price * quantity },
      });
    }

    // Recalculate order totals
    const items = await prisma.orderItem.findMany({ where: { orderId } });
    const newSubtotal = items.reduce((sum, i) => sum + Number(i.total), 0);
    const discountPercent = Number(order.discountPercent || 0);
    const discount = discountPercent > 0 ? newSubtotal * (discountPercent / 100) : Number(order.discount);
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const taxRate = Number(settings?.taxRate || 0);
    const tax = (newSubtotal - discount) * (taxRate / 100);
    const total = newSubtotal - discount + tax;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId, tenantId },
      data: { subtotal: newSubtotal, discount, tax, total },
      include: { table: true, items: { include: { product: true } } },
    });

    return updatedOrder;
  }
}
