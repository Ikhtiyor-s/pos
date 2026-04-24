import { OrderStatus, ItemStatus } from '@oshxona/database';

// ==========================================
// ORDER LIFECYCLE ENGINE
// Unified state machine for all order sources
//
// Pipeline: NEW → CONFIRMED → PREPARING(COOKING) → READY → COMPLETED
//                                                          ↗
//           Any stage ──────────────→ CANCELLED
//           READY ──→ DELIVERING ──→ COMPLETED
// ==========================================

// --- Status Labels (UI uchun) ---

export const ORDER_STATUS_PIPELINE: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PREPARING',  // = COOKING
  'READY',
  'DELIVERING',
  'COMPLETED',
];

export const STATUS_LABELS: Record<OrderStatus, { uz: string; en: string; icon: string; color: string }> = {
  NEW:        { uz: 'Yangi',          en: 'New',        icon: '🆕', color: '#3b82f6' },
  CONFIRMED:  { uz: 'Tasdiqlangan',   en: 'Confirmed',  icon: '✅', color: '#8b5cf6' },
  PREPARING:  { uz: 'Tayyorlanmoqda', en: 'Cooking',    icon: '🍳', color: '#f59e0b' },
  READY:      { uz: 'Tayyor',         en: 'Ready',      icon: '🔔', color: '#10b981' },
  DELIVERING: { uz: 'Yetkazilmoqda',  en: 'Delivering', icon: '🚗', color: '#06b6d4' },
  COMPLETED:  { uz: 'Yakunlangan',    en: 'Completed',  icon: '✔️', color: '#22c55e' },
  CANCELLED:  { uz: 'Bekor qilingan', en: 'Cancelled',  icon: '❌', color: '#ef4444' },
};

// --- Valid Transitions ---

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW:        ['CONFIRMED', 'PREPARING', 'CANCELLED'], // PREPARING ga to'g'ridan-to'g'ri (tez buyurtma)
  CONFIRMED:  ['PREPARING', 'CANCELLED'],
  PREPARING:  ['READY', 'CANCELLED'],
  READY:      ['DELIVERING', 'COMPLETED'],
  DELIVERING: ['COMPLETED', 'CANCELLED'],
  COMPLETED:  [],
  CANCELLED:  [],
};

// --- Source-specific auto-transitions ---
// Ba'zi source lar uchun bosqichlarni skip qilish mumkin

interface SourceTransitionConfig {
  autoConfirm: boolean;       // NEW → CONFIRMED avtomatik
  autoStartCooking: boolean;  // CONFIRMED → PREPARING avtomatik
  requireDelivery: boolean;   // READY → DELIVERING bosqichi kerakmi
}

const SOURCE_CONFIGS: Record<string, SourceTransitionConfig> = {
  POS_ORDER:      { autoConfirm: true,  autoStartCooking: false, requireDelivery: false },
  WAITER_ORDER:   { autoConfirm: true,  autoStartCooking: false, requireDelivery: false },
  QR_ORDER:       { autoConfirm: false, autoStartCooking: false, requireDelivery: false },
  NONBOR_ORDER:   { autoConfirm: false, autoStartCooking: false, requireDelivery: true },
  TELEGRAM_ORDER: { autoConfirm: false, autoStartCooking: false, requireDelivery: true },
  WEBSITE_ORDER:  { autoConfirm: false, autoStartCooking: false, requireDelivery: true },
  API_ORDER:      { autoConfirm: false, autoStartCooking: false, requireDelivery: false },
};

// --- Lifecycle Engine ---

export interface TransitionResult {
  allowed: boolean;
  newStatus: OrderStatus;
  autoTransitions: OrderStatus[];  // Zanjirli avtomatik o'tishlar
  reason?: string;
}

export interface OrderContext {
  id: string;
  status: OrderStatus;
  source: string;
  type: string;          // DINE_IN, TAKEAWAY, DELIVERY
  tableId?: string | null;
  tenantId: string;
  items: Array<{ id: string; status: string }>;
  payments: Array<{ status: string; amount: number }>;
  total: number;
}

export class OrderLifecycleEngine {

  // ==========================================
  // VALIDATE TRANSITION
  // ==========================================

  static validateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    source?: string,
  ): TransitionResult {
    // Terminal state check
    if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      return {
        allowed: false,
        newStatus: currentStatus,
        autoTransitions: [],
        reason: `${currentStatus} holatidagi buyurtmani o'zgartirish mumkin emas`,
      };
    }

    // Valid transition check
    const validTargets = VALID_TRANSITIONS[currentStatus] || [];
    if (!validTargets.includes(targetStatus)) {
      return {
        allowed: false,
        newStatus: currentStatus,
        autoTransitions: [],
        reason: `${currentStatus} → ${targetStatus} o'tish mumkin emas. Ruxsat etilgan: ${validTargets.join(', ')}`,
      };
    }

    return {
      allowed: true,
      newStatus: targetStatus,
      autoTransitions: [],
    };
  }

  // ==========================================
  // GET AUTO-TRANSITIONS AFTER CREATE
  // Source ga qarab avtomatik bosqichlar
  // ==========================================

  static getAutoTransitionsOnCreate(source: string): OrderStatus[] {
    const config = SOURCE_CONFIGS[source] || SOURCE_CONFIGS.POS_ORDER;
    const transitions: OrderStatus[] = [];

    if (config.autoConfirm) {
      transitions.push('CONFIRMED');
    }
    if (config.autoConfirm && config.autoStartCooking) {
      transitions.push('PREPARING');
    }

    return transitions;
  }

  // ==========================================
  // GET NEXT VALID STATUSES
  // UI uchun — qaysi tugmalarni ko'rsatish kerak
  // ==========================================

  static getNextStatuses(currentStatus: OrderStatus, source: string, orderType: string): Array<{
    status: OrderStatus;
    label: string;
    icon: string;
    color: string;
    isPrimary: boolean;
  }> {
    const validTargets = VALID_TRANSITIONS[currentStatus] || [];
    const config = SOURCE_CONFIGS[source] || SOURCE_CONFIGS.POS_ORDER;

    return validTargets
      .filter(status => {
        // DELIVERING faqat delivery order uchun
        if (status === 'DELIVERING' && !config.requireDelivery && orderType !== 'DELIVERY') {
          return false;
        }
        return true;
      })
      .map((status, index) => ({
        status,
        label: STATUS_LABELS[status].uz,
        icon: STATUS_LABELS[status].icon,
        color: STATUS_LABELS[status].color,
        isPrimary: index === 0, // Birinchi option = primary
      }));
  }

  // ==========================================
  // GET PAYMENT STATUS
  // Order uchun to'lov holati
  // ==========================================

  static getPaymentStatus(order: OrderContext): {
    status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' | 'REFUNDED';
    paidAmount: number;
    remainingAmount: number;
    label: string;
    color: string;
  } {
    const completed = order.payments.filter(p => p.status === 'COMPLETED');
    const refunded = order.payments.filter(p => p.status === 'REFUNDED');
    const paidAmount = completed.reduce((s, p) => s + p.amount, 0);
    const refundedAmount = refunded.reduce((s, p) => s + p.amount, 0);
    const netPaid = paidAmount - refundedAmount;
    const remaining = order.total - netPaid;

    if (refundedAmount > 0 && netPaid <= 0) {
      return { status: 'REFUNDED', paidAmount: netPaid, remainingAmount: remaining, label: 'Qaytarilgan', color: '#ef4444' };
    }
    if (netPaid <= 0) {
      return { status: 'UNPAID', paidAmount: 0, remainingAmount: order.total, label: "To'lanmagan", color: '#ef4444' };
    }
    if (remaining > 1) { // 1 so'm tolerance
      return { status: 'PARTIAL', paidAmount: netPaid, remainingAmount: remaining, label: 'Qisman', color: '#f59e0b' };
    }
    if (remaining < -1) {
      return { status: 'OVERPAID', paidAmount: netPaid, remainingAmount: remaining, label: "Ortiqcha to'langan", color: '#3b82f6' };
    }
    return { status: 'PAID', paidAmount: netPaid, remainingAmount: 0, label: "To'langan", color: '#22c55e' };
  }

  // ==========================================
  // GET ORDER TIMELINE
  // Buyurtma bosqichlari vizualizatsiyasi uchun
  // ==========================================

  static getTimeline(currentStatus: OrderStatus, source: string, orderType: string): Array<{
    status: OrderStatus;
    label: string;
    icon: string;
    state: 'completed' | 'current' | 'upcoming' | 'skipped';
  }> {
    const config = SOURCE_CONFIGS[source] || SOURCE_CONFIGS.POS_ORDER;

    const pipeline = ORDER_STATUS_PIPELINE.filter(status => {
      if (status === 'DELIVERING' && !config.requireDelivery && orderType !== 'DELIVERY') return false;
      return true;
    });

    if (currentStatus === 'CANCELLED') {
      return pipeline.map(status => ({
        status,
        label: STATUS_LABELS[status].uz,
        icon: STATUS_LABELS[status].icon,
        state: 'skipped' as const,
      }));
    }

    const currentIndex = pipeline.indexOf(currentStatus);

    return pipeline.map((status, index) => ({
      status,
      label: STATUS_LABELS[status].uz,
      icon: STATUS_LABELS[status].icon,
      state: index < currentIndex ? 'completed' as const
           : index === currentIndex ? 'current' as const
           : 'upcoming' as const,
    }));
  }

  // ==========================================
  // LIFECYCLE HOOKS — Har bir status o'zgarishda nima bo'ladi
  // ==========================================

  static getHooksForTransition(
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    orderContext: OrderContext,
  ): LifecycleHook[] {
    const hooks: LifecycleHook[] = [];

    // NEW → CONFIRMED
    if (toStatus === 'CONFIRMED') {
      hooks.push({ type: 'NOTIFY', target: 'kitchen', event: 'order:confirmed' });
      // Ombor: buyurtma tasdiqlanganda ingredientlarni ayirish
      hooks.push({ type: 'INVENTORY_DEDUCT', orderId: orderContext.id });
    }

    // → PREPARING (COOKING)
    if (toStatus === 'PREPARING') {
      hooks.push({ type: 'NOTIFY', target: 'kitchen', event: 'order:cooking' });
      hooks.push({ type: 'PRINT', printType: 'kitchen_ticket' });
    }

    // → READY
    if (toStatus === 'READY') {
      hooks.push({ type: 'NOTIFY', target: 'pos', event: 'order:ready' });
      hooks.push({ type: 'NOTIFY', target: 'waiter', event: 'order:ready' });
      if (orderContext.source === 'NONBOR_ORDER') {
        hooks.push({ type: 'EXTERNAL_SYNC', target: 'nonbor', action: 'status_update' });
      }
    }

    // → DELIVERING
    if (toStatus === 'DELIVERING') {
      hooks.push({ type: 'NOTIFY', target: 'admin', event: 'order:delivering' });
    }

    // → COMPLETED
    if (toStatus === 'COMPLETED') {
      hooks.push({ type: 'NOTIFY', target: 'all', event: 'order:completed' });
      hooks.push({ type: 'PRINT', printType: 'receipt' });
      hooks.push({ type: 'LOYALTY_EARN', orderId: orderContext.id });
      if (orderContext.tableId) {
        hooks.push({ type: 'TABLE_FREE', tableId: orderContext.tableId });
      }
      if (orderContext.source === 'NONBOR_ORDER') {
        hooks.push({ type: 'EXTERNAL_SYNC', target: 'nonbor', action: 'completed' });
      }
    }

    // → CANCELLED
    if (toStatus === 'CANCELLED') {
      hooks.push({ type: 'NOTIFY', target: 'all', event: 'order:cancelled' });
      // Agar CONFIRMED/PREPARING/READY dan bekor qilinsa → ombor qaytarish
      const wasDeducted = ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'].includes(fromStatus);
      if (wasDeducted) {
        hooks.push({ type: 'INVENTORY_RESTORE', orderId: orderContext.id });
      }
      if (orderContext.tableId) {
        hooks.push({ type: 'TABLE_FREE', tableId: orderContext.tableId });
      }
      if (orderContext.source === 'NONBOR_ORDER') {
        hooks.push({ type: 'EXTERNAL_SYNC', target: 'nonbor', action: 'cancelled' });
      }
    }

    return hooks;
  }

  // ==========================================
  // CHECK ALL ITEMS READY
  // ==========================================

  static shouldAutoAdvanceToReady(items: Array<{ status: string }>): boolean {
    if (items.length === 0) return false;
    return items.every(item =>
      item.status === 'READY' || item.status === 'SERVED'
    );
  }

  // ==========================================
  // ORDER ENRICHMENT — Barcha tizimlar uchun to'liq order data
  // ==========================================

  static enrichOrder(order: OrderContext): EnrichedOrder {
    const paymentStatus = this.getPaymentStatus(order);
    const timeline = this.getTimeline(order.status, order.source, order.type);
    const nextStatuses = this.getNextStatuses(order.status, order.source, order.type);
    const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED';
    const statusInfo = STATUS_LABELS[order.status];

    return {
      ...order,
      statusInfo: {
        label: statusInfo.uz,
        labelEn: statusInfo.en,
        icon: statusInfo.icon,
        color: statusInfo.color,
        isTerminal,
      },
      paymentStatus,
      timeline,
      nextStatuses,
      sourceLabel: SOURCE_LABELS[order.source] || order.source,
    };
  }
}

// --- Types ---

export interface LifecycleHook {
  type: 'NOTIFY' | 'PRINT' | 'INVENTORY_DEDUCT' | 'INVENTORY_RESTORE' | 'TABLE_FREE' | 'EXTERNAL_SYNC' | 'LOYALTY_EARN';
  target?: string;
  event?: string;
  printType?: string;
  orderId?: string;
  tableId?: string;
  action?: string;
}

export interface EnrichedOrder extends OrderContext {
  statusInfo: {
    label: string;
    labelEn: string;
    icon: string;
    color: string;
    isTerminal: boolean;
  };
  paymentStatus: {
    status: string;
    paidAmount: number;
    remainingAmount: number;
    label: string;
    color: string;
  };
  timeline: Array<{
    status: OrderStatus;
    label: string;
    icon: string;
    state: string;
  }>;
  nextStatuses: Array<{
    status: OrderStatus;
    label: string;
    icon: string;
    color: string;
    isPrimary: boolean;
  }>;
  sourceLabel: string;
}

const SOURCE_LABELS: Record<string, string> = {
  POS_ORDER: 'POS Terminal',
  WAITER_ORDER: 'Ofitsiant',
  QR_ORDER: 'QR Menyu',
  NONBOR_ORDER: 'Nonbor',
  TELEGRAM_ORDER: 'Telegram',
  WEBSITE_ORDER: 'Veb-sayt',
  API_ORDER: 'Tashqi API',
};
