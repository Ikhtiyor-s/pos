import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OrderFilters, OrderStatus, OrderType, PaymentStatus, ORDER_STATUS_INFO, ORDER_TYPE_INFO } from '@/types/order';

interface OrderFilterProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
  onReset: () => void;
  className?: string;
}

export function OrderFilter({
  filters,
  onFiltersChange,
  onReset,
  className,
}: OrderFilterProps) {
  // Filterni yangilash
  const updateFilter = <K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Status options
  const statusOptions = [
    { value: 'all', label: 'Barcha holatlar' },
    ...Object.entries(ORDER_STATUS_INFO).map(([key, info]) => ({
      value: key,
      label: `${info.icon} ${info.label}`,
    })),
  ];

  // Type options
  const typeOptions = [
    { value: 'all', label: 'Barcha turlar' },
    ...Object.entries(ORDER_TYPE_INFO).map(([key, info]) => ({
      value: key,
      label: `${info.icon} ${info.label}`,
    })),
  ];

  // Payment status options
  const paymentOptions = [
    { value: 'all', label: 'Barcha to\'lovlar' },
    { value: 'pending', label: '⏳ Kutilmoqda' },
    { value: 'paid', label: '✅ To\'langan' },
    { value: 'failed', label: '❌ Muvaffaqiyatsiz' },
  ];

  // Filtrlar faolmi
  const hasActiveFilters =
    filters.search ||
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.paymentStatus !== 'all' ||
    filters.dateRange !== null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Qidiruv */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <Input
            type="text"
            placeholder="Buyurtma raqami yoki mijoz nomi..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status */}
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(value) => updateFilter('status', value as OrderStatus | 'all')}
          className="w-full lg:w-44"
        />

        {/* Type */}
        <Select
          options={typeOptions}
          value={filters.type}
          onChange={(value) => updateFilter('type', value as OrderType | 'all')}
          className="w-full lg:w-40"
        />

        {/* Payment status */}
        <Select
          options={paymentOptions}
          value={filters.paymentStatus}
          onChange={(value) => updateFilter('paymentStatus', value as PaymentStatus | 'all')}
          className="w-full lg:w-44"
        />

        {/* Tozalash */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onReset}
            className="flex items-center gap-2 border-gray-200 text-gray-500 hover:text-gray-900"
          >
            <RotateCcw size={16} />
            Tozalash
          </Button>
        )}
      </div>

      {/* Faol filtrlar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <FilterTag
              label={`Qidiruv: "${filters.search}"`}
              onRemove={() => updateFilter('search', '')}
            />
          )}
          {filters.status !== 'all' && (
            <FilterTag
              label={`Holat: ${ORDER_STATUS_INFO[filters.status as OrderStatus]?.label}`}
              onRemove={() => updateFilter('status', 'all')}
            />
          )}
          {filters.type !== 'all' && (
            <FilterTag
              label={`Tur: ${ORDER_TYPE_INFO[filters.type as OrderType]?.label}`}
              onRemove={() => updateFilter('type', 'all')}
            />
          )}
          {filters.paymentStatus !== 'all' && (
            <FilterTag
              label={`To'lov: ${filters.paymentStatus}`}
              onRemove={() => updateFilter('paymentStatus', 'all')}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Status tabs komponenti
interface StatusTabsProps {
  currentStatus: OrderStatus | 'all';
  counts: Record<string, number>;
  onChange: (status: OrderStatus | 'all') => void;
}

export function StatusTabs({ currentStatus, counts, onChange }: StatusTabsProps) {
  const tabs = [
    { value: 'all' as const, label: 'Barchasi', count: counts.all || 0 },
    { value: 'new' as const, label: 'Yangi', count: counts.new || 0, color: 'blue' },
    { value: 'preparing' as const, label: 'Tayyorlan..', count: counts.preparing || 0, color: 'amber' },
    { value: 'ready' as const, label: 'Tayyor', count: counts.ready || 0, color: 'green' },
    { value: 'delivering' as const, label: 'Yetkazil..', count: counts.delivering || 0, color: 'cyan' },
    { value: 'completed' as const, label: 'Yakunlan..', count: counts.completed || 0, color: 'orange' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
            currentStatus === tab.value
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <span className="whitespace-nowrap">{tab.label}</span>
          <span
            className={cn(
              'flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]',
              currentStatus === tab.value
                ? 'bg-white/20'
                : 'bg-gray-200'
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// Filtr tegi
function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-3 py-1 text-sm text-orange-400">
      {label}
      <button
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-orange-500/30"
      >
        <X size={14} />
      </button>
    </span>
  );
}
