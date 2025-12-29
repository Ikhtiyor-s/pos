import { useState } from 'react';
import {
  Clock,
  User,
  MapPin,
  Phone,
  MoreHorizontal,
  Check,
  X,
  Eye,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Order,
  ORDER_STATUS_INFO,
  ORDER_TYPE_INFO,
  OrderStatus,
} from '@/types/order';

interface OrderCardProps {
  order: Order;
  onView: (order: Order) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onCancel: (orderId: string, reason: string) => void;
  compact?: boolean;
}

export function OrderCard({
  order,
  onView,
  onStatusChange,
  onCancel,
  compact = false,
}: OrderCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const statusInfo = ORDER_STATUS_INFO[order.status];
  const typeInfo = ORDER_TYPE_INFO[order.type];

  // Vaqtni hisoblash
  const getElapsedTime = () => {
    const created = new Date(order.createdAt).getTime();
    const now = Date.now();
    const minutes = Math.floor((now - created) / 60000);

    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}s ${remainingMinutes}m`;
  };

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Keyingi status
  const getNextStatus = (): OrderStatus | null => {
    switch (order.status) {
      case 'new':
        return 'confirmed';
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return order.type === 'delivery' ? 'delivering' : 'completed';
      case 'delivering':
        return 'completed';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();
  const nextStatusInfo = nextStatus ? ORDER_STATUS_INFO[nextStatus] : null;

  // Vaqt ogohlantirishi (15 daqiqadan ko'p)
  const elapsedMinutes = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / 60000
  );
  const isLate = elapsedMinutes > 15 && order.status !== 'completed' && order.status !== 'cancelled';

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-slate-800/50 transition-all duration-200',
        'hover:border-slate-600 hover:shadow-lg hover:shadow-black/20',
        isLate ? 'border-amber-500/50' : 'border-slate-700',
        order.status === 'cancelled' && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Buyurtma raqami */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-white">
                #{order.orderNumber.split('-').pop()}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: statusInfo.color }}
              >
                {statusInfo.label}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <span>{typeInfo.icon} {typeInfo.label}</span>
              {order.tableNumber && (
                <span>• Stol {order.tableNumber}</span>
              )}
            </div>
          </div>
        </div>

        {/* Vaqt va menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px]',
              isLate ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
            )}
          >
            <Clock size={10} />
            {getElapsedTime()}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                  <button
                    onClick={() => {
                      onView(order);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <Eye size={16} />
                    Ko'rish
                  </button>
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700">
                    <Printer size={16} />
                    Chek chiqarish
                  </button>
                  {order.status === 'new' && (
                    <>
                      <div className="my-1 border-t border-slate-700" />
                      <button
                        onClick={() => {
                          const reason = prompt('Bekor qilish sababi:');
                          if (reason) {
                            onCancel(order.id, reason);
                            setShowMenu(false);
                          }
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700"
                      >
                        <X size={16} />
                        Bekor qilish
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Mijoz ma'lumotlari */}
        {(order.customerName || order.customerPhone || order.deliveryAddress) && (
          <div className="mb-3 space-y-1">
            {order.customerName && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <User size={14} className="text-slate-500" />
                {order.customerName}
              </div>
            )}
            {order.customerPhone && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Phone size={14} className="text-slate-500" />
                {order.customerPhone}
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin size={14} className="mt-0.5 text-slate-500" />
                <span className="line-clamp-2">{order.deliveryAddress}</span>
              </div>
            )}
          </div>
        )}

        {/* Buyurtma elementlari */}
        <div className="mb-3 space-y-1.5">
          {order.items.slice(0, compact ? 2 : 4).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-700 text-xs font-medium text-white">
                  {item.quantity}
                </span>
                <span className="text-slate-300">{item.name}</span>
                {item.notes && (
                  <span className="text-slate-500" title={item.notes}>
                    📝
                  </span>
                )}
              </div>
              <span className="text-slate-400">
                {formatPrice(item.total)}
              </span>
            </div>
          ))}
          {order.items.length > (compact ? 2 : 4) && (
            <div className="text-sm text-slate-500">
              +{order.items.length - (compact ? 2 : 4)} ta boshqa...
            </div>
          )}
        </div>

        {/* Jami */}
        <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
          <span className="text-sm text-slate-400">Jami:</span>
          <span className="text-lg font-bold text-white">
            {formatPrice(order.total)}
          </span>
        </div>

        {/* Eslatma */}
        {order.notes && (
          <div className="mt-2 rounded-lg bg-slate-700/30 p-2 text-sm text-slate-400">
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Footer - Actionlar */}
      {order.status !== 'completed' && order.status !== 'cancelled' && (
        <div className="flex gap-2 border-t border-slate-700/50 p-2">
          {nextStatus && (
            <Button
              onClick={() => onStatusChange(order.id, nextStatus)}
              className={cn(
                'flex-1 text-xs px-2 py-1.5 h-auto min-h-[32px]',
                nextStatus === 'completed'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-orange-500 hover:bg-orange-600',
                'text-white'
              )}
              size="sm"
            >
              <Check size={14} className="mr-1 flex-shrink-0" />
              <span className="truncate">{nextStatusInfo?.label}</span>
            </Button>
          )}
          <Button
            onClick={() => onView(order)}
            variant="outline"
            size="sm"
            className="border-slate-700 px-2 h-auto min-h-[32px]"
          >
            <Eye size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
