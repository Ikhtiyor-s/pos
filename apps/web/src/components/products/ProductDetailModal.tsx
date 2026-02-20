import {
  Package,
  Clock,
  Flame,
  Tag,
  Box,
  DollarSign,
  Calendar,
  Edit,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  product: Product | null;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  onEdit,
  product,
}: ProductDetailModalProps) {
  if (!product) return null;

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Sanani formatlash
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Foyda hisoblash
  const profitAmount = product.price - product.costPrice;
  const profitMargin = Math.round((profitAmount / product.price) * 100);

  // Zahira holati
  const getStockStatus = () => {
    if (product.stock === 0) {
      return { label: 'Tugagan', variant: 'danger' as const };
    }
    if (product.stock <= product.minStock) {
      return { label: 'Kam', variant: 'warning' as const };
    }
    return { label: 'Yetarli', variant: 'success' as const };
  };

  const stockStatus = getStockStatus();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mahsulot tafsilotlari"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header - Rasm va asosiy ma'lumotlar */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Rasm */}
          <div className="w-full md:w-1/3">
            <div className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package size={64} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Asosiy ma'lumotlar */}
          <div className="flex-1 space-y-4">
            {/* Status va kategoriya */}
            <div className="flex items-center gap-2">
              <Badge variant={product.status === 'active' ? 'success' : 'default'}>
                {product.status === 'active' ? 'Faol' : 'Nofaol'}
              </Badge>
              <Badge variant="info">{product.category?.name}</Badge>
            </div>

            {/* Nomi */}
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>

            {/* Tavsif */}
            {product.description && (
              <p className="text-gray-500">{product.description}</p>
            )}

            {/* SKU */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Tag size={16} />
              <span>SKU: {product.sku}</span>
            </div>

            {/* Narx */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.costPrice)}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  profitMargin >= 30 ? 'text-green-600' : 'text-amber-600'
                )}
              >
                +{profitMargin}% foyda
              </span>
            </div>

            {/* Tahrirlash tugmasi */}
            <Button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-gray-900"
            >
              <Edit size={18} className="mr-2" />
              Tahrirlash
            </Button>
          </div>
        </div>

        {/* Detailllar grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Zahira */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Box size={16} />
              Zahira holati
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Joriy zahira</span>
                <span className="font-medium text-gray-900">
                  {product.stock} {product.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Minimal zahira</span>
                <span className="font-medium text-gray-900">
                  {product.minStock} {product.unit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Holat</span>
                <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
              </div>
              {/* Progress bar */}
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
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
            </div>
          </div>

          {/* Narxlar */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <DollarSign size={16} />
              Narx ma'lumotlari
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Sotuv narxi</span>
                <span className="font-medium text-gray-900">
                  {formatPrice(product.price)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tannarx</span>
                <span className="font-medium text-gray-900">
                  {formatPrice(product.costPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Foyda</span>
                <span className="font-medium text-green-600">
                  +{formatPrice(profitAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Foyda marjasi</span>
                <span
                  className={cn(
                    'font-medium',
                    profitMargin >= 30 ? 'text-green-600' : 'text-amber-600'
                  )}
                >
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>

          {/* Qo'shimcha ma'lumotlar */}
          {(product.cookingTime || product.calories) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
                <Clock size={16} />
                Qo'shimcha
              </h3>
              <div className="space-y-3">
                {product.cookingTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tayyorlash vaqti</span>
                    <span className="font-medium text-gray-900">
                      {product.cookingTime} daqiqa
                    </span>
                  </div>
                )}
                {product.calories && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Kaloriya</span>
                    <span className="flex items-center gap-1 font-medium text-gray-900">
                      <Flame size={14} className="text-orange-500" />
                      {product.calories} kkal
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sanalar */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Calendar size={16} />
              Sanalar
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Yaratilgan</span>
                <span className="font-medium text-gray-900">
                  {formatDate(product.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Yangilangan</span>
                <span className="font-medium text-gray-900">
                  {formatDate(product.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
