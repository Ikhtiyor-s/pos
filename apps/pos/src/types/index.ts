// From App.tsx lines 82-104:
export type OrderType = 'dine-in' | 'takeaway';
export type PaymentMethod = 'cash' | 'card' | 'payme' | 'click' | 'uzum';
export type Step = 'tables' | 'products' | 'table-detail' | 'payment' | 'receipt' | 'reports';
export type AdminTab = 'dashboard' | 'products' | 'orders' | 'tables' | 'staff' | 'reports' | 'inventory' | 'settings';

export interface TableData {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
}

export interface ActiveOrderData {
  orderId: string;
  tableId: string;
  tableNumber: number;
  items: number;
  total: number;
  time: string;
  status: string;
  awaitingPayment: boolean;
  orderItems: OrderItemData[];
}

export interface OrderItemData {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

// NEW - Replace all `any` types:
export interface DashboardData {
  revenue: { total: number; averageCheck: number } | number;
  orders: { total: number; completed: number } | null;
  customers?: number;
  employees?: number;
  orderCount?: number;
  completedOrders?: number;
  avgCheck?: number;
  topProducts?: TopProduct[];
  recentOrders?: RecentOrder[];
  paymentMethods?: Record<string, number | { amount: number; count: number }>;
  ordersByStatus?: Record<string, number>;
  dailyRevenue?: DailyRevenue[];
  totalRevenue?: number;
  totalSales?: number;
  totalExpenses?: number;
  averageCheck?: number;
  averageOrder?: number;
  posSales?: number;
  cashSales?: number;
  nonborSales?: number;
  qrSales?: number;
  waiterSales?: number;
}

export interface TopProduct {
  name: string;
  count?: number;
  quantity?: number;
  revenue?: number;
  total?: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  type?: string;
  source?: string;
  table?: { number: number; name: string };
  user?: { firstName: string; lastName: string };
  items?: Array<{ id: string; quantity: number; price: number }>;
  createdAt: string;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders?: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  nameRu?: string;
  price: number;
  costPrice?: number;
  categoryId: string;
  category?: { id: string; name: string };
  image?: string;
  barcode?: string;
  sku?: string;
  stockQuantity?: number;
  lowStockAlert?: number;
  cookingTime?: number;
  calories?: number;
  weight?: number;
  description?: string;
  isActive: boolean;
  isFeatured?: boolean;
  isAvailableOnline?: boolean;
  sortOrder?: number;
  tags?: string[];
  createdAt?: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  createdAt?: string;
}

export interface BarcodeResult {
  name?: string;
  product_name?: string;
  brand?: string;
  image?: string;
  description?: string;
  weight?: string;
  country?: string;
  error?: boolean;
  message?: string;
  suggestedData?: {
    name: string;
    brand: string;
    weight: string;
    category: string;
    image: string;
    description: string;
    country: string;
    mxikCode: string;
    mxikName: string;
  };
  barcodeInfo?: {
    found: boolean;
    name?: string;
    brand?: string;
    imageUrl?: string;
  };
  mxikResult?: {
    found: boolean;
    code: string;
    name: string;
  };
  existingProduct?: AdminProduct | null;
}

export interface ProductFormData {
  name: string;
  price: string;
  costPrice: string;
  categoryId: string;
  description: string;
  barcode: string;
  mxikCode: string;
  stockQuantity: string;
  weight: string;
  _scanMode?: 'usb' | 'camera' | 'manual';
}

export interface StaffFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  pin: string;
  _id?: string;
}

export interface TableFormData {
  number: string;
  name: string;
  capacity: string;
  floor: string;
  status: string;
}

export interface SettingsFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  cookTime: number;
  image: string;
}
