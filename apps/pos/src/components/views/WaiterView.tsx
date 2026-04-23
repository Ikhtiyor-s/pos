import { useState, ReactNode } from 'react';
import { Utensils, Clock, Plus, Users, Check, CheckCircle, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice } from '../../lib/helpers';
import type { TableData, ActiveOrderData, OrderType } from '../../types';

interface WaiterViewProps {
  tables: TableData[];
  activeOrders: ActiveOrderData[];
  userName?: string;
  lockElements: ReactNode;
  onSelectOrderType: (type: OrderType, table?: TableData) => void;
  onLogout: () => void;
}

export default function WaiterView({ tables, activeOrders, userName, lockElements, onSelectOrderType, onLogout }: WaiterViewProps) {
  const [selectingTable, setSelectingTable] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-purple-50">
      {lockElements}
      <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-md">
            <Utensils className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">Ofitsiant</span>
            <p className="text-xs text-gray-600">Stollar va buyurtmalar</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} />
            <span className="text-sm">{new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button onClick={() => setSelectingTable(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
            <Plus size={16} /> Yangi buyurtma
          </button>
          <div className="flex items-center gap-2 rounded-xl glass-card px-2.5 py-1">
            <span className="text-xs font-medium text-gray-700">{userName}</span>
            <button onClick={onLogout} className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Chiqish">
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="mx-auto max-w-6xl">
          {selectingTable && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Stol tanlang</h2>
                <button onClick={() => { setSelectingTable(false); setSelectedTable(null); }} className="rounded-xl glass-card px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">Bekor</button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {tables.map((table) => {
                  const isFree = table.status === 'free';
                  const isSelected = selectedTable?.id === table.id;
                  return (
                    <button key={table.id} onClick={() => isFree && setSelectedTable(table)} disabled={!isFree}
                      className={cn('flex flex-col items-center rounded-2xl border-2 p-6 transition-all shadow-md',
                        isFree ? (isSelected ? 'border-purple-400 bg-purple-50/50' : 'glass-card hover:border-purple-300') : 'border-red-200/60 bg-red-50/40 cursor-not-allowed'
                      )}>
                      <span className={cn('text-3xl font-bold', isFree ? (isSelected ? 'text-purple-500' : 'text-gray-900') : 'text-gray-500')}>#{table.number}</span>
                      <span className="text-sm text-gray-600 flex items-center gap-1 mt-1"><Users size={12} />{table.capacity}</span>
                    </button>
                  );
                })}
              </div>
              {selectedTable && (
                <div className="mt-4 flex justify-end">
                  <button onClick={() => { setSelectingTable(false); onSelectOrderType('dine-in', selectedTable); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 px-8 py-3 font-semibold text-white shadow-md hover:shadow-lg transition-all">
                    Davom etish <Check size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-4">Faol buyurtmalar</h2>
          {activeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card shadow-lg mb-4"><Utensils className="h-12 w-12 text-gray-500" /></div>
              <p className="text-lg font-medium text-gray-700">Hozircha buyurtma yo'q</p>
              <p className="text-sm text-gray-600">Yangi buyurtma qo'shish uchun tugmani bosing</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map((order) => (
                <div key={order.orderId} className={cn('rounded-2xl border p-5 shadow-lg transition-all', order.status === 'READY' ? 'bg-green-50/60 border-green-200/60' : 'glass-card')}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-gray-900">{order.tableNumber > 0 ? `Stol #${order.tableNumber}` : 'Olib ketish'}</span>
                    <div className={cn('rounded-full px-3 py-1 text-xs font-medium',
                      order.status === 'NEW' ? 'bg-orange-500/10 text-orange-600' :
                      order.status === 'PREPARING' ? 'bg-yellow-500/10 text-yellow-700' :
                      order.status === 'READY' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'
                    )}>
                      {order.status === 'NEW' && 'Yangi'}
                      {order.status === 'CONFIRMED' && 'Tasdiqlangan'}
                      {order.status === 'PREPARING' && 'Tayyorlanmoqda'}
                      {order.status === 'READY' && 'Tayyor!'}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{order.items} ta mahsulot • {formatPrice(order.total)}</div>
                  {order.status === 'READY' && (
                    <div className="flex items-center gap-2 rounded-xl bg-green-100/60 border border-green-200/60 py-2 px-3 text-sm font-medium text-green-600">
                      <CheckCircle size={16} /> Mijozga olib boring!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
