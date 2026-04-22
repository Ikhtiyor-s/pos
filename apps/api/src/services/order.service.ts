import { prisma, Prisma, OrderStatus, ItemStatus, TableStatus } from '@oshxona/database';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { CreateOrderInput, UpdateOrderInput, OrderItemInput } from '../validators/order.validator.js';
import { InventoryService } from './inventory.service.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export class OrderService {
  // Atomik order number — Redis INCR + DATE key, midnight'da expire
  static async generateOrderNumber(tenantId: string): Promise<string> {
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    const prefix = settings?.orderPrefix || 'ORD';

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    const key = `order_seq:${tenantId}:${dateStr}`;

    // INCR atomik — race condition yo'q
    const seq = await redis.incr(key);

    // Agar yangi key bo'lsa — keyingi kuni yarim kechada expire bo'lsin
    if (seq === 1) {
      const midnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
      await redis.pexpire(key, midnightMs);
    }

    return `${prefix}-${dateStr}-${String(seq).padStart(4, '0')}`;
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
    const limit = Math.min(options?.limit || 20, 100);
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
            include: { product: { select: { id: true, name: true, image: true } } },
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
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!order) throw new AppError('Buyurtma topilmadi', 404, ErrorCode.NOT_FOUND);
    return order;
  }

  static async getKitchenOrders(tenantId: string) {
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PREPARING] },
      },
      include: {
        table: { select: { id: true, number: true, name: true } },
        items: {
          where: { status: { in: [ItemStatus.PENDING, ItemStatus.PREPARING] } },
          include: { product: { select: { id: true, name: true, cookingTime: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return orders.filter((o) => o.items.length > 0);
  }

  static async create(tenantId: string, data: CreateOrderInput, userId: string) {
    if (data.tableId) {
      const table = await prisma.table.findUnique({ where: { id: data.tableId, tenantId } });
      if (!table) throw new AppError('Stol topilmadi', 404, ErrorCode.NOT_FOUND);

      if (table.status === TableStatus.OCCUPIED) {
        const activeOrder = await prisma.order.findFirst({
          where: {
            tenantId,
            tableId: data.tableId,
            status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
          },
        });
        if (activeOrder) throw new AppError('Bu stolda faol buyurtma mavjud', 400, ErrorCode.CONFLICT);
      }
    }

    const productIds = data.items.map((item) => item.productId);
    const [products, settings] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds }, tenantId } }),
      prisma.settings.findFirst({ where: { tenantId } }),
    ]);

    if (products.length !== productIds.length) {
      throw new AppError("Ba'zi mahsulotlar topilmadi", 404, ErrorCode.NOT_FOUND);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;

    const orderItems = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const price = Number(product.price);
      const total = price * item.quantity;
      subtotal += total;
      return { productId: item.productId, quantity: item.quantity, price, total, notes: item.notes };
    });

    let discount = data.discount || 0;
    if (data.discountPercent) discount = subtotal * (data.discountPercent / 100);

    const taxRate = Number(settings?.taxRate || 0);
    const tax = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + tax;

    const orderNumber = await this.generateOrderNumber(tenantId);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId,
          orderNumber,
          source: (data.source as any) || 'POS_ORDER',
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
          items: { create: orderItems },
        },
        include: { table: true, customer: true, items: { include: { product: true } } },
      });

      if (data.tableId && data.type === 'DINE_IN') {
        await tx.table.update({
          where: { id: data.tableId, tenantId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      return created;
    });

    logger.info('Order created', { tenantId, orderId: order.id, orderNumber, total });
    return order;
  }

  static async updateStatus(tenantId: string, id: string, status: OrderStatus) {
    const order = await this.getById(tenantId, id);

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
        400,
        ErrorCode.ORDER_INVALID_STATUS,
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id, tenantId },
      data: { status },
      include: { table: true, items: { include: { product: true } } },
    });

    if (status === OrderStatus.COMPLETED) {
      InventoryService.deductForOrder(id, order.userId, tenantId).catch((err) =>
        logger.error('Inventory deduct failed', { orderId: id, error: err.message }),
      );
    }

    if ((status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED) && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId, tenantId },
        data: { status: TableStatus.CLEANING },
      });
    }

    logger.info('Order status updated', { tenantId, orderId: id, from: order.status, to: status });
    return updatedOrder;
  }

  static async updateItemStatus(tenantId: string, orderId: string, itemId: string, status: ItemStatus) {
    const order = await this.getById(tenantId, orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new AppError('Buyurtma elementi topilmadi', 404, ErrorCode.NOT_FOUND);

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { product: true },
    });

    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    const allReady = allItems.every(
      (i) => i.status === ItemStatus.READY || i.status === ItemStatus.SERVED,
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
      throw new AppError("Yakunlangan buyurtmaga element qo'shib bo'lmaydi", 400, ErrorCode.ORDER_INVALID_STATUS);
    }

    const productIds = items.map((item) => item.productId);
    const [products, settings] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds }, tenantId } }),
      prisma.settings.findFirst({ where: { tenantId } }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    let addedTotal = 0;

    const orderItems = items.flatMap((item) => {
      const product = productMap.get(item.productId);
      if (!product) return [];
      const price = Number(product.price);
      const total = price * item.quantity;
      addedTotal += total;
      return [{ orderId, productId: item.productId, quantity: item.quantity, price, total, notes: item.notes }];
    });

    await prisma.orderItem.createMany({ data: orderItems });

    const newSubtotal = Number(order.subtotal) + addedTotal;
    const discountPercent = Number(order.discountPercent || 0);
    const discount = discountPercent > 0 ? newSubtotal * (discountPercent / 100) : Number(order.discount);
    const taxRate = Number(settings?.taxRate || 0);
    const tax = (newSubtotal - discount) * (taxRate / 100);
    const total = newSubtotal - discount + tax;

    return prisma.order.update({
      where: { id: orderId, tenantId },
      data: { subtotal: newSubtotal, discount, tax, total },
      include: { table: true, items: { include: { product: true } } },
    });
  }

  static async updateItemQuantity(tenantId: string, orderId: string, itemId: string, quantity: number) {
    const order = await this.getById(tenantId, orderId);

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new AppError("Yakunlangan buyurtmani o'zgartirib bo'lmaydi", 400, ErrorCode.ORDER_INVALID_STATUS);
    }

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) throw new AppError('Element topilmadi', 404, ErrorCode.NOT_FOUND);

    if (quantity <= 0) {
      await prisma.orderItem.delete({ where: { id: itemId } });
    } else {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { quantity, total: Number(item.price) * quantity },
      });
    }

    const [items, settings] = await Promise.all([
      prisma.orderItem.findMany({ where: { orderId } }),
      prisma.settings.findFirst({ where: { tenantId } }),
    ]);

    const newSubtotal = items.reduce((sum, i) => sum + Number(i.total), 0);
    const discountPercent = Number(order.discountPercent || 0);
    const discount = discountPercent > 0 ? newSubtotal * (discountPercent / 100) : Number(order.discount);
    const taxRate = Number(settings?.taxRate || 0);
    const tax = (newSubtotal - discount) * (taxRate / 100);
    const total = newSubtotal - discount + tax;

    return prisma.order.update({
      where: { id: orderId, tenantId },
      data: { subtotal: newSubtotal, discount, tax, total },
      include: { table: true, items: { include: { product: true } } },
    });
  }
}
