import { useState } from 'react';
import {
  Utensils, Package, Play, Check, CheckCircle, ChefHat,
  MessageSquare, Flame,
} from 'lucide-react';
import OrderTimer from './OrderTimer';

// ==========================================
// KDS ORDER CARD — Buyurtma kartochkasi
// Katta shriftlar, touch-friendly, status boshqarish
// ==========================================

export interface KDSOrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
  cookingTime?: number;
}

export interface KDSOrder {
  id: string;
  orderNumber: string;
  tableNumber: number | null;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  items: KDSOrderItem[];
  createdAt: Date;
  status: 'NEW' | 'PREPARING' | 'READY';
  notes?: string;
  source?: string;
  totalItems: number;
}

interface OrderCardProps {
  order: KDSOrder;
  onStartItem: (orderId: string, itemId: string) => void;
  onCompleteItem: (orderId: string, itemId: string) => void;
  onStartAll: (orderId: string) => void;
  onCompleteAll: (orderId: string) => void;
}

const typeConfig = {
  DINE_IN: { label: 'STOLDA', icon: Utensils, color: 'text-blue-400' },
  TAKEAWAY: { label: 'OLIB KETISH', icon: Package, color: 'text-purple-400' },
  DELIVERY: { label: 'YETKAZISH', icon: Package, color: 'text-cyan-400' },
};

const statusBorder = {
  NEW: 'border-l-blue-500',
  PREPARING: 'border-l-orange-500',
  READY: 'border-l-emerald-500',
};

const statusBg = {
  NEW: 'bg-blue-500/5',
  PREPARING: 'bg-orange-500/5',
  READY: 'bg-emerald-500/5',
};

export default function OrderCard({
  order,
  onStartItem,
  onCompleteItem,
  onStartAll,
  onCompleteAll,
}: OrderCardProps) {
  const [animatingItem, setAnimatingItem] = useState<string | null>(null);

  const typeInfo = typeConfig[order.type];
  const TypeIcon = typeInfo.icon;

  const pendingItems = order.items.filter(i => i.status === 'PENDING');
  const preparingItems = order.items.filter(i => i.status === 'PREPARING');
  const readyItems = order.items.filter(i => i.status === 'READY');
  const allReady = order.items.length > 0 && readyItems.length === order.items.length;
  const minutes = Math.floor((Date.now() - order.createdAt.getTime()) / 60000);
  const isUrgent = minutes > 20;
  const isDelayed = minutes > 15;

  const handleItemClick = (item: KDSOrderItem) => {
    setAnimatingItem(item.id);
    setTimeout(() => setAnimatingItem(null), 300);

    if (item.status === 'PENDING') {
      onStartItem(order.id, item.id);
    } else if (item.status === 'PREPARING') {
      onCompleteItem(order.id, item.id);
    }
  };

  return (
    <div
      className={`
        rounded-xl border-l-4 ${statusBorder[order.status]} ${statusBg[order.status]}
        bg-gray-900/80 backdrop-blur-sm
        flex flex-col overflow-hidden
        ${isUrgent ? 'ring-2 ring-red-500/50' : ''}
        ${isDelayed && !isUrgent ? 'ring-1 ring-orange-500/30' : ''}
        transition-all duration-300
      `}
    >
      {/* ====== HEADER ====== */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          {/* Order number */}
          <span className="text-2xl font-black text-white tracking-tight">
            #{order.orderNumber.split('-').pop()}
          </span>

          {/* Table / Type */}
          <div className={`flex items-center gap-1.5 ${typeInfo.color}`}>
            <TypeIcon size={18} />
            {order.tableNumber ? (
              <span className="text-lg font-bold">STOL {order.tableNumber}</span>
            ) : (
              <span className="text-sm font-semibold uppercase">{typeInfo.label}</span>
            )}
          </div>

          {/* Urgent badge */}
          {isUrgent && (
            <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
              <Flame size={12} />
              SHOSHILINCH
            </div>
          )}
        </div>

        {/* Timer */}
        <OrderTimer createdAt={order.createdAt} size="md" />
      </div>

      {/* ====== ITEMS LIST ====== */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-gray-700">
        {order.items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            disabled={item.status === 'READY'}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              transition-all duration-200 touch-action-manipulation
              ${animatingItem === item.id ? 'scale-95' : ''}
              ${item.status === 'PENDING'
                ? 'bg-gray-800/60 hover:bg-blue-900/30 active:bg-blue-900/50 cursor-pointer'
                : item.status === 'PREPARING'
                ? 'bg-orange-900/20 hover:bg-orange-900/30 active:bg-emerald-900/30 cursor-pointer'
                : 'bg-emerald-900/15 opacity-60 cursor-default'
              }
            `}
          >
            {/* Status icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${item.status === 'PENDING' ? 'bg-gray-700 text-gray-400' : ''}
              ${item.status === 'PREPARING' ? 'bg-orange-500/20 text-orange-400' : ''}
              ${item.status === 'READY' ? 'bg-emerald-500/20 text-emerald-400' : ''}
            `}>
              {item.status === 'PENDING' && <Play size={20} />}
              {item.status === 'PREPARING' && <ChefHat size={20} className="animate-bounce" />}
              {item.status === 'READY' && <CheckCircle size={20} />}
            </div>

            {/* Item info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className={`
                  text-lg font-bold truncate
                  ${item.status === 'READY' ? 'text-gray-500 line-through' : 'text-white'}
                `}>
                  {item.name}
                </span>
              </div>
              {item.notes && (
                <div className="flex items-center gap-1 text-yellow-400/80 text-sm mt-0.5">
                  <MessageSquare size={12} />
                  <span className="truncate">{item.notes}</span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className={`
              text-2xl font-black flex-shrink-0 w-12 text-center
              ${item.status === 'READY' ? 'text-gray-600' : 'text-white'}
            `}>
              ×{item.quantity}
            </div>
          </button>
        ))}
      </div>

      {/* ====== NOTES ====== */}
      {order.notes && (
        <div className="px-4 py-2 border-t border-gray-800 bg-yellow-500/5">
          <p className="text-yellow-400/80 text-sm flex items-center gap-1.5">
            <MessageSquare size={14} />
            {order.notes}
          </p>
        </div>
      )}

      {/* ====== FOOTER ACTIONS ====== */}
      <div className="px-3 py-3 border-t border-gray-800 flex gap-2">
        {order.status === 'NEW' && (
          <button
            onClick={() => onStartAll(order.id)}
            className="
              flex-1 flex items-center justify-center gap-2
              bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white font-bold text-lg py-3 rounded-xl
              transition-all touch-action-manipulation active:scale-95
            "
          >
            <Play size={22} />
            BOSHLASH
          </button>
        )}

        {order.status === 'PREPARING' && !allReady && (
          <>
            <div className="flex-1 flex items-center justify-center gap-2 text-orange-400 font-semibold">
              <ChefHat size={20} className="animate-bounce" />
              {preparingItems.length}/{order.items.length} tayyorlanmoqda
            </div>
            {pendingItems.length === 0 && (
              <button
                onClick={() => onCompleteAll(order.id)}
                className="
                  px-6 flex items-center justify-center gap-2
                  bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                  text-white font-bold text-lg py-3 rounded-xl
                  transition-all touch-action-manipulation active:scale-95
                "
              >
                <Check size={22} />
                TAYYOR
              </button>
            )}
          </>
        )}

        {(allReady || order.status === 'READY') && (
          <button
            onClick={() => onCompleteAll(order.id)}
            className="
              flex-1 flex items-center justify-center gap-2
              bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
              text-white font-bold text-lg py-3 rounded-xl
              transition-all touch-action-manipulation active:scale-95
            "
          >
            <CheckCircle size={22} />
            TAYYOR — BERILSIN
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${order.items.length > 0 ? (readyItems.length / order.items.length) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
