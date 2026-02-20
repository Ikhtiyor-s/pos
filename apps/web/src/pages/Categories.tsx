import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Grid3X3,
  List,
  Trash2,
  ToggleRight,
  ToggleLeft,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryGrid } from '@/components/categories/CategoryCard';
import { CategoryList } from '@/components/categories/CategoryList';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { CategoryFilter } from '@/components/categories/CategoryFilter';
import { CategoryStats } from '@/components/categories/CategoryStats';
import { CategoryDetailModal } from '@/components/categories/CategoryDetailModal';
import { DeleteCategoryModal } from '@/components/categories/DeleteCategoryModal';
import { cn } from '@/lib/utils';
import { categoryFullService } from '@/services/category.service';
import type { Category, CategoryFilters, CreateCategoryDto, CategoryViewMode } from '@/types/category';

// Boshlang'ich filtr qiymatlari
const initialFilters: CategoryFilters = {
  search: '',
  status: 'all',
  parentId: '',
  sortBy: 'displayOrder',
  sortOrder: 'asc',
};

export function CategoriesPage() {
  // State-lar
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<CategoryFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<CategoryViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Loading / Error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal state-lari
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Ma'lumotlarni yuklash
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryFullService.getAll();
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Kategoriyalarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrlangan kategoriyalar
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status);
    }

    if (filters.parentId) {
      result = result.filter((c) => c.parentId === filters.parentId);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'productCount':
          comparison = a.productCount - b.productCount;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'displayOrder':
        default:
          comparison = a.displayOrder - b.displayOrder;
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [categories, filters]);

  // Statistika
  const stats = useMemo(
    () => ({
      totalCategories: categories.length,
      activeCategories: categories.filter((c) => c.status === 'active').length,
      inactiveCategories: categories.filter((c) => c.status === 'inactive').length,
      totalProducts: categories.reduce((sum, c) => sum + c.productCount, 0),
      avgProductsPerCategory: categories.length > 0
        ? Math.round(categories.reduce((sum, c) => sum + c.productCount, 0) / categories.length)
        : 0,
    }),
    [categories]
  );

  // Handlers
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleViewCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsDetailOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      const newStatus = category.status === 'active' ? 'inactive' : 'active';
      await categoryFullService.update(category.id, { isActive: newStatus === 'active' });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, status: newStatus as 'active' | 'inactive' } : c
        )
      );
      showToast(`Kategoriya ${newStatus === 'active' ? 'faollashtirildi' : 'nofaol qilindi'}`);
    } catch {
      showToast('Statusni o\'zgartirishda xatolik', 'error');
    }
  };

  const handleDuplicateCategory = async (category: Category) => {
    try {
      setIsSaving(true);
      const newCat = await categoryFullService.create({
        name: `${category.name} (nusxa)`,
        description: category.description,
      });
      setCategories((prev) => [...prev, newCat]);
      showToast('Kategoriya nusxalandi');
    } catch {
      showToast('Nusxalashda xatolik', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormSubmit = async (data: CreateCategoryDto) => {
    setIsSaving(true);
    try {
      if (selectedCategory) {
        const updated = await categoryFullService.update(selectedCategory.id, {
          name: data.name,
          description: data.description,
          image: data.image,
          sortOrder: data.displayOrder,
        });
        setCategories((prev) => prev.map((c) => (c.id === selectedCategory.id ? updated : c)));
        showToast('Kategoriya yangilandi');
      } else {
        const created = await categoryFullService.create({
          name: data.name,
          description: data.description,
          image: data.image,
          sortOrder: data.displayOrder,
        });
        setCategories((prev) => [...prev, created]);
        showToast('Kategoriya yaratildi');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    setIsSaving(true);
    try {
      await categoryFullService.delete(selectedCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
      setSelectedIds((prev) => prev.filter((id) => id !== selectedCategory.id));
      showToast('Kategoriya o\'chirildi');
      setIsDeleteOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'O\'chirishda xatolik', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Ommaviy operatsiyalar
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsSaving(true);
    try {
      await Promise.all(selectedIds.map((id) => categoryFullService.delete(id)));
      setCategories((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
      showToast(`${selectedIds.length} ta kategoriya o'chirildi`);
      setSelectedIds([]);
    } catch {
      showToast('Ommaviy o\'chirishda xatolik', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkToggleStatus = async (status: 'active' | 'inactive') => {
    setIsSaving(true);
    try {
      await Promise.all(
        selectedIds.map((id) => categoryFullService.update(id, { isActive: status === 'active' }))
      );
      setCategories((prev) =>
        prev.map((c) => (selectedIds.includes(c.id) ? { ...c, status } : c))
      );
      showToast(`${selectedIds.length} ta kategoriya ${status === 'active' ? 'faollashtirildi' : 'nofaol qilindi'}`);
      setSelectedIds([]);
    } catch {
      showToast('Statusni o\'zgartirishda xatolik', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading holati
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500">Kategoriyalar yuklanmoqda...</p>
      </div>
    );
  }

  // Error holati
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-700 font-medium mb-2">Xatolik yuz berdi</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">Qayta yuklash</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-fade-in-up',
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        )}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kategoriyalar</h1>
          <p className="text-sm text-gray-500">
            Mahsulot kategoriyalarini boshqaring va tartibga soling
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          >
            <ArrowUpDown size={18} className="mr-2" />
            Tartiblash
          </Button>

          <Button
            onClick={handleAddCategory}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:brightness-110 text-white"
          >
            <Plus size={18} className="mr-2" />
            Yangi kategoriya
          </Button>
        </div>
      </div>

      {/* Statistika */}
      <CategoryStats stats={stats} />

      {/* Filtrlar va ko'rinish */}
      <div className="space-y-4">
        <CategoryFilter
          filters={filters}
          categories={categories}
          onFiltersChange={setFilters}
          onReset={() => setFilters(initialFilters)}
        />

        <div className="flex items-center justify-between">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {selectedIds.length} ta tanlandi
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggleStatus('active')}
                disabled={isSaving}
                className="border-gray-200 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <ToggleRight size={16} className="mr-1" />
                Faollashtirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggleStatus('inactive')}
                disabled={isSaving}
                className="border-gray-200 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                <ToggleLeft size={16} className="mr-1" />
                Nofaollashtirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                disabled={isSaving}
                className="border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} className="mr-1" />
                O'chirish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="text-gray-500 hover:text-gray-700"
              >
                Bekor qilish
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Jami: {filteredCategories.length} ta kategoriya
            </div>
          )}

          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Grid3X3 size={16} />
              Kartalar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List size={16} />
              Ro'yxat
            </button>
          </div>
        </div>
      </div>

      {/* Bo'sh holat */}
      {categories.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-white border border-gray-200">
          <FolderOpen className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">Kategoriyalar yo'q</h3>
          <p className="text-sm text-gray-500 mb-4">Birinchi kategoriyangizni qo'shing</p>
          <Button onClick={handleAddCategory} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={18} className="mr-2" />
            Yangi kategoriya
          </Button>
        </div>
      )}

      {/* Kategoriyalar ro'yxati */}
      {categories.length > 0 && (
        viewMode === 'grid' ? (
          <CategoryGrid
            categories={filteredCategories}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onView={handleViewCategory}
            onToggleStatus={handleToggleStatus}
            onDuplicate={handleDuplicateCategory}
          />
        ) : (
          <CategoryList
            categories={filteredCategories}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onView={handleViewCategory}
            onToggleStatus={handleToggleStatus}
          />
        )
      )}

      {/* Modallar */}
      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        category={selectedCategory}
        categories={categories}
        isLoading={isSaving}
      />

      <CategoryDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleEditCategory}
        category={selectedCategory}
      />

      <DeleteCategoryModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        category={selectedCategory}
        isLoading={isSaving}
      />
    </div>
  );
}
