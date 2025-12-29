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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle size={32} className="text-red-400" />
        </div>

        {/* Sarlavha */}
        <h3 className="mb-2 text-xl font-semibold text-white">
          Kategoriyani o'chirish
        </h3>

        {/* Xabar */}
        <p className="mb-4 text-slate-400">
          <span className="font-medium text-white">"{category.name}"</span>{' '}
          kategoriyasini o'chirishni xohlaysizmi?
        </p>

        {/* Ogohlantirish */}
        {(hasProducts || hasSubcategories) && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left">
            <p className="mb-2 text-sm font-medium text-amber-400">
              Diqqat! Bu kategoriyada:
            </p>
            <ul className="space-y-1 text-sm text-amber-300">
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
            <p className="mt-2 text-xs text-amber-400/80">
              O'chirilgandan so'ng, mahsulotlar "Kategoriyasiz" ga o'tkaziladi
            </p>
          </div>
        )}

        {!hasProducts && !hasSubcategories && (
          <p className="mb-6 text-sm text-slate-500">
            Bu amalni qaytarib bo'lmaydi.
          </p>
        )}

        {/* Tugmalar */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-700"
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
