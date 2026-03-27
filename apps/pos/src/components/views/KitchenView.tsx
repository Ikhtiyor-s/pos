import { ChefHat, Clock, LogOut, Timer, Check, Play, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { orderService } from '../../services/order.service';
import type { ActiveOrderData } from '../../types';

interface KitchenViewProps {
  activeOrders: ActiveOrderData[];
  fetchData: () => Promise<void>;
  userName?: string;
  onLogout: () => void;
}

export default function KitchenView({ activeOrders, fetchData, userName, onLogout }: KitchenViewProps) {
  const kitchenOrders = activeOrders.filter(
    (o) => o.status !== 'READY' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED'
  );

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await orderService.updateStatus(orderId, status);
      await fetchData();
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-green-50">
      <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">Oshxona</span>
            <p className="text-xs text-gray-600">Buyurtmalar paneli</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} />
            <span className="text-sm">
              {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl glass-strong border border-white/60 px-3 py-1.5">
            <span className="text-xs font-medium text-gray-700">{userName}</span>
            <span className="text-[10px] text-gray-500 capitalize">Oshpaz</span>
            <button
              onClick={onLogout}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
              title="Chiqish"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="mx-auto max-w-6xl">
          {kitchenOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card border border-white/60 shadow-lg mb-4">
                <ChefHat className="h-12 w-12 text-gray-500" />
              </div>
              <p className="text-lg font-medium text-gray-700">Hozircha buyurtma yo'q</p>
              <p className="text-sm text-gray-500">Yangi buyurtmalar bu yerda ko'rinadi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenOrders.map((order) => (
                <div
                  key={order.orderId}
                  className={cn(
                    'glass-card rounded-2xl p-5 transition-all',
                    order.status === 'NEW' ? 'bg-orange-50/60 border-orange-200/60' :
                    order.status === 'CONFIRMED' ? 'bg-blue-50/60 border-blue-200/60' :
                    order.status === 'PREPARING' ? 'bg-yellow-50/60 border-yellow-200/60' :
                    'bg-green-50/60 border-green-200/60'
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-gray-900">
                      {order.tableNumber > 0 ? `Stol #${order.tableNumber}` : 'Olib ketish'}
                    </span>
                    <div className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                      order.status === 'NEW' ? 'bg-orange-500/10 text-orange-600' :
                      order.status === 'CONFIRMED' ? 'bg-blue-500/10 text-blue-600' :
                      order.status === 'PREPARING' ? 'bg-yellow-500/10 text-yellow-700' :
                      'bg-green-500/10 text-green-600'
                    )}>
                      {order.status === 'NEW' && 'Yangi'}
                      {order.status === 'CONFIRMED' && 'Tasdiqlangan'}
                      {order.status === 'PREPARING' && 'Tayyorlanmoqda'}
                      {order.status === 'READY' && 'Tayyor'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                    <Timer size={12} />
                    <span>{order.time}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-3 py-2">
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-200/80 px-2 text-xs font-bold text-gray-700">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {order.status === 'NEW' && (
                      <button
                        onClick={() => handleStatusUpdate(order.orderId, 'CONFIRMED')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Check size={16} /> Qabul qilish
                      </button>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleStatusUpdate(order.orderId, 'PREPARING')}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Play size={16} /> Tayyorlash
                      </button>
                    )}
                    {order.status === 'PREPARING' && (
                      <button
                        onClick={async () => {
                          const items = order.orderItems.map((i) => `${i.quantity}x ${i.name}`).join(', ');
                          if (!confirm(`Buyurtma tayyor deb belgilansinmi?\n\n${items}`)) return;
                          await handleStatusUpdate(order.orderId, 'READY');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <CheckCircle size={16} /> Tayyor!
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
