import {
  X,
  Clock,
  User,
  MapPin,
  Phone,
  CreditCard,
  FileText,
  ChefHat,
  Truck,
  Check,
  Ban,
  Printer,
  MessageSquare,
  Package,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Order, OrderStatus, OrderItem } from '@/types/order';
import { ORDER_STATUS_INFO, ORDER_TYPE_INFO } from '@/types/order';
import { cn } from '@/lib/utils';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  onCancel?: (orderId: string, reason: string) => void;
  onPrint?: (order: Order) => void;
}

export function OrderDetailModal({
  isOpen,
  onClose,
  order,
  onStatusChange,
  onCancel,
  onPrint,
}: OrderDetailModalProps) {
  if (!order) return null;

  const statusInfo = ORDER_STATUS_INFO[order.status];
  const typeInfo = ORDER_TYPE_INFO[order.type];

  // Vaqtni formatlash
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sanani formatlash
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // O'tgan vaqtni hisoblash
  const getElapsedTime = () => {
    const created = new Date(order.createdAt).getTime();
    const now = Date.now();
    const diff = Math.floor((now - created) / 60000);

    if (diff < 60) return `${diff} daqiqa`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours} soat ${minutes} daqiqa`;
  };

  // Summani formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Keyingi status olish
  const getNextStatus = (): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      new: 'preparing',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: order.type === 'delivery' ? 'delivering' : 'completed',
      delivering: 'completed',
      completed: null,
      cancelled: null,
    };
    return statusFlow[order.status];
  };

  const nextStatus = getNextStatus();

  // Status tugmasi matni
  const getStatusButtonText = (status: OrderStatus): string => {
    const texts: Record<OrderStatus, string> = {
      new: 'Qabul qilish',
      confirmed: 'Tayyorlashni boshlash',
      preparing: 'Tayyor',
      ready: order.type === 'delivery' ? 'Yetkazishga berish' : 'Yakunlash',
      delivering: 'Yetkazildi',
      completed: 'Yakunlangan',
      cancelled: 'Bekor qilingan',
    };
    return texts[status];
  };

  // To'lov usuli
  const getPaymentMethodText = (method?: string) => {
    const methods: Record<string, string> = {
      cash: '💵 Naqd',
      card: '💳 Karta',
      payme: '📱 Payme',
      click: '📱 Click',
      uzum: '📱 Uzum',
    };
    return method ? methods[method] || method : 'Belgilanmagan';
  };

  // To'lov statusi
  const getPaymentStatusBadge = () => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      paid: 'success',
      pending: 'warning',
      failed: 'danger',
    };
    const labels: Record<string, string> = {
      paid: 'To\'langan',
      pending: 'Kutilmoqda',
      failed: 'Muvaffaqiyatsiz',
    };
    return (
      <Badge variant={variants[order.paymentStatus] || 'default'}>
        {labels[order.paymentStatus] || order.paymentStatus}
      </Badge>
    );
  };

  // Item status badge
  const getItemStatusBadge = (status: OrderItem['status']) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
      pending: 'default',
      preparing: 'warning',
      ready: 'info',
      served: 'success',
      cancelled: 'danger',
    };
    const labels: Record<string, string> = {
      pending: 'Kutilmoqda',
      preparing: 'Tayyorlanmoqda',
      ready: 'Tayyor',
      served: 'Berildi',
      cancelled: 'Bekor',
    };
    return (
      <Badge variant={variants[status] || 'default'} className="text-xs">
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-700 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">{order.orderNumber}</h2>
              <Badge
                style={{
                  backgroundColor: `${statusInfo.color}20`,
                  color: statusInfo.color,
                }}
              >
                {statusInfo.icon} {statusInfo.label}
              </Badge>
              <Badge variant="default">
                {typeInfo.icon} {typeInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDate(order.createdAt)} {formatTime(order.createdAt)}
              </span>
              <span>•</span>
              <span className="text-orange-400">{getElapsedTime()} oldin</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Mijoz ma'lumotlari */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mijoz */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3">
                <User size={16} />
                Mijoz ma'lumotlari
              </h3>
              <div className="space-y-2">
                {order.customerName && (
                  <p className="text-white font-medium">{order.customerName}</p>
                )}
                {order.customerPhone && (
                  <p className="flex items-center gap-2 text-slate-300">
                    <Phone size={14} className="text-slate-500" />
                    {order.customerPhone}
                  </p>
                )}
                {order.type === 'dine-in' && order.tableNumber && (
                  <p className="text-slate-300">
                    🪑 {order.tableNumber}-stol
                  </p>
                )}
              </div>
            </div>

            {/* Yetkazish manzili */}
            {order.type === 'delivery' && order.deliveryAddress && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3">
                  <MapPin size={16} />
                  Yetkazish manzili
                </h3>
                <p className="text-white">{order.deliveryAddress}</p>
                {order.deliveryNotes && (
                  <p className="text-sm text-slate-400 mt-2">
                    📝 {order.deliveryNotes}
                  </p>
                )}
              </div>
            )}

            {/* To'lov */}
            <div className={cn(
              "rounded-xl border border-slate-700 bg-slate-800/50 p-4",
              order.type !== 'delivery' && 'md:col-span-1'
            )}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3">
                <CreditCard size={16} />
                To'lov ma'lumotlari
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Usul:</span>
                  <span className="text-white">{getPaymentMethodText(order.paymentMethod)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Holat:</span>
                  {getPaymentStatusBadge()}
                </div>
                {order.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">To'langan:</span>
                    <span className="text-slate-300">{formatTime(order.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Buyurtma elementlari */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
              <Package size={16} />
              Buyurtma tarkibi ({order.items.length} ta)
            </h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-sm font-bold text-white">
                      {item.quantity}x
                    </span>
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">
                        {formatPrice(item.price)} / dona
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getItemStatusBadge(item.status)}
                    <span className="font-semibold text-white">
                      {formatPrice(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hisob-kitob */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-3">
              <FileText size={16} />
              Hisob-kitob
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Jami:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Yetkazish:</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex items-center justify-between text-green-400">
                  <span>Chegirma {order.discountPercent && `(${order.discountPercent}%)`}:</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              {order.tax > 0 && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Soliq:</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-lg font-bold text-white">
                <span>Umumiy:</span>
                <span className="text-orange-400">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Vaqt liniyasi */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
              <Clock size={16} />
              Vaqt liniyasi
            </h3>
            <div className="space-y-3">
              <TimelineItem
                icon={<FileText size={14} />}
                label="Yaratilgan"
                time={order.createdAt}
                active
              />
              {order.confirmedAt && (
                <TimelineItem
                  icon={<Check size={14} />}
                  label="Tasdiqlangan"
                  time={order.confirmedAt}
                  active
                />
              )}
              {order.preparingAt && (
                <TimelineItem
                  icon={<ChefHat size={14} />}
                  label="Tayyorlash boshlandi"
                  time={order.preparingAt}
                  active
                />
              )}
              {order.readyAt && (
                <TimelineItem
                  icon={<Package size={14} />}
                  label="Tayyor"
                  time={order.readyAt}
                  active
                />
              )}
              {order.type === 'delivery' && order.status === 'delivering' && (
                <TimelineItem
                  icon={<Truck size={14} />}
                  label="Yetkazilmoqda"
                  time={order.readyAt || order.createdAt}
                  active
                />
              )}
              {order.completedAt && (
                <TimelineItem
                  icon={<Check size={14} />}
                  label="Yakunlangan"
                  time={order.completedAt}
                  active
                  isLast
                />
              )}
              {order.cancelledAt && (
                <TimelineItem
                  icon={<Ban size={14} />}
                  label={`Bekor qilingan: ${order.cancelReason || ''}`}
                  time={order.cancelledAt}
                  active
                  isLast
                  isError
                />
              )}
            </div>
          </div>

          {/* Izohlar */}
          {order.notes && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-2">
                <MessageSquare size={16} />
                Izohlar
              </h3>
              <p className="text-white">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPrint?.(order)}
              className="border-slate-700 text-slate-400 hover:text-white"
            >
              <Printer size={16} className="mr-2" />
              Chop etish
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {order.status !== 'completed' && order.status !== 'cancelled' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const reason = prompt('Bekor qilish sababi:');
                    if (reason) onCancel?.(order.id, reason);
                  }}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Ban size={16} className="mr-2" />
                  Bekor qilish
                </Button>

                {nextStatus && (
                  <Button
                    onClick={() => onStatusChange?.(order.id, nextStatus)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {nextStatus === 'preparing' && <ChefHat size={16} className="mr-2" />}
                    {nextStatus === 'ready' && <Check size={16} className="mr-2" />}
                    {nextStatus === 'delivering' && <Truck size={16} className="mr-2" />}
                    {nextStatus === 'completed' && <Check size={16} className="mr-2" />}
                    {getStatusButtonText(order.status)}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Vaqt liniyasi elementi
function TimelineItem({
  icon,
  label,
  time,
  active,
  isLast,
  isError,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  active?: boolean;
  isLast?: boolean;
  isError?: boolean;
}) {
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-start gap-3">
      <div className="relative">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full',
            isError
              ? 'bg-red-500/20 text-red-400'
              : active
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-slate-700 text-slate-500'
          )}
        >
          {icon}
        </div>
        {!isLast && (
          <div
            className={cn(
              'absolute left-1/2 top-7 h-6 w-0.5 -translate-x-1/2',
              active ? 'bg-orange-500/30' : 'bg-slate-700'
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isError ? 'text-red-400' : 'text-white')}>{label}</p>
        <p className="text-xs text-slate-500">{formatTime(time)}</p>
      </div>
    </div>
  );
}
