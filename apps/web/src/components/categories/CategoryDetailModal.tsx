import {
  Package,
  Calendar,
  Edit,
  FolderTree,
  Tag,
  Printer,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types/category';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (category: Category) => void;
  category: Category | null;
}

export function CategoryDetailModal({
  isOpen,
  onClose,
  onEdit,
  category,
}: CategoryDetailModalProps) {
  if (!category) return null;

  // Sanani formatlash
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kategoriya tafsilotlari" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Ikonka */}
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
            style={{
              backgroundColor: `${category.color}20`,
            }}
          >
            {category.icon || '📁'}
          </div>

          {/* Ma'lumotlar */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={category.status === 'active' ? 'success' : 'default'}>
                {category.status === 'active' ? 'Faol' : 'Nofaol'}
              </Badge>
              <span className="text-sm text-slate-500">#{category.displayOrder}</span>
            </div>

            <h2 className="mb-1 text-2xl font-bold text-white">{category.name}</h2>

            {category.description && (
              <p className="text-slate-400">{category.description}</p>
            )}

            {/* Tahrirlash tugmasi */}
            <Button
              onClick={() => {
                onClose();
                onEdit(category);
              }}
              className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Edit size={18} className="mr-2" />
              Tahrirlash
            </Button>
          </div>
        </div>

        {/* Statistika */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Package size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Mahsulotlar</p>
                <p className="text-xl font-bold text-white">{category.productCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <FolderTree size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Ichki kategoriyalar</p>
                <p className="text-xl font-bold text-white">
                  {category.subcategoryCount}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <div
                  className="h-5 w-5 rounded"
                  style={{ backgroundColor: category.color }}
                />
              </div>
              <div>
                <p className="text-sm text-slate-400">Rang</p>
                <p className="text-sm font-medium text-white">{category.color}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sozlamalar */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Printer size={16} />
            Chop etish sozlamalari
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Chekda ko'rsatish</span>
              <Badge variant={category.showOnReceipt ? 'success' : 'default'}>
                {category.showOnReceipt ? 'Ha' : 'Yo\'q'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Alohida bo'lim sifatida</span>
              <Badge variant={category.showAsSection ? 'success' : 'default'}>
                {category.showAsSection ? 'Ha' : 'Yo\'q'}
              </Badge>
            </div>
            {category.shortName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Qisqartma nom</span>
                <span className="font-medium text-white">{category.shortName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Kalit so'zlar */}
        {category.keywords && category.keywords.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Tag size={16} />
              Kalit so'zlar
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sanalar */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
            <Calendar size={16} />
            Sanalar
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Yaratilgan</span>
              <span className="font-medium text-white">
                {formatDate(category.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Yangilangan</span>
              <span className="font-medium text-white">
                {formatDate(category.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
