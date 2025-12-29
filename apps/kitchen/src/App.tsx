import { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import {
  ChefHat,
  Clock,
  CheckCircle,
  AlertCircle,
  Timer,
  Volume2,
  VolumeX,
  Package,
  Utensils,
  Bell,
  RefreshCw,
  Play,
  Check,
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

interface Order {
  id: string;
  orderNumber: string;
  tableNumber: number | null;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  items: OrderItem[];
  createdAt: Date;
  status: 'NEW' | 'PREPARING' | 'READY';
  priority: 'normal' | 'high';
}

// Demo buyurtmalar
const demoOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    tableNumber: 3,
    type: 'DINE_IN',
    status: 'NEW',
    priority: 'normal',
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    items: [
      { id: '1', name: "O'zbek oshi", quantity: 2, status: 'PENDING' },
      { id: '2', name: 'Achichuk', quantity: 2, status: 'PENDING' },
      { id: '3', name: "Ko'k choy", quantity: 1, status: 'PENDING' },
    ],
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    tableNumber: 7,
    type: 'DINE_IN',
    status: 'PREPARING',
    priority: 'high',
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    items: [
      { id: '4', name: 'Shashlik (4 shish)', quantity: 1, status: 'PREPARING' },
      { id: '5', name: "Sho'rva", quantity: 2, status: 'READY' },
      { id: '6', name: 'Non', quantity: 2, status: 'READY' },
    ],
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    tableNumber: null,
    type: 'TAKEAWAY',
    status: 'NEW',
    priority: 'normal',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    items: [
      { id: '7', name: "Lag'mon", quantity: 1, status: 'PENDING' },
      { id: '8', name: 'Manti', quantity: 1, notes: "Qaymoqsiz", status: 'PENDING' },
    ],
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    tableNumber: 1,
    type: 'DINE_IN',
    status: 'PREPARING',
    priority: 'normal',
    createdAt: new Date(Date.now() - 18 * 60 * 1000),
    items: [
      { id: '9', name: 'Samarqand oshi', quantity: 3, status: 'PREPARING' },
      { id: '10', name: 'Shakarob', quantity: 3, status: 'READY' },
    ],
  },
  {
    id: '5',
    orderNumber: 'ORD-005',
    tableNumber: 5,
    type: 'DINE_IN',
    status: 'READY',
    priority: 'normal',
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
    items: [
      { id: '11', name: 'Chuchvara', quantity: 2, status: 'READY' },
      { id: '12', name: "Ko'k choy", quantity: 2, status: 'READY' },
    ],
  },
];

function getTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Hozirgina";
  if (minutes < 60) return `${minutes} daqiqa`;
  return `${Math.floor(minutes / 60)} soat`;
}

function getTimerColor(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 10) return 'text-green-400';
  if (minutes < 20) return 'text-yellow-400';
  return 'text-red-400';
}

function getOrderTypeLabel(type: Order['type']): string {
  switch (type) {
    case 'DINE_IN': return 'Stolda';
    case 'TAKEAWAY': return 'Olib ketish';
    case 'DELIVERY': return 'Yetkazish';
  }
}

function getOrderTypeIcon(type: Order['type']) {
  switch (type) {
    case 'DINE_IN': return Utensils;
    case 'TAKEAWAY': return Package;
    case 'DELIVERY': return Package;
  }
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setTick] = useState(0);
  const [selectedView, setSelectedView] = useState<'all' | 'new' | 'preparing' | 'ready'>('all');

  // Har daqiqa yangilash
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleItemStatus = (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        );

        const allReady = updatedItems.every((item) => item.status === 'READY');
        const anyPreparing = updatedItems.some((item) => item.status === 'PREPARING');

        let newOrderStatus: Order['status'] = 'NEW';
        if (allReady) newOrderStatus = 'READY';
        else if (anyPreparing) newOrderStatus = 'PREPARING';

        return { ...order, items: updatedItems, status: newOrderStatus };
      })
    );

    if (newStatus === 'READY' && soundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    }
  };

  const handleStartAllItems = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          status: 'PREPARING',
          items: order.items.map((item) => ({
            ...item,
            status: item.status === 'PENDING' ? 'PREPARING' : item.status,
          })),
        };
      })
    );
  };

  const handleMarkOrderReady = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: 'READY',
              items: order.items.map((item) => ({ ...item, status: 'READY' as const })),
            }
          : order
      )
    );

    if (soundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    }
  };

  const handleCompleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  const newOrders = orders.filter((o) => o.status === 'NEW');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  const filteredOrders = selectedView === 'all'
    ? orders
    : orders.filter((o) => o.status === selectedView.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Oshpaz Paneli</h1>
            <p className="text-xs text-slate-500">Real-time buyurtmalar</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-6 mr-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                <AlertCircle size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Yangi</p>
                <p className="font-bold text-red-400">{newOrders.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
                <Timer size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tayyorlanmoqda</p>
                <p className="font-bold text-amber-400">{preparingOrders.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tayyor</p>
                <p className="font-bold text-green-400">{readyOrders.length}</p>
              </div>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              soundEnabled
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Ovoz yoqiq' : "Ovoz o'chiq"}</span>
          </button>

          {/* Time */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
            <Clock size={16} className="text-orange-400" />
            <span className="text-lg font-bold">
              {new Date().toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/50 px-6 py-3">
        {[
          { id: 'all', label: 'Barchasi', count: orders.length },
          { id: 'new', label: 'Yangi', count: newOrders.length, color: 'red' },
          { id: 'preparing', label: 'Tayyorlanmoqda', count: preparingOrders.length, color: 'amber' },
          { id: 'ready', label: 'Tayyor', count: readyOrders.length, color: 'green' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedView(tab.id as typeof selectedView)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              selectedView === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            )}
          >
            {tab.label}
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs',
              selectedView === tab.id
                ? 'bg-white/20'
                : tab.color ? `bg-${tab.color}-500/20 text-${tab.color}-400` : 'bg-slate-700'
            )}>
              {tab.count}
            </span>
          </button>
        ))}

        <div className="flex-1" />

        <button className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>

      {/* Orders Grid */}
      <div className="p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ChefHat size={64} className="mb-4 opacity-50" />
            <p className="text-xl font-medium">Buyurtmalar yo'q</p>
            <p className="text-sm">Yangi buyurtmalar bu yerda ko'rinadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onItemStatus={handleItemStatus}
                onStartAll={handleStartAllItems}
                onMarkReady={handleMarkOrderReady}
                onComplete={handleCompleteOrder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onStartAll: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onComplete: (orderId: string) => void;
}

function OrderCard({ order, onItemStatus, onStartAll, onMarkReady, onComplete }: OrderCardProps) {
  const TypeIcon = getOrderTypeIcon(order.type);

  const statusConfig = {
    NEW: {
      border: 'border-red-500',
      bg: 'bg-red-500/10',
      badge: 'bg-red-500',
      badgeText: 'Yangi',
    },
    PREPARING: {
      border: 'border-amber-500',
      bg: 'bg-amber-500/10',
      badge: 'bg-amber-500',
      badgeText: 'Tayyorlanmoqda',
    },
    READY: {
      border: 'border-green-500',
      bg: 'bg-green-500/10',
      badge: 'bg-green-500',
      badgeText: 'Tayyor',
    },
  };

  const config = statusConfig[order.status];
  const pendingItems = order.items.filter((i) => i.status === 'PENDING').length;
  const preparingItems = order.items.filter((i) => i.status === 'PREPARING').length;
  const readyItems = order.items.filter((i) => i.status === 'READY').length;

  return (
    <div className={cn(
      'rounded-xl border-2 bg-slate-900 overflow-hidden transition-all',
      config.border,
      order.priority === 'high' && 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-950'
    )}>
      {/* Order Header */}
      <div className={cn('px-4 py-3 border-b border-slate-800', config.bg)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{order.orderNumber}</span>
            {order.priority === 'high' && (
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium">
                <Bell size={10} />
                Tezkor
              </span>
            )}
          </div>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium text-white', config.badge)}>
            {config.badgeText}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <TypeIcon size={14} />
            <span>
              {order.tableNumber ? `Stol #${order.tableNumber}` : getOrderTypeLabel(order.type)}
            </span>
          </div>
          <div className={cn('flex items-center gap-1', getTimerColor(order.createdAt))}>
            <Clock size={12} />
            <span className="font-medium">{getTimeAgo(order.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-slate-800/50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Jarayon:</span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden flex">
            {readyItems > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${(readyItems / order.items.length) * 100}%` }}
              />
            )}
            {preparingItems > 0 && (
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(preparingItems / order.items.length) * 100}%` }}
              />
            )}
          </div>
          <span>{readyItems}/{order.items.length}</span>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {order.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center justify-between rounded-lg p-3 transition-colors',
              item.status === 'READY'
                ? 'bg-green-500/10 border border-green-500/30'
                : item.status === 'PREPARING'
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-slate-800 border border-slate-700'
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {item.quantity}x {item.name}
                </span>
                {item.status === 'READY' && (
                  <CheckCircle size={14} className="text-green-400" />
                )}
                {item.status === 'PREPARING' && (
                  <Timer size={14} className="text-amber-400 animate-pulse" />
                )}
              </div>
              {item.notes && (
                <p className="text-sm text-amber-400 mt-1">📝 {item.notes}</p>
              )}
            </div>

            {order.status !== 'READY' && (
              <div className="flex gap-1 ml-2">
                {item.status === 'PENDING' && (
                  <button
                    onClick={() => onItemStatus(order.id, item.id, 'PREPARING')}
                    className="flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-xs font-medium hover:bg-amber-600 transition-colors"
                  >
                    <Play size={10} />
                    Boshlash
                  </button>
                )}
                {item.status === 'PREPARING' && (
                  <button
                    onClick={() => onItemStatus(order.id, item.id, 'READY')}
                    className="flex items-center gap-1 rounded-lg bg-green-500 px-2 py-1 text-xs font-medium hover:bg-green-600 transition-colors"
                  >
                    <Check size={10} />
                    Tayyor
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {order.status === 'NEW' && pendingItems > 0 && (
          <button
            onClick={() => onStartAll(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 font-medium hover:bg-amber-600 transition-colors"
          >
            <Play size={16} />
            Hammasini boshlash
          </button>
        )}

        {order.status === 'PREPARING' && (
          <button
            onClick={() => onMarkReady(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 py-3 font-medium hover:bg-green-600 transition-colors"
          >
            <CheckCircle size={16} />
            Tayyor deb belgilash
          </button>
        )}

        {order.status === 'READY' && (
          <button
            onClick={() => onComplete(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 py-3 font-medium hover:bg-blue-600 transition-colors"
          >
            <Check size={16} />
            Topshirildi
          </button>
        )}
      </div>
    </div>
  );
}
