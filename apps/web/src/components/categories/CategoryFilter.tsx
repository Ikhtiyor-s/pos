import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CategoryFilters, Category } from '@/types/category';

interface CategoryFilterProps {
  filters: CategoryFilters;
  categories: Category[];
  onFiltersChange: (filters: CategoryFilters) => void;
  onReset: () => void;
  className?: string;
}

export function CategoryFilter({
  filters,
  categories,
  onFiltersChange,
  onReset,
  className,
}: CategoryFilterProps) {
  // Filterni yangilash
  const updateFilter = <K extends keyof CategoryFilters>(
    key: K,
    value: CategoryFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Status options
  const statusOptions = [
    { value: 'all', label: 'Barchasi' },
    { value: 'active', label: 'Faol' },
    { value: 'inactive', label: 'Nofaol' },
  ];

  // Ota kategoriyalar
  const parentOptions = [
    { value: '', label: 'Barcha kategoriyalar' },
    ...categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        value: c.id,
        label: `${c.icon || '📁'} ${c.name}`,
      })),
  ];

  // Saralash options
  const sortOptions = [
    { value: 'displayOrder', label: 'Tartib bo\'yicha' },
    { value: 'name', label: 'Nomi bo\'yicha' },
    { value: 'productCount', label: 'Mahsulotlar soni' },
    { value: 'createdAt', label: 'Sana bo\'yicha' },
  ];

  // Filtrlar faolmi
  const hasActiveFilters =
    filters.search || filters.status !== 'all' || filters.parentId;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Qidiruv */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400"
          />
          <Input
            type="text"
            placeholder="Kategoriya nomini qidiring..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status */}
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(value) =>
            updateFilter('status', value as CategoryFilters['status'])
          }
          className="w-full lg:w-36"
        />

        {/* Ota kategoriya */}
        <Select
          options={parentOptions}
          value={filters.parentId}
          onChange={(value) => updateFilter('parentId', value)}
          className="w-full lg:w-48"
        />

        {/* Saralash */}
        <div className="flex gap-2">
          <Select
            options={sortOptions}
            value={filters.sortBy}
            onChange={(value) =>
              updateFilter('sortBy', value as CategoryFilters['sortBy'])
            }
            className="w-full lg:w-44"
          />
          <button
            onClick={() =>
              updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
            }
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
              'border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
            )}
            title={filters.sortOrder === 'asc' ? 'O\'sish tartibi' : 'Kamayish tartibi'}
          >
            <span className="text-lg">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
          </button>
        </div>

        {/* Tozalash */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onReset}
            className="flex items-center gap-2 border-slate-700 text-slate-400 hover:text-white"
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
              label={`Status: ${filters.status === 'active' ? 'Faol' : 'Nofaol'}`}
              onRemove={() => updateFilter('status', 'all')}
            />
          )}
          {filters.parentId && (
            <FilterTag
              label={`Ota: ${categories.find((c) => c.id === filters.parentId)?.name}`}
              onRemove={() => updateFilter('parentId', '')}
            />
          )}
        </div>
      )}
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
