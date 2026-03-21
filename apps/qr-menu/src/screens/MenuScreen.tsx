import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Search } from 'lucide-react';
import { useMenuStore } from '@/store/menu';
import type { Product } from '@/services/api';
import ProductDetailModal from '@/screens/ProductDetailModal';

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + " so'm";
}

export default function MenuScreen() {
  const {
    tenant,
    table,
    categories,
    products,
    cart,
    activeCategory,
    setActiveCategory,
    addToCart,
    setShowCart,
  } = useMenuStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !activeCategory || p.categoryId === activeCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Scroll active category into view
  useEffect(() => {
    if (activeCategory && categoryScrollRef.current) {
      const activeEl = categoryScrollRef.current.querySelector(`[data-cat="${activeCategory}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{tenant?.name || 'Oshxona'}</h1>
            <p className="text-xs text-gray-500">
              Stol #{table?.number} {table?.name ? `- ${table.name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-3"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Taom qidirish..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </motion.div>
        )}

        {/* Category tabs */}
        <div
          ref={categoryScrollRef}
          className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar"
        >
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !activeCategory
                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="px-4 pt-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">Taomlar topilmadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.97] transition-transform cursor-pointer"
              >
                {/* Product image */}
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      🍽
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Product info */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                    {product.name}
                  </h3>
                  <p className="text-sm font-bold text-orange-500 mt-1">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom cart bar */}
      {cartItemsCount > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-100"
        >
          <button
            onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between py-3.5 px-5 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">{cartItemsCount} ta taom</span>
            </span>
            <span className="font-bold">{formatPrice(cartTotal)}</span>
          </button>
        </motion.div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </motion.div>
  );
}
