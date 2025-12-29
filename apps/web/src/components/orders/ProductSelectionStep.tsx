import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  X,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { QuickOrderItem } from '@/types/quickOrder';

interface ProductSelectionStepProps {
  items: QuickOrderItem[];
  onAddItem: (product: { id: string; name: string; price: number }) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  subtotal: number;
  total: number;
  onGoToReceipt: () => void;
}

// Mock kategoriyalar
const mockCategories = [
  { id: 'all', name: 'Barchasi', icon: '🍽️', productCount: 0 },
  { id: 'cat-1', name: 'Salatlar', icon: '🥗', productCount: 8 },
  { id: 'cat-2', name: 'Sho\'rvalar', icon: '🍲', productCount: 6 },
  { id: 'cat-3', name: 'Asosiy taomlar', icon: '🍖', productCount: 15 },
  { id: 'cat-4', name: 'Ichimliklar', icon: '🥤', productCount: 12 },
  { id: 'cat-5', name: 'Shirinliklar', icon: '🍰', productCount: 7 },
];

// Mock mahsulotlar
const mockProducts = [
  { id: 'p-1', name: 'Sezar salati', price: 35000, categoryId: 'cat-1', isAvailable: true },
  { id: 'p-2', name: 'Grek salati', price: 32000, categoryId: 'cat-1', isAvailable: true },
  { id: 'p-3', name: 'Olivye', price: 28000, categoryId: 'cat-1', isAvailable: true },
  { id: 'p-4', name: 'Vinegret', price: 22000, categoryId: 'cat-1', isAvailable: false },
  { id: 'p-5', name: 'Mastava', price: 25000, categoryId: 'cat-2', isAvailable: true },
  { id: 'p-6', name: 'Lag\'mon', price: 30000, categoryId: 'cat-2', isAvailable: true },
  { id: 'p-7', name: 'Sho\'rva', price: 22000, categoryId: 'cat-2', isAvailable: true },
  { id: 'p-8', name: 'Osh', price: 35000, categoryId: 'cat-3', isAvailable: true },
  { id: 'p-9', name: 'Manti', price: 32000, categoryId: 'cat-3', isAvailable: true },
  { id: 'p-10', name: 'Chuchvara', price: 28000, categoryId: 'cat-3', isAvailable: true },
  { id: 'p-11', name: 'Qozon kabob', price: 55000, categoryId: 'cat-3', isAvailable: true },
  { id: 'p-12', name: 'Shashlik', price: 45000, categoryId: 'cat-3', isAvailable: true },
  { id: 'p-13', name: 'Tandir go\'sht', price: 65000, categoryId: 'cat-3', isAvailable: true },
  { id: 'p-14', name: 'Coca-Cola 0.5L', price: 10000, categoryId: 'cat-4', isAvailable: true },
  { id: 'p-15', name: 'Fanta 0.5L', price: 10000, categoryId: 'cat-4', isAvailable: true },
  { id: 'p-16', name: 'Sprite 0.5L', price: 10000, categoryId: 'cat-4', isAvailable: true },
  { id: 'p-17', name: 'Choy', price: 5000, categoryId: 'cat-4', isAvailable: true },
  { id: 'p-18', name: 'Kompot', price: 8000, categoryId: 'cat-4', isAvailable: true },
  { id: 'p-19', name: 'Medovik', price: 25000, categoryId: 'cat-5', isAvailable: true },
  { id: 'p-20', name: 'Napoleon', price: 22000, categoryId: 'cat-5', isAvailable: true },
  { id: 'p-21', name: 'Tiramisu', price: 30000, categoryId: 'cat-5', isAvailable: true },
];

export function ProductSelectionStep({
  items,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  notes,
  onNotesChange,
  subtotal,
  total,
  onGoToReceipt,
}: ProductSelectionStepProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Filtrlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      // Kategoriya filtri
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) {
        return false;
      }

      // Qidiruv filtri
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (!product.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Savatchadagi mahsulot miqdorini olish
  const getItemQuantity = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    return item?.quantity || 0;
  };

  // Savatchadagi item topish
  const getCartItem = (productId: string) => {
    return items.find((i) => i.productId === productId);
  };

  return (
    <div className="flex h-full">
      {/* Chap tomon - Mahsulotlar */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">
        {/* Kategoriyalar va qidiruv */}
        <div className="border-b border-slate-700 p-4 space-y-3">
          {/* Qidiruv */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Mahsulot qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Kategoriyalar */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {mockCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  selectedCategory === category.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mahsulotlar grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const quantity = getItemQuantity(product.id);
              const cartItem = getCartItem(product.id);

              return (
                <div
                  key={product.id}
                  className={cn(
                    'relative rounded-xl border p-3 transition-all',
                    product.isAvailable
                      ? quantity > 0
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      : 'border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed'
                  )}
                >
                  {/* Mahsulot nomi va narxi */}
                  <div className="mb-3">
                    <h4 className="font-medium text-white text-sm line-clamp-2">
                      {product.name}
                    </h4>
                    <p className="mt-1 text-orange-400 font-semibold text-sm">
                      {new Intl.NumberFormat('uz-UZ').format(product.price)} so'm
                    </p>
                  </div>

                  {/* Qo'shish/Miqdor tugmalari */}
                  {product.isAvailable && (
                    <div className="flex items-center justify-between">
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              cartItem && onUpdateQuantity(cartItem.id, quantity - 1)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-bold text-white">
                            {quantity}
                          </span>
                          <button
                            onClick={() =>
                              cartItem && onUpdateQuantity(cartItem.id, quantity + 1)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onAddItem(product)}
                          className="flex w-full items-center justify-center gap-1 rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                        >
                          <Plus size={14} />
                          <span>Qo'shish</span>
                        </button>
                      )}
                    </div>
                  )}

                  {!product.isAvailable && (
                    <div className="text-center text-xs text-slate-500">
                      Mavjud emas
                    </div>
                  )}

                  {/* Miqdor badge */}
                  {quantity > 0 && (
                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                      {quantity}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Search size={48} className="mb-4 opacity-50" />
              <p>Mahsulot topilmadi</p>
            </div>
          )}
        </div>
      </div>

      {/* O'ng tomon - Savatcha */}
      <div className="w-80 flex flex-col bg-slate-800/50">
        {/* Savatcha header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-orange-400" />
            <span className="font-medium text-white">Savatcha</span>
            {items.length > 0 && (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Tozalash
            </button>
          )}
        </div>

        {/* Savatcha items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ShoppingCart size={40} className="mb-3 opacity-50" />
              <p className="text-sm">Savatcha bo'sh</p>
              <p className="text-xs mt-1">Mahsulot tanlang</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-700 bg-slate-800 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-sm truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {new Intl.NumberFormat('uz-UZ').format(item.price)} so'm
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="font-semibold text-white text-sm">
                    {new Intl.NumberFormat('uz-UZ').format(
                      item.price * item.quantity
                    )}{' '}
                    so'm
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Izoh */}
        {items.length > 0 && (
          <div className="border-t border-slate-700 px-3 py-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <MessageSquare size={14} />
              <span>{notes ? 'Izohni tahrirlash' : 'Izoh qo\'shish'}</span>
            </button>
            {showNotes && (
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Buyurtma uchun izoh..."
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                rows={2}
              />
            )}
          </div>
        )}

        {/* Jami va tugma */}
        <div className="border-t border-slate-700 p-4 space-y-3">
          {items.length > 0 && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Jami:</span>
                  <span className="text-white">
                    {new Intl.NumberFormat('uz-UZ').format(subtotal)} so'm
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Umumiy:</span>
                  <span className="text-orange-400">
                    {new Intl.NumberFormat('uz-UZ').format(total)} so'm
                  </span>
                </div>
              </div>
            </>
          )}

          <Button
            onClick={onGoToReceipt}
            disabled={items.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
          >
            <span>Davom etish</span>
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
