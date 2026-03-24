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
  Flame,
  BarChart3,
  TrendingUp,
  Award,
  Eye,
  RefreshCw,
  Sun,
  Moon,
  LogIn,
  Phone,
  Lock,
  LogOut,
  Loader2,
} from 'lucide-react';
import { kitchenService, type KitchenOrder } from './services/kitchen.service';
import { socketService } from './services/socket.service';
import { useAuthStore } from './store/auth';
import { settingsService, type BusinessSettings } from './services/settings.service';

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

type FilterTab = 'ALL' | 'NEW' | 'PREPARING' | 'READY';

// ============ API DATA MAPPER ============

function mapApiOrderToOrder(apiOrder: KitchenOrder): Order {
  const items: OrderItem[] = apiOrder.items.map((item) => ({
    id: item.id,
    name: item.product?.name || 'Noma\'lum',
    quantity: item.quantity,
    notes: item.notes,
    status: item.status === 'SERVED' || item.status === 'CANCELLED' ? 'READY' : item.status as OrderItem['status'],
  }));

  const allReady = items.every((i) => i.status === 'READY');
  const anyPreparing = items.some((i) => i.status === 'PREPARING' || i.status === 'READY');

  let status: Order['status'] = 'NEW';
  if (allReady) status = 'READY';
  else if (anyPreparing) status = 'PREPARING';
  if (apiOrder.status === 'PREPARING') status = status === 'NEW' ? 'PREPARING' : status;

  const minutesAgo = Math.floor((Date.now() - new Date(apiOrder.createdAt).getTime()) / 60000);

  return {
    id: apiOrder.id,
    orderNumber: apiOrder.orderNumber,
    tableNumber: apiOrder.table?.number ?? null,
    type: apiOrder.type,
    items,
    createdAt: new Date(apiOrder.createdAt),
    status,
    priority: minutesAgo > 20 ? 'high' : 'normal',
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

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

function getTimerColor(date: Date, isDark: boolean): string {
  const minutes = getMinutesAgo(date);
  if (minutes < 10) return isDark ? 'text-green-400' : 'text-green-600';
  if (minutes < 15) return isDark ? 'text-yellow-400' : 'text-yellow-600';
  if (minutes < 20) return isDark ? 'text-orange-400' : 'text-orange-600';
  return isDark ? 'text-red-400' : 'text-red-600';
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

// ============ THEME HOOK ============

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('kitchen-theme');
    if (saved) return saved === 'dark';
    return true; // default dark for kitchen
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('kitchen-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

// ============ LOGIN PAGE ============

function LoginPage({ isDark }: { isDark: boolean }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('998') ? `+${cleanPhone}` : `+998${cleanPhone}`;
    await login(fullPhone, password);
  };

  return (
    <div className={cn('min-h-screen flex items-center justify-center', isDark ? 'bg-slate-950' : 'bg-gray-50')}>
      <div className={cn('w-full max-w-md rounded-2xl p-8 shadow-xl border', isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200')}>
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 mb-4">
            <ChefHat className="h-8 w-8 text-white" />
          </div>
          <h1 className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>Oshxona Paneli</h1>
          <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>Oshpaz sifatida kiring</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-300' : 'text-gray-700')}>
              Telefon raqam
            </label>
            <div className="relative">
              <Phone size={16} className={cn('absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500' : 'text-gray-400')} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); clearError(); }}
                placeholder="+998 90 123 45 67"
                className={cn(
                  'w-full rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500',
                  isDark ? 'bg-slate-800 text-white placeholder:text-slate-500 border border-slate-700' : 'bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200'
                )}
              />
            </div>
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1.5', isDark ? 'text-slate-300' : 'text-gray-700')}>
              Parol
            </label>
            <div className="relative">
              <Lock size={16} className={cn('absolute left-3 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500' : 'text-gray-400')} />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                placeholder="Parolni kiriting"
                className={cn(
                  'w-full rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500',
                  isDark ? 'bg-slate-800 text-white placeholder:text-slate-500 border border-slate-700' : 'bg-gray-50 text-gray-900 placeholder:text-gray-400 border border-gray-200'
                )}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !phone || !password}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white transition-colors',
              isLoading ? 'bg-orange-400 cursor-wait' : 'bg-orange-500 hover:bg-orange-600',
              (!phone || !password) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {isLoading ? 'Kirish...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ MAIN APP ============

export default function App() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [, setTick] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [bizSettings, setBizSettings] = useState<BusinessSettings | null>(null);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage isDark={isDark} />;
  }

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoadingOrders(true);
      const apiOrders = await kitchenService.getOrders();
      const mapped = apiOrders.map(mapApiOrderToOrder);
      // Faqat faol buyurtmalar — COMPLETED va CANCELLED ni ko'rsatmaslik
      const activeOrders = mapped.filter(o => o.status !== 'READY');
      setOrders(activeOrders);
    } catch (err) {
      console.error('[Kitchen] Buyurtmalarni yuklashda xatolik:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Initial fetch + polling every 15s
  useEffect(() => {
    fetchOrders();
    // Biznes sozlamalarini yuklash
    settingsService.get().then(setBizSettings).catch(() => {});
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Socket.IO real-time updates
  useEffect(() => {
    socketService.connect();

    const unsubNew = socketService.onNewOrder(() => {
      fetchOrders();
      setNewOrderFlash(true);
      if (soundEnabled) {
        try { new Audio('/notification.mp3').play().catch(() => {}); } catch { /* ignore */ }
      }
    });

    const unsubStatus = socketService.onOrderStatus(() => {
      fetchOrders();
    });

    const unsubItemStatus = socketService.onItemStatus(() => {
      fetchOrders();
    });

    const unsubUpdated = socketService.onOrderUpdated(() => {
      fetchOrders();
    });

    return () => {
      unsubNew();
      unsubStatus();
      unsubItemStatus();
      unsubUpdated();
      socketService.disconnect();
    };
  }, [fetchOrders, soundEnabled]);

  // Timer update every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // New order flash
  useEffect(() => {
    if (newOrderFlash) {
      const timeout = setTimeout(() => setNewOrderFlash(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [newOrderFlash]);

  const handleItemStatus = useCallback(async (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    // Optimistic update
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

    // API call
    try {
      await kitchenService.updateItemStatus(orderId, itemId, newStatus);
    } catch (err) {
      console.error('[Kitchen] Item status yangilashda xatolik:', err);
      fetchOrders(); // Revert on error
    }

    if (newStatus === 'READY' && soundEnabled) {
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch { /* ignore */ }
    }
  }, [soundEnabled, fetchOrders]);

  const handleStartAllItems = useCallback(async (orderId: string) => {
    // Optimistic update
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

    // API calls - update each pending item
    try {
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        const pendingItems = order.items.filter((i) => i.status === 'PENDING');
        await Promise.all(
          pendingItems.map((item) =>
            kitchenService.updateItemStatus(orderId, item.id, 'PREPARING')
          )
        );
      }
    } catch (err) {
      console.error('[Kitchen] Barcha itemlarni boshlashda xatolik:', err);
      fetchOrders();
    }
  }, [orders, fetchOrders]);

  const handleMarkOrderReady = useCallback(async (orderId: string) => {
    // Tasdiqlash dialog
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const itemNames = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    if (!confirm(`Buyurtma #${order.orderNumber} tayyor deb belgilansinmi?\n\n${itemNames}`)) return;

    // API calls - mark all items as READY
    try {
      const nonReadyItems = order.items.filter((i) => i.status !== 'READY');
      await Promise.all(
        nonReadyItems.map((item) =>
          kitchenService.updateItemStatus(orderId, item.id, 'READY')
        )
      );
      // READY bo'lgandan keyin 2 soniyada ro'yxatdan o'chirish
      setTimeout(() => {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }, 2000);
      // Optimistic: darhol READY ga o'tkazish
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'READY' as const, items: o.items.map((item) => ({ ...item, status: 'READY' as const })) }
            : o
        )
      );
    } catch (err) {
      console.error('[Kitchen] Buyurtmani tayyor qilishda xatolik:', err);
      fetchOrders();
    }

    if (soundEnabled) {
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch { /* ignore */ }
    }
  }, [orders, soundEnabled, fetchOrders]);

  const handleCompleteOrder = useCallback(async (orderId: string) => {
    // Optimistic remove
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
    setSelectedOrder(null);

    // API call - mark order as READY (it will be picked up by waiter/POS)
    try {
      await kitchenService.updateOrderStatus(orderId, 'READY');
    } catch (err) {
      console.error('[Kitchen] Buyurtmani yakunlashda xatolik:', err);
      fetchOrders();
    }
  }, [fetchOrders]);

  // Counts
  const newCount = orders.filter((o) => o.status === 'NEW').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;
  const delayedCount = orders.filter((o) => o.status !== 'READY' && isDelayed(o.createdAt)).length;

  // Filter + Search
  const filteredOrders = orders
    .filter((o) => activeFilter === 'ALL' || o.status === activeFilter)
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.tableNumber && o.tableNumber.toString().includes(q)) ||
        o.items.some((i) => i.name.toLowerCase().includes(q)) ||
        (o.waiterName && o.waiterName.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Statistics
  const completedToday = 12;
  const avgPrepTime = 18;
  const topDishes = [
    { name: "O'zbek oshi", count: 24 },
    { name: 'Shashlik', count: 18 },
    { name: "Lag'mon", count: 15 },
    { name: "Sho'rva", count: 12 },
    { name: 'Manti', count: 10 },
  ];
  const hourlyStats = [
    { hour: '10:00', count: 5 }, { hour: '11:00', count: 8 }, { hour: '12:00', count: 18 },
    { hour: '13:00', count: 22 }, { hour: '14:00', count: 15 }, { hour: '15:00', count: 8 },
    { hour: '16:00', count: 6 }, { hour: '17:00', count: 4 }, { hour: '18:00', count: 12 },
    { hour: '19:00', count: 20 }, { hour: '20:00', count: 25 }, { hour: '21:00', count: 18 },
  ];
  const maxHourlyCount = Math.max(...hourlyStats.map((h) => h.count));

  const filterTabs: { key: FilterTab; label: string; count: number; color: string; activeColor: string }[] = [
    { key: 'ALL', label: 'Barchasi', count: orders.length, color: 'text-gray-400', activeColor: 'bg-orange-500 text-white' },
    { key: 'NEW', label: 'Yangi', count: newCount, color: 'text-red-400', activeColor: 'bg-red-500 text-white' },
    { key: 'PREPARING', label: 'Tayyorlanmoqda', count: preparingCount, color: 'text-amber-400', activeColor: 'bg-amber-500 text-white' },
    { key: 'READY', label: 'Tayyor', count: readyCount, color: 'text-green-400', activeColor: 'bg-green-500 text-white' },
  ];

  return (
    <div className={cn('min-h-screen transition-colors duration-300', isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900')}>
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-30 border-b px-4 py-3',
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200 shadow-sm'
      )}>
        <div className="flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 transition-all',
              newOrderFlash && 'animate-pulse ring-4 ring-orange-500/50'
            )}>
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{bizSettings?.name || 'Oshxona Paneli'}</h1>
              <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Buyurtmalar boshqaruvi</p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Status counters - visible on lg */}
            <div className="hidden lg:flex items-center gap-4 mr-3">
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  newOrderFlash ? 'bg-red-500 animate-pulse' : isDark ? 'bg-red-500/20' : 'bg-red-100'
                )}>
                  <AlertCircle size={14} className="text-red-500" />
                </div>
                <span className="text-sm font-bold text-red-500">{newCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', isDark ? 'bg-amber-500/20' : 'bg-amber-100')}>
                  <Timer size={14} className="text-amber-500" />
                </div>
                <span className="text-sm font-bold text-amber-500">{preparingCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', isDark ? 'bg-green-500/20' : 'bg-green-100')}>
                  <CheckCircle size={14} className="text-green-500" />
                </div>
                <span className="text-sm font-bold text-green-500">{readyCount}</span>
              </div>
              {delayedCount > 0 && (
                <div className="flex items-center gap-1.5 animate-pulse">
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', isDark ? 'bg-red-600/30' : 'bg-red-100')}>
                    <Flame size={14} className="text-red-600" />
                  </div>
                  <span className="text-sm font-bold text-red-600">{delayedCount}</span>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={15} className={cn('absolute left-2.5 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500' : 'text-gray-400')} />
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-36 rounded-lg pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50',
                  isDark ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-gray-100 text-gray-900 placeholder:text-gray-400 border border-gray-200'
                )}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className={cn('absolute right-2 top-1/2 -translate-y-1/2', isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-700')}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Stats Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                showStats
                  ? 'bg-orange-500 text-white'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <BarChart3 size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                soundEnabled
                  ? isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              )}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchOrders}
              disabled={isLoadingOrders}
              className={cn(
                'flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
                isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <RefreshCw size={16} className={isLoadingOrders ? 'animate-spin' : ''} />
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isDark ? 'bg-slate-800 text-red-400 hover:bg-red-500/20' : 'bg-gray-100 text-red-500 hover:bg-red-50'
              )}
              title={user ? `${user.firstName} - Chiqish` : 'Chiqish'}
            >
              <LogOut size={16} />
            </button>

            {/* Clock */}
            <div className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2',
              isDark ? 'bg-slate-800' : 'bg-gray-100'
            )}>
              <Clock size={15} className="text-orange-500" />
              <span className="text-sm font-bold tabular-nums">
                {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-3">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeFilter === tab.key
                  ? tab.activeColor
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {tab.label}
              <span className={cn(
                'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
                activeFilter === tab.key
                  ? 'bg-white/20 text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Grid Content */}
        <main className="flex-1 p-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <ChefHat size={64} className={cn('mb-4', isDark ? 'text-slate-700' : 'text-gray-300')} />
              <p className={cn('text-lg', isDark ? 'text-slate-600' : 'text-gray-400')}>Buyurtma topilmadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isDark={isDark}
                  onItemStatus={handleItemStatus}
                  onStartAll={handleStartAllItems}
                  onMarkReady={handleMarkOrderReady}
                  onComplete={handleCompleteOrder}
                  onSelect={() => setSelectedOrder(order)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Statistics Sidebar */}
        {showStats && (
          <aside className={cn(
            'w-80 shrink-0 overflow-y-auto border-l p-4 space-y-4',
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 size={20} className="text-orange-500" />
                Statistika
              </h3>
              <button onClick={() => setShowStats(false)} className={cn(isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-700')}>
                <X size={18} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn('rounded-lg p-3', isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100')}>
                <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Jami bugun</p>
                <p className="text-2xl font-bold">{orders.length + completedToday}</p>
              </div>
              <div className={cn('rounded-lg p-3', isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100')}>
                <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Bajarilgan</p>
                <p className="text-2xl font-bold text-green-500">{completedToday}</p>
              </div>
              <div className={cn('rounded-lg p-3', isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100')}>
                <p className={cn('text-xs flex items-center gap-1', isDark ? 'text-slate-500' : 'text-gray-400')}>
                  <TrendingUp size={12} /> O'rtacha vaqt
                </p>
                <p className="text-2xl font-bold text-amber-500">{avgPrepTime}<span className={cn('text-sm', isDark ? 'text-slate-500' : 'text-gray-400')}> daq</span></p>
              </div>
              <div className={cn('rounded-lg p-3', isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100')}>
                <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>Kechikkan</p>
                <p className={cn('text-2xl font-bold', delayedCount > 0 ? 'text-red-500' : 'text-green-500')}>{delayedCount}</p>
              </div>
            </div>

            {/* Top Dishes */}
            <div className={cn('rounded-lg p-4', isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100')}>
              <h4 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', isDark ? 'text-slate-300' : 'text-gray-600')}>
                <Award size={16} className="text-amber-500" />
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
                      isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'
                    )}>
                      {i + 1}
                    </span>
                    <span className={cn('flex-1 text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>{dish.name}</span>
                    <span className="text-sm font-bold">{dish.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Flow */}
            <div className={cn('rounded-lg p-4', isDark ? 'bg-slate-800' : 'bg-gray-50 border border-gray-100')}>
              <h4 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', isDark ? 'text-slate-300' : 'text-gray-600')}>
                <Clock size={16} className="text-blue-500" />
                Soatlik buyurtmalar
              </h4>
              <div className="space-y-1.5">
                {hourlyStats.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={cn('w-12 text-xs tabular-nums', isDark ? 'text-slate-500' : 'text-gray-400')}>{h.hour}</span>
                    <div className={cn('flex-1 h-4 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-200')}>
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          h.count > 20 ? 'bg-red-500' : h.count > 15 ? 'bg-orange-500' : h.count > 10 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${(h.count / maxHourlyCount) * 100}%` }}
                      />
                    </div>
                    <span className={cn('w-6 text-xs text-right tabular-nums', isDark ? 'text-slate-400' : 'text-gray-500')}>{h.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isDark={isDark}
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

// ============ ORDER CARD (Grid) ============

interface OrderCardProps {
  order: Order;
  isDark: boolean;
  onItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onStartAll: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  onSelect: () => void;
}

function OrderCard({ order, isDark, onItemStatus, onStartAll, onMarkReady, onComplete, onSelect }: OrderCardProps) {
  const TypeIcon = getOrderTypeIcon(order.type);
  const delayed = order.status !== 'READY' && isDelayed(order.createdAt);
  const urgent = order.status !== 'READY' && isUrgent(order.createdAt);
  const readyItems = order.items.filter((i) => i.status === 'READY').length;
  const hasNotes = order.items.some((i) => i.notes);

  const statusBorderColor = {
    NEW: delayed ? 'border-red-500' : isDark ? 'border-red-500/50' : 'border-red-300',
    PREPARING: delayed ? 'border-red-500' : isDark ? 'border-amber-500/50' : 'border-amber-300',
    READY: isDark ? 'border-green-500/50' : 'border-green-300',
  };

  const statusTopColor = {
    NEW: 'bg-red-500',
    PREPARING: 'bg-amber-500',
    READY: 'bg-green-500',
  };

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition-all',
        isDark ? 'bg-slate-900' : 'bg-white shadow-sm',
        statusBorderColor[order.status],
        urgent && 'animate-pulse',
        order.priority === 'high' && 'ring-2 ring-red-500 ring-offset-1',
        order.priority === 'high' && (isDark ? 'ring-offset-slate-950' : 'ring-offset-gray-50')
      )}
    >
      {/* Color top bar */}
      <div className={cn('h-1.5', statusTopColor[order.status])} />

      {/* Card Header */}
      <div className={cn('flex items-center justify-between px-3 py-2.5 border-b', isDark ? 'border-slate-800/50' : 'border-gray-100')}>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">{order.orderNumber}</span>
          {order.priority === 'high' && <Flame size={14} className="text-red-500" />}
          {hasNotes && <MessageSquare size={12} className="text-amber-500" />}
        </div>
        <button
          onClick={onSelect}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
            isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          )}
        >
          <Eye size={12} />
          Batafsil
        </button>
      </div>

      {/* Meta Info */}
      <div className={cn('flex items-center justify-between px-3 py-2 text-xs', isDark ? 'bg-slate-800/30 text-slate-400' : 'bg-gray-50 text-gray-500')}>
        <div className="flex items-center gap-3">
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
        <span className={cn('flex items-center gap-1 font-bold', getTimerColor(order.createdAt, isDark))}>
          <Clock size={11} />
          {getTimeAgo(order.createdAt)}
        </span>
      </div>

      {/* Progress bar */}
      {order.status === 'PREPARING' && (
        <div className="px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className={cn('flex-1 h-1.5 rounded-full overflow-hidden', isDark ? 'bg-slate-700' : 'bg-gray-200')}>
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(readyItems / order.items.length) * 100}%` }}
              />
            </div>
            <span className={cn('tabular-nums', isDark ? 'text-slate-500' : 'text-gray-400')}>{readyItems}/{order.items.length}</span>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="px-3 py-2 space-y-1.5">
        {order.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors',
              item.status === 'READY'
                ? isDark ? 'bg-green-500/10 text-green-300' : 'bg-green-50 text-green-700'
                : item.status === 'PREPARING'
                ? isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-700'
                : isDark ? 'bg-slate-800/60 text-slate-300' : 'bg-gray-50 text-gray-600'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn('font-semibold', isDark ? 'text-white' : 'text-gray-900')}>{item.quantity}x</span>
                <span className={cn(item.status === 'READY' && 'line-through opacity-60')}>{item.name}</span>
                {item.status === 'READY' && <CheckCircle size={12} className="text-green-500 shrink-0" />}
                {item.status === 'PREPARING' && <Timer size={12} className="text-amber-500 animate-pulse shrink-0" />}
              </div>
              {item.notes && (
                <p className="text-xs text-amber-500 mt-0.5 truncate">⚠ {item.notes}</p>
              )}
            </div>

            {order.status !== 'READY' && (
              <div className="ml-2 shrink-0">
                {item.status === 'PENDING' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onItemStatus(order.id, item.id, 'PREPARING'); }}
                    className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
                  >
                    <Play size={10} />
                  </button>
                )}
                {item.status === 'PREPARING' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onItemStatus(order.id, item.id, 'READY'); }}
                    className="rounded-md bg-green-500 px-2 py-1 text-xs font-medium text-white hover:bg-green-600 transition-colors"
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
      <div className={cn('px-3 py-2.5 border-t', isDark ? 'border-slate-800/50' : 'border-gray-100')}>
        {order.status === 'NEW' && (
          <button
            onClick={() => onStartAll(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
          >
            <Play size={14} />
            Tayyorlashni boshlash
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button
            onClick={() => onMarkReady(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 transition-colors"
          >
            <CheckCircle size={14} />
            Tayyor
          </button>
        )}
        {order.status === 'READY' && (
          <button
            onClick={() => onComplete(order.id)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-500 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition-colors"
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
  isDark: boolean;
  onClose: () => void;
  onItemStatus: (orderId: string, itemId: string, status: OrderItem['status']) => void;
  onStartAll: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onComplete: (orderId: string) => void;
}

function OrderDetailModal({ order, isDark, onClose, onItemStatus, onStartAll, onMarkReady, onComplete }: OrderDetailModalProps) {
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
          'w-full max-w-lg rounded-2xl border-2 shadow-2xl overflow-hidden',
          isDark ? 'bg-slate-900' : 'bg-white',
          delayed ? 'border-red-500' : isDark ? 'border-slate-700' : 'border-gray-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={cn('flex items-center justify-between border-b px-6 py-4', isDark ? 'border-slate-800' : 'border-gray-100')}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{order.orderNumber}</span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium text-white', statusLabel[order.status].color)}>
              {statusLabel[order.status].text}
            </span>
            {order.priority === 'high' && (
              <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600')}>
                <Flame size={12} />
                Tezkor
              </span>
            )}
          </div>
          <button onClick={onClose} className={cn('rounded-lg p-2 transition-colors', isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700')}>
            <X size={20} />
          </button>
        </div>

        {/* Order Info */}
        <div className={cn('grid grid-cols-3 gap-4 border-b px-6 py-4', isDark ? 'border-slate-800' : 'border-gray-100')}>
          <div>
            <p className={cn('text-xs mb-1', isDark ? 'text-slate-500' : 'text-gray-400')}>Stol / Turi</p>
            <div className="flex items-center gap-1.5 font-medium">
              <TypeIcon size={16} className="text-orange-500" />
              {order.tableNumber ? `Stol #${order.tableNumber}` : getOrderTypeLabel(order.type)}
            </div>
          </div>
          <div>
            <p className={cn('text-xs mb-1', isDark ? 'text-slate-500' : 'text-gray-400')}>Ofitsiant</p>
            <div className="flex items-center gap-1.5 font-medium">
              <User size={16} className="text-blue-500" />
              {order.waiterName || '—'}
            </div>
          </div>
          <div>
            <p className={cn('text-xs mb-1', isDark ? 'text-slate-500' : 'text-gray-400')}>Vaqt</p>
            <div className={cn('flex items-center gap-1.5 font-medium', getTimerColor(order.createdAt, isDark))}>
              <Clock size={16} />
              {getTimeAgo(order.createdAt)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className={cn('flex items-center gap-6 border-b px-6 py-3 text-sm', isDark ? 'border-slate-800' : 'border-gray-100')}>
          <div className="flex items-center gap-2">
            <div className={cn('h-3 w-3 rounded-full', isDark ? 'bg-slate-600' : 'bg-gray-300')} />
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Kutmoqda: <b className={isDark ? 'text-white' : 'text-gray-900'}>{pendingItems}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Tayyorlanmoqda: <b className={isDark ? 'text-white' : 'text-gray-900'}>{preparingItems}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>Tayyor: <b className={isDark ? 'text-white' : 'text-gray-900'}>{readyItems}</b></span>
          </div>
        </div>

        {/* Items List */}
        <div className="max-h-72 overflow-y-auto px-6 py-4 space-y-2">
          {order.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between rounded-xl p-4 transition-all border',
                item.status === 'READY'
                  ? isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                  : item.status === 'PREPARING'
                  ? isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                  : isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-orange-500">{item.quantity}x</span>
                  <span className="font-medium">{item.name}</span>
                  {item.category && (
                    <span className={cn('rounded-md px-2 py-0.5 text-xs', isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500')}>{item.category}</span>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-amber-500">
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
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
                    >
                      <Play size={12} />
                      Boshlash
                    </button>
                  )}
                  {item.status === 'PREPARING' && (
                    <button
                      onClick={() => onItemStatus(order.id, item.id, 'READY')}
                      className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                    >
                      <Check size={12} />
                      Tayyor
                    </button>
                  )}
                  {item.status === 'READY' && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className={cn('flex gap-3 border-t px-6 py-4', isDark ? 'border-slate-800' : 'border-gray-100')}>
          {order.status === 'NEW' && (
            <button
              onClick={() => { onStartAll(order.id); onClose(); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-600 transition-colors"
            >
              <Play size={16} />
              Hammasini boshlash
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button
              onClick={() => { onMarkReady(order.id); onClose(); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-bold text-white hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={16} />
              Hammasi tayyor
            </button>
          )}
          {order.status === 'READY' && (
            <button
              onClick={() => { onComplete(order.id); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-bold text-white hover:bg-blue-600 transition-colors"
            >
              <Check size={16} />
              Topshirildi - Ofitsiantga yuborish
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              'rounded-xl px-6 py-3 font-medium transition-colors',
              isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            )}
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
