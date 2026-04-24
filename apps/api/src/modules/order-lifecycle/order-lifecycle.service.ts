import { prisma, OrderStatus, ItemStatus, TableStatus } from '@oshxona/database';
import { OrderLifecycleEngine, OrderContext, LifecycleHook } from './lifecycle-engine.js';
import { realtimeSyncManager } from './realtime-sync.js';
import { PrinterService } from '../printer/printer.service.js';
import { InventoryService } from '../../services/inventory.service.js';
import { LoyaltyService } from '../loyalty/loyalty.service.js';

// ==========================================
// ORDER LIFECYCLE SERVICE
// Buyurtma hayot tsikli boshqaruvi — yagona nuqta
// Barcha source lar bu service orqali ishlaydi
// ==========================================

const ORDER_INCLUDE = {
  table: { select: { id: true, number: true, name: true } },
  customer: { select: { id: true, phone: true, firstName: true, lastName: true } },
  user: { select: { id: true, firstName: true, lastName: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, image: true, price: true } },
    },
  },
  payments: true,
} as const;

export class OrderLifecycleService {

  // ==========================================
  // TRANSITION STATUS — Yagona status o'zgartirish nuqtasi
  // ==========================================

  static async transitionStatus(
    tenantId: string,
    orderId: string,
    targetStatus: OrderStatus,
    userId?: string,
  ): Promise<{ success: boolean; order: any; hooks: LifecycleHook[]; message: string }> {

    // 1. Buyurtmani olish
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      return { success: false, order: null, hooks: [], message: 'Buyurtma topilmadi' };
    }

    const fromStatus = order.status;

    // 2. Transition validatsiya
    const validation = OrderLifecycleEngine.validateTransition(
      fromStatus,
      targetStatus,
      (order as any).source,
    );

    if (!validation.allowed) {
      return { success: false, order, hooks: [], message: validation.reason || 'O\'tish mumkin emas' };
    }

    // 3. Status yangilash
    const updatedOrder = await prisma.order.update({
      where: { id: orderId, tenantId },
      data: { status: targetStatus },
      include: ORDER_INCLUDE,
    });

    // 4. Order context yaratish
    const context: OrderContext = {
      id: orderId,
      status: targetStatus,
      source: (order as any).source || 'POS_ORDER',
      type: order.type,
      tableId: order.tableId,
      tenantId,
      items: order.items.map(i => ({ id: i.id, status: i.status })),
      payments: order.payments.map(p => ({ status: p.status, amount: Number(p.amount) })),
      total: Number(order.total),
    };

    // 5. Lifecycle hooks olish
    const hooks = OrderLifecycleEngine.getHooksForTransition(fromStatus, targetStatus, context);

    // 6. Hooks bajarish (async, non-blocking)
    this.executeHooksAsync(tenantId, hooks, updatedOrder, context);

    // 7. Real-time broadcast
    realtimeSyncManager.broadcastStatusChange(
      tenantId, orderId, fromStatus, targetStatus, updatedOrder
    );

    return {
      success: true,
      order: updatedOrder,
      hooks,
      message: `${fromStatus} → ${targetStatus}`,
    };
  }

  // ==========================================
  // ON ORDER CREATED — Yangi buyurtma yaratilganda
  // ==========================================

  static async onOrderCreated(tenantId: string, order: any): Promise<void> {
    const source = order.source || 'POS_ORDER';

    // Auto-transitions (POS/Waiter = auto-confirm)
    const autoTransitions = OrderLifecycleEngine.getAutoTransitionsOnCreate(source);

    let currentOrder = order;
    for (const targetStatus of autoTransitions) {
      const result = await this.transitionStatus(tenantId, order.id, targetStatus);
      if (result.success && result.order) {
        currentOrder = result.order;
      }
    }

    // Broadcast new order
    realtimeSyncManager.broadcastNewOrder(tenantId, currentOrder);

    // Kitchen ticket
    PrinterService.autoPrintKitchenTicket(order.id, tenantId).catch(console.error);
  }

  // ==========================================
  // ON ITEM STATUS CHANGE
  // ==========================================

  static async onItemStatusChange(
    tenantId: string,
    orderId: string,
    itemId: string,
    status: ItemStatus,
  ): Promise<{ order: any; autoAdvanced: boolean }> {

    // Item update
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status },
      include: { product: true },
    });

    // Broadcast
    realtimeSyncManager.broadcastItemStatusChange(tenantId, orderId, itemId, status, updatedItem);

    // Auto-advance: barcha item READY → order READY
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    let autoAdvanced = false;
    if (order && order.status === 'PREPARING') {
      if (OrderLifecycleEngine.shouldAutoAdvanceToReady(order.items)) {
        await this.transitionStatus(tenantId, orderId, 'READY');
        autoAdvanced = true;
      }
    }

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    return { order: fullOrder, autoAdvanced };
  }

  // ==========================================
  // ON PAYMENT — To'lov qabul qilinganda
  // ==========================================

  static async onPaymentReceived(
    tenantId: string,
    orderId: string,
    payment: { method: string; amount: number },
  ): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) return;

    const context: OrderContext = {
      id: orderId,
      status: order.status,
      source: (order as any).source || 'POS_ORDER',
      type: order.type,
      tableId: order.tableId,
      tenantId,
      items: [],
      payments: order.payments.map(p => ({ status: p.status, amount: Number(p.amount) })),
      total: Number(order.total),
    };

    const paymentStatus = OrderLifecycleEngine.getPaymentStatus(context);

    // Broadcast payment update
    realtimeSyncManager.broadcastPayment(tenantId, orderId, payment, paymentStatus);

    // Auto-print receipt
    PrinterService.autoPrintReceipt(orderId, tenantId).catch(console.error);
  }

  // ==========================================
  // ENRICH ORDER — Barcha metadata bilan
  // ==========================================

  static async getEnrichedOrder(tenantId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: ORDER_INCLUDE,
    });

    if (!order) return null;

    const context: OrderContext = {
      id: order.id,
      status: order.status,
      source: (order as any).source || 'POS_ORDER',
      type: order.type,
      tableId: order.tableId,
      tenantId,
      items: order.items.map(i => ({ id: i.id, status: i.status })),
      payments: order.payments.map(p => ({ status: p.status, amount: Number(p.amount) })),
      total: Number(order.total),
    };

    return {
      ...order,
      ...OrderLifecycleEngine.enrichOrder(context),
    };
  }

  // ==========================================
  // PRIVATE: Hooks async execution
  // ==========================================

  private static async executeHooksAsync(
    tenantId: string,
    hooks: LifecycleHook[],
    order: any,
    context: OrderContext,
  ): Promise<void> {
    for (const hook of hooks) {
      try {
        switch (hook.type) {
          case 'PRINT':
            if (hook.printType === 'kitchen_ticket') {
              await PrinterService.autoPrintKitchenTicket(context.id, tenantId);
            } else if (hook.printType === 'receipt') {
              await PrinterService.autoPrintReceipt(context.id, tenantId);
            }
            break;

          case 'INVENTORY_DEDUCT':
            if (hook.orderId) {
              await InventoryService.deductForOrder(hook.orderId, order.userId || '', tenantId);
            }
            break;

          case 'INVENTORY_RESTORE':
            if (hook.orderId) {
              await InventoryService.restoreForOrder(hook.orderId, order.userId || '', tenantId);
            }
            break;

          case 'TABLE_FREE':
            if (hook.tableId) {
              await prisma.table.update({
                where: { id: hook.tableId, tenantId },
                data: { status: TableStatus.CLEANING },
              });
              realtimeSyncManager.broadcastTableStatus(tenantId, hook.tableId, 'CLEANING');
            }
            break;

          case 'LOYALTY_EARN':
            if (hook.orderId) {
              const o = await prisma.order.findUnique({
                where: { id: hook.orderId },
                select: { customerId: true, total: true, tenantId: true },
              });
              if (o?.customerId) {
                await LoyaltyService.earnPoints(
                  o.tenantId, o.customerId, hook.orderId, Number(o.total)
                );
              }
            }
            break;

          case 'EXTERNAL_SYNC':
            // Handled by integration service separately
            break;
        }
      } catch (error) {
        console.error(`[Lifecycle] Hook error: ${hook.type}`, error);
      }
    }
  }
}
