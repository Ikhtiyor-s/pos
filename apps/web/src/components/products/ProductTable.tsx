import {
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductTableProps {
  products: Product[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
}

export function ProductTable({
  products,
  selectedIds,
  onSelect,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}: ProductTableProps) {
  // Hammasini tanlash
  const handleSelectAll = () => {
    if (selectedIds.length === products.length) {
      onSelect([]);
    } else {
      onSelect(products.map((p) => p.id));
    }
  };

  // Bitta mahsulotni tanlash
  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  // Zahira holati
  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: 'Tugagan', variant: 'danger' as const, icon: AlertTriangle };
    }
    if (product.stock <= product.minStock) {
      return { label: 'Kam', variant: 'warning' as const, icon: AlertTriangle };
    }
    return { label: 'Bor', variant: 'success' as const, icon: Package };
  };

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Foyda foizi
  const getProfitMargin = (price: number, cost: number) => {
    if (cost === 0) return 0;
    return Math.round(((price - cost) / price) * 100);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full">
        {/* Jadval sarlavhasi */}
        <thead className="border-b border-slate-700 bg-slate-800/50">
          <tr>
            {/* Checkbox */}
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.length === products.length && products.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
              />
            </th>

            {/* Mahsulot */}
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
              Mahsulot
            </th>

            {/* Kategoriya */}
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
              Kategoriya
            </th>

            {/* Narx */}
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
              Narx
            </th>

            {/* Zahira */}
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
              Zahira
            </th>

            {/* Status */}
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
              Status
            </th>

            {/* Harakatlar */}
            <th className="w-24 px-4 py-3 text-right text-sm font-medium text-slate-300">
              Harakatlar
            </th>
          </tr>
        </thead>

        {/* Jadval tanasi */}
        <tbody className="divide-y divide-slate-700/50">
          {products.map((product) => {
            const stockStatus = getStockStatus(product);
            const StockIcon = stockStatus.icon;
            const isSelected = selectedIds.includes(product.id);
            const profitMargin = getProfitMargin(product.price, product.costPrice);

            return (
              <tr
                key={product.id}
                className={cn(
                  'transition-colors hover:bg-slate-800/30',
                  isSelected && 'bg-orange-500/10'
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(product.id)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                  />
                </td>

                {/* Mahsulot */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Rasm */}
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-700">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                          <Package size={20} />
                        </div>
                      )}
                    </div>

                    {/* Ma'lumotlar */}
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                </td>

                {/* Kategoriya */}
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-700 px-2.5 py-1 text-sm text-slate-300">
                    {product.category?.name || '-'}
                  </span>
                </td>

                {/* Narx */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{formatPrice(product.price)}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">
                        Tannarx: {formatPrice(product.costPrice)}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          profitMargin >= 30
                            ? 'text-green-400'
                            : profitMargin >= 15
                              ? 'text-amber-400'
                              : 'text-red-400'
                        )}
                      >
                        ({profitMargin}%)
                      </span>
                    </div>
                  </div>
                </td>

                {/* Zahira */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={stockStatus.variant}>
                      <StockIcon size={12} className="mr-1" />
                      {stockStatus.label}
                    </Badge>
                    <span className="text-sm text-slate-400">
                      {product.stock} {product.unit}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        product.stock === 0
                          ? 'bg-red-500'
                          : product.stock <= product.minStock
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                      )}
                      style={{
                        width: `${Math.min((product.stock / (product.minStock * 3)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleStatus(product)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                      product.status === 'active'
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    )}
                  >
                    {product.status === 'active' ? (
                      <>
                        <ToggleRight size={16} />
                        Faol
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={16} />
                        Nofaol
                      </>
                    )}
                  </button>
                </td>

                {/* Harakatlar */}
                <td className="px-4 py-3">
                  <div className="relative flex justify-end">
                    {/* Tezkor harakatlar */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onView(product)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                        title="Ko'rish"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-blue-400"
                        title="Tahrirlash"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-red-400"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bo'sh holat */}
      {products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package size={48} className="mb-4 text-slate-600" />
          <p className="text-lg font-medium text-slate-400">Mahsulot topilmadi</p>
          <p className="text-sm text-slate-500">
            Filtrlarni o'zgartiring yoki yangi mahsulot qo'shing
          </p>
        </div>
      )}
    </div>
  );
}
