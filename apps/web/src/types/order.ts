// Buyurtma turi
export type OrderType = 'dine-in' | 'delivery' | 'takeaway';

// Buyurtma holati
export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'cancelled';

// To'lov usuli
export type PaymentMethod = 'cash' | 'card' | 'payme' | 'click' | 'uzum';

// To'lov holati
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Buyurtma elementi holati
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

// Buyurtma elementi
export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: OrderItemStatus;
}

// Buyurtma interfeysi
export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;

  // Mijoz ma'lumotlari
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  // Stol (dine-in uchun)
  tableId?: string;
  tableNumber?: number;

  // Yetkazib berish (delivery uchun)
  deliveryAddress?: string;
  deliveryNotes?: string;

  // Buyurtma elementlari
  items: OrderItem[];

  // Narxlar
  subtotal: number;
  deliveryFee: number;
  discount: number;
  discountPercent?: number;
  tax: number;
  total: number;

  // To'lov
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: string;

  // Izohlar
  notes?: string;

  // Xodim
  userId: string;
  userName?: string;

  // Vaqtlar
  createdAt: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  estimatedTime?: number; // minutlarda

  // Boshqa
  cancelReason?: string;
}

// Filtrlash parametrlari
export interface OrderFilters {
  search: string;
  status: OrderStatus | 'all';
  type: OrderType | 'all';
  paymentStatus: PaymentStatus | 'all';
  dateRange: {
    start: string;
    end: string;
  } | null;
}

// Statistika
export interface OrderStats {
  totalOrders: number;
  newOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  avgWaitTime: number;
}

// Status ma'lumotlari
export const ORDER_STATUS_INFO: Record<OrderStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  new: {
    label: 'Yangi',
    color: '#3B82F6',
    bgColor: 'bg-blue-500/20',
    icon: '🆕',
  },
  confirmed: {
    label: 'Tasdiqlangan',
    color: '#8B5CF6',
    bgColor: 'bg-purple-500/20',
    icon: '✅',
  },
  preparing: {
    label: 'Tayyorlanmoqda',
    color: '#F59E0B',
    bgColor: 'bg-amber-500/20',
    icon: '👨‍🍳',
  },
  ready: {
    label: 'Tayyor',
    color: '#10B981',
    bgColor: 'bg-green-500/20',
    icon: '🍽️',
  },
  delivering: {
    label: 'Yetkazilmoqda',
    color: '#06B6D4',
    bgColor: 'bg-cyan-500/20',
    icon: '🚚',
  },
  completed: {
    label: 'Yakunlangan',
    color: '#22C55E',
    bgColor: 'bg-green-500/20',
    icon: '✔️',
  },
  cancelled: {
    label: 'Bekor qilingan',
    color: '#EF4444',
    bgColor: 'bg-red-500/20',
    icon: '❌',
  },
};

// Buyurtma turi ma'lumotlari
export const ORDER_TYPE_INFO: Record<OrderType, {
  label: string;
  icon: string;
  color: string;
}> = {
  'dine-in': {
    label: 'Stolda',
    icon: '🪑',
    color: '#3B82F6',
  },
  delivery: {
    label: 'Yetkazib berish',
    icon: '🚚',
    color: '#10B981',
  },
  takeaway: {
    label: 'Olib ketish',
    icon: '🥡',
    color: '#F59E0B',
  },
};

// To'lov usuli ma'lumotlari
export const PAYMENT_METHOD_INFO: Record<PaymentMethod, {
  label: string;
  icon: string;
}> = {
  cash: { label: 'Naqd', icon: '💵' },
  card: { label: 'Karta', icon: '💳' },
  payme: { label: 'Payme', icon: '📱' },
  click: { label: 'Click', icon: '📱' },
  uzum: { label: 'Uzum', icon: '📱' },
};
