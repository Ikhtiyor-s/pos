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
  tenantId?: string | null;
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
export type OrderSource = 'POS_ORDER' | 'WAITER_ORDER' | 'QR_ORDER' | 'NONBOR_ORDER' | 'TELEGRAM_ORDER' | 'WEBSITE_ORDER' | 'API_ORDER';
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
  source: OrderSource;
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

// ==========================================
// FINANCE MODULE TYPES
// ==========================================

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type IncomeSource = 'ORDER' | 'REFUND' | 'BONUS' | 'OTHER';
export type ReportPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface ExpenseCategory {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  categoryId: string;
  category?: ExpenseCategory;
  status: ExpenseStatus;
  receiptUrl?: string;
  paidAt?: string;
  userId: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  source: IncomeSource;
  amount: number;
  orderId?: string;
  notes?: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  userId: string;
  user?: User;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  totalCash: number;
  totalCard: number;
  totalOnline: number;
  totalOrders: number;
  totalRefunds: number;
  difference?: number;
  notes?: string;
}

export interface FinancialReport {
  id: string;
  period: ReportPeriod;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  orderCount: number;
  averageCheck: number;
  data?: any;
  createdAt: string;
}

// ==========================================
// ONLINE ORDERS MODULE TYPES
// ==========================================

export type OnlineOrderSource = 'NONBOR' | 'TELEGRAM' | 'WEBSITE' | 'EXTERNAL_API';
export type OnlineOrderStatus = 'RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'MAPPED' | 'COMPLETED' | 'FAILED';

export interface OnlineOrder {
  id: string;
  source: OnlineOrderSource;
  externalId: string;
  status: OnlineOrderStatus;
  rawPayload: any;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  totalAmount: number;
  localOrderId?: string;
  localOrder?: Order;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// WAREHOUSE MODULE TYPES (EXTENDED)
// ==========================================

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  status: PurchaseOrderStatus;
  totalAmount: number;
  expectedAt?: string;
  receivedAt?: string;
  notes?: string;
  userId: string;
  user?: User;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  total: number;
}

export interface StockAlert {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  severity: AlertSeverity;
  currentQty: number;
  minQty: number;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export interface WasteLog {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantity: number;
  reason: string;
  costAmount: number;
  userId: string;
  createdAt: string;
}

// ==========================================
// NOTIFICATION MODULE TYPES
// ==========================================

export type NotificationType =
  | 'STOCK_LOW'
  | 'STOCK_EXPIRED'
  | 'ORDER_NEW'
  | 'ORDER_ONLINE'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'SHIFT_OPENED'
  | 'SHIFT_CLOSED'
  | 'EXPENSE_PENDING'
  | 'PURCHASE_ORDER'
  | 'SYSTEM';

export type NotificationChannel = 'IN_APP' | 'TELEGRAM' | 'SMS' | 'PUSH';

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  userId?: string;
  createdAt: string;
}

export interface NotificationSetting {
  id: string;
  stockLowEnabled: boolean;
  stockLowChannels: string[];
  orderNewEnabled: boolean;
  orderNewChannels: string[];
  onlineOrderEnabled: boolean;
  onlineOrderChannels: string[];
  expenseEnabled: boolean;
  expenseChannels: string[];
}

// ==========================================
// AI ANALYTICS MODULE TYPES
// ==========================================

export type SnapshotType =
  | 'DAILY_SALES'
  | 'WEEKLY_SUMMARY'
  | 'PRODUCT_PERFORMANCE'
  | 'CUSTOMER_BEHAVIOR'
  | 'INVENTORY_TURNOVER';

export type ForecastType = 'DEMAND' | 'REVENUE' | 'INVENTORY';

export interface AnalyticsSnapshot {
  id: string;
  type: SnapshotType;
  periodDate: string;
  data: any;
  insights?: string;
  createdAt: string;
}

export interface Forecast {
  id: string;
  type: ForecastType;
  targetDate: string;
  predictedValue: number;
  confidence: number;
  actualValue?: number;
  metadata?: any;
  createdAt: string;
}

export interface Anomaly {
  type: string;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface MenuRecommendation {
  productId: string;
  product: Product;
  category: 'STAR' | 'OPPORTUNITY' | 'WORKHORSE' | 'PROBLEM';
  action: string;
  reason: string;
}

export interface InventoryRecommendation {
  inventoryItemId: string;
  item: InventoryItem;
  suggestedReorderQty: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  daysUntilStockout: number;
  reason: string;
}
