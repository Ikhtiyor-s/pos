// ============ PLAN ============

export interface Plan {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  basePrice: number;
  pricePerWarehouse: number;
  pricePerKitchen: number;
  pricePerWaiter: number;
  maxUsers: number;
  maxOrders: number;
  maxWarehouses: number;
  maxKitchens: number;
  maxWaiters: number;
  hasIntegrations: boolean;
  hasReports: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { subscriptions: number };
}

export interface CreatePlanDto {
  name: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  basePrice: number;
  pricePerWarehouse?: number;
  pricePerKitchen?: number;
  pricePerWaiter?: number;
  maxUsers?: number;
  maxOrders?: number;
  maxWarehouses?: number;
  maxKitchens?: number;
  maxWaiters?: number;
  hasIntegrations?: boolean;
  hasReports?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

// ============ SUBSCRIPTION ============

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';

export interface Subscription {
  id: string;
  planId: string;
  plan: Plan;
  status: SubscriptionStatus;
  warehouses: number;
  kitchens: number;
  waiters: number;
  calculatedPrice: number;
  overridePrice: number | null;
  totalPrice: number;
  startDate: string;
  endDate: string;
  ordersThisMonth: number;
  monthResetDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionDto {
  planId: string;
  warehouses?: number;
  kitchens?: number;
  waiters?: number;
  startDate?: string;
  endDate?: string;
  overridePrice?: number;
  notes?: string;
}

export interface UpdateResourcesDto {
  warehouses?: number;
  kitchens?: number;
  waiters?: number;
}

export interface OverridePriceDto {
  overridePrice: number | null;
  notes?: string;
}

// ============ INVOICE ============

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface BillingInvoice {
  id: string;
  subscriptionId: string;
  subscription: Subscription;
  invoiceNumber: string;
  periodYear: number;
  periodMonth: number;
  status: InvoiceStatus;
  basePrice: number;
  warehouseCount: number;
  warehousePrice: number;
  warehouseTotal: number;
  kitchenCount: number;
  kitchenPrice: number;
  kitchenTotal: number;
  waiterCount: number;
  waiterPrice: number;
  waiterTotal: number;
  calculatedAmount: number;
  overrideAmount: number | null;
  totalAmount: number;
  paidAmount: number | null;
  paidAt: string | null;
  paymentMethod: string | null;
  dueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceBreakdown {
  basePrice: number;
  warehouses: { count: number; pricePerUnit: number; total: number };
  kitchens: { count: number; pricePerUnit: number; total: number };
  waiters: { count: number; pricePerUnit: number; total: number };
  calculatedAmount: number;
  overrideAmount: number | null;
  totalAmount: number;
}

export interface GenerateInvoiceDto {
  year: number;
  month: number;
  overrideAmount?: number;
  notes?: string;
}

export interface PayInvoiceDto {
  paidAmount: number;
  paymentMethod: string;
  notes?: string;
}

// ============ USAGE ============

export interface UsageData {
  subscription: {
    id: string;
    plan: string;
    planId: string;
    status: SubscriptionStatus;
    totalPrice: number;
    calculatedPrice: number;
    overridePrice: number | null;
    warehouses: number;
    kitchens: number;
    waiters: number;
    startDate: string;
    endDate: string;
  } | null;
  usage: {
    users: { current: number; limit: number };
    orders: { current: number; limit: number };
    warehouses: { current: number; limit: number };
    kitchens: { current: number; limit: number };
    waiters: { current: number; limit: number };
  };
  features: {
    hasIntegrations: boolean;
    hasReports: boolean;
  };
}

export interface InvoiceSummary {
  currentMonthlyPrice: number;
  pending: { count: number; totalAmount: number };
  paid: { count: number; totalPaid: number };
  overdue: { count: number; totalAmount: number };
}

// ============ INTEGRATION ============

export interface Integration {
  id: string;
  name: string;
  key: string;
  category: string;
  isActive: boolean;
  config: Record<string, string>;
  description?: string;
}
