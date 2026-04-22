import React, { useEffect, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import { X, Truck, ShoppingBag, Clock, Phone, MapPin, Banknote, CreditCard, Smartphone, HelpCircle, CheckCheck } from 'lucide-react';
import { type Order } from '../../../services/order.service';

interface OnlineOrdersPanelProps {
  orders: Order[];
  onDismiss: (orderId: string) => void;
  onClose: () => void;
}

// To'lov usuli belgisi
function PaymentBadge({ notes }: { notes?: string | null }) {
  const raw = notes?.split('|')[1]?.trim() || '';

  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    CASH: { label: 'Naqd', icon: <Banknote size={12} />, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CARD: { label: 'Karta', icon: <CreditCard size={12} />, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    CLICK: { label: 'Click', icon: <Smartphone size={12} />, className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
    PAYME: { label: 'Payme', icon: <Smartphone size={12} />, className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
    UZUM: { label: 'Uzum', icon: <Smartphone size={12} />, className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    NOT_CHOSEN: { label: "Noma'lum", icon: <HelpCircle size={12} />, className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  };

  const cfg = map[raw] || map['NOT_CHOSEN'];

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// Yetkazib berish turi belgisi
function DeliveryBadge({ type }: { type: string }) {
  if (type === 'DELIVERY') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        <Truck size={12} />
        Yetkazib berish
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
      <ShoppingBag size={12} />
      Olib ketish
    </span>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onDismiss }: { order: Order; onDismiss: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Card Header */}
      <div className="flex items-start justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{order.orderNumber}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={11} />
            {formatTime(order.createdAt)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DeliveryBadge type={order.type} />
          <PaymentBadge notes={order.notes} />
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-1.5">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{item.quantity}x</span>{' '}
              {item.product?.name}
            </span>
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {item.total.toLocaleString('uz-UZ')}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 space-y-2">
        {/* Manzil (yetkazib berish uchun) */}
        {order.type === 'DELIVERY' && order.address && (
          <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <MapPin size={12} className="mt-0.5 flex-shrink-0 text-orange-500" />
            <span>{order.address}</span>
          </div>
        )}

        {/* Mijoz telefoni */}
        {order.customer?.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <Phone size={12} className="text-blue-500" />
            <span>{order.customer.phone}</span>
          </div>
        )}

        {/* Total + Dismiss */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {order.total.toLocaleString('uz-UZ')} so'm
          </span>
          <button
            onClick={() => onDismiss(order.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold',
              'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white',
              'active:scale-[0.95] transition-all touch-manipulation select-none'
            )}
          >
            <CheckCheck size={14} />
            Ko'rindi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnlineOrdersPanel({ orders, onDismiss, onClose }: OnlineOrdersPanelProps) {
  // Escape tugmasi bilan yopish
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50 flex flex-col',
          'w-full max-w-sm bg-gray-50 dark:bg-gray-900',
          'border-l border-gray-200 dark:border-gray-700',
          'shadow-2xl animate-in slide-in-from-right duration-250'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-orange-500" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Onlayn buyurtmalar</h2>
            {orders.length > 0 && (
              <span className="min-w-[22px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                {orders.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3">
              <Truck size={48} className="opacity-30" />
              <p className="text-sm">Yangi onlayn buyurtmalar yo'q</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} onDismiss={onDismiss} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
