import { useState, useEffect, useCallback } from 'react';
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
  Play,
  Check,
  Search,
  X,
  User,
  MessageSquare,
  ChevronRight,
  Flame,
  BarChart3,
  TrendingUp,
  Award,
  Eye,
} from 'lucide-react';

// ============ TYPES ============

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
  category?: string;
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
  waiterName?: string;
  totalItems: number;
}

// ============ DEMO DATA ============

const demoOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-001',
    tableNumber: 3,
    type: 'DINE_IN',
    status: 'NEW',
    priority: 'normal',
    waiterName: 'Sardor A.',
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    totalItems: 5,
    items: [
      { id: '1', name: "O'zbek oshi", quantity: 2, status: 'PENDING', category: 'Asosiy taomlar' },
      { id: '2', name: 'Achichuk', quantity: 2, status: 'PENDING', category: 'Salatlar' },
      { id: '3', name: "Ko'k choy", quantity: 1, status: 'PENDING', category: 'Ichimliklar' },
    ],
  },
  {
    id: '2',
    orderNumber: 'ORD-002',
    tableNumber: 7,
    type: 'DINE_IN',
    status: 'PREPARING',
    priority: 'high',
    waiterName: 'Dilshod K.',
    createdAt: new Date(Date.now() - 14 * 60 * 1000),
    totalItems: 5,
    items: [
      { id: '4', name: 'Shashlik (4 shish)', quantity: 1, notes: 'Kam pishgan', status: 'PREPARING', category: 'Asosiy taomlar' },
      { id: '5', name: "Sho'rva", quantity: 2, status: 'READY', category: 'Birinchi taomlar' },
      { id: '6', name: 'Non', quantity: 2, status: 'READY', category: 'Non' },
    ],
  },
  {
    id: '3',
    orderNumber: 'ORD-003',
    tableNumber: null,
    type: 'TAKEAWAY',
    status: 'NEW',
    priority: 'normal',
    waiterName: 'Sardor A.',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    totalItems: 2,
    items: [
      { id: '7', name: "Lag'mon", quantity: 1, status: 'PENDING', category: 'Birinchi taomlar' },
      { id: '8', name: 'Manti', quantity: 1, notes: 'Qaymoqsiz, tuzsiz', status: 'PENDING', category: 'Asosiy taomlar' },
    ],
  },
  {
    id: '4',
    orderNumber: 'ORD-004',
    tableNumber: 1,
    type: 'DINE_IN',
    status: 'PREPARING',
    priority: 'normal',
    waiterName: 'Bobur M.',
    createdAt: new Date(Date.now() - 22 * 60 * 1000),
    totalItems: 6,
    items: [
      { id: '9', name: 'Samarqand oshi', quantity: 3, status: 'PREPARING', category: 'Asosiy taomlar' },
      { id: '10', name: 'Shakarob', quantity: 3, status: 'READY', category: 'Salatlar' },
    ],
  },
  {
    id: '5',
    orderNumber: 'ORD-005',
    tableNumber: 5,
    type: 'DINE_IN',
    status: 'READY',
    priority: 'normal',
    waiterName: 'Dilshod K.',
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
    totalItems: 4,
    items: [
      { id: '11', name: 'Chuchvara', quantity: 2, status: 'READY', category: 'Birinchi taomlar' },
      { id: '12', name: "Ko'k choy", quantity: 2, status: 'READY', category: 'Ichimliklar' },
    ],
  },
  {
    id: '6',
    orderNumber: 'ORD-006',
    tableNumber: 9,
    type: 'DINE_IN',
    status: 'NEW',
    priority: 'normal',
    waiterName: 'Bobur M.',
    createdAt: new Date(Date.now() - 1 * 60 * 1000),
    totalItems: 3,
    items: [
      { id: '13', name: 'Kabob', quantity: 2, notes: 'Achchiq sousli', status: 'PENDING', category: 'Asosiy taomlar' },
      { id: '14', name: 'Somsa', quantity: 1, status: 'PENDING', category: 'Pishiriqlar' },
    ],
  },
  {
    id: '7',
    orderNumber: 'ORD-007',
    tableNumber: null,
    type: 'DELIVERY',
    status: 'PREPARING',
    priority: 'high',
    waiterName: 'Sardor A.',
    createdAt: new Date(Date.now() - 18 * 60 * 1000),
    totalItems: 4,
    items: [
      { id: '15', name: "Lag'mon", quantity: 2, status: 'READY', category: 'Birinchi taomlar' },
      { id: '16', name: "Qo'y go'shti kabob", quantity: 2, status: 'PREPARING', category: 'Asosiy taomlar' },
    ],
  },
];

// ============ HELPERS ============

function getTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Hozirgina';
  if (minutes < 60) return `${minutes} daq`;
  return `${Math.floor(minutes / 60)} soat ${minutes % 60} daq`;
}

function getMinutesAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 60000);
}

function isDelayed(date: Date): boolean {
  return getMinutesAgo(date) > 15;
}

function isUrgent(date: Date): boolean {
  return getMinutesAgo(date) > 20;
}

function getTimerColor(date: Date): string {
  const minutes = getMinutesAgo(date);
  if (minutes < 10) return 'text-green-400';
  if (minutes < 15) return 'text-yellow-400';
  if (minutes < 20) return 'text-orange-400';
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

// ============ MAIN APP ============

export default function App() {
  const [orders, setOrders] = useState<Order[]>(demoOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer update every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Simulate new order notification
  useEffect(() => {
    const hasNew = orders.some((o) => o.status === 'NEW' && getMinutesAgo(o.createdAt) < 2);
    if (hasNew) {
      setNewOrderFlash(true);
      const timeout = setTimeout(() => setNewOrderFlash(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [orders]);

  const handleItemStatus = useCallback((orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        );
        const allReady = updatedItems.every((item) => item.status === 'READY');
        const anyPreparing = updatedItems.some(
          (item) => item.status === 'PREPARING' || item.status === 'READY'
        );
        let newOrderStatus: Order['status'] = 'NEW';
        if (allReady) newOrderStatus = 'READY';
        else if (anyPreparing) newOrderStatus = 'PREPARING';
        return { ...order, items: updatedItems, status: newOrderStatus };
      })
    );

    if (newStatus === 'READY' && soundEnabled) {
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
    }
  }, [soundEnabled]);

  const handleStartAllItems = useCallback((orderId: string) => {
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
  }, []);

  const handleMarkOrderReady = useCallback((orderId: string) => {
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
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
    }
  }, [soundEnabled]);

  const handleCompleteOrder = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    setSelectedOrder(null);
  }, []);

  // Filtered & sorted
  const newOrders = orders
    .filter((o) => o.status === 'NEW')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const preparingOrders = orders
    .filter((o) => o.status === 'PREPARING')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const readyOrders = orders
    .filter((o) => o.status === 'READY')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Search filter
  const filterBySearch = (list: Order[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.tableNumber && o.tableNumber.toString().includes(q)) ||
        o.items.some((i) => i.name.toLowerCase().includes(q)) ||
        (o.waiterName && o.waiterName.toLowerCase().includes(q))
    );
  };

  const filteredNew = filterBySearch(newOrders);
  const filteredPreparing = filterBySearch(preparingOrders);
  const filteredReady = filterBySearch(readyOrders);

  // Statistics
  const totalOrdersToday = orders.length;
  const completedToday = 12; // Mock
  const avgPrepTime = 18; // Mock - minutes
  const delayedCount = orders.filter((o) => o.status !== 'READY' && isDelayed(o.createdAt)).length;

  // Kitchen stats data
  const topDishes = [
    { name: "O'zbek oshi", count: 24 },
    { name: 'Shashlik', count: 18 },
    { name: "Lag'mon", count: 15 },
    { name: "Sho'rva", count: 12 },
    { name: 'Manti', count: 10 },
  ];

  const hourlyStats = [
    { hour: '10:00', count: 5 },
    { hour: '11:00', count: 8 },
    { hour: '12:00', count: 18 },
    { hour: '13:00', count: 22 },
    { hour: '14:00', count: 15 },
    { hour: '15:00', count: 8 },
    { hour: '16:00', count: 6 },
    { hour: '17:00', count: 4 },
    { hour: '18:00', count: 12 },
    { hour: '19:00', count: 20 },
    { hour: '20:00', count: 25 },
    { hour: '21:00', count: 18 },
  ];

  const maxHourlyCount = Math.max(...hourlyStats.map((h) => h.count));

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 transition-all',
            newOrderFlash && 'animate-pulse ring-4 ring-orange-500/50'
          )}>
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Oshxona Paneli</h1>
            <p className="text-xs text-slate-500">Buyurtmalar boshqaruvi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-5 mr-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                newOrderFlash ? 'bg-red-500 animate-pulse' : 'bg-red-500/20'
              )}>
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
            {delayedCount > 0 && (
              <div className="flex items-center gap-2 animate-pulse">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/30">
                  <Flame size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-red-400">Kechikkan</p>
                  <p className="font-bold text-red-500">{delayedCount}</p>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Stol, buyurtma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 rounded-lg bg-slate-800 pl-9 pr-8 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              showStats
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            <BarChart3 size={18} />
            <span className="hidden sm:inline">Statistika</span>
          </button>

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
          </button>

          {/* Clock */}
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2">
            <Clock size={16} className="text-orange-400" />
            <span className="text-lg font-bold tabular-nums">
              {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Kanban Board */}
        <div className={cn('flex flex-1 gap-4 p-4 overflow-hidden transition-all', showStats && 'pr-0')}>
          {/* Column: Yangi */}
          <KanbanColumn
            title="Yangi"
            icon={<AlertCircle size={18} />}
            count={filteredNew.length}
            color="red"
            orders={filteredNew}
            onItemStatus={handleItemStatus}
            onStartAll={handleStartAllItems}
            onMarkReady={handleMarkOrderReady}
            onComplete={handleCompleteOrder}
            onSelectOrder={setSelectedOrder}
          />

          {/* Column: Tayyorlanmoqda */}
          <KanbanColumn
            title="Tayyorlanmoqda"
            icon={<Timer size={18} />}
            count={filteredPreparing.length}
            color="amber"
            orders={filteredPreparing}
            onItemStatus={handleItemStatus}
            onStartAll={handleStartAllItems}
            onMarkReady={handleMarkOrderReady}
            onComplete={handleCompleteOrder}
            onSelectOrder={setSelectedOrder}
          />

          {/* Column: Tayyor */}
          <KanbanColumn
            title="Tayyor"
            icon={<CheckCircle size={18} />}
            count={filteredReady.length}
            color="green"
            orders={filteredReady}
            onItemStatus={handleItemStatus}
            onStartAll={handleStartAllItems}
            onMarkReady={handleMarkOrderReady}
            onComplete={handleCompleteOrder}
            onSelectOrder={setSelectedOrder}
          />
        </div>

        {/* Statistics Panel */}
        {showStats && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-900 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 size={20} className="text-orange-400" />
                Statistika
              </h3>
              <button onClick={() => setShowStats(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-slate-500">Jami bugun</p>
                <p className="text-2xl font-bold text-white">{totalOrdersToday + completedToday}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-slate-500">Bajarilgan</p>
                <p className="text-2xl font-bold text-green-400">{completedToday}</p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <TrendingUp size={12} />
                  O'rtacha vaqt
                </p>
                <p className="text-2xl font-bold text-amber-400">{avgPrepTime}<span className="text-sm text-slate-500"> daq</span></p>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <p className="text-xs text-slate-500">Kechikkan</p>
                <p className={cn('text-2xl font-bold', delayedCount > 0 ? 'text-red-400' : 'text-green-400')}>
                  {delayedCount}
                </p>
              </div>
            </div>

            {/* Top Dishes */}
            <div className="rounded-lg bg-slate-800 p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                Eng ko'p tayyorlangan
              </h4>
              <div className="space-y-2">
                {topDishes.map((dish, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      i === 0 ? 'bg-amber-500 text-white' :
                      i === 1 ? 'bg-slate-400 text-white' :
                      i === 2 ? 'bg-orange-700 text-white' :
                      'bg-slate-700 text-slate-400'
                    )}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-300">{dish.name}</span>
                    <span className="text-sm font-bold text-white">{dish.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Flow */}
            <div className="rounded-lg bg-slate-800 p-4">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                Soatlik buyurtmalar
              </h4>
              <div className="space-y-1.5">
                {hourlyStats.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-12 text-xs text-slate-500 tabular-nums">{h.hour}</span>
                    <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          h.count > 20 ? 'bg-red-500' : h.count > 15 ? 'bg-orange-500' : h.count > 10 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${(h.count / maxHourlyCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-xs text-slate-400 text-right tabular-nums">{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onItemStatus={handleItemStatus}
          onStartAll={handleStartAllItems}
          onMarkReady={handleMarkOrderReady}
          onComplete={handleCompleteOrder}
        />
      )}
    </div>
  );
}

// ============ KANBAN COLUMN ============

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  color: 'red' | 'amber' | 'green';
  orders: Order[];
  onItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onStartAll: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  onSelectOrder: (order: Order) => void;
}

const colorMap = {
  red: {
    header: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    badge: 'bg-red-500',
    dot: 'bg-red-500',
  },
  amber: {
    header: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
    badge: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  green: {
    header: 'bg-green-500/10 border-green-500/30',
    text: 'text-green-400',
    badge: 'bg-green-500',
    dot: 'bg-green-500',
  },
};

function KanbanColumn({
  title, icon, count, color, orders,
  onItemStatus, onStartAll, onMarkReady, onComplete, onSelectOrder,
}: KanbanColumnProps) {
  const c = colorMap[color];
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      {/* Column Header */}
      <div className={cn('flex items-center justify-between border-b px-4 py-3', c.header)}>
        <div className="flex items-center gap-2">
          <span className={c.text}>{icon}</span>
          <h2 className="font-bold">{title}</h2>
        </div>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white', c.badge)}>
          {count}
        </span>
      </div>

      {/* Column Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
            <ChefHat size={40} className="mb-2 opacity-30" />
            <p className="text-sm">Buyurtma yo'q</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onItemStatus={onItemStatus}
              onStartAll={onStartAll}
              onMarkReady={onMarkReady}
              onComplete={onComplete}
              onSelect={() => onSelectOrder(order)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============ ORDER CARD ============

interface OrderCardProps {
  order: Order;
  onItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onStartAll: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  onSelect: () => void;
}

function OrderCard({ order, onItemStatus, onStartAll, onMarkReady, onComplete, onSelect }: OrderCardProps) {
  const TypeIcon = getOrderTypeIcon(order.type);
  const delayed = order.status !== 'READY' && isDelayed(order.createdAt);
  const urgent = order.status !== 'READY' && isUrgent(order.createdAt);
  const readyItems = order.items.filter((i) => i.status === 'READY').length;
  const hasNotes = order.items.some((i) => i.notes);

  const statusBorder = {
    NEW: delayed ? 'border-red-600 bg-red-500/5' : 'border-red-500/40',
    PREPARING: delayed ? 'border-red-600 bg-red-500/5' : 'border-amber-500/40',
    READY: 'border-green-500/40',
  };

  return (
    <div
      className={cn(
        'rounded-xl border-2 bg-slate-900 overflow-hidden transition-all',
        statusBorder[order.status],
        urgent && 'animate-pulse',
        order.priority === 'high' && 'ring-2 ring-red-500 ring-offset-1 ring-offset-slate-950'
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">{order.orderNumber}</span>
          {order.priority === 'high' && (
            <Flame size={14} className="text-red-500" />
          )}
          {hasNotes && (
            <MessageSquare size={12} className="text-amber-400" />
          )}
        </div>
        <button
          onClick={onSelect}
          className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Eye size={12} />
          Batafsil
        </button>
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/30 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1">
            <TypeIcon size={12} />
            {order.tableNumber ? `Stol #${order.tableNumber}` : getOrderTypeLabel(order.type)}
          </span>
          {order.waiterName && (
            <span className="flex items-center gap-1">
              <User size={11} />
              {order.waiterName}
            </span>
          )}
        </div>
        <span className={cn('flex items-center gap-1 font-bold', getTimerColor(order.createdAt))}>
          <Clock size={11} />
          {getTimeAgo(order.createdAt)}
        </span>
      </div>

      {/* Progress */}
      {order.status !== 'READY' && order.status !== 'NEW' && (
        <div className="px-3 py-1.5 bg-slate-800/20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(readyItems / order.items.length) * 100}%` }}
              />
            </div>
            <span className="tabular-nums">{readyItems}/{order.items.length}</span>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="px-3 py-2 space-y-1.5">
        {order.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors',
              item.status === 'READY'
                ? 'bg-green-500/10 text-green-300'
                : item.status === 'PREPARING'
                ? 'bg-amber-500/10 text-amber-200'
                : 'bg-slate-800/60 text-slate-300'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">{item.quantity}x</span>
                <span className={cn(item.status === 'READY' && 'line-through opacity-60')}>
                  {item.name}
                </span>
                {item.status === 'READY' && <CheckCircle size={12} className="text-green-400 shrink-0" />}
                {item.status === 'PREPARING' && <Timer size={12} className="text-amber-400 animate-pulse shrink-0" />}
              </div>
              {item.notes && (
                <p className="text-xs text-amber-400 mt-0.5 truncate">⚠ {item.notes}</p>
              )}
            </div>

            {order.status !== 'READY' && (
              <div className="ml-2 shrink-0">
                {item.status === 'PENDING' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onItemStatus(order.id, item.id, 'PREPARING'); }}
                    className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium hover:bg-amber-600 transition-colors"
                  >
                    <Play size={10} />
                  </button>
                )}
                {item.status === 'PREPARING' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onItemStatus(order.id, item.id, 'READY'); }}
                    className="rounded-md bg-green-500 px-2 py-1 text-xs font-medium hover:bg-green-600 transition-colors"
                  >
                    <Check size={10} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Action */}
      <div className="px-3 py-2.5 border-t border-slate-800/50">
        {order.status === 'NEW' && (
          <button
            onClick={() => onStartAll(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-bold hover:bg-amber-600 transition-colors"
          >
            <Play size={14} />
            Tayyorlashni boshlash
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => onMarkReady(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-bold hover:bg-green-600 transition-colors"
          >
            <CheckCircle size={14} />
            Tayyor
          </button>
        )}
        {order.status === 'READY' && (
          <button
            onClick={() => onComplete(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-bold hover:bg-blue-600 transition-colors"
          >
            <Check size={14} />
            Topshirildi
          </button>
        )}
      </div>
    </div>
  );
}

// ============ ORDER DETAIL MODAL ============

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onStartAll: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onComplete: (orderId: string) => void;
}

function OrderDetailModal({ order, onClose, onItemStatus, onStartAll, onMarkReady, onComplete }: OrderDetailModalProps) {
  const TypeIcon = getOrderTypeIcon(order.type);
  const readyItems = order.items.filter((i) => i.status === 'READY').length;
  const preparingItems = order.items.filter((i) => i.status === 'PREPARING').length;
  const pendingItems = order.items.filter((i) => i.status === 'PENDING').length;
  const delayed = order.status !== 'READY' && isDelayed(order.createdAt);

  const statusLabel = {
    NEW: { text: 'Yangi buyurtma', color: 'bg-red-500' },
    PREPARING: { text: 'Tayyorlanmoqda', color: 'bg-amber-500' },
    READY: { text: 'Tayyor', color: 'bg-green-500' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl bg-slate-900 border-2 shadow-2xl overflow-hidden',
          delayed ? 'border-red-500' : 'border-slate-700'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{order.orderNumber}</span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium text-white', statusLabel[order.status].color)}>
              {statusLabel[order.status].text}
            </span>
            {order.priority === 'high' && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                <Flame size={12} />
                Tezkor
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Order Info */}
        <div className="grid grid-cols-3 gap-4 border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Stol / Turi</p>
            <div className="flex items-center gap-1.5 font-medium">
              <TypeIcon size={16} className="text-orange-400" />
              {order.tableNumber ? `Stol #${order.tableNumber}` : getOrderTypeLabel(order.type)}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Ofitsiant</p>
            <div className="flex items-center gap-1.5 font-medium">
              <User size={16} className="text-blue-400" />
              {order.waiterName || '—'}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Vaqt</p>
            <div className={cn('flex items-center gap-1.5 font-medium', getTimerColor(order.createdAt))}>
              <Clock size={16} />
              {getTimeAgo(order.createdAt)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-6 border-b border-slate-800 px-6 py-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-600" />
            <span className="text-slate-400">Kutmoqda: <b className="text-white">{pendingItems}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-slate-400">Tayyorlanmoqda: <b className="text-white">{preparingItems}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-slate-400">Tayyor: <b className="text-white">{readyItems}</b></span>
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-72 overflow-y-auto px-6 py-4 space-y-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between rounded-xl p-4 transition-all',
                item.status === 'READY'
                  ? 'bg-green-500/10 border border-green-500/30'
                  : item.status === 'PREPARING'
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-slate-800 border border-slate-700'
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-orange-400">{item.quantity}x</span>
                  <span className="font-medium text-white">{item.name}</span>
                  {item.category && (
                    <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs text-slate-400">{item.category}</span>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-amber-400">
                    <MessageSquare size={12} />
                    {item.notes}
                  </p>
                )}
              </div>

              {order.status !== 'READY' && (
                <div className="flex items-center gap-2 ml-4">
                  {item.status === 'PENDING' && (
                    <button
                      onClick={() => onItemStatus(order.id, item.id, 'PREPARING')}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      <Play size={12} />
                      Boshlash
                    </button>
                  )}
                  {item.status === 'PREPARING' && (
                    <button
                      onClick={() => onItemStatus(order.id, item.id, 'READY')}
                      className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      <Check size={12} />
                      Tayyor
                    </button>
                  )}
                  {item.status === 'READY' && (
                    <CheckCircle size={20} className="text-green-400" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 border-t border-slate-800 px-6 py-4">
          {order.status === 'NEW' && (
            <button
              onClick={() => { onStartAll(order.id); onClose(); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold hover:bg-amber-600 transition-colors"
            >
              <Play size={16} />
              Hammasini boshlash
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button
              onClick={() => { onMarkReady(order.id); onClose(); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-bold hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={16} />
              Hammasi tayyor
            </button>
          )}
          {order.status === 'READY' && (
            <button
              onClick={() => { onComplete(order.id); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-bold hover:bg-blue-600 transition-colors"
            >
              <ChevronRight size={16} />
              Topshirildi - Ofitsiantga yuborish
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-6 py-3 font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
