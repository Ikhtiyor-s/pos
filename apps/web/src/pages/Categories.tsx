import { useState, useMemo } from 'react';
import {
  Plus,
  Grid3X3,
  List,
  Trash2,
  ToggleRight,
  ToggleLeft,
  ArrowUpDown,
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
import { mockCategories as initialCategories } from '@/data/mockCategories';
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
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [filters, setFilters] = useState<CategoryFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<CategoryViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal state-lari
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtrlangan kategoriyalar
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    // Qidiruv
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower) ||
          c.shortName?.toLowerCase().includes(searchLower)
      );
    }

    // Status filtri
    if (filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status);
    }

    // Ota kategoriya filtri
    if (filters.parentId) {
      result = result.filter((c) => c.parentId === filters.parentId);
    }

    // Saralash
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
      avgProductsPerCategory: Math.round(
        categories.reduce((sum, c) => sum + c.productCount, 0) / categories.length
      ),
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

  const handleToggleStatus = (category: Category) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === category.id
          ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' }
          : c
      )
    );
  };

  const handleDuplicateCategory = (category: Category) => {
    const newCategory: Category = {
      ...category,
      id: String(Date.now()),
      name: `${category.name} (nusxa)`,
      slug: `${category.slug}-copy-${Date.now()}`,
      displayOrder: categories.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleFormSubmit = (data: CreateCategoryDto) => {
    setIsLoading(true);

    setTimeout(() => {
      if (selectedCategory) {
        // Yangilash
        setCategories((prev) =>
          prev.map((c) =>
            c.id === selectedCategory.id
              ? {
                  ...c,
                  ...data,
                  keywords: data.keywords
                    ? data.keywords.split(',').map((k) => k.trim())
                    : undefined,
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        );
      } else {
        // Yangi qo'shish
        const newCategory: Category = {
          id: String(Date.now()),
          name: data.name,
          slug: data.name.toLowerCase().replace(/\s+/g, '-'),
          description: data.description,
          color: data.color,
          icon: data.icon,
          parentId: data.parentId || undefined,
          displayOrder: data.displayOrder || categories.length + 1,
          productCount: 0,
          subcategoryCount: 0,
          status: data.status || 'active',
          showOnReceipt: data.showOnReceipt ?? true,
          showAsSection: data.showAsSection ?? true,
          shortName: data.shortName,
          keywords: data.keywords
            ? data.keywords.split(',').map((k) => k.trim())
            : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setCategories((prev) => [...prev, newCategory]);
      }

      setIsLoading(false);
      setIsFormOpen(false);
    }, 500);
  };

  const handleConfirmDelete = () => {
    if (!selectedCategory) return;

    setIsLoading(true);
    setTimeout(() => {
      setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
      setSelectedIds((prev) => prev.filter((id) => id !== selectedCategory.id));
      setIsLoading(false);
      setIsDeleteOpen(false);
    }, 500);
  };

  // Ommaviy operatsiyalar
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setCategories((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  const handleBulkToggleStatus = (status: 'active' | 'inactive') => {
    setCategories((prev) =>
      prev.map((c) => (selectedIds.includes(c.id) ? { ...c, status } : c))
    );
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kategoriyalar</h1>
          <p className="text-sm text-gray-500">
            Mahsulot kategoriyalarini boshqaring va tartibga soling
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Tartiblash */}
          <Button
            variant="outline"
            className="border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          >
            <ArrowUpDown size={18} className="mr-2" />
            Tartiblash
          </Button>

          {/* Yangi kategoriya */}
          <Button
            onClick={handleAddCategory}
            className="bg-gradient-to-r from-[#FF5722] to-[#E91E63] hover:brightness-110 text-white"
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

        {/* View mode va bulk actions */}
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
                className="border-gray-200 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <ToggleRight size={16} className="mr-1" />
                Faollashtirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggleStatus('inactive')}
                className="border-gray-200 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
              >
                <ToggleLeft size={16} className="mr-1" />
                Nofaollashtirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
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

          {/* Ko'rinish tugmalari */}
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

      {/* Kategoriyalar ro'yxati */}
      {viewMode === 'grid' ? (
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
      )}

      {/* Modallar */}
      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        category={selectedCategory}
        categories={categories}
        isLoading={isLoading}
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
        isLoading={isLoading}
      />
    </div>
  );
}
