import { useState, useMemo } from 'react';
import {
  Plus,
  Grid3X3,
  List,
  Download,
  Upload,
  Trash2,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { ProductFilter } from '@/components/products/ProductFilter';
import { ProductTable } from '@/components/products/ProductTable';
import { ProductGrid } from '@/components/products/ProductCard';
import { ProductForm } from '@/components/products/ProductForm';
import { ProductStats } from '@/components/products/ProductStats';
import { ProductDetailModal } from '@/components/products/ProductDetailModal';
import { DeleteConfirmModal } from '@/components/products/DeleteConfirmModal';
import { cn } from '@/lib/utils';
import { mockProducts, mockCategories } from '@/data/mockProducts';
import type { Product, ProductFilters, CreateProductDto } from '@/types/product';

// Boshlang'ich filtr qiymatlari
const initialFilters: ProductFilters = {
  search: '',
  categoryId: '',
  status: 'all',
  stockStatus: 'all',
  priceRange: { min: 0, max: 1000000 },
  sortBy: 'name',
  sortOrder: 'asc',
};

export function ProductsPage() {
  // State-lar
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal state-lari
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Qidiruv
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Kategoriya filtri
    if (filters.categoryId) {
      result = result.filter((p) => p.categoryId === filters.categoryId);
    }

    // Status filtri
    if (filters.status !== 'all') {
      result = result.filter((p) => p.status === filters.status);
    }

    // Zahira holati filtri
    if (filters.stockStatus !== 'all') {
      result = result.filter((p) => {
        if (filters.stockStatus === 'outOfStock') return p.stock === 0;
        if (filters.stockStatus === 'lowStock') return p.stock > 0 && p.stock <= p.minStock;
        if (filters.stockStatus === 'inStock') return p.stock > p.minStock;
        return true;
      });
    }

    // Saralash
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistika
  const stats = useMemo(() => ({
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === 'active').length,
    lowStockProducts: products.filter((p) => p.stock <= p.minStock && p.stock > 0).length,
    outOfStockProducts: products.filter((p) => p.stock === 0).length,
    averagePrice: Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length),
  }), [products]);

  // Handlers
  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = (product: Product) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
          : p
      )
    );
  };

  const handleFormSubmit = (data: CreateProductDto) => {
    setIsLoading(true);

    // Simulatsiya qilingan API chaqiruvi
    setTimeout(() => {
      if (selectedProduct) {
        // Yangilash
        setProducts((prev) =>
          prev.map((p) =>
            p.id === selectedProduct.id
              ? {
                  ...p,
                  ...data,
                  category: mockCategories.find((c) => c.id === data.categoryId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
      } else {
        // Yangi qo'shish
        const newProduct: Product = {
          id: String(Date.now()),
          ...data,
          category: mockCategories.find((c) => c.id === data.categoryId),
          sku: data.sku || `PRD-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Product;
        setProducts((prev) => [newProduct, ...prev]);
      }

      setIsLoading(false);
      setIsFormOpen(false);
    }, 500);
  };

  const handleConfirmDelete = () => {
    if (!selectedProduct) return;

    setIsLoading(true);
    setTimeout(() => {
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      setSelectedIds((prev) => prev.filter((id) => id !== selectedProduct.id));
      setIsLoading(false);
      setIsDeleteOpen(false);
    }, 500);
  };

  // Ommaviy o'chirish
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
    setSelectedIds([]);
  };

  // Ommaviy status o'zgartirish
  const handleBulkToggleStatus = (status: 'active' | 'inactive') => {
    setProducts((prev) =>
      prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status } : p))
    );
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Mahsulotlar</h1>
          <p className="text-slate-400">
            Barcha mahsulotlarni boshqaring va nazorat qiling
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Import/Export */}
          <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white">
            <Download size={18} className="mr-2" />
            Eksport
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white">
            <Upload size={18} className="mr-2" />
            Import
          </Button>

          {/* Yangi mahsulot */}
          <Button
            onClick={handleAddProduct}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            Yangi mahsulot
          </Button>
        </div>
      </div>

      {/* Statistika */}
      <ProductStats stats={stats} />

      {/* Filtrlar va ko'rinish tugmalari */}
      <div className="space-y-4">
        <ProductFilter
          filters={filters}
          categories={mockCategories}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilters(initialFilters);
            setCurrentPage(1);
          }}
        />

        {/* View mode va bulk actions */}
        <div className="flex items-center justify-between">
          {/* Tanlangan elementlar uchun harakatlar */}
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                {selectedIds.length} ta tanlandi
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggleStatus('active')}
                className="border-slate-700 text-green-400 hover:text-green-300"
              >
                <ToggleRight size={16} className="mr-1" />
                Faollashtirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggleStatus('inactive')}
                className="border-slate-700 text-slate-400 hover:text-slate-300"
              >
                <ToggleLeft size={16} className="mr-1" />
                Nofaollashtirish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                className="border-slate-700 text-red-400 hover:text-red-300"
              >
                <Trash2 size={16} className="mr-1" />
                O'chirish
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-white"
              >
                Bekor qilish
              </Button>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              Jami: {filteredProducts.length} ta mahsulot
            </div>
          )}

          {/* Ko'rinish tugmalari */}
          <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                viewMode === 'table'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <List size={16} />
              Jadval
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                viewMode === 'grid'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Grid3X3 size={16} />
              Kartalar
            </button>
          </div>
        </div>
      </div>

      {/* Mahsulotlar ro'yxati */}
      {viewMode === 'table' ? (
        <ProductTable
          products={paginatedProducts}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onView={handleViewProduct}
          onToggleStatus={handleToggleStatus}
        />
      ) : (
        <ProductGrid
          products={paginatedProducts}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onView={handleViewProduct}
        />
      )}

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredProducts.length}
        />
      )}

      {/* Modallar */}
      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        product={selectedProduct}
        categories={mockCategories}
        isLoading={isLoading}
      />

      <ProductDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleEditProduct}
        product={selectedProduct}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        product={selectedProduct}
        isLoading={isLoading}
      />
    </div>
  );
}
