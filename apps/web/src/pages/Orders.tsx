import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  List,
  Volume2,
  VolumeX,
  Filter,
  LayoutDashboard,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderStats } from '@/components/orders/OrderStats';
import { OrderFilter, StatusTabs } from '@/components/orders/OrderFilter';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { NewOrderModal } from '@/components/orders/NewOrderModal';
import { orderApiService, type OrderApi, type OrderApiItem } from '@/services/order.service';
import type { Order, OrderStatus, OrderType, OrderItem, OrderItemStatus, PaymentStatus, OrderFilters, OrderStats as OrderStatsType } from '@/types/order';
import { ORDER_STATUS_INFO } from '@/types/order';
import { cn } from '@/lib/utils';

// Boshlang'ich filtrlar
const initialFilters: OrderFilters = {
  search: '',
  status: 'all',
  type: 'all',
  paymentStatus: 'all',
  dateRange: null,
};

// View mode
type ViewMode = 'kanban' | 'list';

// Backend type -> frontend type mapping
const mapApiType = (type: string): OrderType => {
  const typeMap: Record<string, OrderType> = {
    'DINE_IN': 'dine-in',
    'TAKEAWAY': 'takeaway',
    'DELIVERY': 'delivery',
    'dine_in': 'dine-in',
    'takeaway': 'takeaway',
    'delivery': 'delivery',
  };
  return typeMap[type] || (type.toLowerCase().replace('_', '-') as OrderType);
};

// Backend status -> frontend status mapping
const mapApiStatus = (status: string): OrderStatus => {
  const statusMap: Record<string, OrderStatus> = {
    'NEW': 'new',
    'CONFIRMED': 'confirmed',
    'PREPARING': 'preparing',
    'READY': 'ready',
    'DELIVERING': 'delivering',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  };
  return statusMap[status] || (status.toLowerCase() as OrderStatus);
};

// Backend item status -> frontend item status mapping
const mapItemStatus = (status: string): OrderItemStatus => {
  const statusMap: Record<string, OrderItemStatus> = {
    'PENDING': 'pending',
    'PREPARING': 'preparing',
    'READY': 'ready',
    'SERVED': 'served',
    'CANCELLED': 'cancelled',
  };
  return statusMap[status] || (status.toLowerCase() as OrderItemStatus);
};

// Payment status ni hisoblash
const calculatePaymentStatus = (payments: OrderApi['payments'], total: number): PaymentStatus => {
  if (!payments || payments.length === 0) return 'pending';
  const paidAmount = payments
    .filter((p) => p.status === 'COMPLETED' || p.status === 'completed' || p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);
  if (paidAmount >= total) return 'paid';
  if (paidAmount > 0) return 'pending'; // partial - frontend uses 'pending' as there's no 'partial'
  return 'pending';
};

// OrderApi -> Order mapper
const mapApiOrder = (apiOrder: OrderApi): Order => {
  const items: OrderItem[] = (apiOrder.items || []).map((item: OrderApiItem) => ({
    id: item.id,
    productId: item.productId,
    name: item.product?.name || `Mahsulot #${item.productId}`,
    quantity: item.quantity,
    price: item.price,
    total: item.total,
    notes: item.notes,
    status: mapItemStatus(item.status),
  }));

  const paymentStatus = calculatePaymentStatus(apiOrder.payments, apiOrder.total);

  // Payment method - oxirgi muvaffaqiyatli to'lovdan
  const lastPayment = apiOrder.payments?.find(
    (p) => p.status === 'COMPLETED' || p.status === 'completed' || p.status === 'success'
  );

  // Customer name
  const customerName = apiOrder.customer
    ? [apiOrder.customer.firstName, apiOrder.customer.lastName].filter(Boolean).join(' ')
    : undefined;

  // Waiter/user name
  const userName = apiOrder.user
    ? [apiOrder.user.firstName, apiOrder.user.lastName].filter(Boolean).join(' ')
    : undefined;

  return {
    id: apiOrder.id,
    orderNumber: apiOrder.orderNumber,
    type: mapApiType(apiOrder.type),
    status: mapApiStatus(apiOrder.status),
    customerId: apiOrder.customerId,
    customerName,
    customerPhone: apiOrder.customer?.phone,
    tableId: apiOrder.tableId,
    tableNumber: apiOrder.table?.number,
    deliveryAddress: apiOrder.address,
    items,
    subtotal: apiOrder.subtotal,
    deliveryFee: 0,
    discount: apiOrder.discount,
    tax: apiOrder.tax,
    total: apiOrder.total,
    paymentMethod: lastPayment?.method as Order['paymentMethod'],
    paymentStatus,
    paidAt: paymentStatus === 'paid' ? apiOrder.updatedAt : undefined,
    notes: apiOrder.notes,
    userId: apiOrder.userId,
    userName,
    createdAt: apiOrder.createdAt,
  };
};

// Statistika hisoblash funksiyasi (lokal)
function calculateOrderStats(orders: Order[]): OrderStatsType {
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

export function OrdersPage() {
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Toast ko'rsatish
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Ma'lumotlarni yuklash
  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const { orders: apiOrders } = await orderApiService.getAll({ limit: 200 });
      const mappedOrders = apiOrders.map(mapApiOrder);
      setOrders(mappedOrders);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Buyurtmalarni yuklashda xatolik yuz berdi';
      setError(message);
      console.error('Orders load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Sahifa ochilganda ma'lumot yuklash
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Statistika hisoblash
  const stats: OrderStatsType = useMemo(() => calculateOrderStats(orders), [orders]);

  // Status bo'yicha hisoblash
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filterlangan buyurtmalar
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Qidiruv
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerName?.toLowerCase().includes(searchLower) ||
          order.customerPhone?.includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false;
      }

      // Turi
      if (filters.type !== 'all' && order.type !== filters.type) {
        return false;
      }

      // To'lov holati
      if (filters.paymentStatus !== 'all' && order.paymentStatus !== filters.paymentStatus) {
        return false;
      }

      return true;
    });
  }, [orders, filters]);

  // Kanban ustunlari uchun buyurtmalarni guruhlash
  const kanbanColumns = useMemo(() => {
    const columns: { status: OrderStatus; orders: Order[] }[] = [
      { status: 'new', orders: [] },
      { status: 'preparing', orders: [] },
      { status: 'ready', orders: [] },
      { status: 'delivering', orders: [] },
    ];

    filteredOrders
      .filter((o) => !['completed', 'cancelled', 'confirmed'].includes(o.status))
      .forEach((order) => {
        const column = columns.find((c) => c.status === order.status);
        if (column) {
          column.orders.push(order);
        }
      });

    // Har bir ustunni vaqt bo'yicha saralash (eng eski birinchi)
    columns.forEach((col) => {
      col.orders.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    return columns;
  }, [filteredOrders]);

  // Yangilash
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadOrders();
    showToast('success', 'Buyurtmalar yangilandi');
  }, [loadOrders, showToast]);

  // Buyurtmani ko'rish
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // Buyurtma statusini o'zgartirish
  const handleStatusChange = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    setIsSaving(true);
    try {
      const updatedApiOrder = await orderApiService.updateStatus(orderId, newStatus.toUpperCase());
      const updatedOrder = mapApiOrder(updatedApiOrder);

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updatedOrder : order))
      );

      // Modal ochiq bo'lsa, uni ham yangilash
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }

      const statusLabel = ORDER_STATUS_INFO[newStatus]?.label || newStatus;
      showToast('success', `Buyurtma holati "${statusLabel}" ga o'zgartirildi`);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Status o\'zgartirishda xatolik yuz berdi';
      showToast('error', message);
      console.error('Status change error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [selectedOrder, showToast]);

  // Buyurtmani bekor qilish
  const handleCancelOrder = useCallback(async (orderId: string, _reason: string) => {
    setIsSaving(true);
    try {
      const updatedApiOrder = await orderApiService.updateStatus(orderId, 'CANCELLED');
      const updatedOrder = mapApiOrder(updatedApiOrder);

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...updatedOrder, cancelReason: _reason } : order))
      );

      setIsDetailModalOpen(false);
      setSelectedOrder(null);
      showToast('success', 'Buyurtma bekor qilindi');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Buyurtmani bekor qilishda xatolik';
      showToast('error', message);
      console.error('Cancel order error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  // Chop etish
  const handlePrintOrder = (order: Order) => {
    console.log('Printing order:', order.orderNumber);
    // Print logic
  };

  // Filtrlarni tozalash
  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  // Yangi buyurtma qo'shilganda - API dan qayta yuklash
  const handleOrderCreated = useCallback(async (_newOrder: Order) => {
    // API dan yangi ma'lumotlarni yuklash
    await loadOrders();
    showToast('success', 'Yangi buyurtma yaratildi');
  }, [loadOrders, showToast]);

  // Loading holati
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-gray-500">Buyurtmalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Xatolik holati
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm text-gray-600">{error}</p>
          <Button
            onClick={() => {
              setIsLoading(true);
              loadOrders();
            }}
            className="mt-4 bg-orange-500 text-white hover:bg-orange-600"
          >
            Qayta yuklash
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Buyurtmalar</h1>
            <p className="text-sm text-gray-500">
              Faol buyurtmalar: {(statusCounts.new || 0) + (statusCounts.preparing || 0) + (statusCounts.ready || 0) + (statusCounts.delivering || 0)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ovoz */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                soundEnabled
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-500'
                  : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600'
              )}
              title={soundEnabled ? 'Ovozni o\'chirish' : 'Ovozni yoqish'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Yangilash */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isSaving}
              className="border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs px-2"
            >
              <RefreshCw
                size={14}
                className={cn('mr-1', isRefreshing && 'animate-spin')}
              />
              <span className="hidden sm:inline">Yangilash</span>
            </Button>

            {/* Filter toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'border-gray-200 text-xs px-2',
                showFilters
                  ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              <Filter size={14} className="mr-1" />
              <span className="hidden sm:inline">Filtr</span>
            </Button>

            {/* Ko'rinish */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <List size={14} />
                <span className="hidden sm:inline">Ro'yxat</span>
              </button>
            </div>

            {/* Yangi buyurtma */}
            <Button
              size="sm"
              onClick={() => setIsNewOrderModalOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:brightness-110 text-white text-xs px-2"
            >
              <Plus size={14} className="mr-1" />
              <span className="hidden sm:inline">Yangi</span>
            </Button>
          </div>
        </div>

        {/* Statistika */}
        <OrderStats stats={stats} />

        {/* Status tabs */}
        <StatusTabs
          currentStatus={filters.status}
          counts={statusCounts}
          onChange={(status) => setFilters({ ...filters, status })}
        />

        {/* Filtrlar */}
        {showFilters && (
          <OrderFilter
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          />
        )}

        {/* Kontent */}
        {viewMode === 'kanban' ? (
          /* Kanban View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {kanbanColumns.map((column) => {
              const statusInfo = ORDER_STATUS_INFO[column.status];
              return (
                <div
                  key={column.status}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {/* Ustun sarlavhasi */}
                  <div
                    className="flex items-center justify-between border-b border-gray-100 px-3 py-2"
                    style={{ borderTopColor: statusInfo.color }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusInfo.color }}
                      />
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {statusInfo.label}
                      </span>
                    </div>
                    <span
                      className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold flex-shrink-0"
                      style={{
                        backgroundColor: `${statusInfo.color}20`,
                        color: statusInfo.color,
                      }}
                    >
                      {column.orders.length}
                    </span>
                  </div>

                  {/* Buyurtmalar */}
                  <div className="space-y-3 p-3 max-h-[600px] overflow-y-auto">
                    {column.orders.length > 0 ? (
                      column.orders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onView={handleViewOrder}
                          onStatusChange={handleStatusChange}
                          onCancel={handleCancelOrder}
                          compact
                        />
                      ))
                    ) : (
                      <div className="py-8 text-center text-gray-400">
                        <p className="text-sm">Buyurtmalar yo'q</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onView={handleViewOrder}
                  onStatusChange={handleStatusChange}
                  onCancel={handleCancelOrder}
                />
              ))
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
                <p className="text-gray-500">Buyurtmalar topilmadi</p>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-4 border-gray-200 text-gray-600 hover:text-gray-800"
                >
                  Filtrlarni tozalash
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Yakunlangan va bekor qilingan buyurtmalar */}
        {viewMode === 'kanban' && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-600">
              Yakunlangan buyurtmalar (bugun)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOrders
                .filter((o) => o.status === 'completed' || o.status === 'cancelled')
                .slice(0, 8)
                .map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={handleViewOrder}
                    onStatusChange={handleStatusChange}
                    onCancel={handleCancelOrder}
                    compact
                  />
                ))}
            </div>
          </div>
        )}

        {/* Buyurtma tafsilotlari modali */}
        <OrderDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onStatusChange={handleStatusChange}
          onCancel={handleCancelOrder}
          onPrint={handlePrintOrder}
        />

        {/* Yangi buyurtma modali */}
        <NewOrderModal
          isOpen={isNewOrderModalOpen}
          onClose={() => setIsNewOrderModalOpen(false)}
          onOrderCreated={handleOrderCreated}
        />

        {/* Toast */}
        {toast && (
          <div className={cn(
            'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all',
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          )}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
