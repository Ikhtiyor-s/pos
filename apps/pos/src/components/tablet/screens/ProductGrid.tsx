import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { productService, categoryService, type Product, type Category } from '../../../services/product.service';
import { useCartStore } from '../../../store/cart';
import { Search, Loader2, Package, LayoutGrid } from 'lucide-react';

interface ProductGridProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function ProductGrid({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tappedId, setTappedId] = useState<string | null>(null);

  const { items, addItem } = useCartStore();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [prods, cats] = await Promise.all([
          productService.getAll(),
          categoryService.getAll(),
        ]);
        setProducts(prods.filter((p) => p.isActive));
        setCategories(cats.filter((c) => c.isActive));
      } catch (err) {
        console.error('Ma\'lumotlarni yuklashda xatolik:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory) {
      result = result.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameRu?.toLowerCase().includes(q) ||
          p.barcode?.includes(q)
      );
    }
    return result;
  }, [products, selectedCategory, searchQuery]);

  const getCartQuantity = (productId: string): number => {
    const item = items.find((i) => i.product.id === productId);
    return item?.quantity ?? 0;
  };

  const handleAddItem = (product: Product) => {
    addItem(product as any);
    setTappedId(product.id);
    setTimeout(() => setTappedId(null), 200);
  };

  return (
    <div className="flex h-full">
      {/* Category Sidebar */}
      <div
        className={cn(
          'w-20 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700',
          'bg-gray-50 dark:bg-gray-800/50'
        )}
      >
        {/* All Categories */}
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'w-full flex flex-col items-center justify-center gap-1 p-2 min-h-[72px]',
            'transition-colors touch-manipulation select-none',
            selectedCategory === null
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          <LayoutGrid size={22} />
          <span className="text-[10px] font-medium leading-tight text-center">Hammasi</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'w-full flex flex-col items-center justify-center gap-1 p-2 min-h-[72px]',
              'transition-colors touch-manipulation select-none',
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {cat.image ? (
              <img src={cat.image} alt={cat.name} className="w-8 h-8 object-cover rounded" />
            ) : (
              <Package size={22} />
            )}
            <span className="text-[10px] font-medium leading-tight text-center line-clamp-2">
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className={cn(
                'w-full min-h-[44px] pl-10 pr-4 rounded-xl',
                'bg-gray-100 dark:bg-gray-800',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={36} className="animate-spin text-gray-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <Package size={48} className="mb-2 opacity-50" />
              <span>Mahsulot topilmadi</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredProducts.map((product) => {
                const qty = getCartQuantity(product.id);
                const isTapped = tappedId === product.id;

                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product)}
                    className={cn(
                      'relative flex flex-col items-center p-3 rounded-xl',
                      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                      'transition-all duration-100 active:scale-[0.95] select-none touch-manipulation',
                      'hover:border-blue-400 dark:hover:border-blue-500',
                      isTapped && 'scale-[0.93] ring-2 ring-blue-500'
                    )}
                  >
                    {/* Quantity Badge */}
                    {qty > 0 && (
                      <span
                        className={cn(
                          'absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5',
                          'flex items-center justify-center rounded-full',
                          'bg-blue-600 text-white text-xs font-bold',
                          'dark:bg-blue-500'
                        )}
                      >
                        {qty}
                      </span>
                    )}

                    {/* Image or Icon */}
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 mb-2">
                        <Package size={28} className="text-gray-400" />
                      </div>
                    )}

                    {/* Name */}
                    <span className="text-sm font-medium text-center text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                      {product.name}
                    </span>

                    {/* Price */}
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {product.price.toLocaleString('uz-UZ')} so'm
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
