import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import OrderCard, { type KDSOrder, type KDSOrderItem } from './OrderCard';
import StatusBar from './StatusBar';
import OrderTimer from './OrderTimer';
import { kitchenService, type KitchenOrder } from '../../services/kitchen.service';
import { socketService } from '../../services/socket.service';
import { settingsService } from '../../services/settings.service';

// ==========================================
// KDS LAYOUT — Kitchen Display System
// Real-time buyurtma ko'rsatish va boshqarish
// Katta shriftlar, dark mode, touch-optimized
// ==========================================

type FilterTab = 'ALL' | 'NEW' | 'PREPARING' | 'READY';

// Notification sound
const playSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => {
      osc.frequency.value = 1000;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1000;
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.15);
    }, 200);
  } catch {}
};

function mapApiOrder(apiOrder: KitchenOrder): KDSOrder {
  const items: KDSOrderItem[] = apiOrder.items.map(item => ({
    id: item.id,
    name: item.product?.name || 'Noma\'lum',
    quantity: item.quantity,
    notes: item.notes,
    status: item.status === 'SERVED' || item.status === 'CANCELLED'
      ? 'READY'
      : (item.status as KDSOrderItem['status']),
    cookingTime: item.product?.cookingTime,
  }));

  const allReady = items.length > 0 && items.every(i => i.status === 'READY');
  const anyPreparing = items.some(i => i.status === 'PREPARING' || i.status === 'READY');

  let status: KDSOrder['status'] = 'NEW';
  if (allReady) status = 'READY';
  else if (anyPreparing) status = 'PREPARING';
  if (apiOrder.status === 'PREPARING' && status === 'NEW') status = 'PREPARING';

  return {
    id: apiOrder.id,
    orderNumber: apiOrder.orderNumber,
    tableNumber: apiOrder.table?.number ?? null,
    type: apiOrder.type,
    items,
    createdAt: new Date(apiOrder.createdAt),
    status,
    notes: apiOrder.notes,
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
  };
}

export default function KDSLayout() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [businessName, setBusinessName] = useState('Oshxona');
  const [isLoading, setIsLoading] = useState(false);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  // ==========================================
  // LOAD ORDERS
  // ==========================================

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiOrders = await kitchenService.getOrders();
      const mapped = apiOrders.map(mapApiOrder);
      setOrders(mapped.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    } catch (error) {
      console.error('[KDS] Buyurtmalarni yuklashda xatolik:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ==========================================
  // SOCKET.IO — Real-time events
  // ==========================================

  useEffect(() => {
    socketService.connect();
    setIsConnected(true);

    const unsubNew = socketService.onNewOrder((data: any) => {
      if (soundEnabled) playSound();
      // Yangi buyurtma — to'liq qayta yuklash
      loadOrders();
    });

    const unsubStatus = socketService.onOrderStatus((data) => {
      setOrders(prev => prev.map(o => {
        if (o.id === data.orderId) {
          const newStatus = data.status as KDSOrder['status'];
          if (['COMPLETED', 'CANCELLED'].includes(data.status)) {
            return null as any; // O'chiriladi
          }
          return { ...o, status: newStatus };
        }
        return o;
      }).filter(Boolean));
    });

    const unsubItemStatus = socketService.onItemStatus((data) => {
      setOrders(prev => prev.map(o => {
        if (o.id === data.orderId) {
          const updatedItems = o.items.map(i =>
            i.id === data.itemId ? { ...i, status: data.status as KDSOrderItem['status'] } : i
          );
          const allReady = updatedItems.every(i => i.status === 'READY');
          const anyPreparing = updatedItems.some(i => i.status === 'PREPARING');
          let status: KDSOrder['status'] = 'NEW';
          if (allReady) status = 'READY';
          else if (anyPreparing) status = 'PREPARING';
          return { ...o, items: updatedItems, status };
        }
        return o;
      }));
    });

    const unsubUpdated = socketService.onOrderUpdated(() => {
      loadOrders();
    });

    return () => {
      unsubNew();
      unsubStatus();
      unsubItemStatus();
      unsubUpdated();
      socketService.disconnect();
    };
  }, [soundEnabled]);

  // Initial load + periodic refresh
  useEffect(() => {
    loadOrders();
    settingsService.get().then((s: any) => {
      if (s?.name || s?.businessName) setBusinessName(s.name || s.businessName);
    }).catch(() => {});

    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleStartItem = async (orderId: string, itemId: string) => {
    try {
      await kitchenService.updateItemStatus(orderId, itemId, 'PREPARING');
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const items = o.items.map(i => i.id === itemId ? { ...i, status: 'PREPARING' as const } : i);
          return { ...o, items, status: 'PREPARING' };
        }
        return o;
      }));
    } catch (e) { console.error('[KDS] Start item xatolik:', e); }
  };

  const handleCompleteItem = async (orderId: string, itemId: string) => {
    try {
      await kitchenService.updateItemStatus(orderId, itemId, 'READY');
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const items = o.items.map(i => i.id === itemId ? { ...i, status: 'READY' as const } : i);
          const allReady = items.every(i => i.status === 'READY');
          return { ...o, items, status: allReady ? 'READY' : 'PREPARING' };
        }
        return o;
      }));
    } catch (e) { console.error('[KDS] Complete item xatolik:', e); }
  };

  const handleStartAll = async (orderId: string) => {
    try {
      await kitchenService.updateOrderStatus(orderId, 'PREPARING');
      const order = orders.find(o => o.id === orderId);
      if (order) {
        for (const item of order.items.filter(i => i.status === 'PENDING')) {
          await kitchenService.updateItemStatus(orderId, item.id, 'PREPARING');
        }
      }
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'PREPARING',
            items: o.items.map(i => ({ ...i, status: 'PREPARING' as const })),
          };
        }
        return o;
      }));
    } catch (e) { console.error('[KDS] Start all xatolik:', e); }
  };

  const handleCompleteAll = async (orderId: string) => {
    try {
      await kitchenService.updateOrderStatus(orderId, 'READY');
      if (soundEnabled) playSound();
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status: 'READY',
            items: o.items.map(i => ({ ...i, status: 'READY' as const })),
          };
        }
        return o;
      }));
    } catch (e) { console.error('[KDS] Complete all xatolik:', e); }
  };

  // ==========================================
  // FILTER
  // ==========================================

  const filteredOrders = filter === 'ALL'
    ? orders
    : orders.filter(o => o.status === filter);

  // Sort: urgent first, then by time
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aMin = Math.floor((Date.now() - a.createdAt.getTime()) / 60000);
    const bMin = Math.floor((Date.now() - b.createdAt.getTime()) / 60000);
    const aUrgent = aMin > 20 ? 1 : 0;
    const bUrgent = bMin > 20 ? 1 : 0;
    if (aUrgent !== bUrgent) return bUrgent - aUrgent;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const filterTabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'ALL', label: 'BARCHASI', count: orders.length, color: 'text-white bg-gray-700' },
    { key: 'NEW', label: 'YANGI', count: orders.filter(o => o.status === 'NEW').length, color: 'text-blue-400 bg-blue-500/15' },
    { key: 'PREPARING', label: 'TAYYORLANMOQDA', count: orders.filter(o => o.status === 'PREPARING').length, color: 'text-orange-400 bg-orange-500/15' },
    { key: 'READY', label: 'TAYYOR', count: orders.filter(o => o.status === 'READY').length, color: 'text-emerald-400 bg-emerald-500/15' },
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Status Bar */}
      <StatusBar
        orders={orders}
        businessName={businessName}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        isConnected={isConnected}
      />

      {/* Filter Tabs + Refresh */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800">
        <div className="flex gap-2">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                transition-all touch-action-manipulation active:scale-95
                ${filter === tab.key ? tab.color : 'text-gray-500 bg-gray-800/50 hover:bg-gray-800'}
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full font-black
                  ${filter === tab.key ? 'bg-white/20' : 'bg-gray-700'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={loadOrders}
          disabled={isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            text-gray-400 bg-gray-800 hover:bg-gray-700 transition-all
            ${isLoading ? 'animate-spin' : ''}
          `}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          YANGILASH
        </button>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <div className="text-8xl mb-4">👨‍🍳</div>
            <p className="text-2xl font-bold">Buyurtmalar yo'q</p>
            <p className="text-lg mt-2">Yangi buyurtma kutilmoqda...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {sortedOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStartItem={handleStartItem}
                onCompleteItem={handleCompleteItem}
                onStartAll={handleStartAll}
                onCompleteAll={handleCompleteAll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
