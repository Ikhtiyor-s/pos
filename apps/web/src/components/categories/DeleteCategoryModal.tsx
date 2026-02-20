import { AlertTriangle, Loader2, Package } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types/category';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  category: Category | null;
  isLoading?: boolean;
}

export function DeleteCategoryModal({
  isOpen,
  onClose,
  onConfirm,
  category,
  isLoading = false,
}: DeleteCategoryModalProps) {
  if (!category) return null;

  const hasProducts = category.productCount > 0;
  const hasSubcategories = category.subcategoryCount > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        {/* Ogohlantirish ikonkasi */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle size={32} className="text-red-600" />
        </div>

        {/* Sarlavha */}
        <h3 className="mb-2 text-xl font-semibold text-gray-900">
          Kategoriyani o'chirish
        </h3>

        {/* Xabar */}
        <p className="mb-4 text-gray-500">
          <span className="font-medium text-gray-900">"{category.name}"</span>{' '}
          kategoriyasini o'chirishni xohlaysizmi?
        </p>

        {/* Ogohlantirish */}
        {(hasProducts || hasSubcategories) && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
            <p className="mb-2 text-sm font-medium text-amber-600">
              Diqqat! Bu kategoriyada:
            </p>
            <ul className="space-y-1 text-sm text-amber-700">
              {hasProducts && (
                <li className="flex items-center gap-2">
                  <Package size={14} />
                  {category.productCount} ta mahsulot bor
                </li>
              )}
              {hasSubcategories && (
                <li className="flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {category.subcategoryCount} ta ichki kategoriya bor
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-amber-600/80">
              O'chirilgandan so'ng, mahsulotlar "Kategoriyasiz" ga o'tkaziladi
            </p>
          </div>
        )}

        {!hasProducts && !hasSubcategories && (
          <p className="mb-6 text-sm text-gray-400">
            Bu amalni qaytarib bo'lmaydi.
          </p>
        )}

        {/* Tugmalar */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-200"
          >
            Bekor qilish
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
            Ha, o'chirish
          </Button>
        </div>
      </div>
    </Modal>
  );
}
