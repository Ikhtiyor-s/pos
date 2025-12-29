import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/product';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  product: Product | null;
  isLoading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  product,
  isLoading = false,
}: DeleteConfirmModalProps) {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center">
        {/* Ogohlantirish ikonkasi */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle size={32} className="text-red-400" />
        </div>

        {/* Sarlavha */}
        <h3 className="mb-2 text-xl font-semibold text-white">
          Mahsulotni o'chirish
        </h3>

        {/* Xabar */}
        <p className="mb-6 text-slate-400">
          <span className="font-medium text-white">"{product.name}"</span> mahsulotini
          o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
        </p>

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
