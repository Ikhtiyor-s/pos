import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Check, Loader2, RefreshCw } from 'lucide-react';
import { orderService } from '../services';
import { useTranslation } from '../store/language';

export default function OrdersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.getAll(),
    refetchInterval: 15000,
  });

  const orders = ordersData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'CONFIRMED': return 'bg-indigo-500';
      case 'PREPARING': return 'bg-yellow-500';
      case 'READY': return 'bg-green-500';
      case 'SERVED': return 'bg-purple-500';
      case 'COMPLETED': return 'bg-green-700';
      default: return 'bg-muted-foreground';
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

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tables')} className="btn-touch rounded-full p-2 hover:bg-white/10">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{t('orders.title')}</h1>
            <p className="text-xs opacity-90">{orders.length} {t('orders.count')}</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="rounded-full p-2 hover:bg-white/10">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {t('orders.empty')}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="overflow-hidden rounded-2xl bg-card shadow-sm border border-border">
                {/* Order Header */}
                <div className="flex items-center justify-between bg-muted p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold">
                      #{order.orderNumber}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">#{order.orderNumber}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getTimeAgo(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium text-white ${getStatusColor(order.status)}`}
                  >
                    {getStatusText(order.status)}
                  </span>
                </div>

                {/* Order Items */}
                <div className="divide-y divide-border p-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-bold text-orange-600 dark:text-orange-400">
                          {item.quantity}
                        </span>
                        <span className="text-foreground">{item.product?.name || t('orders.product')}</span>
                      </div>
                      <span className="font-medium text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                <div className="flex items-center justify-between border-t border-border bg-muted p-4">
                  <div className="text-sm text-muted-foreground">{t('total')}:</div>
                  <div className="text-xl font-bold text-foreground">{formatPrice(order.total)}</div>
                </div>

                {/* Actions */}
                {order.status === 'READY' && (
                  <div className="flex gap-2 p-4 pt-0">
                    <button className="btn-touch flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-3 font-medium text-white">
                      <Check className="mr-2 inline h-5 w-5" />
                      {t('orders.served')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
