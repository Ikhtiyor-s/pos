import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus,
  Grid3X3,
  List,
  Download,
  Upload,
  Trash2,
  ToggleRight,
  ToggleLeft,
  ScanLine,
  Loader2,
  AlertCircle,
  PackageOpen,
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
import { QRScannerModal } from '@/components/QRScannerModal';
import { productApiService, categoryApiService } from '@/services/product.service';
import { cn } from '@/lib/utils';
import type { Product, Category, ProductFilters, CreateProductDto } from '@/types/product';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Ma'lumotlarni yuklash
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [prodResult, cats] = await Promise.all([
        productApiService.getAll(),
        categoryApiService.getAll(),
      ]);
      setProducts(prodResult.products);
      setCategories(cats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.categoryId) {
      result = result.filter((p) => p.categoryId === filters.categoryId);
    }

    if (filters.status !== 'all') {
      result = result.filter((p) => p.status === filters.status);
    }

    if (filters.stockStatus !== 'all') {
      result = result.filter((p) => {
        if (filters.stockStatus === 'outOfStock') return p.stock === 0;
        if (filters.stockStatus === 'lowStock') return p.stock > 0 && p.stock <= p.minStock;
        if (filters.stockStatus === 'inStock') return p.stock > p.minStock;
        return true;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name': comparison = a.name.localeCompare(b.name); break;
        case 'price': comparison = a.price - b.price; break;
        case 'stock': comparison = a.stock - b.stock; break;
        case 'createdAt': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, filters]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = useMemo(() => ({
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.status === 'active').length,
    lowStockProducts: products.filter((p) => p.stock <= p.minStock && p.stock > 0).length,
    outOfStockProducts: products.filter((p) => p.stock === 0).length,
    averagePrice: products.length > 0 ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length) : 0,
  }), [products]);

  // Handlers
  const handleAddProduct = () => { setSelectedProduct(null); setIsFormOpen(true); };
  const handleEditProduct = (product: Product) => { setSelectedProduct(product); setIsFormOpen(true); };
  const handleViewProduct = (product: Product) => { setSelectedProduct(product); setIsDetailOpen(true); };
  const handleDeleteProduct = (product: Product) => { setSelectedProduct(product); setIsDeleteOpen(true); };

  const handleToggleStatus = async (product: Product) => {
    try {
      const newActive = product.status !== 'active';
      await productApiService.update(product.id, { isActive: newActive });
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, status: newActive ? 'active' : 'inactive' } : p)
      );
      showToast('success', `${product.name} ${newActive ? 'faollashtirildi' : 'nofaollashtirildi'}`);
    } catch {
      showToast('error', 'Status o\'zgartirishda xatolik');
    }
  };

  const handleFormSubmit = async (data: CreateProductDto) => {
    setIsSaving(true);
    try {
      if (selectedProduct) {
        const updated = await productApiService.update(selectedProduct.id, {
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          price: data.price,
          costPrice: data.costPrice,
          cookingTime: data.cookingTime,
          calories: data.calories,
          isActive: data.status !== 'inactive',
        });
        setProducts((prev) => prev.map((p) => p.id === selectedProduct.id ? updated : p));
        showToast('success', 'Mahsulot yangilandi');
      } else {
        const created = await productApiService.create({
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          price: data.price,
          costPrice: data.costPrice,
          cookingTime: data.cookingTime,
          calories: data.calories,
        });
        setProducts((prev) => [created, ...prev]);
        showToast('success', 'Yangi mahsulot qo\'shildi');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);
    try {
      await productApiService.delete(selectedProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      setSelectedIds((prev) => prev.filter((id) => id !== selectedProduct.id));
      showToast('success', 'Mahsulot o\'chirildi');
      setIsDeleteOpen(false);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'O\'chirishda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQRScan = async (barcode: string) => {
    try {
      const product = await productApiService.getByBarcode(barcode);
      const mapped: Product = {
        id: product.id, name: product.name, description: product.description,
        categoryId: product.categoryId, category: product.category as any,
        price: Number(product.price), costPrice: Number(product.costPrice || 0),
        stock: 0, minStock: 0, unit: 'dona', image: product.image,
        status: product.isActive ? 'active' : 'inactive',
        barcode: product.barcode, sku: product.barcode || '',
        cookingTime: product.cookingTime, calories: product.calories,
        createdAt: product.createdAt, updatedAt: product.updatedAt,
      };
      setSelectedProduct(mapped);
      setIsDetailOpen(true);
    } catch {
      showToast('error', 'Mahsulot topilmadi. QR kodni tekshiring.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => productApiService.delete(id)));
      setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      showToast('success', `${selectedIds.length} ta mahsulot o'chirildi`);
      setSelectedIds([]);
    } catch {
      showToast('error', 'Ommaviy o\'chirishda xatolik');
    }
  };

  const handleBulkToggleStatus = async (status: 'active' | 'inactive') => {
    try {
      await Promise.all(selectedIds.map((id) => productApiService.update(id, { isActive: status === 'active' })));
      setProducts((prev) => prev.map((p) => selectedIds.includes(p.id) ? { ...p, status } : p));
      showToast('success', `${selectedIds.length} ta mahsulot ${status === 'active' ? 'faollashtirildi' : 'nofaollashtirildi'}`);
      setSelectedIds([]);
    } catch {
      showToast('error', 'Status o\'zgartirishda xatolik');
    }
  };

  // Loading holati
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-gray-500">Mahsulotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Xatolik holati
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm text-gray-600">{error}</p>
          <Button onClick={loadData} className="mt-4 bg-orange-500 text-white hover:bg-orange-600">
            Qayta yuklash
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mahsulotlar</h1>
          <p className="text-sm text-gray-500">
            Barcha mahsulotlarni boshqaring va nazorat qiling
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setIsScannerOpen(true)} className="border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            <ScanLine size={18} className="mr-2" />
            QR Skanerlash
          </Button>
          <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            <Download size={18} className="mr-2" />
            Eksport
          </Button>
          <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            <Upload size={18} className="mr-2" />
            Import
          </Button>
          <Button onClick={handleAddProduct} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:brightness-110 text-white">
            <Plus size={18} className="mr-2" />
            Yangi mahsulot
          </Button>
        </div>
      </div>

      {/* Statistika */}
      <ProductStats stats={stats} />

      {/* Filtrlar */}
      <div className="space-y-4">
        <ProductFilter
          filters={filters}
          categories={categories}
          onFiltersChange={(newFilters) => { setFilters(newFilters); setCurrentPage(1); }}
          onReset={() => { setFilters(initialFilters); setCurrentPage(1); }}
        />

        <div className="flex items-center justify-between">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{selectedIds.length} ta tanlandi</span>
              <Button size="sm" variant="outline" onClick={() => handleBulkToggleStatus('active')} className="border-gray-200 text-green-600 hover:text-green-700 hover:bg-green-50">
                <ToggleRight size={16} className="mr-1" /> Faollashtirish
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkToggleStatus('inactive')} className="border-gray-200 text-gray-600 hover:text-gray-700 hover:bg-gray-50">
                <ToggleLeft size={16} className="mr-1" /> Nofaollashtirish
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDelete} className="border-gray-200 text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={16} className="mr-1" /> O'chirish
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="text-gray-500 hover:text-gray-700">
                Bekor qilish
              </Button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Jami: {filteredProducts.length} ta mahsulot</div>
          )}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            <button onClick={() => setViewMode('table')} className={cn('flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors', viewMode === 'table' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
              <List size={16} /> Jadval
            </button>
            <button onClick={() => setViewMode('grid')} className={cn('flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors', viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700')}>
              <Grid3X3 size={16} /> Kartalar
            </button>
          </div>
        </div>
      </div>

      {/* Bo'sh holat */}
      {products.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
          <PackageOpen className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-lg font-medium text-gray-500">Mahsulotlar topilmadi</p>
          <p className="mt-1 text-sm text-gray-400">Birinchi mahsulotingizni qo'shing</p>
          <Button onClick={handleAddProduct} className="mt-4 bg-orange-500 text-white hover:bg-orange-600">
            <Plus size={18} className="mr-2" /> Yangi mahsulot
          </Button>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <ProductTable products={paginatedProducts} selectedIds={selectedIds} onSelect={setSelectedIds} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onView={handleViewProduct} onToggleStatus={handleToggleStatus} />
          ) : (
            <ProductGrid products={paginatedProducts} selectedIds={selectedIds} onSelect={setSelectedIds} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onView={handleViewProduct} />
          )}
          {filteredProducts.length > 0 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredProducts.length} />
          )}
        </>
      )}

      {/* Modallar */}
      <ProductForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleFormSubmit} product={selectedProduct} categories={categories} isLoading={isSaving} />
      <ProductDetailModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onEdit={handleEditProduct} product={selectedProduct} />
      <DeleteConfirmModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleConfirmDelete} product={selectedProduct} isLoading={isSaving} />
      <QRScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleQRScan} title="Mahsulot QR Skanerlash" />

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg',
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        )}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
