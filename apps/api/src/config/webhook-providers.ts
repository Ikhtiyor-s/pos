// ==========================================
// WEBHOOK PROVIDERS — Delivery platformlari konfiguratsiyasi
//
// Qo'llab-quvvatlanadigan platformalar:
//   - Yandex Eats
//   - Express 24 (O'zbekiston)
//   - Delivery Club
// ==========================================

export type DeliveryPlatform = 'yandex-eats' | 'express24' | 'delivery-club';

export interface ProviderFieldMap {
  externalOrderId: string;
  status?:         string;
  items?:          string;
  itemName?:       string;
  itemQty?:        string;
  itemPrice?:      string;
  customerPhone?:  string;
  customerName?:   string;
  deliveryAddress?: string;
  totalAmount?:    string;
  paymentMethod?:  string;
  notes?:          string;
}

export interface WebhookProviderConfig {
  name:               DeliveryPlatform;
  displayName:        string;
  signatureHeader?:   string;
  signatureAlgorithm?: 'hmac-sha256' | 'hmac-sha1';
  newOrderEventField:  string;
  newOrderEventValues: string[];
  statusEventValues?:  string[];
  statusEventField?:   string;
  fieldMap:            ProviderFieldMap;
  statusMap?:          Record<string, string>;
}

// ==========================================
// YANDEX EATS
// ==========================================

const yandexEats: WebhookProviderConfig = {
  name:        'yandex-eats',
  displayName: 'Yandex Eats',
  signatureHeader:    'x-ya-signature',
  signatureAlgorithm: 'hmac-sha256',

  newOrderEventField:  'eventType',
  newOrderEventValues: ['ORDER_CREATED', 'order.created', 'NEW'],
  statusEventValues:   ['ORDER_STATUS_CHANGED', 'order.status_changed'],

  fieldMap: {
    externalOrderId: 'order.id',
    status:          'order.status',
    items:           'order.cart.items',
    itemName:        'name',
    itemQty:         'quantity',
    itemPrice:       'price',
    customerPhone:   'order.contact.phone',
    customerName:    'order.contact.name',
    deliveryAddress: 'order.delivery_address.full_address',
    totalAmount:     'order.price',
    paymentMethod:   'order.payment_type',
    notes:           'order.comment',
  },

  statusMap: {
    CREATED:           'NEW',
    IN_PROGRESS:       'CONFIRMED',
    COOKING:           'PREPARING',
    READY_FOR_PICKUP:  'READY',
    DELIVERING:        'DELIVERING',
    DELIVERED:         'COMPLETED',
    CANCELLED:         'CANCELLED',
    REJECTED:          'CANCELLED',
  },
};

// ==========================================
// EXPRESS 24 (O'ZBEKISTON)
// ==========================================

const express24: WebhookProviderConfig = {
  name:        'express24',
  displayName: 'Express 24',
  signatureHeader:    'x-express-signature',
  signatureAlgorithm: 'hmac-sha256',

  newOrderEventField:  'type',
  newOrderEventValues: ['order.new', 'ORDER_NEW', 'new_order'],
  statusEventValues:   ['order.status', 'ORDER_STATUS', 'status_changed'],

  fieldMap: {
    externalOrderId: 'data.order_id',
    status:          'data.status',
    items:           'data.items',
    itemName:        'product_name',
    itemQty:         'quantity',
    itemPrice:       'price',
    customerPhone:   'data.customer.phone',
    customerName:    'data.customer.name',
    deliveryAddress: 'data.address',
    totalAmount:     'data.total_amount',
    paymentMethod:   'data.payment_type',
    notes:           'data.comment',
  },

  statusMap: {
    new:        'NEW',
    accepted:   'CONFIRMED',
    cooking:    'PREPARING',
    ready:      'READY',
    delivering: 'DELIVERING',
    delivered:  'COMPLETED',
    cancelled:  'CANCELLED',
    rejected:   'CANCELLED',
  },
};

// ==========================================
// DELIVERY CLUB
// ==========================================

const deliveryClub: WebhookProviderConfig = {
  name:        'delivery-club',
  displayName: 'Delivery Club',
  signatureHeader:    'x-dc-signature',
  signatureAlgorithm: 'hmac-sha256',

  newOrderEventField:  'type',
  newOrderEventValues: ['order_created', 'ORDER_CREATED'],
  statusEventValues:   ['order_status_changed', 'ORDER_STATUS_CHANGED'],

  fieldMap: {
    externalOrderId: 'order.number',
    status:          'order.state',
    items:           'order.products',
    itemName:        'name',
    itemQty:         'amount',
    itemPrice:       'price',
    customerPhone:   'order.contact_phone',
    customerName:    'order.contact_name',
    deliveryAddress: 'order.delivery_point.full_address',
    totalAmount:     'order.sum',
    paymentMethod:   'order.payment_method',
    notes:           'order.comment',
  },

  statusMap: {
    new:                'NEW',
    accepted:           'CONFIRMED',
    cooking:            'PREPARING',
    ready_for_courier:  'READY',
    delivering:         'DELIVERING',
    delivered:          'COMPLETED',
    cancelled:          'CANCELLED',
    rejected:           'CANCELLED',
    returned:           'CANCELLED',
  },
};

// ==========================================
// REGISTRY
// ==========================================

export const WEBHOOK_PROVIDERS: Record<DeliveryPlatform, WebhookProviderConfig> = {
  'yandex-eats':    yandexEats,
  'express24':      express24,
  'delivery-club':  deliveryClub,
};

export const SUPPORTED_PROVIDERS = Object.keys(WEBHOOK_PROVIDERS) as DeliveryPlatform[];

export function getProvider(service: string): WebhookProviderConfig | null {
  return WEBHOOK_PROVIDERS[service as DeliveryPlatform] ?? null;
}

export function isSupportedProvider(service: string): service is DeliveryPlatform {
  return service in WEBHOOK_PROVIDERS;
}
