/**
 * Telegram bot buyurtma formatini OnlineOrder formatiga o'zgartiradi
 */
export function transformTelegramOrder(telegramData: any): {
  externalId: string;
  customerName: string;
  customerPhone: string;
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
  // Telegram bot dan keladigan ma'lumotlar formati
  const chatId = telegramData.chat_id || telegramData.chatId || '';
  const messageId = telegramData.message_id || telegramData.messageId || '';
  const externalId = telegramData.order_id || telegramData.orderId || `tg-${chatId}-${messageId}-${Date.now()}`;

  // Mijoz ma'lumotlari
  const customerName = telegramData.customer_name
    || telegramData.customerName
    || telegramData.from?.first_name
    || telegramData.from?.username
    || 'Telegram foydalanuvchi';

  const customerPhone = telegramData.customer_phone
    || telegramData.customerPhone
    || telegramData.phone
    || '';

  // Buyurtma elementlari
  const rawItems = telegramData.items || telegramData.products || [];
  const items = rawItems.map((item: any) => ({
    externalProductId: String(item.product_id || item.productId || item.id || ''),
    name: item.name || item.product_name || item.title || 'Noma\'lum mahsulot',
    quantity: Number(item.quantity || item.count || 1),
    price: Number(item.price || 0),
    total: Number(item.total || (item.price || 0) * (item.quantity || item.count || 1)),
  }));

  // Umumiy summa
  const totalAmount = telegramData.total_amount
    || telegramData.totalAmount
    || telegramData.total
    || items.reduce((sum: number, item: any) => sum + item.total, 0)
    || 0;

  return {
    externalId: String(externalId),
    customerName,
    customerPhone,
    totalAmount: Number(totalAmount),
    rawPayload: telegramData,
    items,
  };
}
