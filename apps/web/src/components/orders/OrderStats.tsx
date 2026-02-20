import {
  ShoppingBag,
  Clock,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStats as OrderStatsType } from '@/types/order';

interface OrderStatsProps {
  stats: OrderStatsType;
  className?: string;
}

export function OrderStats({ stats, className }: OrderStatsProps) {
  // Narxni formatlash
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return (price / 1000000).toFixed(1) + ' mln';
    }
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const statCards = [
    {
      title: 'Bugungi buyurtmalar',
      value: stats.totalOrders,
      icon: ShoppingBag,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Yangi',
      value: stats.newOrders,
      icon: AlertCircle,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
      pulse: stats.newOrders > 0,
    },
    {
      title: 'Tayyorlanmoqda',
      value: stats.preparingOrders,
      icon: Utensils,
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
    },
    {
      title: 'Tayyor',
      value: stats.readyOrders,
      icon: CheckCircle,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Bugungi daromad',
      value: formatPrice(stats.totalRevenue) + ' so\'m',
      icon: DollarSign,
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      isPrice: true,
    },
    {
      title: 'O\'rtacha kutish',
      value: stats.avgWaitTime + ' min',
      icon: Clock,
      bgColor: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/20',
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6',
        className
      )}
    >
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className={cn(
              'relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-lg',
              stat.bgColor,
              stat.borderColor
            )}
          >
            {/* Pulse effect for new orders */}
            {stat.pulse && (
              <div className="absolute right-2 top-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500"></span>
                </span>
              </div>
            )}

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
                <p className="text-xs text-gray-500">{stat.title}</p>
                <p className={cn('text-xl font-bold', stat.iconColor)}>
                  {stat.isPrice ? stat.value : stat.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
