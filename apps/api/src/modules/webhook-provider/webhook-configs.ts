// ==========================================
// PRE-BUILT WEBHOOK PLATFORM CONFIGS
// Har bir platforma uchun maydon moslama (field mapping)
// ==========================================

export interface FieldMapping {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: string;
  items: string;
  itemName: string;
  itemQuantity: string;
  itemPrice: string;
  itemTotal?: string;
  itemExternalId?: string;
  notes?: string;
}

export interface StatusMapping {
  [externalStatus: string]: string;
}

export interface PlatformConfig {
  fieldMapping: FieldMapping;
  statusMapping: StatusMapping;
}

// Dot-notation path resolver
export function getByPath(obj: any, path: string): any {
  if (!path || obj == null) return undefined;
  return path.split('.').reduce((curr, key) => {
    if (curr == null) return undefined;
    return curr[key];
  }, obj);
}

// Standart OrderStatus larga moslashtirish
const COMMON_STATUS_MAP: StatusMapping = {
  new: 'NEW',
  NEW: 'NEW',
  confirmed: 'CONFIRMED',
  CONFIRMED: 'CONFIRMED',
  preparing: 'PREPARING',
  PREPARING: 'PREPARING',
  ready: 'READY',
  READY: 'READY',
  delivering: 'DELIVERING',
  DELIVERING: 'DELIVERING',
  delivered: 'COMPLETED',
  DELIVERED: 'COMPLETED',
  completed: 'COMPLETED',
  COMPLETED: 'COMPLETED',
  cancelled: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  canceled: 'CANCELLED',
  rejected: 'CANCELLED',
  REJECTED: 'CANCELLED',
};

// ==========================================
// YANDEX EDA (Yandex Eats)
// ==========================================
export const YANDEX_EATS_CONFIG: PlatformConfig = {
  fieldMapping: {
    orderId: 'order_nr',
    customerName: 'user_info.name',
    customerPhone: 'user_info.phone',
    deliveryAddress: 'delivery_info.address.full',
    totalAmount: 'pricing.total',
    items: 'cart.items',
    itemName: 'name',
    itemQuantity: 'quantity',
    itemPrice: 'price.value',
    itemTotal: 'total_price',
    itemExternalId: 'id',
    notes: 'user_comment',
  },
  statusMapping: {
    ...COMMON_STATUS_MAP,
    created: 'NEW',
    waiting_for_confirmation: 'NEW',
    cooking: 'PREPARING',
    courier_on_the_way: 'DELIVERING',
    delivered: 'COMPLETED',
  },
};

// ==========================================
// DELIVERY CLUB
// ==========================================
export const DELIVERY_CLUB_CONFIG: PlatformConfig = {
  fieldMapping: {
    orderId: 'order.uuid',
    customerName: 'order.client_name',
    customerPhone: 'order.client_phone',
    deliveryAddress: 'order.delivery_address',
    totalAmount: 'order.total_amount',
    items: 'order.items',
    itemName: 'name',
    itemQuantity: 'count',
    itemPrice: 'price',
    itemTotal: 'total_price',
    itemExternalId: 'external_id',
    notes: 'order.comment',
  },
  statusMapping: {
    ...COMMON_STATUS_MAP,
    'new': 'NEW',
    'in_progress': 'PREPARING',
    'on_way': 'DELIVERING',
    'delivered': 'COMPLETED',
    'canceled': 'CANCELLED',
  },
};

// ==========================================
// EXPRESS24 (O'zbekiston yetkazib berish)
// ==========================================
export const EXPRESS24_CONFIG: PlatformConfig = {
  fieldMapping: {
    orderId: 'id',
    customerName: 'client.name',
    customerPhone: 'client.phone',
    deliveryAddress: 'address',
    totalAmount: 'total',
    items: 'products',
    itemName: 'name',
    itemQuantity: 'quantity',
    itemPrice: 'price',
    itemTotal: 'amount',
    itemExternalId: 'product_id',
    notes: 'comment',
  },
  statusMapping: {
    ...COMMON_STATUS_MAP,
    pending: 'NEW',
    accepted: 'CONFIRMED',
    in_kitchen: 'PREPARING',
    ready_for_pickup: 'READY',
    courier_assigned: 'DELIVERING',
    delivered: 'COMPLETED',
    cancelled: 'CANCELLED',
  },
};

// ==========================================
// OLX FOOD (O'zbekiston)
// ==========================================
export const OLX_FOOD_CONFIG: PlatformConfig = {
  fieldMapping: {
    orderId: 'order_id',
    customerName: 'buyer_name',
    customerPhone: 'buyer_phone',
    deliveryAddress: 'delivery_address',
    totalAmount: 'total_price',
    items: 'order_items',
    itemName: 'product_name',
    itemQuantity: 'quantity',
    itemPrice: 'unit_price',
    itemTotal: 'total_price',
    itemExternalId: 'product_id',
    notes: 'notes',
  },
  statusMapping: {
    ...COMMON_STATUS_MAP,
    new_order: 'NEW',
    accepted: 'CONFIRMED',
    being_prepared: 'PREPARING',
    ready: 'READY',
    on_delivery: 'DELIVERING',
    completed: 'COMPLETED',
    cancelled: 'CANCELLED',
  },
};

// Platforma nomidan configni olish
export function getPlatformConfig(providerName: string): PlatformConfig | null {
  const configs: Record<string, PlatformConfig> = {
    YANDEX_EATS: YANDEX_EATS_CONFIG,
    DELIVERY_CLUB: DELIVERY_CLUB_CONFIG,
    EXPRESS24: EXPRESS24_CONFIG,
    OLX_FOOD: OLX_FOOD_CONFIG,
  };
  return configs[providerName] || null;
}

// Default CUSTOM config (generic)
export const CUSTOM_CONFIG: PlatformConfig = {
  fieldMapping: {
    orderId: 'id',
    customerName: 'customer_name',
    customerPhone: 'customer_phone',
    deliveryAddress: 'delivery_address',
    totalAmount: 'total_amount',
    items: 'items',
    itemName: 'name',
    itemQuantity: 'quantity',
    itemPrice: 'price',
    itemTotal: 'total',
    itemExternalId: 'id',
    notes: 'notes',
  },
  statusMapping: COMMON_STATUS_MAP,
};
