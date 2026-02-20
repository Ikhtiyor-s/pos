import {
  Edit,
  Trash2,
  Eye,
  Package,
  FolderTree,
  ToggleRight,
  ToggleLeft,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/category';

interface CategoryListProps {
  categories: Category[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onView: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
}

export function CategoryList({
  categories,
  selectedIds,
  onSelect,
  onEdit,
  onDelete,
  onView,
  onToggleStatus,
}: CategoryListProps) {
  // Hammasini tanlash
  const handleSelectAll = () => {
    if (selectedIds.length === categories.length) {
      onSelect([]);
    } else {
      onSelect(categories.map((c) => c.id));
    }
  };

  // Bitta kategoriyani tanlash
  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderTree size={48} className="mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-500">Kategoriya topilmadi</p>
        <p className="text-sm text-gray-400">
          Filtrlarni o'zgartiring yoki yangi kategoriya qo'shing
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full">
        {/* Header */}
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="w-12 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedIds.length === categories.length && categories.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 bg-white text-orange-500 focus:ring-orange-500"
              />
            </th>
            <th className="w-12 px-2 py-3 text-left text-sm font-medium text-gray-700">
              #
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Kategoriya
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Mahsulotlar
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Status
            </th>
            <th className="w-32 px-4 py-3 text-right text-sm font-medium text-gray-700">
              Harakatlar
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-100">
          {categories.map((category) => {
            const isSelected = selectedIds.includes(category.id);

            return (
              <tr
                key={category.id}
                className={cn(
                  'group transition-colors hover:bg-gray-50',
                  isSelected && 'bg-orange-500/10'
                )}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(category.id)}
                    className="h-4 w-4 rounded border-gray-300 bg-white text-orange-500 focus:ring-orange-500"
                  />
                </td>

                {/* Tartib raqami */}
                <td className="px-2 py-3">
                  <div className="flex items-center gap-1 text-gray-400">
                    <GripVertical size={14} className="cursor-grab" />
                    <span className="text-sm">{category.displayOrder}</span>
                  </div>
                </td>

                {/* Kategoriya */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Ikonka */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                      style={{
                        backgroundColor: `${category.color}20`,
                      }}
                    >
                      {category.icon || '📁'}
                    </div>

                    {/* Ma'lumotlar */}
                    <div>
                      <p className="font-medium text-gray-900">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-gray-400 line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Mahsulotlar soni */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Package size={14} className="text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {category.productCount}
                      </span>
                    </div>
                    {category.subcategoryCount > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <FolderTree size={14} />
                        <span>{category.subcategoryCount} ichki</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggleStatus(category)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                      category.status === 'active'
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    )}
                  >
                    {category.status === 'active' ? (
                      <>
                        <ToggleRight size={14} />
                        Faol
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={14} />
                        Nofaol
                      </>
                    )}
                  </button>
                </td>

                {/* Harakatlar */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(category)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                      title="Ko'rish"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(category)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-400"
                      title="Tahrirlash"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(category)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-400"
                      title="O'chirish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
