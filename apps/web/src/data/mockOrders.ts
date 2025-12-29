import type { Order, OrderStats } from '@/types/order';

// Mock buyurtmalar
export const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-20241229-001',
    type: 'dine-in',
    status: 'new',
    tableId: '5',
    tableNumber: 5,
    customerName: 'Ali Valiyev',
    items: [
      { id: '1', productId: '1', name: 'O\'zbek oshi', quantity: 2, price: 45000, total: 90000, status: 'pending' },
      { id: '2', productId: '7', name: 'Achichuk', quantity: 1, price: 15000, total: 15000, status: 'pending' },
      { id: '3', productId: '10', name: 'Choy (1 choynek)', quantity: 1, price: 10000, total: 10000, status: 'pending' },
    ],
    subtotal: 115000,
    deliveryFee: 0,
    discount: 0,
    tax: 0,
    total: 115000,
    paymentStatus: 'pending',
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    estimatedTime: 25,
  },
  {
    id: '2',
    orderNumber: 'ORD-20241229-002',
    type: 'dine-in',
    status: 'preparing',
    tableId: '3',
    tableNumber: 3,
    customerName: 'Sardor Karimov',
    items: [
      { id: '4', productId: '2', name: 'Lag\'mon', quantity: 3, price: 38000, total: 114000, status: 'preparing' },
      { id: '5', productId: '4', name: 'Shashlik (1 shish)', quantity: 5, price: 25000, total: 125000, status: 'preparing' },
    ],
    subtotal: 239000,
    deliveryFee: 0,
    discount: 0,
    tax: 0,
    total: 239000,
    paymentStatus: 'pending',
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    confirmedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    preparingAt: new Date(Date.now() - 10 * 60000).toISOString(),
    estimatedTime: 20,
  },
  {
    id: '3',
    orderNumber: 'ORD-20241229-003',
    type: 'delivery',
    status: 'ready',
    customerName: 'Madina Rahimova',
    customerPhone: '+998901234567',
    deliveryAddress: 'Toshkent sh., Chilonzor t., 5-mavze, 12-uy, 45-xonadon',
    deliveryNotes: 'Eshik oldiga qo\'ying',
    items: [
      { id: '6', productId: '3', name: 'Manti', quantity: 2, price: 35000, total: 70000, status: 'ready' },
      { id: '7', productId: '8', name: 'Coca-Cola 0.5L', quantity: 2, price: 12000, total: 24000, status: 'ready' },
    ],
    subtotal: 94000,
    deliveryFee: 15000,
    discount: 0,
    tax: 0,
    total: 109000,
    paymentMethod: 'payme',
    paymentStatus: 'paid',
    paidAt: new Date(Date.now() - 25 * 60000).toISOString(),
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    confirmedAt: new Date(Date.now() - 28 * 60000).toISOString(),
    preparingAt: new Date(Date.now() - 25 * 60000).toISOString(),
    readyAt: new Date(Date.now() - 5 * 60000).toISOString(),
    estimatedTime: 15,
  },
  {
    id: '4',
    orderNumber: 'ORD-20241229-004',
    type: 'takeaway',
    status: 'preparing',
    customerName: 'Jamshid Toshmatov',
    customerPhone: '+998909876543',
    items: [
      { id: '8', productId: '9', name: 'Somsa go\'shtli', quantity: 10, price: 8000, total: 80000, status: 'preparing' },
      { id: '9', productId: '10', name: 'Choy (1 choynek)', quantity: 2, price: 10000, total: 20000, status: 'ready' },
    ],
    subtotal: 100000,
    deliveryFee: 0,
    discount: 10000,
    discountPercent: 10,
    tax: 0,
    total: 90000,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    confirmedAt: new Date(Date.now() - 18 * 60000).toISOString(),
    preparingAt: new Date(Date.now() - 15 * 60000).toISOString(),
    estimatedTime: 10,
    notes: 'Qo\'shimcha ziravor so\'radi',
  },
  {
    id: '5',
    orderNumber: 'ORD-20241229-005',
    type: 'dine-in',
    status: 'completed',
    tableId: '7',
    tableNumber: 7,
    customerName: 'Nodira Azimova',
    items: [
      { id: '10', productId: '6', name: 'Mastava', quantity: 2, price: 30000, total: 60000, status: 'served' },
      { id: '11', productId: '7', name: 'Achichuk', quantity: 2, price: 15000, total: 30000, status: 'served' },
    ],
    subtotal: 90000,
    deliveryFee: 0,
    discount: 0,
    tax: 0,
    total: 90000,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    paidAt: new Date(Date.now() - 45 * 60000).toISOString(),
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    confirmedAt: new Date(Date.now() - 85 * 60000).toISOString(),
    preparingAt: new Date(Date.now() - 80 * 60000).toISOString(),
    readyAt: new Date(Date.now() - 60 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: '6',
    orderNumber: 'ORD-20241229-006',
    type: 'delivery',
    status: 'delivering',
    customerName: 'Rustam Qodirov',
    customerPhone: '+998905551122',
    deliveryAddress: 'Toshkent sh., Sergeli t., 8-mavze',
    items: [
      { id: '12', productId: '1', name: 'O\'zbek oshi', quantity: 3, price: 45000, total: 135000, status: 'ready' },
      { id: '13', productId: '4', name: 'Shashlik (1 shish)', quantity: 6, price: 25000, total: 150000, status: 'ready' },
      { id: '14', productId: '8', name: 'Coca-Cola 0.5L', quantity: 3, price: 12000, total: 36000, status: 'ready' },
    ],
    subtotal: 321000,
    deliveryFee: 20000,
    discount: 0,
    tax: 0,
    total: 341000,
    paymentMethod: 'click',
    paymentStatus: 'paid',
    paidAt: new Date(Date.now() - 40 * 60000).toISOString(),
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 50 * 60000).toISOString(),
    confirmedAt: new Date(Date.now() - 48 * 60000).toISOString(),
    preparingAt: new Date(Date.now() - 45 * 60000).toISOString(),
    readyAt: new Date(Date.now() - 10 * 60000).toISOString(),
    estimatedTime: 30,
  },
  {
    id: '7',
    orderNumber: 'ORD-20241229-007',
    type: 'dine-in',
    status: 'cancelled',
    tableId: '2',
    tableNumber: 2,
    items: [
      { id: '15', productId: '5', name: 'Qovurma lag\'mon', quantity: 2, price: 40000, total: 80000, status: 'cancelled' },
    ],
    subtotal: 80000,
    deliveryFee: 0,
    discount: 0,
    tax: 0,
    total: 80000,
    paymentStatus: 'pending',
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    cancelledAt: new Date(Date.now() - 55 * 60000).toISOString(),
    cancelReason: 'Mijoz fikrini o\'zgartirdi',
  },
  {
    id: '8',
    orderNumber: 'ORD-20241229-008',
    type: 'dine-in',
    status: 'new',
    tableId: '1',
    tableNumber: 1,
    customerName: 'Shaxzod Normurodov',
    items: [
      { id: '16', productId: '12', name: 'Qo\'y go\'shti shashlik', quantity: 4, price: 30000, total: 120000, status: 'pending' },
      { id: '17', productId: '7', name: 'Achichuk', quantity: 2, price: 15000, total: 30000, status: 'pending' },
      { id: '18', productId: '10', name: 'Choy (1 choynek)', quantity: 2, price: 10000, total: 20000, status: 'pending' },
    ],
    subtotal: 170000,
    deliveryFee: 0,
    discount: 0,
    tax: 0,
    total: 170000,
    paymentStatus: 'pending',
    userId: '1',
    userName: 'Kassir',
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    estimatedTime: 30,
  },
];

// Statistika hisoblash funksiyasi
export function calculateOrderStats(orders: Order[]): OrderStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt) >= today
  );

  const completedOrders = todayOrders.filter((o) => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  // O'rtacha kutish vaqtini hisoblash
  const completedWithTimes = completedOrders.filter(
    (o) => o.createdAt && o.completedAt
  );
  const avgWaitTime =
    completedWithTimes.length > 0
      ? Math.round(
          completedWithTimes.reduce((sum, o) => {
            const created = new Date(o.createdAt).getTime();
            const completed = new Date(o.completedAt!).getTime();
            return sum + (completed - created) / 60000;
          }, 0) / completedWithTimes.length
        )
      : 0;

  return {
    totalOrders: todayOrders.length,
    newOrders: todayOrders.filter((o) => o.status === 'new').length,
    preparingOrders: todayOrders.filter((o) => o.status === 'preparing').length,
    readyOrders: todayOrders.filter((o) => o.status === 'ready').length,
    completedOrders: completedOrders.length,
    cancelledOrders: todayOrders.filter((o) => o.status === 'cancelled').length,
    totalRevenue,
    avgOrderValue: completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0,
    avgWaitTime,
  };
}
