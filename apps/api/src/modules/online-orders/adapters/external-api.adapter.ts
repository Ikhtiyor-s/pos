/**
 * Tashqi API buyurtma formatini OnlineOrder formatiga o'zgartiradi.
 * Umumiy adapter — har xil API formatlarini qo'llab-quvvatlaydi.
 */
export function transformExternalApiOrder(externalData: any): {
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
    notes?: string;
  }>;
} {
  // External ID — turli formatlarni qo'llab-quvvatlash
  const externalId = externalData.external_id
    || externalData.externalId
    || externalData.order_id
    || externalData.orderId
    || externalData.id
    || `ext-${Date.now()}`;

  // Mijoz ismi
  const customerName = externalData.customer_name
    || externalData.customerName
    || externalData.customer?.name
    || externalData.client_name
    || '';

  // Mijoz telefoni
  const customerPhone = externalData.customer_phone
    || externalData.customerPhone
    || externalData.customer?.phone
    || externalData.phone
    || '';

  // Yetkazib berish manzili
  const deliveryAddress = externalData.delivery_address
    || externalData.deliveryAddress
    || externalData.address
    || externalData.delivery?.address
    || '';

  // Buyurtma elementlari
  const rawItems = externalData.items
    || externalData.products
    || externalData.order_items
    || externalData.orderItems
    || [];

  const items = rawItems.map((item: any) => {
    const quantity = Number(item.quantity || item.count || item.qty || 1);
    const price = Number(item.price || item.unit_price || item.unitPrice || 0);
    const total = Number(item.total || item.subtotal || price * quantity);

    return {
      externalProductId: String(item.product_id || item.productId || item.id || item.sku || ''),
      name: item.name || item.product_name || item.title || item.description || 'Noma\'lum',
      quantity,
      price,
      total,
      notes: item.notes || item.comment || item.special_instructions || undefined,
    };
  });

  // Umumiy summa
  const totalAmount = Number(
    externalData.total_amount
    || externalData.totalAmount
    || externalData.total
    || externalData.grand_total
    || items.reduce((sum: number, item: any) => sum + item.total, 0)
    || 0
  );

  return {
    externalId: String(externalId),
    customerName,
    customerPhone,
    deliveryAddress,
    totalAmount,
    rawPayload: externalData,
    items,
  };
}
