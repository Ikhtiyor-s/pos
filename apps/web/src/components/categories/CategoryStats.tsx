import { FolderTree, CheckCircle, XCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsData {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalProducts: number;
  avgProductsPerCategory: number;
}

interface CategoryStatsProps {
  stats: StatsData;
  className?: string;
}

export function CategoryStats({ stats, className }: CategoryStatsProps) {
  const statCards = [
    {
      title: 'Jami kategoriyalar',
      value: stats.totalCategories,
      icon: FolderTree,
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Faol',
      value: stats.activeCategories,
      icon: CheckCircle,
      bgColor: 'bg-green-500/10',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/20',
    },
    {
      title: 'Nofaol',
      value: stats.inactiveCategories,
      icon: XCircle,
      bgColor: 'bg-slate-500/10',
      iconColor: 'text-slate-400',
      borderColor: 'border-slate-500/20',
    },
    {
      title: 'Jami mahsulotlar',
      value: stats.totalProducts,
      icon: Package,
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/20',
    },
    {
      title: 'O\'rtacha / kategoriya',
      value: stats.avgProductsPerCategory,
      icon: Package,
      bgColor: 'bg-orange-500/10',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/20',
      suffix: 'ta',
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
                <p className="text-sm text-gray-600 dark:text-slate-400">{stat.title}</p>
                <p className={cn('text-xl font-bold', stat.iconColor)}>
                  {stat.value.toLocaleString()}
                  {stat.suffix && (
                    <span className="ml-1 text-sm font-normal text-gray-500 dark:text-slate-500">
                      {stat.suffix}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
