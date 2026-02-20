import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Check, Loader2, ChevronDown, ChevronUp, Clock, Users } from 'lucide-react';
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
  const [showCart, setShowCart] = useState(false);
  const [showExistingOrders, setShowExistingOrders] = useState(true);
  const [guestCount, setGuestCount] = useState(1);

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

    // If there's an existing order for this table, add items to it
    // Otherwise, create a new order
    if (existingOrders.length > 0) {
      const activeOrder = existingOrders[0]; // Get the most recent active order
      addItemsMutation.mutate(activeOrder.id);
    } else {
      createOrderMutation.mutate();
    }
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-white">
        <button onClick={() => navigate('/tables')} className="btn-touch rounded-full p-2 hover:bg-white/10">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">{t('menu.title', { number: table?.number || tableId || '' })}</h1>
          <p className="text-xs opacity-90">{t('menu.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="btn-touch relative rounded-full p-2 hover:bg-white/10"
        >
          <ShoppingCart className="h-6 w-6" />
          {getTotalItems() > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-orange-500">
              {getTotalItems()}
            </span>
          )}
        </button>
      </div>

      {/* Existing Orders Section */}
      {existingOrders.length > 0 && (
        <div className="bg-card border-b border-border">
          <button
            onClick={() => setShowExistingOrders(!showExistingOrders)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <span className="font-semibold text-foreground">{t('menu.existingOrders')}</span>
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
                <div key={order.id} className="rounded-xl bg-muted p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">#{order.orderNumber}</span>
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
                          <span className="font-medium text-orange-600 dark:text-orange-400">{item.quantity}x</span>{' '}
                          {item.product?.name || 'Mahsulot'}
                        </span>
                        <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">{t('total')}:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{formatPrice(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`btn-touch whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                : 'bg-muted text-foreground hover:bg-accent'
            }`}
          >
            {t('menu.allCategories')}
          </button>
          {categories.map((cat: Category) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`btn-touch whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              <span className="mr-1">{categoryIcons[cat.slug] || categoryIcons['default']}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {t('menu.noProducts')}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {products.map((product: Product) => {
              const quantity = getCartQuantity(product.id);
              const inCart = quantity > 0;

              return (
                <div
                  key={product.id}
                  className={`group relative overflow-hidden rounded-xl bg-card shadow-sm transition-all hover:shadow-md ${inCart ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-square overflow-hidden bg-muted">
                      {product.image ? (
                        <img
                          src={product.image.startsWith('http') ? product.image : `/uploads/${product.image}`}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-tight min-h-[32px]">{product.name}</h3>
                      <p className="text-xs font-bold text-orange-500 dark:text-orange-400 mt-1">{formatPrice(product.price)}</p>
                    </div>
                  </div>

                  {/* Quantity controls */}
                  {inCart && (
                    <div className="absolute bottom-12 right-1 flex items-center gap-0.5 rounded-full bg-card shadow-lg border border-border">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                        className="rounded-full bg-muted p-1 hover:bg-accent active:scale-95"
                      >
                        <Minus className="h-3 w-3 text-foreground" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-foreground">{quantity}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, 1); }}
                        className="rounded-full bg-orange-500 p-1 hover:bg-orange-600 active:scale-95"
                      >
                        <Plus className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  )}

                  {/* Cart badge */}
                  {inCart && (
                    <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                      {quantity}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Overlay */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{t('menu.newOrder')}</h2>
              <button onClick={() => setShowCart(false)} className="text-muted-foreground text-2xl">
                ×
              </button>
            </div>

            {/* Guest Count - only show for new orders */}
            {existingOrders.length === 0 && (
              <div className="mb-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-foreground">{t('menu.guestCount')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                      className="rounded-full bg-card border border-border p-2 shadow-sm hover:bg-accent active:scale-95"
                    >
                      <Minus className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="w-8 text-center text-xl font-bold text-blue-600 dark:text-blue-400">{guestCount}</span>
                    <button
                      onClick={() => setGuestCount(guestCount + 1)}
                      className="rounded-full bg-blue-600 p-2 shadow-sm hover:bg-blue-700 active:scale-95"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="mb-6 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="btn-touch rounded-full bg-accent p-1 hover:bg-accent/80"
                    >
                      <Minus className="h-4 w-4 text-foreground" />
                    </button>
                    <span className="w-8 text-center font-bold text-foreground">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="btn-touch rounded-full bg-orange-500 p-1 text-white hover:bg-orange-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white">
              <span className="text-lg font-bold">{t('total')}:</span>
              <span className="text-2xl font-bold">{formatPrice(getTotalPrice())}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setCart([])}
                className="btn-touch flex-1 rounded-xl bg-muted py-3 font-medium text-foreground hover:bg-accent"
              >
                <Trash2 className="mr-2 inline h-5 w-5" />
                {t('clear')}
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={createOrderMutation.isPending || addItemsMutation.isPending}
                className="btn-touch flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-3 font-medium text-white hover:from-orange-600 hover:to-pink-600 disabled:opacity-50"
              >
                {(createOrderMutation.isPending || addItemsMutation.isPending) ? (
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                ) : (
                  <Check className="mr-2 inline h-5 w-5" />
                )}
                {existingOrders.length > 0 ? t('menu.addToOrder') : t('menu.confirmOrder')}
              </button>
            </div>

            {(createOrderMutation.isError || addItemsMutation.isError) && (
              <p className="mt-4 text-center text-red-500">{t('menu.orderError')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
