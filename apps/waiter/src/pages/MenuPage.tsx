import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Check, Loader2, ChevronDown, ChevronUp, Clock, Users, X } from 'lucide-react';
import { productService, categoryService, orderService, tableService } from '../services';
import { useTranslation } from '../store/language';
import type { Product, Category } from '../services/product.service';

// Category icons mapping
const categoryIcons: Record<string, string> = {
  'osh': '🍛',
  'salat': '🥗',
  'shorva': '🍲',
  'ichimlik': '🍵',
  'shirinlik': '🍰',
  'default': '🍽️',
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    price: number;
  };
}

interface TableOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export default function MenuPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showExistingOrders, setShowExistingOrders] = useState(true);
  const [guestCount, setGuestCount] = useState(1);
  const [cartExpanded, setCartExpanded] = useState(false);

  // Fetch table info
  const { data: tableData } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => tableService.getById(tableId!),
    enabled: !!tableId,
  });

  // Fetch existing orders for this table
  const { data: tableOrdersData } = useQuery({
    queryKey: ['tableOrders', tableId],
    queryFn: () => orderService.getByTableId(tableId!),
    enabled: !!tableId,
  });

  // Fetch categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => productService.getAll(selectedCategory || undefined),
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: () => orderService.create({
      type: 'DINE_IN',
      tableId: tableId,
      guestCount: guestCount,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tableOrders', tableId] });
      setCart([]);
      setGuestCount(1);
      navigate('/tables');
    },
  });

  // Add items to existing order mutation
  const addItemsMutation = useMutation({
    mutationFn: (orderId: string) => orderService.addItems(
      orderId,
      cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tableOrders', tableId] });
      setCart([]);
      navigate('/tables');
    },
  });

  const categories = categoriesData?.data || [];
  const products = productsData?.data || [];
  const table = tableData?.data;
  const existingOrders: TableOrder[] = tableOrdersData?.data || [];

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find((item) => item.id === productId);
    return item?.quantity || 0;
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  const getStatusText = (status: string) => {
    return t(`orderStatus.${status}`) || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'CONFIRMED': return 'bg-indigo-500';
      case 'PREPARING': return 'bg-yellow-500';
      case 'READY': return 'bg-green-500';
      case 'SERVED': return 'bg-purple-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return t('time.justNow');
    if (diffMin < 60) return t('time.minutesAgo', { min: diffMin });
    const diffHours = Math.floor(diffMin / 60);
    return t('time.hoursAgo', { hours: diffHours });
  };

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;

    if (existingOrders.length > 0) {
      const activeOrder = existingOrders[0];
      addItemsMutation.mutate(activeOrder.id);
    } else {
      createOrderMutation.mutate();
    }
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-gray-900 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/tables')}
            className="flex items-center justify-center rounded-xl bg-gray-800 p-2.5 active:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>

          <div className="text-center flex-1 mx-3">
            <h1 className="text-lg font-bold text-white">Stol #{table?.number || tableId || ''}</h1>
            {existingOrders.length > 0 && (
              <p className="text-xs text-orange-400">{existingOrders.length} faol buyurtma</p>
            )}
          </div>

          <button
            onClick={() => {
              if (cart.length > 0) {
                setCartExpanded(true);
              }
            }}
            className="relative flex items-center justify-center rounded-xl bg-gray-800 p-2.5 active:bg-gray-700"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <ShoppingCart className="h-5 w-5 text-white" />
            {getTotalItems() > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Existing Orders Collapsible */}
      {existingOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setShowExistingOrders(!showExistingOrders)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            style={{ minHeight: '44px' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">{t('menu.existingOrders')}</span>
                <span className="ml-2 text-sm text-muted-foreground">({existingOrders.length})</span>
              </div>
            </div>
            {showExistingOrders ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showExistingOrders && (
            <div className="px-4 pb-4 space-y-3">
              {existingOrders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">#{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{getTimeAgo(order.createdAt)}</span>
                  </div>

                  <div className="space-y-1 mb-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">{item.quantity}x</span>{' '}
                          {item.product?.name || 'Mahsulot'}
                        </span>
                        <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-muted-foreground">{t('total')}:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{formatPrice(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Chips - horizontal scroll */}
      <div className="sticky top-[52px] z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
              selectedCategory === null
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200'
            }`}
            style={{ minHeight: '36px' }}
          >
            Barchasi
          </button>
          {categories.map((cat: Category) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200'
              }`}
              style={{ minHeight: '36px' }}
            >
              <span className="mr-1">{categoryIcons[cat.slug] || categoryIcons['default']}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products List - 1 column for phone */}
      <div className={`flex-1 overflow-y-auto px-4 pt-3 ${cart.length > 0 ? 'pb-24' : 'pb-6'}`}>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-base">{t('menu.noProducts')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product: Product) => {
              const quantity = getCartQuantity(product.id);
              const inCart = quantity > 0;

              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 p-3 border transition-all ${
                    inCart
                      ? 'border-orange-300 dark:border-orange-700 shadow-sm shadow-orange-500/10'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Product image thumbnail */}
                  <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {product.image ? (
                      <img
                        src={product.image.startsWith('http') ? product.image : `/uploads/${product.image}`}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground leading-tight line-clamp-1">{product.name}</h3>
                    <p className="text-sm font-bold text-orange-500 dark:text-orange-400 mt-0.5">{formatPrice(product.price)}</p>
                  </div>

                  {/* Add / quantity controls */}
                  <div className="flex-shrink-0">
                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200"
                          style={{ height: '36px', width: '36px' }}
                        >
                          <Minus className="h-4 w-4 text-foreground" />
                        </button>
                        <span className="w-7 text-center text-base font-bold text-foreground">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="flex items-center justify-center rounded-xl bg-orange-500 active:bg-orange-600"
                          style={{ height: '36px', width: '36px' }}
                        >
                          <Plus className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="flex items-center justify-center rounded-xl bg-orange-500 active:bg-orange-600"
                        style={{ height: '44px', width: '44px' }}
                      >
                        <Plus className="h-5 w-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Cart Bar - mini (when cart has items but not expanded) */}
      {cart.length > 0 && !cartExpanded && (
        <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
          <button
            onClick={() => setCartExpanded(true)}
            className="w-full flex items-center justify-between bg-orange-500 px-5 py-4 text-white active:bg-orange-600"
            style={{ minHeight: '56px' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {getTotalItems()}
              </div>
              <span className="text-base font-semibold">{getTotalItems()} ta mahsulot</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{formatPrice(getTotalPrice())}</span>
              <ChevronUp className="h-5 w-5 text-white/70" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Expanded - Full Drawer */}
      {cartExpanded && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setCartExpanded(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-gray-900 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-5 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {existingOrders.length > 0 ? "Qo'shimcha buyurtma" : "Yangi buyurtma"}
                </h2>
                <button
                  onClick={() => setCartExpanded(false)}
                  className="flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800"
                  style={{ height: '44px', width: '44px' }}
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
              </div>

              {/* Guest Count - only for new orders */}
              {existingOrders.length === 0 && (
                <div className="mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-foreground">{t('menu.guestCount')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                        className="flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 active:bg-gray-100"
                        style={{ height: '40px', width: '40px' }}
                      >
                        <Minus className="h-4 w-4 text-foreground" />
                      </button>
                      <span className="w-8 text-center text-xl font-bold text-blue-600 dark:text-blue-400">{guestCount}</span>
                      <button
                        onClick={() => setGuestCount(guestCount + 1)}
                        className="flex items-center justify-center rounded-xl bg-blue-600 active:bg-blue-700"
                        style={{ height: '40px', width: '40px' }}
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-2 mb-5">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-orange-500 font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="flex items-center justify-center rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 active:bg-gray-100"
                        style={{ height: '36px', width: '36px' }}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-foreground" />
                        )}
                      </button>
                      <span className="w-7 text-center text-base font-bold text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex items-center justify-center rounded-xl bg-orange-500 active:bg-orange-600"
                        style={{ height: '36px', width: '36px' }}
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-2xl bg-gray-900 dark:bg-gray-800 p-4 text-white mb-4">
                <span className="text-base font-semibold">Jami:</span>
                <span className="text-xl font-bold">{formatPrice(getTotalPrice())}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setCart([]); setCartExpanded(false); }}
                  className="flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 px-5 text-sm font-medium text-foreground active:bg-gray-200"
                  style={{ minHeight: '52px' }}
                >
                  <Trash2 className="h-5 w-5 mr-1.5 text-red-500" />
                  Tozalash
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={createOrderMutation.isPending || addItemsMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 text-base font-semibold text-white active:bg-orange-600 disabled:opacity-50"
                  style={{ minHeight: '52px' }}
                >
                  {(createOrderMutation.isPending || addItemsMutation.isPending) ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {existingOrders.length > 0 ? "Qo'shish" : 'Buyurtma berish'}
                </button>
              </div>

              {(createOrderMutation.isError || addItemsMutation.isError) && (
                <p className="mt-4 text-center text-sm text-red-500">Xatolik yuz berdi. Qayta urinib ko'ring.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
