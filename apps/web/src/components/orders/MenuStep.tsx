import { useState, useMemo } from 'react';
import { Search, Plus, Minus, Clock, ShoppingCart, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { mockProducts, mockCategories } from '@/data/mockProducts';
import { NewOrderItem } from '@/types/newOrder';
import { Product } from '@/types/product';

interface MenuStepProps {
  items: NewOrderItem[];
  onAddItem: (product: Product) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MenuStep({
  items,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onNext,
  onBack,
}: MenuStepProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');

  // Filterlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      // Faol mahsulotlar
      if (product.status !== 'active') return false;

      // Qidiruv
      if (search) {
        const searchLower = search.toLowerCase();
        if (!product.name.toLowerCase().includes(searchLower)) return false;
      }

      // Kategoriya
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [search, selectedCategory]);

  // Savatchadagi mahsulot sonini olish
  const getItemQuantity = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    return item?.quantity || 0;
  };

  // Savatchadagi mahsulotni olish
  const getCartItem = (productId: string) => {
    return items.find((i) => i.productId === productId);
  };

  // Jami hisoblash
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  return (
    <div className="flex h-full">
      {/* Asosiy qism - Kategoriyalar va mahsulotlar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Qidiruv */}
        <div className="mb-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <Input
              type="text"
              placeholder="Mahsulot qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-gray-200 text-gray-900"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Kategoriyalar */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-500 hover:text-gray-900'
            )}
          >
            Barchasi
          </button>
          {mockCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Mahsulotlar grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const quantity = getItemQuantity(product.id);
              const cartItem = getCartItem(product.id);
              const isOutOfStock = product.stock === 0;

              return (
                <div
                  key={product.id}
                  className={cn(
                    'relative rounded-xl border bg-gray-50 overflow-hidden transition-all',
                    quantity > 0 ? 'border-orange-500/50' : 'border-gray-200',
                    isOutOfStock && 'opacity-50'
                  )}
                >
                  {/* Rasm */}
                  <div className="aspect-square relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}

                    {/* Stock yoki out of stock */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-sm font-medium text-red-400">
                          Tugagan
                        </span>
                      </div>
                    )}

                    {/* Miqdor badge */}
                    {quantity > 0 && (
                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                        {quantity}
                      </div>
                    )}
                  </div>

                  {/* Ma'lumot */}
                  <div className="p-2">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {product.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-orange-400">
                        {formatPrice(product.price)}
                      </span>
                      {product.cookingTime && product.cookingTime > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Clock size={10} />
                          {product.cookingTime}m
                        </span>
                      )}
                    </div>

                    {/* Qo'shish/Olib tashlash */}
                    {quantity > 0 ? (
                      <div className="flex items-center justify-between mt-2">
                        <button
                          onClick={() => {
                            if (quantity === 1) {
                              onRemoveItem(cartItem!.id);
                            } else {
                              onUpdateQuantity(cartItem!.id, quantity - 1);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-medium text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(cartItem!.id, quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => !isOutOfStock && onAddItem(product)}
                        disabled={isOutOfStock}
                        className={cn(
                          'mt-2 w-full rounded-lg py-1.5 text-xs font-medium transition-colors',
                          isOutOfStock
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-gray-900'
                        )}
                      >
                        <Plus size={14} className="inline mr-1" />
                        Qo'shish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-gray-500">Mahsulot topilmadi</p>
            </div>
          )}
        </div>
      </div>

      {/* O'ng sidebar - Mini savatcha */}
      <div className="hidden lg:flex w-72 flex-col ml-4 rounded-xl border border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between border-b border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-orange-400" />
            <span className="font-medium text-gray-900">Savatcha</span>
          </div>
          <span className="text-sm text-gray-500">{totalItems} ta</span>
        </div>

        {/* Savatcha elementlari */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatPrice(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => {
                      if (item.quantity === 1) {
                        onRemoveItem(item.id);
                      } else {
                        onUpdateQuantity(item.id, item.quantity - 1);
                      }
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-orange-500 text-white hover:bg-orange-600"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <ShoppingCart size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">Savatcha bo'sh</p>
            </div>
          )}
        </div>

        {/* Jami */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500">Jami:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(total)} so'm
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobil uchun savatcha summary */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{totalItems} ta mahsulot</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(total)} so'm</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onBack}
              className="border-gray-300 text-gray-500"
            >
              Orqaga
            </Button>
            <Button
              onClick={onNext}
              disabled={items.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <ShoppingCart size={16} className="mr-2" />
              Davom
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop uchun harakatlar */}
      <div className="hidden lg:flex items-center justify-between pt-4 border-t border-gray-200 absolute bottom-0 left-0 right-0 bg-white p-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-300 text-gray-500"
        >
          Orqaga
        </Button>
        <Button
          onClick={onNext}
          disabled={items.length === 0}
          className={cn(
            'bg-orange-500 hover:bg-orange-600 text-white',
            items.length === 0 && 'opacity-50 cursor-not-allowed'
          )}
        >
          Davom etish ({totalItems} ta, {formatPrice(total)} so'm)
        </Button>
      </div>
    </div>
  );
}
