import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from 'lucide-react';
import { Select } from '@/components/ui/select';

const stats = [
  {
    title: 'Bugungi sotuv',
    value: "12,450,000",
    unit: "so'm",
    change: '+12%',
    changeType: 'positive',
    icon: DollarSign,
    bgColor: 'bg-[#FF5722]',
    lightBg: 'bg-[#FFF3E0]',
  },
  {
    title: 'Buyurtmalar',
    value: '48',
    unit: 'ta',
    change: '+8%',
    changeType: 'positive',
    icon: ShoppingCart,
    bgColor: 'bg-[#2196F3]',
    lightBg: 'bg-[#E3F2FD]',
  },
  {
    title: "O'rtacha check",
    value: "259,375",
    unit: "so'm",
    change: '+5%',
    changeType: 'positive',
    icon: TrendingUp,
    bgColor: 'bg-[#4CAF50]',
    lightBg: 'bg-[#E8F5E9]',
  },
  {
    title: 'Faol stollar',
    value: '6 / 10',
    unit: '',
    change: '-2',
    changeType: 'negative',
    icon: Users,
    bgColor: 'bg-[#E91E63]',
    lightBg: 'bg-[#FCE4EC]',
  },
];

const recentOrders = [
  { id: 'ORD-001', table: 'Stol 3', total: 185000, status: 'Tayyor', statusColor: 'bg-green-100 text-green-700' },
  { id: 'ORD-002', table: 'Stol 7', total: 320000, status: 'Tayyorlanmoqda', statusColor: 'bg-amber-100 text-amber-700' },
  { id: 'ORD-003', table: 'Olib ketish', total: 95000, status: 'Yakunlangan', statusColor: 'bg-gray-100 text-gray-700' },
  { id: 'ORD-004', table: 'Stol 1', total: 450000, status: 'Yangi', statusColor: 'bg-blue-100 text-blue-700' },
  { id: 'ORD-005', table: 'Yetkazish', total: 275000, status: 'Yetkazilmoqda', statusColor: 'bg-purple-100 text-purple-700' },
];

const topProducts = [
  { name: "O'zbek oshi", quantity: 24, revenue: 1080000, image: '🍚' },
  { name: 'Shashlik (1 shish)', quantity: 45, revenue: 1125000, image: '🍖' },
  { name: 'Manti', quantity: 18, revenue: 630000, image: '🥟' },
  { name: "Lag'mon", quantity: 15, revenue: 570000, image: '🍜' },
  { name: "Sho'rva", quantity: 12, revenue: 360000, image: '🍲' },
];

export function DashboardPage() {
  const periodOptions = [
    { value: 'today', label: 'Bugun' },
    { value: 'week', label: 'Hafta' },
    { value: 'month', label: 'Oy' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Bugungi statistika va umumiy ko'rsatkichlar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={periodOptions}
            value="today"
            className="w-32"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.lightBg} dark:bg-opacity-20`}>
                  <Icon className={`h-6 w-6 ${stat.bgColor.replace('bg-', 'text-')}`} />
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{stat.title}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
                  {stat.unit && <span className="text-sm text-gray-500 dark:text-slate-400">{stat.unit}</span>}
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm">
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      stat.changeType === 'positive' ? 'font-medium text-green-500' : 'font-medium text-red-500'
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-gray-400 dark:text-slate-400">kechagidan</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">So'nggi buyurtmalar</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Oxirgi 5 ta buyurtma</p>
            </div>
            <button className="text-sm font-medium text-[#FF5722] hover:text-[#E91E63]">
              Barchasini ko'rish
            </button>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-700/50 p-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5722]/10">
                      <ShoppingCart className="h-5 w-5 text-[#FF5722]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{order.id}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{order.table}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {order.total.toLocaleString()} so'm
                    </p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${order.statusColor} dark:opacity-90`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Top mahsulotlar</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Bugungi kun uchun</p>
            </div>
            <button className="text-sm font-medium text-[#FF5722] hover:text-[#E91E63]">
              Barchasini ko'rish
            </button>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-700/50 p-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#FF5722]/10 to-[#E91E63]/10 text-xl">
                      {product.image}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{product.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{product.quantity} ta sotildi</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {product.revenue.toLocaleString()} so'm
                    </p>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
