// ==========================================
// PRINT FORMATTERS
// POS buyurtma ma'lumotlarini XPrinter formatiga aylantiradi
// ==========================================

interface POSOrderData {
  id: string;
  orderNumber: string;
  type: string;
  source: string;
  table?: { number: number; name?: string } | null;
  customer?: { firstName?: string; lastName?: string; phone?: string } | null;
  user?: { firstName: string; lastName: string } | null;
  items: Array<{
    id: string;
    product: { id: string; name: string; price?: any };
    quantity: number;
    price: any;
    total: any;
    notes?: string | null;
    status: string;
  }>;
  subtotal: any;
  discount: any;
  tax: any;
  total: any;
  notes?: string | null;
  payments?: Array<{
    method: string;
    amount: any;
    status: string;
  }>;
  createdAt: string | Date;
}

interface DailyReportData {
  date: string;
  businessName: string;
  totalOrders: number;
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  totalOnline: number;
  totalDiscount: number;
  totalRefunds: number;
  netRevenue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  bySource: Array<{ source: string; orders: number; revenue: number }>;
  openingCash?: number;
  closingCash?: number;
  difference?: number;
}

interface XPrinterOrderPayload {
  order_id: string;
  order_number: string;
  business_name: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_method: string;
  payment_method: string;
  order_type: string;
  comment: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    total_price: number;
    modifiers?: Array<{ name: string; quantity: number; price: number }>;
    comment?: string;
  }>;
  business_id: number;
}

// ==========================================
// KITCHEN TICKET FORMATTER
// ==========================================

export function formatKitchenTicket(
  order: POSOrderData,
  businessName: string,
  businessId: number,
): XPrinterOrderPayload {
  const tableInfo = order.table
    ? `STOL ${order.table.number}${order.table.name ? ` (${order.table.name})` : ''}`
    : order.type === 'TAKEAWAY' ? 'OLIB KETISH' : 'YETKAZISH';

  const time = new Date(order.createdAt).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Faqat tayyorlanishi kerak bo'lgan itemlar
  const kitchenItems = order.items
    .filter(item => item.status === 'PENDING' || item.status === 'PREPARING')
    .map(item => ({
      id: item.id,
      name: item.product.name,
      quantity: item.quantity,
      price: 0, // Oshxona uchun narx ko'rsatilmaydi
      total_price: 0,
      comment: item.notes || undefined,
    }));

  return {
    order_id: order.id,
    order_number: order.orderNumber,
    business_name: businessName,
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    delivery_method: '',
    payment_method: '',
    order_type: `OSHXONA | ${tableInfo} | ${time}`,
    comment: order.notes || '',
    items: kitchenItems,
    business_id: businessId,
  };
}

// ==========================================
// CUSTOMER RECEIPT FORMATTER
// ==========================================

export function formatCustomerReceipt(
  order: POSOrderData,
  businessName: string,
  businessId: number,
): XPrinterOrderPayload {
  const customerName = order.customer
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    : '';

  const paymentMethods = order.payments
    ?.filter(p => p.status === 'COMPLETED')
    .map(p => `${p.method}: ${Number(p.amount).toLocaleString()}`)
    .join(', ') || '';

  const sourceLabels: Record<string, string> = {
    POS_ORDER: 'POS',
    WAITER_ORDER: 'Ofitsiant',
    QR_ORDER: 'QR Menyu',
    NONBOR_ORDER: 'Nonbor',
    TELEGRAM_ORDER: 'Telegram',
    WEBSITE_ORDER: 'Veb-sayt',
    API_ORDER: 'API',
  };

  const typeLabels: Record<string, string> = {
    DINE_IN: 'Stolda',
    TAKEAWAY: 'Olib ketish',
    DELIVERY: 'Yetkazib berish',
  };

  const items = order.items.map(item => ({
    id: item.id,
    name: item.product.name,
    quantity: item.quantity,
    price: Number(item.price),
    total_price: Number(item.total),
    comment: item.notes || undefined,
  }));

  const tableStr = order.table ? `Stol: ${order.table.number}` : '';
  const sourceStr = sourceLabels[order.source] || order.source;
  const typeStr = typeLabels[order.type] || order.type;
  const orderTypeStr = [typeStr, tableStr, sourceStr].filter(Boolean).join(' | ');

  return {
    order_id: order.id,
    order_number: order.orderNumber,
    business_name: businessName,
    customer_name: customerName,
    customer_phone: order.customer?.phone || '',
    customer_address: '',
    delivery_method: typeStr,
    payment_method: paymentMethods,
    order_type: orderTypeStr,
    comment: [
      order.notes || '',
      `Jami: ${Number(order.total).toLocaleString()} so'm`,
      Number(order.discount) > 0 ? `Chegirma: ${Number(order.discount).toLocaleString()} so'm` : '',
      Number(order.tax) > 0 ? `Soliq: ${Number(order.tax).toLocaleString()} so'm` : '',
    ].filter(Boolean).join('\n'),
    items,
    business_id: businessId,
  };
}

// ==========================================
// DAILY REPORT FORMATTER
// ==========================================

export function formatDailyReport(
  report: DailyReportData,
  businessId: number,
): XPrinterOrderPayload {
  // Kunlik hisobotni maxsus item lar sifatida formatlash
  const items: XPrinterOrderPayload['items'] = [];

  // Umumiy ma'lumot
  items.push({
    id: 'summary',
    name: '═══ UMUMIY ═══',
    quantity: 1,
    price: 0,
    total_price: 0,
  });

  items.push({
    id: 'orders',
    name: `Buyurtmalar soni`,
    quantity: report.totalOrders,
    price: 0,
    total_price: 0,
  });

  items.push({
    id: 'revenue',
    name: `Jami daromad`,
    quantity: 1,
    price: report.totalRevenue,
    total_price: report.totalRevenue,
  });

  // To'lov usullari
  items.push({
    id: 'payment-header',
    name: '═══ TO\'LOVLAR ═══',
    quantity: 1,
    price: 0,
    total_price: 0,
  });

  if (report.totalCash > 0) {
    items.push({ id: 'cash', name: 'Naqd', quantity: 1, price: report.totalCash, total_price: report.totalCash });
  }
  if (report.totalCard > 0) {
    items.push({ id: 'card', name: 'Karta', quantity: 1, price: report.totalCard, total_price: report.totalCard });
  }
  if (report.totalOnline > 0) {
    items.push({ id: 'online', name: 'Online', quantity: 1, price: report.totalOnline, total_price: report.totalOnline });
  }

  // Chegirmalar va qaytarishlar
  if (report.totalDiscount > 0) {
    items.push({ id: 'discount', name: 'Chegirmalar', quantity: 1, price: -report.totalDiscount, total_price: -report.totalDiscount });
  }
  if (report.totalRefunds > 0) {
    items.push({ id: 'refund', name: 'Qaytarishlar', quantity: 1, price: -report.totalRefunds, total_price: -report.totalRefunds });
  }

  // Source bo'yicha
  if (report.bySource.length > 0) {
    items.push({ id: 'source-header', name: '═══ MANBALAR ═══', quantity: 1, price: 0, total_price: 0 });
    for (const src of report.bySource) {
      items.push({
        id: `src-${src.source}`,
        name: `${src.source} (${src.orders})`,
        quantity: src.orders,
        price: src.revenue,
        total_price: src.revenue,
      });
    }
  }

  // Top mahsulotlar
  if (report.topProducts.length > 0) {
    items.push({ id: 'top-header', name: '═══ TOP TAOMLAR ═══', quantity: 1, price: 0, total_price: 0 });
    for (const prod of report.topProducts.slice(0, 5)) {
      items.push({
        id: `top-${prod.name}`,
        name: prod.name,
        quantity: prod.quantity,
        price: prod.revenue / prod.quantity,
        total_price: prod.revenue,
      });
    }
  }

  // Kassa
  const kassaComment = [
    report.openingCash !== undefined ? `Ochilish: ${report.openingCash.toLocaleString()} so'm` : '',
    report.closingCash !== undefined ? `Yopilish: ${report.closingCash.toLocaleString()} so'm` : '',
    report.difference !== undefined ? `Farq: ${report.difference.toLocaleString()} so'm` : '',
    `Sof daromad: ${report.netRevenue.toLocaleString()} so'm`,
  ].filter(Boolean).join('\n');

  return {
    order_id: `report-${report.date}`,
    order_number: `HISOBOT-${report.date}`,
    business_name: report.businessName,
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    delivery_method: '',
    payment_method: '',
    order_type: `KUNLIK HISOBOT | ${report.date}`,
    comment: kassaComment,
    items,
    business_id: businessId,
  };
}
