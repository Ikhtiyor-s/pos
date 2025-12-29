import {
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  Package,
  FolderTree,
  ToggleRight,
  ToggleLeft,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/category';
import { useState } from 'react';

interface CategoryCardProps {
  category: Category;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onView: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
  onDuplicate: (category: Category) => void;
}

export function CategoryCard({
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
  onDuplicate,
}: CategoryCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 transition-all duration-200',
        'hover:border-slate-600 hover:shadow-xl hover:shadow-black/20',
        isSelected && 'border-orange-500 ring-2 ring-orange-500/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(category.id)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
          />

          {/* Ikonka */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{
              backgroundColor: `${category.color}20`,
            }}
          >
            {category.icon || '📁'}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
                <button
                  onClick={() => {
                    onView(category);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <Eye size={16} />
                  Ko'rish
                </button>
                <button
                  onClick={() => {
                    onEdit(category);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <Edit size={16} />
                  Tahrirlash
                </button>
                <button
                  onClick={() => {
                    onDuplicate(category);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  <Copy size={16} />
                  Nusxa olish
                </button>
                <button
                  onClick={() => {
                    onToggleStatus(category);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                >
                  {category.status === 'active' ? (
                    <>
                      <ToggleLeft size={16} />
                      Nofaollashtirish
                    </>
                  ) : (
                    <>
                      <ToggleRight size={16} />
                      Faollashtirish
                    </>
                  )}
                </button>
                <div className="my-1 border-t border-slate-700" />
                <button
                  onClick={() => {
                    onDelete(category);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700"
                >
                  <Trash2 size={16} />
                  O'chirish
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Nom va tavsif */}
        <h3 className="mb-1 text-lg font-semibold text-white">{category.name}</h3>
        {category.description && (
          <p className="mb-3 text-sm text-slate-400 line-clamp-2">
            {category.description}
          </p>
        )}

        {/* Statistika */}
        <div className="mb-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Package size={14} />
            <span className="font-medium text-white">{category.productCount}</span>
            <span>mahsulot</span>
          </div>
          {category.subcategoryCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <FolderTree size={14} />
              <span className="font-medium text-white">{category.subcategoryCount}</span>
              <span>ichki</span>
            </div>
          )}
        </div>

        {/* Status va rang indikatori */}
        <div className="flex items-center justify-between">
          <Badge variant={category.status === 'active' ? 'success' : 'default'}>
            {category.status === 'active' ? 'Faol' : 'Nofaol'}
          </Badge>

          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-xs text-slate-500">
              #{category.displayOrder}
            </span>
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onView(category)}
          className="rounded-lg bg-white/20 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          title="Ko'rish"
        >
          <Eye size={20} />
        </button>
        <button
          onClick={() => onEdit(category)}
          className="rounded-lg bg-white/20 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-blue-500"
          title="Tahrirlash"
        >
          <Edit size={20} />
        </button>
        <button
          onClick={() => onDelete(category)}
          className="rounded-lg bg-white/20 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-red-500"
          title="O'chirish"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}

// CategoryGrid komponenti
interface CategoryGridProps {
  categories: Category[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onView: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
  onDuplicate: (category: Category) => void;
}

export function CategoryGrid({
  categories,
  selectedIds,
  onSelect,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
  onDuplicate,
}: CategoryGridProps) {
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderTree size={48} className="mb-4 text-slate-600" />
        <p className="text-lg font-medium text-slate-400">Kategoriya topilmadi</p>
        <p className="text-sm text-slate-500">
          Filtrlarni o'zgartiring yoki yangi kategoriya qo'shing
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          isSelected={selectedIds.includes(category.id)}
          onSelect={handleSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onToggleStatus={onToggleStatus}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}
