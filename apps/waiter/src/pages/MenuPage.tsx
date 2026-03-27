import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Check, Loader2, ChevronDown, ChevronUp, Clock, Users, X, PrinterIcon, LogOut, Search } from 'lucide-react';
import { productService, categoryService, orderService, tableService } from '../services';
import { useTranslation } from '../store/language';
import type { Product, Category } from '../services/product.service';

const categoryIcons: Record<string, string> = {
  'osh': '🍛', 'salat': '🥗', 'shorva': '🍲',
  'ichimlik': '🍵', 'shirinlik': '🍰', 'default': '🍽️',
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
  product?: { id: string; name: string; price: number };
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showExistingOrders, setShowExistingOrders] = useState(true);
  const [guestCount, setGuestCount] = useState(1);
  const [cartExpanded, setCartExpanded] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [closeResult, setCloseResult] = useState<'success' | 'error' | null>(null);

  const { data: tableData } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => tableService.getById(tableId!),
    enabled: !!tableId,
  });

  const { data: tableOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['tableOrders', tableId],
    queryFn: () => orderService.getByTableId(tableId!),
    enabled: !!tableId,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory],
    queryFn: () => productService.getAll(selectedCategory || undefined),
  });

  const createOrderMutation = useMutation({
    mutationFn: () => orderService.create({
      type: 'DINE_IN',
      tableId,
      guestCount,
      items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tableOrders', tableId] });
      setCart([]);
      navigate('/tables');
    },
  });

  const addItemsMutation = useMutation({
    mutationFn: (orderId: string) => orderService.addItems(
      orderId,
      cart.map((item) => ({ productId: item.id, quantity: item.quantity }))
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['tableOrders', tableId] });
      setCart([]);
      navigate('/tables');
    },
  });

  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const updateItemQtyMutation = useMutation({
    mutationFn: ({ orderId, itemId, quantity }: { orderId: string; itemId: string; quantity: number }) =>
      orderService.updateItemQuantity(orderId, itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableOrders', tableId] });
    },
    onSettled: () => {
      setPendingItemId(null);
    },
  });

  const categories = categoriesData?.data || [];
  const allProducts = productsData?.data || [];
  const products = searchQuery.trim()
    ? allProducts.filter((p: Product) => {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p as any).nameRu?.toLowerCase().includes(q);
      })
    : allProducts;
  const table = tableData?.data;
  const existingOrders: TableOrder[] = tableOrdersData?.data || [];

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const getCartQuantity = (productId: string) => cart.find((i) => i.id === productId)?.quantity || 0;

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
         .filter((item) => item.quantity > 0)
    );
  };

  const getTotalPrice = () => cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const getTotalItems = () => cart.reduce((sum, i) => sum + i.quantity, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('uz-UZ').format(price) + " so'm";

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-500';
      case 'CONFIRMED': return 'bg-indigo-500';
      case 'PREPARING': return 'bg-yellow-500';
      case 'READY': return 'bg-green-500';
      case 'SERVED': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diffMin = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (diffMin < 1) return t('time.justNow');
    if (diffMin < 60) return t('time.minutesAgo', { min: diffMin });
    return t('time.hoursAgo', { hours: Math.floor(diffMin / 60) });
  };

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;
    if (existingOrders.length > 0) {
      addItemsMutation.mutate(existingOrders[0].id);
    } else {
      createOrderMutation.mutate();
    }
  };

  const handleCloseTable = async () => {
    setPrintingReceipt(true);
    try {
      await Promise.all(existingOrders.map((o) => orderService.printReceipt(o.id)));
      setCloseResult('success');
      setTimeout(() => {
        navigate('/tables');
      }, 1500);
    } catch {
      setCloseResult('error');
    } finally {
      setPrintingReceipt(false);
      setShowCloseConfirm(false);
    }
  };

  const handleExistingItemQty = (orderId: string, itemId: string, currentQty: number, delta: number) => {
    if (pendingItemId) return; // boshqa element yuklanayotgan bo'lsa kutish
    setPendingItemId(itemId);
    const newQty = currentQty + delta;
    updateItemQtyMutation.mutate({ orderId, itemId, quantity: newQty });
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">

      {/* Close Table Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4">
              <PrinterIcon className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground text-center mb-1">Stolni yopish</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Chek kassir printeriga yuboriladi. Tasdiqlaysizmi?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                disabled={printingReceipt}
                className="flex-1 py-3 rounded-xl border border-border text-foreground font-medium disabled:opacity-50"
              >
                Bekor
              </button>
              <button
                onClick={handleCloseTable}
                disabled={printingReceipt}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {printingReceipt
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <PrinterIcon className="h-5 w-5" />}
                {printingReceipt ? 'Yuborilmoqda...' : 'Chek yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result toast */}
      {closeResult && (
        <div className={`fixed top-16 left-4 right-4 z-[100] rounded-2xl px-4 py-3 text-white text-center font-medium shadow-lg ${
          closeResult === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {closeResult === 'success'
            ? '✅ Chek kassirga yuborildi!'
            : '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.'}
        </div>
      )}

      {/* Header */}
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
            <h1 className="text-lg font-bold text-white">Stol #{table?.number || ''}</h1>
            {existingOrders.length > 0 && (
              <p className="text-xs text-orange-400">{existingOrders.length} faol buyurtma</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
              className={`flex items-center justify-center rounded-xl p-2.5 active:bg-gray-700 ${
                searchOpen ? 'bg-orange-500' : 'bg-gray-800'
              }`}
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {searchOpen ? <X className="h-5 w-5 text-white" /> : <Search className="h-5 w-5 text-white" />}
            </button>

            <button
              onClick={() => cart.length > 0 && setCartExpanded(true)}
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

        {/* Search Input */}
        {searchOpen && (
          <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mahsulot qidirish..."
                autoFocus
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Existing Orders — with editable item quantities */}
      {(existingOrders.length > 0 || ordersLoading) && (
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
              <span className="text-sm font-semibold text-foreground">
                {t('menu.existingOrders')}
                {existingOrders.length > 0 && (
                  <span className="ml-2 text-muted-foreground font-normal">({existingOrders.length})</span>
                )}
              </span>
            </div>
            {showExistingOrders
              ? <ChevronUp className="h-5 w-5 text-muted-foreground" />
              : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {showExistingOrders && (
            <div className="px-4 pb-4 space-y-3">
              {ordersLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                </div>
              ) : (
                existingOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Order header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">#{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getStatusColor(order.status)}`}>
                          {t(`orderStatus.${order.status}`)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{getTimeAgo(order.createdAt)}</span>
                    </div>

                    {/* Order items with +/- controls */}
                    <div className="p-3 space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-foreground line-clamp-1">
                            {item.product?.name || 'Mahsulot'}
                          </span>
                          <span className="text-xs text-muted-foreground mr-1">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          {/* Qty controls */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onPointerDown={() => handleExistingItemQty(order.id, item.id, item.quantity, -1)}
                              disabled={pendingItemId === item.id}
                              className="flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 active:bg-red-100 dark:active:bg-red-900/30 disabled:opacity-40"
                              style={{ height: '30px', width: '30px' }}
                            >
                              {item.quantity === 1
                                ? <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                : <Minus className="h-3.5 w-3.5 text-foreground" />}
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                            <button
                              onPointerDown={() => handleExistingItemQty(order.id, item.id, item.quantity, +1)}
                              disabled={pendingItemId === item.id}
                              className="flex items-center justify-center rounded-lg bg-orange-500 active:bg-orange-600 disabled:opacity-40"
                              style={{ height: '30px', width: '30px' }}
                            >
                              <Plus className="h-3.5 w-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order total */}
                    <div className="flex justify-between items-center px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-muted-foreground">{t('total')}:</span>
                      <span className="text-sm font-bold text-orange-500 dark:text-orange-400">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Close Table button — only when orders exist */}
              {!ordersLoading && existingOrders.length > 0 && (
                <div className="px-4 pb-4 pt-1">
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500 active:bg-red-600 py-3.5 text-white font-semibold"
                    style={{ minHeight: '52px' }}
                  >
                    <LogOut className="h-5 w-5" />
                    Stolni yopish
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category Chips */}
      <div className="sticky top-[52px] z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium flex-shrink-0 ${
              selectedCategory === null
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            style={{ minHeight: '36px' }}
          >
            Barchasi
          </button>
          {categories.map((cat: Category) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium flex-shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              style={{ minHeight: '36px' }}
            >
              <span className="mr-1">{categoryIcons[cat.slug] || categoryIcons['default']}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      <div className={`flex-1 overflow-y-auto px-4 pt-3 ${cart.length > 0 ? 'pb-safe' : 'pb-6'}`}>
        {productsLoading ? (
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
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 p-3 border transition-all ${
                    quantity > 0
                      ? 'border-orange-300 dark:border-orange-700 shadow-sm shadow-orange-500/10'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {product.image ? (
                      <img
                        src={product.image.startsWith('http') ? product.image : `/uploads/${product.image}`}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">🍽️</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground leading-tight line-clamp-1">{product.name}</h3>
                    <p className="text-sm font-bold text-orange-500 dark:text-orange-400 mt-0.5">{formatPrice(product.price)}</p>
                  </div>

                  <div className="flex-shrink-0">
                    {quantity > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(product.id, -1)}
                          className="flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 active:bg-gray-200"
                          style={{ height: '36px', width: '36px' }}
                        >
                          <Minus className="h-4 w-4 text-foreground" />
                        </button>
                        <span className="w-7 text-center text-base font-bold text-foreground">{quantity}</span>
                        <button
                          onClick={() => addToCart(product)}
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

      {/* Mini Cart Bar */}
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

      {/* Cart Drawer */}
      {cartExpanded && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setCartExpanded(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-gray-900 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            <div className="px-5 pb-6">
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
                        className="flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                        style={{ height: '40px', width: '40px' }}
                      >
                        <Minus className="h-4 w-4 text-foreground" />
                      </button>
                      <span className="w-8 text-center text-xl font-bold text-blue-600 dark:text-blue-400">{guestCount}</span>
                      <button
                        onClick={() => setGuestCount(guestCount + 1)}
                        className="flex items-center justify-center rounded-xl bg-blue-600"
                        style={{ height: '40px', width: '40px' }}
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-5">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-orange-500 font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="flex items-center justify-center rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        style={{ height: '36px', width: '36px' }}
                      >
                        {item.quantity === 1
                          ? <Trash2 className="h-4 w-4 text-red-500" />
                          : <Minus className="h-4 w-4 text-foreground" />}
                      </button>
                      <span className="w-7 text-center text-base font-bold text-foreground">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className="flex items-center justify-center rounded-xl bg-orange-500"
                        style={{ height: '36px', width: '36px' }}
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-gray-900 dark:bg-gray-800 p-4 text-white mb-4">
                <span className="text-base font-semibold">Jami:</span>
                <span className="text-xl font-bold">{formatPrice(getTotalPrice())}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setCart([]); setCartExpanded(false); }}
                  className="flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 px-5 text-sm font-medium text-foreground"
                  style={{ minHeight: '52px' }}
                >
                  <Trash2 className="h-5 w-5 mr-1.5 text-red-500" />
                  Tozalash
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={createOrderMutation.isPending || addItemsMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 text-base font-semibold text-white disabled:opacity-50"
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
