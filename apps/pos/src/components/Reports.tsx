import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import {
  DollarSign,
  ShoppingCart,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  TrendingUp,
  Clock,
  LogOut,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';

interface ReportsProps {
  onBack: () => void;
}

// Mock data - haqiqiy loyihada backend dan olinadi
const todayStats = {
  totalSales: 4850000,
  totalOrders: 47,
  averageCheck: 103191,
  tablesServed: 23,
  cashSales: 2100000,
  cardSales: 1350000,
  paymeSales: 800000,
  clickSales: 450000,
  uzumSales: 150000,
};

const recentOrders = [
  {
    id: 'ORD-001',
    table: 'Stol 3',
    total: 185000,
    paymentMethod: 'Naqd',
    time: '14:30',
  },
  {
    id: 'ORD-002',
    table: 'Stol 7',
    total: 320000,
    paymentMethod: 'Karta',
    time: '14:15',
  },
  {
    id: 'ORD-003',
    table: 'Olib ketish',
    total: 95000,
    paymentMethod: 'Payme',
    time: '13:45',
  },
  {
    id: 'ORD-004',
    table: 'Stol 1',
    total: 450000,
    paymentMethod: 'Click',
    time: '13:20',
  },
  {
    id: 'ORD-005',
    table: 'Stol 5',
    total: 275000,
    paymentMethod: 'Naqd',
    time: '12:50',
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

export function Reports({ onBack }: ReportsProps) {
  const { user, currentShift, endShift, logout } = useAuthStore();
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [endingCash, setEndingCash] = useState('');

  const handleEndShift = () => {
    const cash = parseFloat(endingCash);

    if (isNaN(cash) || cash < 0) {
      alert('Noto\'g\'ri summa kiritildi');
      return;
    }

    endShift(cash);
    setShowEndShiftModal(false);
    logout();
  };

  if (!currentShift) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Clock className="mx-auto mb-4 h-16 w-16" />
          <p className="text-lg font-medium">Shift ochilmagan</p>
        </div>
      </div>
    );
  }

  // End Shift Modal
  if (showEndShiftModal) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20">
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Shiftni yopish</h2>
            <p className="mt-2 text-slate-400">Kassadagi yakuniy naqd pulni kiriting</p>
          </div>

          {/* Shift Summary */}
          <div className="mb-6 space-y-3 rounded-lg bg-slate-800/50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Boshlang'ich kassa:</span>
              <span className="font-medium text-white">{formatPrice(currentShift.startingCash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Naqd savdo:</span>
              <span className="font-medium text-green-400">{formatPrice(todayStats.cashSales)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Kutilayotgan kassa:</span>
              <span className="font-bold text-orange-400">
                {formatPrice(currentShift.startingCash + todayStats.cashSales)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Yakuniy kassa (so'm)
              </label>
              <input
                type="number"
                value={endingCash}
                onChange={(e) => setEndingCash(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndShiftModal(false)}
                className="flex-1 rounded-xl border border-slate-700 py-3 font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleEndShift}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-orange-500/20"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold">Kunlik hisobotlar</span>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('uz-UZ', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-400">
              Shift: {new Date(currentShift.startTime).toLocaleTimeString('uz-UZ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={() => setShowEndShiftModal(true)}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
          >
            <LogOut size={16} />
            Shiftni yopish
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Sales */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-400">Umumiy savdo</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatPrice(todayStats.totalSales)}
                </p>
                <div className="mt-2 flex items-center gap-1 text-sm text-green-400">
                  <TrendingUp size={14} />
                  <span>+{todayStats.totalOrders} buyurtma</span>
                </div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                  <ShoppingCart className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-400">Buyurtmalar</p>
                <p className="mt-1 text-2xl font-bold text-white">{todayStats.totalOrders} ta</p>
                <p className="mt-2 text-sm text-slate-500">
                  {todayStats.tablesServed} ta stol xizmat ko'rsatildi
                </p>
              </div>
            </div>

            {/* Average Check */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-400">O'rtacha check</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatPrice(todayStats.averageCheck)}
                </p>
                <p className="mt-2 text-sm text-slate-500">Buyurtma uchun</p>
              </div>
            </div>

            {/* Starting Cash */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20">
                  <Banknote className="h-6 w-6 text-orange-400" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-400">Boshlang'ich kassa</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatPrice(currentShift.startingCash)}
                </p>
                <p className="mt-2 text-sm text-green-400">
                  Naqd: +{formatPrice(todayStats.cashSales)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods & Recent Orders */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Payment Methods */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50">
              <div className="border-b border-slate-700 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">To'lov usullari</h2>
                <p className="text-sm text-slate-400">Bugungi statistika</p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  {
                    name: 'Naqd',
                    amount: todayStats.cashSales,
                    icon: Banknote,
                    color: 'green',
                  },
                  {
                    name: 'Karta',
                    amount: todayStats.cardSales,
                    icon: CreditCard,
                    color: 'blue',
                  },
                  {
                    name: 'Payme',
                    amount: todayStats.paymeSales,
                    icon: Smartphone,
                    color: 'cyan',
                  },
                  {
                    name: 'Click',
                    amount: todayStats.clickSales,
                    icon: Smartphone,
                    color: 'purple',
                  },
                  {
                    name: 'QR Kod',
                    amount: todayStats.uzumSales,
                    icon: QrCode,
                    color: 'orange',
                  },
                ].map((method) => {
                  const Icon = method.icon;
                  const percentage = ((method.amount / todayStats.totalSales) * 100).toFixed(1);

                  return (
                    <div
                      key={method.name}
                      className="flex items-center justify-between rounded-lg bg-slate-900/50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${method.color}-500/20`}>
                          <Icon className={`h-5 w-5 text-${method.color}-400`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{method.name}</p>
                          <p className="text-sm text-slate-400">{percentage}%</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {formatPrice(method.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50">
              <div className="border-b border-slate-700 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">So'nggi buyurtmalar</h2>
                <p className="text-sm text-slate-400">Oxirgi 5 ta</p>
              </div>
              <div className="p-5 space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg bg-slate-900/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{order.id}</p>
                      <p className="text-sm text-slate-400">
                        {order.table} • {order.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatPrice(order.total)}</p>
                      <p className="text-xs text-slate-500">{order.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
