import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  FileText,
  Printer,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCard {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
}

const reportCards: ReportCard[] = [
  { title: 'Umumiy daromad', value: '45,280,000', change: '+12.5%', changeType: 'positive', icon: DollarSign, bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  { title: 'Buyurtmalar', value: '1,248', change: '+8.2%', changeType: 'positive', icon: ShoppingCart, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  { title: 'Mijozlar', value: '892', change: '+15.3%', changeType: 'positive', icon: Users, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' },
  { title: "O'rtacha check", value: '362,500', change: '-2.1%', changeType: 'negative', icon: TrendingUp, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
];

const topProducts = [
  { name: "O'zbek oshi", sales: 245, revenue: 11025000, growth: 12 },
  { name: 'Shashlik', sales: 380, revenue: 9500000, growth: 8 },
  { name: 'Manti', sales: 190, revenue: 6650000, growth: -3 },
  { name: "Lag'mon", sales: 165, revenue: 6270000, growth: 15 },
  { name: "Sho'rva", sales: 140, revenue: 4200000, growth: 5 },
];

const dailyRevenue = [
  { day: 'Dush', amount: 5200000 },
  { day: 'Sesh', amount: 4800000 },
  { day: 'Chor', amount: 6100000 },
  { day: 'Pay', amount: 7200000 },
  { day: 'Jum', amount: 8500000 },
  { day: 'Shan', amount: 9800000 },
  { day: 'Yak', amount: 8200000 },
];

const maxRevenue = Math.max(...dailyRevenue.map(d => d.amount));

const paymentMethodStats = [
  { name: 'Naqd pul', amount: 18500000, count: 520, icon: Banknote, color: 'text-green-600', bgColor: 'bg-green-100' },
  { name: 'Karta', amount: 14200000, count: 380, icon: CreditCard, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { name: 'Payme', amount: 7800000, count: 210, icon: Smartphone, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { name: 'Click', amount: 3500000, count: 95, icon: Smartphone, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { name: 'QR kod', amount: 1280000, count: 43, icon: QrCode, color: 'text-orange-600', bgColor: 'bg-orange-100' },
];

const topWaiters = [
  { name: 'Jasur O.', orders: 124, revenue: 12500000 },
  { name: 'Nodira K.', orders: 98, revenue: 9800000 },
  { name: 'Bobur M.', orders: 85, revenue: 8200000 },
  { name: 'Aziza R.', orders: 72, revenue: 7100000 },
];

const hourlyFlow = [
  { hour: '09', customers: 12 },
  { hour: '10', customers: 18 },
  { hour: '11', customers: 35 },
  { hour: '12', customers: 65 },
  { hour: '13', customers: 58 },
  { hour: '14', customers: 42 },
  { hour: '15', customers: 28 },
  { hour: '16', customers: 22 },
  { hour: '17', customers: 35 },
  { hour: '18', customers: 55 },
  { hour: '19', customers: 72 },
  { hour: '20', customers: 68 },
  { hour: '21', customers: 45 },
  { hour: '22', customers: 20 },
];

const maxCustomers = Math.max(...hourlyFlow.map(h => h.customers));

const reportTypes = [
  { id: 'sales', name: 'Sotuv hisoboti', icon: BarChart3, description: 'Kunlik, haftalik, oylik sotuvlar' },
  { id: 'products', name: 'Mahsulot hisoboti', icon: PieChart, description: 'Top mahsulotlar va tahlil' },
  { id: 'inventory', name: 'Ombor hisoboti', icon: FileText, description: 'Xomashyo va inventarizatsiya' },
  { id: 'staff', name: 'Xodimlar hisoboti', icon: Users, description: 'Xodimlar samaradorligi' },
];

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('week');
  const [selectedReport, setSelectedReport] = useState('sales');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hisobotlar</h1>
          <p className="text-sm text-gray-500">Statistika va tahlil</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
            {['today', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  dateRange === range
                    ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {range === 'today' && 'Bugun'}
                {range === 'week' && 'Hafta'}
                {range === 'month' && 'Oy'}
                {range === 'year' && 'Yil'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Calendar size={16} />
            Sana tanlash
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} />
            Yuklab olish
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Printer size={16} />
            Chop etish
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', card.bgColor)}>
                  <Icon className={cn('h-6 w-6', card.iconColor)} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{card.title}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-800">{card.value}</span>
                  {card.title.includes('daromad') || card.title.includes('check') ? (
                    <span className="text-sm text-gray-500">so'm</span>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {card.changeType === 'positive' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={card.changeType === 'positive' ? 'text-sm font-medium text-green-500' : 'text-sm font-medium text-red-500'}>
                    {card.change}
                  </span>
                  <span className="text-sm text-gray-400">o'tgan haftadan</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Haftalik daromad</h2>
              <p className="text-sm text-gray-500">So'nggi 7 kun</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <span className="h-3 w-3 rounded-full bg-gradient-to-r from-[#FF5722] to-[#E91E63]"></span>
                Daromad
              </span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {dailyRevenue.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-10 rounded-t-lg bg-gradient-to-t from-[#FF5722] to-[#E91E63] transition-all hover:opacity-80"
                    style={{ height: `${(day.amount / maxRevenue) * 160}px` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Top mahsulotlar</h2>
            <button className="text-sm font-medium text-[#FF5722] hover:text-[#E91E63]">
              Barchasi
            </button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-200 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sales} ta sotildi</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">{(product.revenue / 1000000).toFixed(1)}M</p>
                  <div className="flex items-center justify-end gap-1">
                    {product.growth > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={product.growth > 0 ? 'text-xs text-green-500' : 'text-xs text-red-500'}>
                      {product.growth > 0 ? '+' : ''}{product.growth}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods & Waiters & Hourly Flow */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Methods */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">To'lov usullari</h2>
          <div className="space-y-3">
            {paymentMethodStats.map((method) => {
              const Icon = method.icon;
              const total = paymentMethodStats.reduce((s, m) => s + m.amount, 0);
              const pct = ((method.amount / total) * 100).toFixed(1);
              return (
                <div key={method.name} className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', method.bgColor)}>
                    <Icon className={cn('h-5 w-5', method.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">{method.name}</p>
                      <p className="text-sm font-bold text-gray-800">{(method.amount / 1000000).toFixed(1)}M</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#FF5722] to-[#E91E63]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{method.count} ta • {pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Waiters */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Eng faol ofitsiantlar</h2>
            <Utensils size={18} className="text-gray-400" />
          </div>
          <div className="space-y-4">
            {topWaiters.map((waiter, index) => (
              <div key={waiter.name} className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  index === 0 ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-white' :
                  index === 1 ? 'bg-gray-200 text-gray-700' :
                  'bg-gray-100 text-gray-500'
                )}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{waiter.name}</p>
                  <p className="text-xs text-gray-500">{waiter.orders} ta buyurtma</p>
                </div>
                <p className="font-bold text-gray-800">{(waiter.revenue / 1000000).toFixed(1)}M</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Customer Flow */}
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Soat bo'yicha mijoz oqimi</h2>
          <p className="text-sm text-gray-500 mb-4">Bugungi kun</p>
          <div className="flex items-end justify-between gap-1 h-40">
            {hourlyFlow.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-gray-500">{h.customers}</span>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#FF5722]/80 to-[#E91E63]/80 transition-all hover:from-[#FF5722] hover:to-[#E91E63]"
                  style={{ height: `${(h.customers / maxCustomers) * 100}px` }}
                />
                <span className="text-[10px] text-gray-400">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Hisobot turlari</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={cn(
                  'flex items-center gap-4 rounded-xl p-4 text-left transition-all border-2',
                  selectedReport === report.id
                    ? 'border-[#FF5722] bg-orange-50'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  selectedReport === report.id ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63]' : 'bg-gray-100'
                )}>
                  <Icon className={cn('h-6 w-6', selectedReport === report.id ? 'text-white' : 'text-gray-500')} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{report.name}</p>
                  <p className="text-xs text-gray-500">{report.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
