import React from 'react';
import { cn } from '../../../lib/utils';
import { useCartStore } from '../../../store/cart';
import { Minus, Plus, Trash2, ShoppingCart, ChefHat, CreditCard, XCircle, Truck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import TouchButton from '../shared/TouchButton';

interface CartPanelProps {
  onSendToKitchen: () => void;
  onPayment: () => void;
  onCloseTable: () => void;
}

const ORDER_TYPE_CONFIG = {
  DELIVERY: { label: 'Yetkazib berish', icon: <Truck size={13} />, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  TAKEAWAY: { label: 'Olib ketish', icon: <ShoppingBag size={13} />, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  DINE_IN: { label: 'Zalda', icon: <UtensilsCrossed size={13} />, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

export default function CartPanel({ onSendToKitchen, onPayment, onCloseTable }: CartPanelProps) {
  const { items, removeItem, updateQuantity, getSubtotal, getTotal, getItemCount, discount, discountPercent, orderType } =
    useCartStore();

  const subtotal = getSubtotal();
  const total = getTotal();
  const itemCount = getItemCount();
  const discountAmount = discountPercent > 0 ? subtotal * (discountPercent / 100) : discount;

  return (
    <div
      className={cn(
        'w-[320px] flex-shrink-0 flex flex-col h-full',
        'bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Buyurtma</h3>
          </div>
          {itemCount > 0 && (
            <span
              className={cn(
                'min-w-[28px] h-7 px-2 flex items-center justify-center rounded-full',
                'bg-blue-600 text-white text-sm font-bold dark:bg-blue-500'
              )}
            >
              {itemCount}
            </span>
          )}
        </div>
        {/* Buyurtma turi badge */}
        {(() => {
          const cfg = ORDER_TYPE_CONFIG[orderType as keyof typeof ORDER_TYPE_CONFIG];
          if (!cfg) return null;
          return (
            <span className={cn('inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.className)}>
              {cfg.icon}
              {cfg.label}
            </span>
          );
        })()}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 px-4">
            <ShoppingCart size={48} className="mb-3 opacity-50" />
            <span className="text-sm text-center">Mahsulot qo'shing</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-start gap-2 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.product.price.toLocaleString('uz-UZ')} x {item.quantity}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                    {(item.product.price * item.quantity).toLocaleString('uz-UZ')} so'm
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className={cn(
                      'w-[44px] h-[44px] flex items-center justify-center rounded-lg',
                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                      'active:scale-[0.92] transition-transform touch-manipulation select-none'
                    )}
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900 dark:text-gray-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className={cn(
                      'w-[44px] h-[44px] flex items-center justify-center rounded-lg',
                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                      'active:scale-[0.92] transition-transform touch-manipulation select-none'
                    )}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeItem(item.product.id)}
                  className={cn(
                    'w-[44px] h-[44px] flex items-center justify-center rounded-lg',
                    'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
                    'active:scale-[0.92] transition-transform touch-manipulation select-none'
                  )}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals & Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Jami:</span>
            <span>{subtotal.toLocaleString('uz-UZ')} so'm</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Chegirma:</span>
              <span>-{discountAmount.toLocaleString('uz-UZ')} so'm</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100 pt-1 border-t border-gray-200 dark:border-gray-700">
            <span>Umumiy:</span>
            <span>{total.toLocaleString('uz-UZ')} so'm</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <TouchButton
            variant="primary"
            size="md"
            icon={<ChefHat size={20} />}
            onClick={onSendToKitchen}
            disabled={items.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            Oshxonaga yuborish
          </TouchButton>

          <TouchButton
            variant="success"
            size="md"
            icon={<CreditCard size={20} />}
            onClick={onPayment}
            disabled={items.length === 0}
            className="w-full"
          >
            To'lov
          </TouchButton>

          <TouchButton
            variant="danger"
            size="sm"
            icon={<XCircle size={18} />}
            onClick={onCloseTable}
            className="w-full"
          >
            Stolni yopish
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
