import { OrderType, PaymentMethod } from './order';

// Yangi buyurtma uchun tiplar
export interface NewOrderCustomer {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  bonusPoints?: number;
}

export interface NewOrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  modifiers?: NewOrderModifier[];
}

export interface NewOrderModifier {
  id: string;
  name: string;
  price: number;
}

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

export interface NewOrderData {
  // Mijoz
  customer: NewOrderCustomer | null;

  // Buyurtma turi
  type: OrderType;
  tableId?: string;
  tableNumber?: number;
  deliveryAddress?: string;
  deliveryNotes?: string;

  // Mahsulotlar
  items: NewOrderItem[];

  // To'lov
  paymentMethod: PaymentMethod | null;
  splitPayments: SplitPayment[];
  isSplitPayment: boolean;

  // Chegirma
  discountPercent: number;
  discountAmount: number;

  // Izohlar
  notes?: string;
}

export type NewOrderStep = 'customer' | 'type' | 'menu' | 'cart' | 'payment';

export const NEW_ORDER_STEPS: { key: NewOrderStep; label: string; icon: string }[] = [
  { key: 'customer', label: 'Mijoz', icon: '👤' },
  { key: 'type', label: 'Turi', icon: '🍽️' },
  { key: 'menu', label: 'Menyu', icon: '📋' },
  { key: 'cart', label: 'Savatcha', icon: '🛒' },
  { key: 'payment', label: 'To\'lov', icon: '💳' },
];

// Stol interfeysi
export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
}

// Mock stollar
export const mockTables: Table[] = [
  { id: '1', number: 1, capacity: 4, status: 'free' },
  { id: '2', number: 2, capacity: 2, status: 'occupied' },
  { id: '3', number: 3, capacity: 6, status: 'free' },
  { id: '4', number: 4, capacity: 4, status: 'reserved' },
  { id: '5', number: 5, capacity: 8, status: 'free' },
  { id: '6', number: 6, capacity: 4, status: 'cleaning' },
  { id: '7', number: 7, capacity: 2, status: 'free' },
  { id: '8', number: 8, capacity: 4, status: 'occupied' },
  { id: '9', number: 9, capacity: 6, status: 'free' },
  { id: '10', number: 10, capacity: 4, status: 'free' },
];

// Mock mijozlar
export interface MockCustomer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  bonusPoints: number;
  ordersCount: number;
}

export const mockCustomers: MockCustomer[] = [
  { id: '1', name: 'Ali Valiyev', phone: '+998901234567', address: 'Toshkent, Chilonzor', bonusPoints: 5000, ordersCount: 12 },
  { id: '2', name: 'Sardor Karimov', phone: '+998909876543', address: 'Toshkent, Yunusobod', bonusPoints: 3200, ordersCount: 8 },
  { id: '3', name: 'Madina Rahimova', phone: '+998905551122', address: 'Toshkent, Sergeli', bonusPoints: 1500, ordersCount: 5 },
  { id: '4', name: 'Jamshid Toshmatov', phone: '+998901112233', bonusPoints: 800, ordersCount: 3 },
  { id: '5', name: 'Nodira Azimova', phone: '+998907778899', address: 'Toshkent, Mirzo Ulug\'bek', bonusPoints: 12000, ordersCount: 25 },
];
