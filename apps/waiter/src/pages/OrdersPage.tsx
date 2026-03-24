import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Check, Loader2, RefreshCw, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { orderService } from '../services';
import { useTranslation } from '../store/language';

type FilterTab = 'ALL' | 'ACTIVE' | 'READY' | 'COMPLETED';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    refetchInterval: 15000,
  });

  const orders = ordersData?.data || [];

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'ALL', label: 'Barchasi' },
    { id: 'ACTIVE', label: 'Faol' },
    { id: 'READY', label: 'Tayyor' },
    { id: 'COMPLETED', label: 'Yakunlangan' },
  ];

  const filteredOrders = orders.filter((order: any) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'ACTIVE') return ['NEW', 'CONFIRMED', 'PREPARING'].includes(order.status);
    if (activeFilter === 'READY') return order.status === 'READY';
    if (activeFilter === 'COMPLETED') return ['SERVED', 'COMPLETED'].includes(order.status);
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'CONFIRMED': return 'bg-indigo-500';
      case 'PREPARING': return 'bg-yellow-500';
      case 'READY': return 'bg-emerald-500';
      case 'SERVED': return 'bg-purple-500';
      case 'COMPLETED': return 'bg-green-700';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return t(`orderStatus.${status}`) || status;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(Number(price) || 0) + " so'm";
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return t('time.justNow');
    if (diffMin < 60) return t('time.minutesAgo', { min: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    return t('time.hoursAgo', { hours: diffHours });
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 px-4 pt-3 pb-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/tables')}
              className="flex items-center justify-center rounded-xl bg-gray-800 active:bg-gray-700"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Buyurtmalar</h1>
              <p className="text-xs text-gray-400">{filteredOrders.length} ta buyurtma</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center justify-center rounded-xl bg-gray-800 active:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <RefreshCw className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Tab Filters */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200'
              }`}
              style={{ minHeight: '36px' }}
            >
              {tab.label}
              {tab.id === 'READY' && orders.filter((o: any) => o.status === 'READY').length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                  {orders.filter((o: any) => o.status === 'READY').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="flex h-64 flex-col items-center justify-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">Buyurtmalar yo'q</p>
            <p className="text-sm text-muted-foreground">
              {activeFilter !== 'ALL' ? "Bu toifada buyurtmalar topilmadi" : "Hali buyurtmalar kiritilmagan"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order: any) => {
              const isExpanded = expandedOrder === order.id;
              const isReady = order.status === 'READY';

              return (
                <div
                  key={order.id}
                  className={`overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border transition-all ${
                    isReady
                      ? 'border-emerald-300 dark:border-emerald-700 shadow-sm shadow-emerald-500/10'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Order Card - Summary (always visible) */}
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className="w-full text-left p-4 active:bg-gray-50 dark:active:bg-gray-800/50"
                    style={{ minHeight: '72px' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white font-bold text-sm ${
                          isReady ? 'bg-emerald-500' : 'bg-orange-500'
                        }`}>
                          #{order.orderNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">Buyurtma #{order.orderNumber}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {order.table && (
                              <span className="text-xs text-muted-foreground">Stol {order.table.number}</span>
                            )}
                            <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {getTimeAgo(order.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                        <span className="text-sm font-bold text-foreground">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex justify-center mt-2">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded: Order Items Detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      <div className="px-4 py-3 space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 text-xs font-bold text-orange-600 dark:text-orange-400">
                                {item.quantity}x
                              </span>
                              <span className="text-sm text-foreground">{item.product?.name || 'Mahsulot'}</span>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total row */}
                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                        <span className="text-sm text-muted-foreground">Jami:</span>
                        <span className="text-lg font-bold text-foreground">{formatPrice(order.total)}</span>
                      </div>

                      {/* Action for READY orders */}
                      {isReady && (
                        <div className="px-4 pb-4 pt-1">
                          <button
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-semibold text-white active:bg-emerald-600"
                            style={{ minHeight: '48px' }}
                          >
                            <Check className="h-5 w-5" />
                            Berildi
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
