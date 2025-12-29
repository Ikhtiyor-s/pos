// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// User types
export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'CASHIER' | 'CHEF' | 'WAREHOUSE' | 'ACCOUNTANT';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// Category types
export interface Category {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  slug: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  products?: Product[];
}

// Product types
export interface Product {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  price: number;
  costPrice?: number;
  image?: string;
  categoryId: string;
  category?: Category;
  isActive: boolean;
  cookingTime?: number;
  calories?: number;
  sortOrder: number;
  variants?: ProductVariant[];
  modifiers?: ProductModifier[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  price: number;
  isActive: boolean;
}

export interface ProductModifier {
  id: string;
  productId: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  price: number;
  isActive: boolean;
}

// Table types
export type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  qrCode: string;
  status: TableStatus;
  positionX?: number;
  positionY?: number;
  isActive: boolean;
  orders?: Order[];
}

// Order types
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';
export type ItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  table?: Table;
  customerId?: string;
  customer?: Customer;
  userId: string;
  user?: User;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountPercent?: number;
  tax: number;
  total: number;
  notes?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
}

// Payment types
export type PaymentMethod = 'CASH' | 'CARD' | 'PAYME' | 'CLICK' | 'UZUM' | 'HUMO' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  reference?: string;
  createdAt: string;
}

// Customer types
export interface Customer {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  birthDate?: string;
  bonusPoints: number;
  isActive: boolean;
  createdAt: string;
}

// Inventory types
export type TransactionType = 'IN' | 'OUT' | 'ADJUST' | 'WASTE';

export interface InventoryItem {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  supplierId?: string;
  supplier?: Supplier;
  expiryDate?: string;
  isActive: boolean;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  item?: InventoryItem;
  type: TransactionType;
  quantity: number;
  notes?: string;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}

// Settings
export interface Settings {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxRate: number;
  currency: string;
  logo?: string;
  timezone: string;
  orderPrefix: string;
  bonusPercent: number;
}

// Dashboard types
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  averageCheck: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: Order[];
  lowStockItems: InventoryItem[];
}
