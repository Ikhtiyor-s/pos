import { useState, useEffect, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  CheckCircle,
  Clock,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboard.service';
import { branchService } from '@/services/branch.service';
import { useAuthStore } from '@/store/auth';
import type { DashboardData, DashboardPeriod, DailySalesData } from '@/types/dashboard';
import type { Branch } from '@/types/branch';

const periods: { key: DashboardPeriod; label: string }[] = [
  { key: 'today', label: 'Bugun' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year', label: 'Yil' },
];

const COLORS = ['#f97316', '#1a1a2e', '#10b981', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6', '#06b6d4'];

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Yangi', color: '#3b82f6' },
  CONFIRMED: { label: 'Tasdiqlangan', color: '#8b5cf6' },
  PREPARING: { label: 'Tayyorlanmoqda', color: '#f59e0b' },
  READY: { label: 'Tayyor', color: '#10b981' },
  DELIVERING: { label: 'Yetkazilmoqda', color: '#06b6d4' },
  COMPLETED: { label: 'Yakunlangan', color: '#22c55e' },
  CANCELLED: { label: 'Bekor qilingan', color: '#ef4444' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  // Filliallar faqat SUPER_ADMIN va MANAGER uchun
  useEffect(() => {
    const canSeeBranches = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER';
    if (!canSeeBranches) return;
    branchService.getAll({ limit: 100 })
      .then((res) => setBranches(res.branches))
      .catch(() => {});
  }, [user?.role]);

  // Dashboard ma'lumotlarini yuklash
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, salesData] = await Promise.all([
        dashboardService.getDashboard(period, selectedBranch || undefined),
        dashboardService.getDailySales(period),
      ]);
      setData(dashData);
      setDailySales(salesData);
    } catch (err) {
      console.error('Dashboard yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        Ma'lumot topilmadi
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        <div className="flex items-center gap-3">
          {/* Branch filter */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
              <GitBranch size={16} className="text-gray-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-sm border-none bg-transparent focus:outline-none text-gray-700 pr-6"
              >
                <option value="">Barcha filliallar</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Period selector */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-all',
                  period === p.key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Umumiy daromad"
          value={formatCurrency(data.revenue.total)}
          icon={DollarSign}
          color="orange"
        />
        <StatCard
          title="Buyurtmalar"
          value={String(data.orders.total)}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="O'rtacha chek"
          value={formatCurrency(data.revenue.averageCheck)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Yakunlangan"
          value={String(data.orders.completed)}
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Kunlik sotuv</h3>
          {dailySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailySales}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Daromad']}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
              Bu davr uchun ma'lumot yo'q
            </div>
          )}
        </div>

        {/* Branch Revenue Pie / Orders by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {data.branchRevenues.length > 0 ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filliallar bo'yicha</h3>
              <div className="flex items-center justify-center">
                <PieChart width={200} height={200}>
                  <Pie
                    data={data.branchRevenues}
                    cx={100}
                    cy={100}
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="revenue"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {data.branchRevenues.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </div>
              <div className="space-y-2 mt-4">
                {data.branchRevenues.map((br, i) => (
                  <div key={br.tenantId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700">{br.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(br.revenue)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyurtma holatlari</h3>
              <div className="space-y-3">
                {data.ordersByStatus.map((os) => {
                  const info = statusLabels[os.status] || { label: os.status, color: '#6b7280' };
                  const percent = data.orders.total > 0 ? Math.round((os.count / data.orders.total) * 100) : 0;
                  return (
                    <div key={os.status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{info.label}</span>
                        <span className="font-medium">{os.count} ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${percent}%`, backgroundColor: info.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.ordersByStatus.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Buyurtmalar yo'q</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top mahsulotlar</h3>
          {data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((product, i) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.quantity} ta sotilgan</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Ma'lumot yo'q</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">So'nggi buyurtmalar</h3>
          {data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.slice(0, 8).map((order) => {
                const statusInfo = statusLabels[order.status] || { label: order.status, color: '#6b7280' };
                return (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Clock size={14} className="text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-400">
                          {order.branch && <span>{order.branch} &middot; </span>}
                          {new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Buyurtmalar yo'q</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card component
function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: string;
  icon: any;
  color: 'orange' | 'blue' | 'green' | 'purple';
}) {
  const colorMap = {
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', colorMap[color])}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
