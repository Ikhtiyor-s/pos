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
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full">
        {/* Jadval sarlavhasi */}
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {/* Checkbox */}
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.length === products.length && products.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 bg-white text-orange-500 focus:ring-orange-500"
              />
            </th>

            {/* Mahsulot */}
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Mahsulot
            </th>

            {/* Kategoriya */}
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Kategoriya
            </th>

            {/* Narx */}
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Narx
            </th>

            {/* Zahira */}
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Zahira
            </th>

            {/* Status */}
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
              Status
            </th>

            {/* Harakatlar */}
            <th className="w-24 px-4 py-3 text-right text-sm font-medium text-gray-600">
              Harakatlar
            </th>
          </tr>
        </thead>

        {/* Jadval tanasi */}
        <tbody className="divide-y divide-gray-100">
          {products.map((product) => {
            const stockStatus = getStockStatus(product);
            const StockIcon = stockStatus.icon;
            const isSelected = selectedIds.includes(product.id);
            const profitMargin = getProfitMargin(product.price, product.costPrice);

            return (
              <tr
                key={product.id}
                className={cn(
                  'transition-colors hover:bg-gray-50/50',
                  isSelected && 'bg-orange-50'
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(product.id)}
                    className="h-4 w-4 rounded border-gray-300 bg-white text-orange-500 focus:ring-orange-500"
                  />
                </td>

                {/* Mahsulot */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Rasm */}
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-200">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Package size={20} />
                        </div>
                      )}
                    </div>

                    {/* Ma'lumotlar */}
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-400">SKU: {product.sku}</p>
                    </div>
                  </div>
                </td>

                {/* Kategoriya */}
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-200 px-2.5 py-1 text-sm text-gray-600">
                    {product.category?.name || '-'}
                  </span>
                </td>

                {/* Narx */}
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{formatPrice(product.price)}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">
                        Tannarx: {formatPrice(product.costPrice)}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          profitMargin >= 30
                            ? 'text-green-600'
                            : profitMargin >= 15
                              ? 'text-amber-600'
                              : 'text-red-600'
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
                    <span className="text-sm text-gray-500">
                      {product.stock} {product.unit}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
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
                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        title="Ko'rish"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600"
                        title="Tahrirlash"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product)}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600"
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
          <Package size={48} className="mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-500">Mahsulot topilmadi</p>
          <p className="text-sm text-gray-400">
            Filtrlarni o'zgartiring yoki yangi mahsulot qo'shing
          </p>
        </div>
      )}
    </div>
  );
}
