import { ShoppingBag, Utensils, DollarSign, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice, getStatusColor, getStatusLabel } from '../../lib/helpers';
import type { ActiveOrderData, RecentOrder } from '../../types';

interface OrdersTabProps {
  activeOrders: ActiveOrderData[];
  allOrders: RecentOrder[];
  onRefresh: () => void;
}

function statusBadge(status: string) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white',
      getStatusColor(status)
    )}>
      {getStatusLabel(status)}
    </span>
  );
}

export default function OrdersTab({ activeOrders, allOrders, onRefresh }: OrdersTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Barcha buyurtmalar</h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl glass-strong border border-white/60 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
        >
          <List size={16} />
          Yangilash
        </button>
      </div>

      {activeOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Faol buyurtmalar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrders.map((order) => (
              <div
                key={order.orderId}
                className={cn(
                  'relative flex flex-col glass-card rounded-2xl border-2 p-4 shadow-lg',
                  order.awaitingPayment ? 'border-yellow-300/50' : 'border-orange-200/50'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      order.awaitingPayment ? 'bg-yellow-500/10' : 'bg-orange-500/10'
                    )}>
                      {order.awaitingPayment
                        ? <DollarSign className="h-5 w-5 text-yellow-600" />
                        : <Utensils className="h-5 w-5 text-orange-500" />}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {order.tableNumber > 0 ? `Stol #${order.tableNumber}` : 'Olib ketish'}
                      </p>
                      <p className="text-xs text-gray-600">{order.time}</p>
                    </div>
                  </div>
                  {statusBadge(order.status)}
                </div>
                <div className="space-y-1 mb-3">
                  {order.orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{item.name}</span>
                      <span className="font-medium">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-gray-200/60 pt-2">
                  <span className="text-gray-600">{order.items} ta mahsulot</span>
                  <span className="text-lg font-bold text-orange-500">{formatPrice(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Barcha buyurtmalar tarixi</h3>
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/40 glass-strong">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Turi</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stol</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mahsulotlar</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Summa</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Holat</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vaqt</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map((order) => (
                    <tr key={order.id} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                      <td className="px-5 py-3 text-sm font-mono text-gray-600">#{(order.id || '').slice(-6)}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {order.type === 'DINE_IN' ? 'Shu yerda' : order.type === 'TAKEAWAY' ? 'Olib ketish' : order.type || '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">
                        {order.table?.number ? `#${order.table.number}` : '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{order.items?.length || 0} ta</td>
                      <td className="px-5 py-3 text-sm font-semibold text-orange-500">{formatPrice(order.total || 0)}</td>
                      <td className="px-5 py-3">{statusBadge(order.status || 'NEW')}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeOrders.length === 0 && allOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card border border-white/60 shadow-lg mb-4">
            <ShoppingBag className="h-12 w-12 text-gray-500" />
          </div>
          <p className="text-lg font-medium text-gray-700">Buyurtmalar yo'q</p>
          <p className="text-sm text-gray-500">Hozircha buyurtmalar yo'q</p>
        </div>
      )}
    </div>
  );
}
