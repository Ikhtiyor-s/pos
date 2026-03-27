import { TrendingUp, DollarSign, BarChart3, Calculator, Printer, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice, getStatusColor, getStatusLabel } from '../../lib/helpers';
import type { DashboardData, RecentOrder, TopProduct } from '../../types';

interface ReportsTabProps {
  dashboardData: DashboardData | null;
  allOrders: RecentOrder[];
  dashboardPeriod: 'today' | 'week' | 'month' | 'year';
  dashboardLoading: boolean;
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void;
}

const PERIODS = [
  { key: 'today' as const, label: 'Bugun' },
  { key: 'week' as const, label: 'Hafta' },
  { key: 'month' as const, label: 'Oy' },
  { key: 'year' as const, label: 'Yil' },
];

export default function ReportsTab({ dashboardData, allOrders, dashboardPeriod, dashboardLoading, onPeriodChange }: ReportsTabProps) {
  const totalRevenue = dashboardData?.totalRevenue ?? dashboardData?.totalSales ?? 0;
  const totalExpenses = dashboardData?.totalExpenses ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const avgCheck = dashboardData?.averageCheck ?? 0;

  const revenueSources = [
    { label: "POS (To'g'ridan-to'g'ri)", value: (dashboardData as Record<string, number> | null)?.posSales || (dashboardData as Record<string, number> | null)?.cashSales || 0, color: 'bg-blue-500' },
    { label: 'Nonbor', value: (dashboardData as Record<string, number> | null)?.nonborSales || 0, color: 'bg-green-500' },
    { label: 'QR buyurtma', value: (dashboardData as Record<string, number> | null)?.qrSales || 0, color: 'bg-purple-500' },
    { label: 'Ofitsiant', value: (dashboardData as Record<string, number> | null)?.waiterSales || 0, color: 'bg-amber-500' },
  ];
  const maxSourceVal = Math.max(...revenueSources.map((s) => s.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Hisobotlar</h2>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
          <Printer size={16} /> Chop etish
        </button>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => onPeriodChange(p.key)}
            className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-all',
              dashboardPeriod === p.key ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' : 'glass-strong border border-white/60 text-gray-700 hover:bg-white/50'
            )}>
            {p.label}
          </button>
        ))}
      </div>

      {dashboardLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Jami daromad', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'bg-green-500/10', iconColor: 'text-green-600' },
              { label: 'Jami xarajat', value: formatPrice(totalExpenses), icon: DollarSign, color: 'bg-red-500/10', iconColor: 'text-red-600' },
              { label: 'Sof foyda', value: formatPrice(netProfit), icon: BarChart3, color: 'bg-blue-500/10', iconColor: 'text-blue-600' },
              { label: "O'rtacha chek", value: formatPrice(avgCheck), icon: Calculator, color: 'bg-purple-500/10', iconColor: 'text-purple-600' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl border border-white/60 shadow-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.color)}>
                    <stat.icon size={20} className={stat.iconColor} />
                  </div>
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Revenue sources */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daromad manbalari</h3>
            <div className="space-y-3">
              {revenueSources.map((source, idx) => {
                const pct = maxSourceVal > 0 ? (source.value / maxSourceVal) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-40 flex-shrink-0">{source.label}</span>
                    <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', source.color)} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-32 text-right">{formatPrice(source.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top products */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 mahsulotlar</h3>
            {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Mahsulot</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Sotilgan</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Daromad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topProducts.slice(0, 5).map((p: TopProduct, idx: number) => (
                      <tr key={idx} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{p.quantity || p.count || 0} ta</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">{formatPrice(p.revenue || p.total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Ma'lumot mavjud emas</p>
            )}
          </div>

          {/* Recent orders */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">So'nggi buyurtmalar</h3>
            {allOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Stol</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Holat</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Summa</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Vaqt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-mono text-gray-500">{(order.orderNumber || order.id || '').toString().slice(-6)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900">{order.table?.number ? `Stol ${order.table.number}` : 'Olib ketish'}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white', getStatusColor(order.status))}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">{formatPrice(order.total || 0)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-500 text-right">
                          {new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Buyurtmalar topilmadi</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
