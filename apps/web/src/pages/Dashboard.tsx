import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  {
    title: 'Bugungi sotuv',
    value: "12,450,000 so'm",
    change: '+12%',
    changeType: 'positive',
    icon: DollarSign,
  },
  {
    title: 'Buyurtmalar',
    value: '48',
    change: '+8%',
    changeType: 'positive',
    icon: ShoppingCart,
  },
  {
    title: "O'rtacha check",
    value: "259,375 so'm",
    change: '+5%',
    changeType: 'positive',
    icon: TrendingUp,
  },
  {
    title: 'Faol stollar',
    value: '6 / 10',
    change: '-2',
    changeType: 'negative',
    icon: Users,
  },
];

const recentOrders = [
  { id: 'ORD-20241228-0001', table: 'Stol 3', total: 185000, status: 'Tayyor' },
  { id: 'ORD-20241228-0002', table: 'Stol 7', total: 320000, status: 'Tayyorlanmoqda' },
  { id: 'ORD-20241228-0003', table: 'Olib ketish', total: 95000, status: 'Yakunlangan' },
  { id: 'ORD-20241228-0004', table: 'Stol 1', total: 450000, status: 'Yangi' },
  { id: 'ORD-20241228-0005', table: 'Yetkazish', total: 275000, status: 'Yetkazilmoqda' },
];

const topProducts = [
  { name: "O'zbek oshi", quantity: 24, revenue: 1080000 },
  { name: 'Shashlik (1 shish)', quantity: 45, revenue: 1125000 },
  { name: 'Manti', quantity: 18, revenue: 630000 },
  { name: "Lag'mon", quantity: 15, revenue: 570000 },
  { name: "Sho'rva", quantity: 12, revenue: 360000 },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-slate-400">
          Bugungi statistika va umumiy ko'rsatkichlar
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="flex items-center text-xs text-muted-foreground">
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="ml-1">kechagidan</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>So'nggi buyurtmalar</CardTitle>
            <CardDescription>Oxirgi 5 ta buyurtma</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.table}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {order.total.toLocaleString()} so'm
                    </p>
                    <p
                      className={`text-sm ${
                        order.status === 'Yakunlangan'
                          ? 'text-green-500'
                          : order.status === 'Yangi'
                            ? 'text-blue-500'
                            : order.status === 'Tayyor'
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Eng ko'p sotilgan taomlar</CardTitle>
            <CardDescription>Bugungi kun uchun</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} ta sotildi
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">{product.revenue.toLocaleString()} so'm</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
