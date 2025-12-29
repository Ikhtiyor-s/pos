import { Package, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsData {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  averagePrice: number;
}

interface ProductStatsProps {
  stats: StatsData;
  className?: string;
}

export function ProductStats({ stats, className }: ProductStatsProps) {
  const statCards = [
    {
      title: 'Jami mahsulotlar',
      value: stats.totalProducts,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Faol mahsulotlar',
      value: stats.activeProducts,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Zahirada kam',
      value: stats.lowStockProducts,
      icon: AlertTriangle,
      color: 'amber',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Zahirada yo\'q',
      value: stats.outOfStockProducts,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-500/10',
      iconColor: 'text-red-400',
      borderColor: 'border-red-500/20',
    },
    {
      title: 'O\'rtacha narx',
      value: new Intl.NumberFormat('uz-UZ').format(stats.averagePrice) + ' so\'m',
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      isPrice: true,
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5', className)}>
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className={cn(
              'rounded-xl border p-4 transition-all hover:shadow-lg',
              stat.bgColor,
              stat.borderColor
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  stat.bgColor
                )}
              >
                <Icon size={20} className={stat.iconColor} />
              </div>
              <div>
                <p className="text-sm text-slate-400">{stat.title}</p>
                <p className={cn('text-xl font-bold', stat.iconColor)}>
                  {stat.isPrice ? stat.value : stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
