import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductFilters, Category } from '@/types/product';

interface ProductFilterProps {
  filters: ProductFilters;
  categories: Category[];
  onFiltersChange: (filters: ProductFilters) => void;
  onReset: () => void;
  className?: string;
}

export function ProductFilter({
  filters,
  categories,
  onFiltersChange,
  onReset,
  className,
}: ProductFilterProps) {
  // Filterni yangilash yordamchi funksiyasi
  const updateFilter = <K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Kategoriyalar uchun optionslar
  const categoryOptions = [
    { value: '', label: 'Barcha kategoriyalar' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  // Status optionslar
  const statusOptions = [
    { value: 'all', label: 'Barchasi' },
    { value: 'active', label: 'Faol' },
    { value: 'inactive', label: 'Nofaol' },
  ];

  // Zahira holati optionslar
  const stockOptions = [
    { value: 'all', label: 'Barchasi' },
    { value: 'inStock', label: 'Zahirada bor' },
    { value: 'lowStock', label: 'Zahira kam' },
    { value: 'outOfStock', label: 'Zahirada yo\'q' },
  ];

  // Saralash optionslar
  const sortOptions = [
    { value: 'name', label: 'Nomi bo\'yicha' },
    { value: 'price', label: 'Narxi bo\'yicha' },
    { value: 'stock', label: 'Zahira bo\'yicha' },
    { value: 'createdAt', label: 'Sana bo\'yicha' },
  ];

  // Filtrlar o'zgarganmi
  const hasActiveFilters =
    filters.search ||
    filters.categoryId ||
    filters.status !== 'all' ||
    filters.stockStatus !== 'all';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Qidiruv va asosiy filtrlar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Qidiruv */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            type="text"
            placeholder="Mahsulot nomini qidiring..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Kategoriya filtri */}
        <Select
          options={categoryOptions}
          value={filters.categoryId}
          onChange={(value) => updateFilter('categoryId', value)}
          className="w-full lg:w-48"
        />

        {/* Status filtri */}
        <Select
          options={statusOptions}
          value={filters.status}
          onChange={(value) => updateFilter('status', value as ProductFilters['status'])}
          className="w-full lg:w-36"
        />

        {/* Zahira filtri */}
        <Select
          options={stockOptions}
          value={filters.stockStatus}
          onChange={(value) => updateFilter('stockStatus', value as ProductFilters['stockStatus'])}
          className="w-full lg:w-44"
        />

        {/* Saralash */}
        <div className="flex gap-2">
          <Select
            options={sortOptions}
            value={filters.sortBy}
            onChange={(value) => updateFilter('sortBy', value as ProductFilters['sortBy'])}
            className="w-full lg:w-40"
          />
          <button
            onClick={() =>
              updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
            }
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
              'border-gray-300 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
            title={filters.sortOrder === 'asc' ? 'O\'sish tartibi' : 'Kamayish tartibi'}
          >
            <span className="text-lg">{filters.sortOrder === 'asc' ? '↑' : '↓'}</span>
          </button>
        </div>

        {/* Filtrlarni tozalash */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onReset}
            className="flex items-center gap-2 border-gray-300 text-gray-500 hover:text-gray-900"
          >
            <RotateCcw size={16} />
            Tozalash
          </Button>
        )}
      </div>

      {/* Faol filtrlar ko'rsatiladi */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <FilterTag
              label={`Qidiruv: "${filters.search}"`}
              onRemove={() => updateFilter('search', '')}
            />
          )}
          {filters.categoryId && (
            <FilterTag
              label={`Kategoriya: ${categories.find((c) => c.id === filters.categoryId)?.name}`}
              onRemove={() => updateFilter('categoryId', '')}
            />
          )}
          {filters.status !== 'all' && (
            <FilterTag
              label={`Status: ${filters.status === 'active' ? 'Faol' : 'Nofaol'}`}
              onRemove={() => updateFilter('status', 'all')}
            />
          )}
          {filters.stockStatus !== 'all' && (
            <FilterTag
              label={`Zahira: ${stockOptions.find((o) => o.value === filters.stockStatus)?.label}`}
              onRemove={() => updateFilter('stockStatus', 'all')}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Filtr tegi komponenti
function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">
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
