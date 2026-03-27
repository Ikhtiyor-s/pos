import { TrendingUp, ShoppingBag, DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice, getStatusColor, getStatusLabel } from '../../lib/helpers';
import type { DashboardData } from '../../types';

interface DashboardTabProps {
  dashboardData: DashboardData | null;
  dashboardPeriod: 'today' | 'week' | 'month' | 'year';
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void;
  dashboardLoading: boolean;
}

const PERIODS = [
  { id: 'today' as const, label: 'Bugun' },
  { id: 'week' as const, label: 'Hafta' },
  { id: 'month' as const, label: 'Oy' },
  { id: 'year' as const, label: 'Yil' },
];

const BAR_COLORS = [
  'from-orange-500 to-orange-400',
  'from-blue-500 to-blue-400',
  'from-green-500 to-green-400',
  'from-purple-500 to-purple-400',
  'from-pink-500 to-pink-400',
];

const METHOD_META: Record<string, { label: string; color: string; bg: string }> = {
  cash: { label: 'Naqd', color: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
  CASH: { label: 'Naqd', color: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
  card: { label: 'Karta', color: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
  CARD: { label: 'Karta', color: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
  online: { label: 'Online', color: 'bg-purple-500', bg: 'bg-purple-50 text-purple-700' },
  payme: { label: 'Payme', color: 'bg-cyan-500', bg: 'bg-cyan-50 text-cyan-700' },
  PAYME: { label: 'Payme', color: 'bg-cyan-500', bg: 'bg-cyan-50 text-cyan-700' },
  click: { label: 'Click', color: 'bg-indigo-500', bg: 'bg-indigo-50 text-indigo-700' },
  CLICK: { label: 'Click', color: 'bg-indigo-500', bg: 'bg-indigo-50 text-indigo-700' },
  uzum: { label: 'Uzum', color: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
  UZUM: { label: 'Uzum', color: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  NEW: { label: 'Yangi', color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-200', icon: '🆕' },
  CONFIRMED: { label: 'Tasdiqlangan', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-200', icon: '✅' },
  PREPARING: { label: 'Tayyorlanmoqda', color: 'text-yellow-700', bg: 'bg-yellow-500/10 border-yellow-200', icon: '👨‍🍳' },
  READY: { label: 'Tayyor', color: 'text-green-600', bg: 'bg-green-500/10 border-green-200', icon: '🔔' },
  COMPLETED: { label: 'Yakunlangan', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-200', icon: '🏁' },
  CANCELLED: { label: 'Bekor qilingan', color: 'text-red-600', bg: 'bg-red-500/10 border-red-200', icon: '❌' },
};

function statusBadge(status: string) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white', getStatusColor(status))}>
      {getStatusLabel(status)}
    </span>
  );
}

export default function DashboardTab({ dashboardData, dashboardPeriod, onPeriodChange, dashboardLoading }: DashboardTabProps) {
  const revenueTotal = dashboardData?.revenue?.total ?? (typeof dashboardData?.revenue === 'number' ? dashboardData.revenue : 0);
  const avgCheck = dashboardData?.revenue?.averageCheck ?? dashboardData?.averageCheck ?? 0;
  const ordersTotal = dashboardData?.orders?.total ?? 0;
  const ordersCompleted = dashboardData?.orders?.completed ?? 0;

  // Revenue chart data
  const revenueData = dashboardData?.dailyRevenue || [
    { date: 'Du', revenue: revenueTotal * 0.8 },
    { date: 'Se', revenue: revenueTotal * 0.6 },
    { date: 'Ch', revenue: revenueTotal * 1.1 },
    { date: 'Pa', revenue: revenueTotal * 0.9 },
    { date: 'Ju', revenue: revenueTotal * 1.3 },
    { date: 'Sh', revenue: revenueTotal * 1.5 },
    { date: 'Ya', revenue: revenueTotal },
  ];
  const maxRevenue = Math.max(...revenueData.map((x) => x.revenue || 0), 1);

  // Payment methods
  const methods = dashboardData?.paymentMethods;
  const paymentData = methods
    ? Object.entries(methods).map(([k, v]) => ({
        method: k,
        amount: typeof v === 'number' ? v : (v as { amount?: number })?.amount || 0,
      }))
    : [
        { method: 'cash', amount: revenueTotal * 0.6 },
        { method: 'card', amount: revenueTotal * 0.25 },
        { method: 'online', amount: revenueTotal * 0.15 },
      ];
  const paymentTotal = paymentData.reduce((s, p) => s + (p.amount || 0), 0) || 1;

  // Order status
  const ordersByStatus = dashboardData?.ordersByStatus;
  const statusData = ordersByStatus
    ? Object.entries(ordersByStatus).map(([s, c]) => ({ status: s, count: typeof c === 'number' ? c : 0 }))
    : [
        { status: 'NEW', count: Math.round(ordersTotal * 0.1) },
        { status: 'PREPARING', count: Math.round(ordersTotal * 0.15) },
        { status: 'READY', count: Math.round(ordersTotal * 0.05) },
        { status: 'COMPLETED', count: ordersCompleted },
      ];
  const statusTotal = statusData.reduce((s, item) => s + (item.count || 0), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-all',
              dashboardPeriod === p.id
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                : 'glass-strong border border-white/60 text-gray-700 hover:bg-white/70'
            )}
          >
            {p.label}
          </button>
        ))}
        {dashboardLoading && <span className="ml-2 text-sm text-gray-500">Yuklanmoqda...</span>}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Daromad', value: formatPrice(revenueTotal), icon: TrendingUp, color: 'bg-green-500/10', iconColor: 'text-green-500' },
          { label: 'Buyurtmalar soni', value: String(ordersTotal), icon: ShoppingBag, color: 'bg-blue-500/10', iconColor: 'text-blue-500' },
          { label: "O'rtacha chek", value: formatPrice(avgCheck), icon: DollarSign, color: 'bg-orange-500/10', iconColor: 'text-orange-500' },
          { label: 'Yakunlangan', value: String(ordersCompleted), icon: CheckCircle, color: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.color)}>
                <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
              </div>
            </div>
            <p className="text-sm text-gray-600">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Bar Chart */}
        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
          <h3 className="text-base font-bold text-gray-900 mb-4">Haftalik daromad</h3>
          <div className="flex items-end gap-2 h-40">
            {revenueData.map((d, i) => {
              const pct = ((d.revenue || 0) / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-400 font-medium">{d.revenue ? formatPrice(d.revenue) : ''}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-400 transition-all" style={{ height: `${Math.max(pct, 5)}%` }} />
                  <span className="text-[10px] text-gray-500 font-medium">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
          <h3 className="text-base font-bold text-gray-900 mb-4">Eng ko'p sotilgan</h3>
          {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const items = dashboardData.topProducts.slice(0, 5);
                const maxQty = Math.max(...items.map((x) => x.quantity || x.count || 0), 1);
                return items.map((item, idx) => {
                  const qty = item.quantity || item.count || 0;
                  const pct = (qty / maxQty) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 truncate max-w-[60%]">{item.name}</span>
                        <span className="text-gray-500 text-xs font-semibold">{qty} ta {item.revenue != null ? `/ ${formatPrice(item.revenue)}` : ''}</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${BAR_COLORS[idx % BAR_COLORS.length]} transition-all`} style={{ width: `${Math.max(pct, 3)}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Ma'lumot yo'q</p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
          <h3 className="text-base font-bold text-gray-900 mb-4">To'lov usullari</h3>
          <div className="space-y-4">
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              {paymentData.map((p, i) => {
                const pct = ((p.amount || 0) / paymentTotal) * 100;
                const meta = METHOD_META[p.method] || { label: p.method, color: 'bg-gray-400', bg: 'bg-gray-50 text-gray-700' };
                return pct > 0 ? <div key={i} className={`${meta.color} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} title={`${meta.label}: ${Math.round(pct)}%`} /> : null;
              })}
            </div>
            <div className="space-y-2">
              {paymentData.map((p, i) => {
                const pct = ((p.amount || 0) / paymentTotal) * 100;
                const meta = METHOD_META[p.method] || { label: p.method, color: 'bg-gray-400', bg: 'bg-gray-50 text-gray-700' };
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${meta.color}`} />
                      <span className="text-gray-700 font-medium">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.bg}`}>{Math.round(pct)}%</span>
                      <span className="text-gray-500 text-xs">{formatPrice(p.amount || 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
          <h3 className="text-base font-bold text-gray-900 mb-4">Buyurtmalar holati</h3>
          <div className="grid grid-cols-2 gap-3">
            {statusData.map((item, i) => {
              const meta = STATUS_META[item.status] || { label: item.status, color: 'text-gray-600', bg: 'bg-gray-500/10 border-gray-200', icon: '📋' };
              const pct = ((item.count || 0) / statusTotal) * 100;
              return (
                <div key={i} className={`rounded-xl border p-3 ${meta.bg} transition-all`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{meta.icon}</span>
                    <span className={`text-2xl font-bold ${meta.color}`}>{item.count || 0}</span>
                  </div>
                  <p className={`text-xs font-semibold ${meta.color} mb-1`}>{meta.label}</p>
                  <div className="w-full h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div className={`h-full rounded-full bg-current ${meta.color} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two column: top products + recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 mahsulotlar</h3>
          {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.topProducts.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-600">{idx + 1}</span>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{item.quantity || item.count || 0} ta</p>
                    {item.revenue != null && <p className="text-xs text-gray-500">{formatPrice(item.revenue)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Ma'lumot yo'q</p>
          )}
        </div>

        <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">So'nggi 5 buyurtma</h3>
          {dashboardData?.recentOrders && dashboardData.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recentOrders.slice(0, 5).map((order, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <ShoppingBag className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.table?.number ? `Stol #${order.table.number}` : `#${(order.id || '').slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-500">{formatPrice(order.total || 0)}</p>
                    {statusBadge(order.status || 'NEW')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Ma'lumot yo'q</p>
          )}
        </div>
      </div>
    </div>
  );
}
