import { Edit, Trash2, Eye, Package, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
}

export function ProductCard({
  product,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onView,
}: ProductCardProps) {
  // Zahira holati
  const getStockStatus = () => {
    if (product.stock === 0) {
      return { label: 'Tugagan', variant: 'danger' as const, color: 'bg-red-500' };
    }
    if (product.stock <= product.minStock) {
      return { label: 'Kam', variant: 'warning' as const, color: 'bg-amber-500' };
    }
    return { label: 'Bor', variant: 'success' as const, color: 'bg-green-500' };
  };

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Foyda foizi
  const profitMargin = Math.round(
    ((product.price - product.costPrice) / product.price) * 100
  );

  const stockStatus = getStockStatus();

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200',
        'hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50',
        isSelected && 'border-orange-500 ring-2 ring-orange-500/20'
      )}
    >
      {/* Rasm qismi */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package size={48} className="text-gray-400" />
          </div>
        )}

        {/* Checkbox */}
        <div className="absolute left-3 top-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(product.id)}
            className="h-5 w-5 rounded border-gray-300 bg-white/80 text-orange-500 focus:ring-orange-500"
          />
        </div>

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          <Badge variant={product.status === 'active' ? 'success' : 'default'}>
            {product.status === 'active' ? 'Faol' : 'Nofaol'}
          </Badge>
        </div>

        {/* Kategoriya */}
        <div className="absolute bottom-3 left-3">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {product.category?.name}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onView(product)}
            className="rounded-lg bg-white/20 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            title="Ko'rish"
          >
            <Eye size={20} />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="rounded-lg bg-white/20 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-blue-500"
            title="Tahrirlash"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="rounded-lg bg-white/20 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
            title="O'chirish"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Kontent qismi */}
      <div className="p-4">
        {/* Nomi va SKU */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
          <p className="text-sm text-gray-400">SKU: {product.sku}</p>
        </div>

        {/* Narx */}
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
          <span
            className={cn(
              'text-sm font-medium',
              profitMargin >= 30
                ? 'text-green-600'
                : profitMargin >= 15
                  ? 'text-amber-600'
                  : 'text-red-600'
            )}
          >
            +{profitMargin}% foyda
          </span>
        </div>

        {/* Zahira */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-gray-500">Zahira</span>
            <div className="flex items-center gap-1.5">
              {stockStatus.variant === 'danger' && (
                <AlertTriangle size={14} className="text-red-600" />
              )}
              {stockStatus.variant === 'warning' && (
                <AlertTriangle size={14} className="text-amber-600" />
              )}
              <span
                className={cn(
                  'font-medium',
                  stockStatus.variant === 'danger'
                    ? 'text-red-600'
                    : stockStatus.variant === 'warning'
                      ? 'text-amber-600'
                      : 'text-green-600'
                )}
              >
                {product.stock} {product.unit}
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn('h-full rounded-full transition-all', stockStatus.color)}
              style={{
                width: `${Math.min((product.stock / (product.minStock * 3)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Qo'shimcha ma'lumot */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {product.cookingTime && (
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{product.cookingTime} min</span>
            </div>
          )}
          {product.calories && (
            <div className="flex items-center gap-1">
              <span>🔥</span>
              <span>{product.calories} kkal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mahsulotlar grid komponenti
interface ProductGridProps {
  products: Product[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
}

export function ProductGrid({
  products,
  selectedIds,
  onSelect,
  onEdit,
  onDelete,
  onView,
}: ProductGridProps) {
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package size={48} className="mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-500">Mahsulot topilmadi</p>
        <p className="text-sm text-gray-400">
          Filtrlarni o'zgartiring yoki yangi mahsulot qo'shing
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isSelected={selectedIds.includes(product.id)}
          onSelect={handleSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
}
