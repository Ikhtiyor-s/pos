import type { NonborOrder } from '../../../services/nonbor.service.js';

/**
 * Nonbor buyurtma formatini OnlineOrder formatiga o'zgartiradi
 */
export function transformNonborOrder(nonborOrder: any): {
  externalId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  totalAmount: number;
  rawPayload: any;
  items: Array<{
    externalProductId: string;
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
} {
  const order = nonborOrder as NonborOrder;

  // Mijoz ismi
  const customerName = [order.user?.first_name, order.user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Noma\'lum';

  // Mijoz telefoni
  const customerPhone = order.user?.phone || '';

  // Yetkazib berish manzili
  const deliveryAddress = (typeof order.delivery === 'object' && order.delivery !== null ? order.delivery.address : '') || '';

  // Buyurtma elementlarini map qilish
  const items = (order.items || []).map((item) => ({
    externalProductId: String(item.product?.id || item.id),
    name: item.product?.name || `Mahsulot #${item.id}`,
    quantity: item.quantity || 1,
    price: Number(item.product?.price || 0),
    total: Number(item.product?.price || 0) * (item.quantity || 1),
  }));

  return {
    externalId: String(order.id),
    customerName,
    customerPhone,
    deliveryAddress,
    totalAmount: Number(order.total_price || order.price || 0),
    rawPayload: nonborOrder,
    items,
  };
}

/**
 * Nonbor buyurtma statusini OnlineOrder statusiga map qiladi
 */
export function mapNonborStatusToOnlineStatus(
  nonborState: string
): 'RECEIVED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' {
  switch (nonborState) {
    case 'CHECKING':
      return 'RECEIVED';
    case 'ACCEPTED':
    case 'PREPARING':
    case 'READY':
    case 'DELIVERING':
      return 'ACCEPTED';
    case 'DELIVERED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'REJECTED';
    default:
      return 'RECEIVED';
  }
}
