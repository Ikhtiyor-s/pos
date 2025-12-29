import { useState, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  List,
  Volume2,
  VolumeX,
  Filter,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderStats } from '@/components/orders/OrderStats';
import { OrderFilter, StatusTabs } from '@/components/orders/OrderFilter';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { NewOrderModal } from '@/components/orders/NewOrderModal';
import { mockOrders, calculateOrderStats } from '@/data/mockOrders';
import type { Order, OrderStatus, OrderFilters, OrderStats as OrderStatsType } from '@/types/order';
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

export function OrdersPage() {
  // State
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

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
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulatsiya
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Buyurtmani ko'rish
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  // Buyurtma statusini o'zgartirish
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const now = new Date().toISOString();
        const updates: Partial<Order> = { status: newStatus };

        // Tegishli vaqt maydonini yangilash
        switch (newStatus) {
          case 'confirmed':
            updates.confirmedAt = now;
            break;
          case 'preparing':
            updates.preparingAt = now;
            if (!order.confirmedAt) updates.confirmedAt = now;
            break;
          case 'ready':
            updates.readyAt = now;
            break;
          case 'completed':
            updates.completedAt = now;
            break;
        }

        return { ...order, ...updates };
      })
    );

    // Modal ochiq bo'lsa, uni ham yangilash
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );
    }
  };

  // Buyurtmani bekor qilish
  const handleCancelOrder = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: 'cancelled' as OrderStatus,
              cancelledAt: new Date().toISOString(),
              cancelReason: reason,
            }
          : order
      )
    );
    setIsDetailModalOpen(false);
  };

  // Chop etish
  const handlePrintOrder = (order: Order) => {
    console.log('Printing order:', order.orderNumber);
    // Print logic
  };

  // Filtrlarni tozalash
  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  // Yangi buyurtma qo'shish
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Buyurtmalar</h1>
            <p className="text-slate-400">
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
                  ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
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
              disabled={isRefreshing}
              className="border-slate-700 text-slate-400 hover:text-white text-xs px-2"
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
                'border-slate-700 text-xs px-2',
                showFilters
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Filter size={14} className="mr-1" />
              <span className="hidden sm:inline">Filtr</span>
            </Button>

            {/* Ko'rinish */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-white'
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
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2"
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
            className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
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
                  className="rounded-xl border border-slate-700 bg-slate-800/30"
                >
                  {/* Ustun sarlavhasi */}
                  <div
                    className="flex items-center justify-between border-b border-slate-700 px-3 py-2"
                    style={{ borderTopColor: statusInfo.color }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: statusInfo.color }}
                      />
                      <span className="text-sm font-semibold text-white truncate">
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
                      <div className="py-8 text-center text-slate-500">
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
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 py-16 text-center">
                <p className="text-slate-400">Buyurtmalar topilmadi</p>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-4 border-slate-700 text-slate-400 hover:text-white"
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
            <h2 className="mb-4 text-lg font-semibold text-slate-400">
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
      </div>
    </div>
  );
}

export default OrdersPage;
