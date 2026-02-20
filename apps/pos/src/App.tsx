import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from './store/cart';
import { useAuthStore } from './store/auth';
import { cn } from './lib/utils';
import { Login } from './components/Login';
import { Reports } from './components/Reports';
import {
  UtensilsCrossed,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  Search,
  Users,
  Package,
  Utensils,
  Check,
  Printer,
  Clock,
  CheckCircle,
  ArrowLeft,
  Lock,
  DollarSign,
  Percent,
  X,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Calculator,
  Store,
  ScanLine,
} from 'lucide-react';
import { productService, categoryService, type Product as ApiProduct, type Category as ApiCategory } from './services/product.service';
import { tableService, type Table as ApiTable } from './services/table.service';
import { orderService, type Order as ApiOrder } from './services/order.service';
import { socketService } from './services/socket.service';
import { settingsService, type BusinessSettings } from './services/settings.service';
import { IntegrationHub } from './components/IntegrationHub';
import { QRScanner } from './components/QRScanner';
import { LowStockAlert } from './components/LowStockAlert';
import { inventoryService, type LowStockItem } from './services/inventory.service';
import type { Product as ApiProduct2 } from './services/product.service';

type OrderType = 'dine-in' | 'takeaway';
type PaymentMethod = 'cash' | 'card' | 'payme' | 'click' | 'uzum';
type Step = 'order-type' | 'order-detail' | 'products' | 'payment' | 'receipt' | 'reports';

interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved';
}

interface ActiveOrderData {
  orderId: string;
  tableId: string;
  tableNumber: number;
  items: number;
  total: number;
  time: string;
  status: string;
  awaitingPayment: boolean;
  orderItems: { productId: string; name: string; price: number; quantity: number }[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

export default function App() {
  const { isAuthenticated, currentShift } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<Step>('order-type');
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<ActiveOrderData | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [currentApiOrderId, setCurrentApiOrderId] = useState<string | null>(null);

  // API data states
  const [bizSettings, setBizSettings] = useState<BusinessSettings | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; icon: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number; categoryId: string; cookTime: number; image: string }[]>([]);
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrderData[]>([]);

  // Bill editing states
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [serviceCharge, setServiceCharge] = useState(0);
  const [showBillEditor, setShowBillEditor] = useState(false);

  // Change calculator states
  const [cashReceived, setCashReceived] = useState('');
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);

  // Integratsiya states
  const [showIntegrationHub, setShowIntegrationHub] = useState(false);
  const [activeIntegrations, setActiveIntegrations] = useState(0);

  // QR Skaner states
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Kam qolgan mahsulotlar states
  const [showLowStock, setShowLowStock] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  // Category icons map
  const categoryIcons: Record<string, string> = {
    'osh': '🍛', 'salat': '🥗', 'shorva': '🍲', 'ichimlik': '🍵', 'shirinlik': '🍰',
    'taom': '🍛', 'non': '🍞', 'pishiriq': '🥟', 'desert': '🍰', 'default': '🍽️',
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      // Fetch business settings
      try {
        const settings = await settingsService.get();
        setBizSettings(settings);
        // Faol integratsiyalar sonini hisoblash
        const s = settings as any;
        let count = 0;
        if (s.nonborEnabled) count++;
        if (s.paymeEnabled) count++;
        if (s.clickEnabled) count++;
        if (s.uzumEnabled) count++;
        if (s.telegramEnabled) count++;
        if (s.deliveryEnabled) count++;
        if (s.crmEnabled) count++;
        setActiveIntegrations(count);
      } catch { /* settings optional */ }

      // Fetch categories
      const apiCategories = await categoryService.getAll();
      setCategories(apiCategories.map((c: ApiCategory) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
        icon: categoryIcons[c.slug || ''] || categoryIcons['default'],
      })));

      // Fetch products
      const apiProducts = await productService.getAll();
      setProducts(apiProducts.map((p: ApiProduct) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        categoryId: p.categoryId,
        cookTime: p.cookingTime || 0,
        image: p.image || '',
      })));

      // Fetch tables
      const apiTables = await tableService.getAll();
      setTables(apiTables.map((t: ApiTable) => ({
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        status: t.status === 'FREE' ? 'free' as const :
               t.status === 'OCCUPIED' ? 'occupied' as const :
               t.status === 'RESERVED' ? 'reserved' as const : 'free' as const,
      })));

      // Fetch low stock items
      try {
        const lowStock = await inventoryService.getLowStock();
        setLowStockItems(lowStock);
      } catch { /* optional */ }

      // Fetch active orders
      const apiOrders = await orderService.getAll({ status: 'active' });
      const activeOrdersList: ActiveOrderData[] = [];
      for (const order of apiOrders as ApiOrder[]) {
        if (['NEW', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)) {
          const isReady = order.status === 'READY';
          activeOrdersList.push({
            orderId: order.id,
            tableId: order.tableId || '',
            tableNumber: order.table?.number || 0,
            items: order.items?.length || 0,
            total: order.total,
            time: new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
            status: order.status,
            awaitingPayment: isReady,
            orderItems: (order.items || []).map((item) => ({
              productId: item.productId,
              name: item.product?.name || 'Noma\'lum',
              price: item.price,
              quantity: item.quantity,
            })),
          });
        }
      }
      setActiveOrders(activeOrdersList);
    } catch (err) {
      console.error('[POS] Ma\'lumotlarni yuklashda xatolik:', err);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated && currentShift) {
      fetchData();

      // Socket.IO ulanish
      socketService.connect();

      const unsubNew = socketService.onNewOrder(() => fetchData());
      const unsubStatus = socketService.onOrderStatus(() => fetchData());
      const unsubTable = socketService.onTableStatus(() => fetchData());
      const unsubItem = socketService.onItemStatus(() => fetchData());
      const unsubUpdated = socketService.onOrderUpdated(() => fetchData());

      // Polling har 20 sekundda
      const interval = setInterval(fetchData, 20000);

      return () => {
        unsubNew();
        unsubStatus();
        unsubTable();
        unsubItem();
        unsubUpdated();
        clearInterval(interval);
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, currentShift, fetchData]);

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal: getCartTotal,
    getItemCount,
  } = useCartStore();

  // Enhanced getTotal with discount and service charge
  const getTotal = () => {
    const subtotal = getCartTotal();
    let total = subtotal;

    // Apply discount
    if (discount > 0) {
      if (discountType === 'percent') {
        total -= (subtotal * discount) / 100;
      } else {
        total -= discount;
      }
    }

    // Apply service charge
    if (serviceCharge > 0) {
      total += (total * serviceCharge) / 100;
    }

    return Math.max(0, total);
  };

  const getDiscountAmount = () => {
    const subtotal = getCartTotal();
    if (discount === 0) return 0;

    if (discountType === 'percent') {
      return (subtotal * discount) / 100;
    }
    return discount;
  };

  const getServiceChargeAmount = () => {
    if (serviceCharge === 0) return 0;
    const subtotal = getCartTotal();
    const discountedTotal = subtotal - getDiscountAmount();
    return (discountedTotal * serviceCharge) / 100;
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesSearch = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleAddProduct = (product: (typeof products)[0]) => {
    addItem(product as any);
  };

  const handleQRProductFound = (product: ApiProduct2) => {
    handleAddProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      categoryId: product.categoryId,
      cookTime: product.cookingTime || 0,
      image: product.image || '',
    });
  };

  const handleSelectOrderType = (type: OrderType, table?: TableData) => {
    setOrderType(type);
    if (table) setSelectedTable(table);
    setCurrentStep('products');
  };

  const handleGoToPayment = () => {
    if (items.length === 0) return;
    setCurrentStep('payment');
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    try {
      const orderPayload = {
        type: (orderType === 'dine-in' ? 'DINE_IN' : 'TAKEAWAY') as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
        tableId: selectedTable?.id,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        discount: discountType === 'fixed' ? discount : undefined,
        discountPercent: discountType === 'percent' ? discount : undefined,
      };

      if (currentApiOrderId) {
        // Mavjud buyurtmaga qo'shish
        await orderService.addItems(currentApiOrderId, orderPayload.items);
      } else {
        // Yangi buyurtma yaratish
        const created = await orderService.create(orderPayload);
        setCurrentApiOrderId(created.id);
      }

      clearCart();
      await fetchData();
      alert('Buyurtma oshxonaga yuborildi!');
    } catch (err) {
      console.error('[POS] Buyurtma yaratishda xatolik:', err);
      alert('Xatolik! Buyurtma yuborilmadi.');
    }
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (['payme', 'click', 'uzum'].includes(method)) {
      setShowQR(true);
    } else {
      setCurrentStep('receipt');
    }
  };

  const handleConfirmQR = () => {
    setQrConfirmed(true);
  };

  const handleProceedToReceipt = () => {
    setShowQR(false);
    setCurrentStep('receipt');
  };

  const handlePrintAndClose = async () => {
    // Buyurtma statusini COMPLETED ga ketma-ket o'tkazish (status zanjiri)
    if (currentApiOrderId) {
      const statusChain = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];
      for (const status of statusChain) {
        try {
          await orderService.updateStatus(currentApiOrderId, status);
        } catch {
          // Allaqachon shu statusda bo'lsa, keyingisiga o'tish
        }
      }
    }

    window.print();

    // Reset everything
    clearCart();
    setCurrentStep('order-type');
    setOrderType(null);
    setSelectedTable(null);
    setPaymentMethod(null);
    setShowQR(false);
    setQrConfirmed(false);
    setCurrentApiOrderId(null);
    await fetchData();
  };

  const handleBack = () => {
    if (currentStep === 'order-detail') {
      setCurrentStep('order-type');
      setOrderType(null);
      setSelectedTable(null);
      setCurrentOrder(null);
      setCurrentApiOrderId(null);
      clearCart();
    } else if (currentStep === 'products') {
      if (currentOrder) {
        // Agar faol buyurtma bo'lsa, order-detail ga qaytish
        setCurrentStep('order-detail');
      } else {
        // Aks holda bosh sahifaga
        setCurrentStep('order-type');
        setOrderType(null);
        setSelectedTable(null);
        setCurrentApiOrderId(null);
      }
    } else if (currentStep === 'payment') {
      setCurrentStep('products');
    } else if (currentStep === 'receipt') {
      setCurrentStep('payment');
      setPaymentMethod(null);
    }
  };

  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  // Login check
  if (!isAuthenticated || !currentShift) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Reports page
  if (currentStep === 'reports') {
    return <Reports onBack={() => setCurrentStep('order-type')} />;
  }

  // Lock tugmasi va overlay (barcha ekranlarda ko'rinadi)
  const lockElements = (
    <>
      {/* Lock tugmasi - ekran tepasida o'rtada */}
      {!isLocked && (
        <button
          onClick={() => setIsLocked(true)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 border border-slate-600/50 text-slate-400 hover:text-white hover:bg-slate-700 backdrop-blur-sm transition-all shadow-lg"
        >
          <Lock size={18} />
        </button>
      )}

      {/* Lock overlay - to'liq ekran */}
      {isLocked && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center cursor-pointer select-none"
          onClick={() => setIsLocked(false)}
        >
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 border-2 border-slate-600">
              <Lock size={40} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-lg font-medium">Ekran bloklangan</p>
            <p className="text-slate-600 text-sm">Ochish uchun bosing</p>
          </div>
        </div>
      )}
    </>
  );

  // Order Detail Step - Faol stol buyurtmalarini ko'rsatish
  if (currentStep === 'order-detail' && currentOrder && selectedTable) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {lockElements}
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">Stol #{selectedTable.number}</span>
              <p className="text-xs text-slate-400">{currentOrder.time} dan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={16} />
            <span className="text-sm">
              {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        <div className="p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Buyurtma ma'lumotlari */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Buyurtma tafsilotlari</h2>
                <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-sm font-medium text-green-400">Faol</span>
                </div>
              </div>

              {/* Mahsulotlar ro'yxati */}
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-lg bg-slate-900/50 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                        <Utensils className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.product.name}</p>
                        <p className="text-sm text-slate-400">{formatPrice(item.product.price)} × {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-orange-400">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Umumiy hisob */}
              <div className="border-t border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Mahsulotlar soni:</span>
                  <span className="font-medium">{getItemCount()} ta</span>
                </div>
                <div className="flex justify-between text-2xl font-bold">
                  <span>Jami summa:</span>
                  <span className="text-orange-400">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            {/* Tugmalar */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCurrentStep('products')}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-4 font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                <Plus size={18} />
                Qo'shish
              </button>
              <button
                onClick={handleGoToPayment}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 font-semibold text-white hover:shadow-lg hover:shadow-orange-500/20 transition-all"
              >
                <Check size={18} />
                Stolni yopish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Order Type Step
  if (currentStep === 'order-type') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {lockElements}
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            {currentStep !== 'order-type' && (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">{bizSettings?.name || 'Oshxona POS'}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={16} />
              <span className="text-sm">
                {new Date().toLocaleDateString('uz-UZ', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })} • {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {currentStep === 'order-type' && (
              <>
                {/* Kam qolgan mahsulotlar ogohlantirishlari */}
                {lowStockItems.length > 0 && (
                  <button
                    onClick={() => setShowLowStock(true)}
                    className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors animate-pulse"
                    title="Kam qolgan mahsulotlar"
                  >
                    <AlertTriangle size={16} />
                    Kam: {lowStockItems.length}
                  </button>
                )}
                {/* Integratsiya markazi tugmasi */}
                <button
                  onClick={() => setShowIntegrationHub(true)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    activeIntegrations > 0
                      ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                  )}
                  title="Integratsiya markazi"
                >
                  <Store size={16} />
                  Integratsiyalar
                  {activeIntegrations > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-xs font-bold text-white">
                      {activeIntegrations}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setCurrentStep('reports')}
                  className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 transition-colors"
                >
                  <BarChart3 size={16} />
                  Hisobotlar
                </button>
                <button
                  onClick={() => setShowOrderTypeModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                  <Plus size={16} />
                  Buyurtma berish
                </button>
              </>
            )}
          </div>
        </header>

        {/* Order Type Modal */}
        {showOrderTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <h3 className="mb-6 text-2xl font-bold text-white">Buyurtma turini tanlang</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowOrderTypeModal(false);
                    handleSelectOrderType('takeaway');
                  }}
                  className="relative flex w-full items-center gap-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 p-4 transition-all hover:border-blue-500 hover:bg-blue-500/20"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                    <Package className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-white">Olib ketish</p>
                    <p className="text-sm text-slate-400">O'zi olib ketadi</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowOrderTypeModal(false);
                    setOrderType('dine-in');
                  }}
                  className="relative flex w-full items-center gap-4 rounded-xl border-2 border-orange-500/30 bg-orange-500/10 p-4 transition-all hover:border-orange-500 hover:bg-orange-500/20"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                    <Utensils className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-white">Shu yerda</p>
                    <p className="text-sm text-slate-400">Stolda ovqatlanish</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowOrderTypeModal(false)}
                className="mt-6 w-full rounded-xl border border-slate-700 py-3 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        <div className="p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {/* Faol buyurtmalar */}
            {activeOrders.length > 0 && (
              <div className="space-y-6">
                {/* To'lov kutayotgan stollar */}
                {activeOrders.some((o) => o.awaitingPayment) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">To'lov kutayotgan stollar</h2>
                        <span className="flex h-6 items-center gap-1 rounded-full bg-yellow-500/20 px-2 text-xs font-medium text-yellow-400 animate-pulse">
                          <AlertCircle size={12} />
                          {activeOrders.filter((o) => o.awaitingPayment).length}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeOrders
                        .filter((o) => o.awaitingPayment)
                        .map((order) => (
                          <button
                            key={order.tableId}
                            onClick={() => {
                              const table = tables.find((t) => t.id === order.tableId);
                              if (table) {
                                setOrderType('dine-in');
                                setSelectedTable(table);
                                setCurrentOrder(order);
                                setCurrentApiOrderId(order.orderId);
                                clearCart();
                                order.orderItems.forEach((item) => {
                                  const product = products.find((p) => p.id === item.productId);
                                  if (product) {
                                    for (let i = 0; i < item.quantity; i++) {
                                      addItem(product as any);
                                    }
                                  }
                                });
                                setCurrentStep('order-detail');
                              }
                            }}
                            className="group relative flex flex-col rounded-xl border-2 border-yellow-500/30 bg-yellow-500/10 p-4 transition-all hover:border-yellow-500 hover:bg-yellow-500/20"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
                                  <DollarSign className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="text-left">
                                  <p className="text-lg font-bold text-white">
                                    Stol #{order.tableNumber}
                                  </p>
                                  <p className="text-xs text-slate-400">{order.time}</p>
                                </div>
                              </div>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 animate-pulse">
                                <AlertCircle size={14} className="text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{order.items} ta mahsulot</span>
                              <span className="text-lg font-bold text-yellow-400">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                            <div className="absolute -top-1 -right-1 flex h-6 items-center gap-1 rounded-full bg-yellow-500 px-2 text-xs font-medium text-white animate-pulse">
                              To'lov kutilmoqda
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Boshqa ochiq stollar */}
                {activeOrders.some((o) => !o.awaitingPayment) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold">Ochiq stollar</h2>
                      <span className="text-sm text-slate-400">
                        {activeOrders.filter((o) => !o.awaitingPayment).length} ta stol
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeOrders
                        .filter((o) => !o.awaitingPayment)
                        .map((order) => (
                          <button
                            key={order.tableId}
                            onClick={() => {
                              const table = tables.find((t) => t.id === order.tableId);
                              if (table) {
                                setOrderType('dine-in');
                                setSelectedTable(table);
                                setCurrentOrder(order);
                                setCurrentApiOrderId(order.orderId);
                                clearCart();
                                order.orderItems.forEach((item) => {
                                  const product = products.find((p) => p.id === item.productId);
                                  if (product) {
                                    for (let i = 0; i < item.quantity; i++) {
                                      addItem(product as any);
                                    }
                                  }
                                });
                                setCurrentStep('order-detail');
                              }
                            }}
                            className="group relative flex flex-col rounded-xl border-2 border-orange-500/30 bg-orange-500/5 p-4 transition-all hover:border-orange-500 hover:bg-orange-500/10"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                                  <Utensils className="h-5 w-5 text-orange-400" />
                                </div>
                                <div className="text-left">
                                  <p className="text-lg font-bold text-white">
                                    Stol #{order.tableNumber}
                                  </p>
                                  <p className="text-xs text-slate-400">{order.time}</p>
                                </div>
                              </div>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 animate-pulse">
                                <Clock size={14} className="text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">{order.items} ta mahsulot</span>
                              <span className="text-lg font-bold text-orange-400">
                                {formatPrice(order.total)}
                              </span>
                            </div>
                            <div className="absolute -top-1 -right-1 flex h-6 items-center gap-1 rounded-full bg-green-500 px-2 text-xs font-medium text-white">
                              <CheckCircle size={12} />
                              Faol
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table Selection - faqat dine-in turi tanlanganda */}
            {orderType === 'dine-in' && (
              <div className="animate-in fade-in-0 slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Stol tanlang</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-green-500"></span>
                      <span className="text-slate-400">Bo'sh</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-500"></span>
                      <span className="text-slate-400">Band</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                      <span className="text-slate-400">Bron</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {tables.map((table) => {
                    const isFree = table.status === 'free';
                    const isSelected = selectedTable?.id === table.id;

                    return (
                      <button
                        key={table.id}
                        onClick={() => isFree && setSelectedTable(table)}
                        disabled={!isFree}
                        className={cn(
                          'relative flex flex-col items-center justify-center rounded-xl border-2 p-6 transition-all',
                          isFree
                            ? isSelected
                              ? 'border-orange-500 bg-orange-500/20'
                              : 'border-slate-700 bg-slate-800 hover:border-green-500/50'
                            : table.status === 'occupied'
                            ? 'border-red-500/30 bg-red-500/10 cursor-not-allowed'
                            : 'border-yellow-500/30 bg-yellow-500/10 cursor-not-allowed'
                        )}
                      >
                        <span className={cn(
                          'text-3xl font-bold',
                          isFree ? (isSelected ? 'text-orange-400' : 'text-white') : 'text-slate-500'
                        )}>
                          #{table.number}
                        </span>
                        <span className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Users size={12} />
                          {table.capacity}
                        </span>
                        {isSelected && (
                          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedTable && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleSelectOrderType('dine-in', selectedTable)}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3 font-semibold text-white hover:bg-orange-600 transition-colors"
                    >
                      Davom etish
                      <Check size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  if (currentStep === 'payment') {
    if (showQR && paymentMethod && ['payme', 'click', 'uzum'].includes(paymentMethod)) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
          {lockElements}
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">QR To'lov</span>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">
                  {paymentMethod === 'payme' && "Payme orqali to'lash"}
                  {paymentMethod === 'click' && "Click orqali to'lash"}
                  {paymentMethod === 'uzum' && "Uzum orqali to'lash"}
                </h3>
                <p className="text-slate-400 mb-6">QR kodni skanerlang</p>

                <div className="mb-6 p-4 rounded-xl bg-slate-900/50">
                  <p className="text-sm text-slate-400">To'lov summasi</p>
                  <p className="text-4xl font-bold text-orange-400 mt-1">{formatPrice(getTotal())}</p>
                </div>

                <div className={cn(
                  'mx-auto w-64 h-64 rounded-2xl flex items-center justify-center mb-6',
                  paymentMethod === 'payme' && 'bg-[#00CCCC]',
                  paymentMethod === 'click' && 'bg-[#00A4E6]',
                  paymentMethod === 'uzum' && 'bg-[#7C3AED]'
                )}>
                  <div className="bg-white p-4 rounded-xl">
                    <QrCode size={160} className="text-slate-900" />
                  </div>
                </div>

                {qrConfirmed ? (
                  <div className="animate-in fade-in-0 duration-300">
                    <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                      <CheckCircle size={24} />
                      <span className="text-lg font-medium">To'lov tasdiqlandi!</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmQR}
                    className="w-full rounded-xl bg-green-500 py-4 font-semibold text-white hover:bg-green-600 transition-colors"
                  >
                    <Check size={18} className="inline mr-2" />
                    To'lov qabul qilindi
                  </button>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { setShowQR(false); setPaymentMethod(null); setQrConfirmed(false); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Orqaga
                </button>
                <button
                  onClick={handleProceedToReceipt}
                  disabled={!qrConfirmed}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer size={16} />
                  Chek chiqarish
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        {lockElements}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">To'lov</span>
          </div>
          <div className="text-slate-400">
            {orderType === 'dine-in' && selectedTable && (
              <span className="text-orange-400 font-medium">Stol #{selectedTable.number}</span>
            )}
            {orderType === 'takeaway' && (
              <span className="text-blue-400 font-medium">Olib ketish</span>
            )}
          </div>
        </header>

        <div className="flex-1 p-8">
          <div className="mx-auto max-w-3xl">
            {/* Order Summary */}
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Buyurtma xulosasi</h3>
                <button
                  onClick={() => setShowBillEditor(!showBillEditor)}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  <DollarSign size={14} />
                  {showBillEditor ? 'Berkitish' : 'Tahrirlash'}
                </button>
              </div>

              {/* Bill Editor */}
              {showBillEditor && (
                <div className="mb-4 space-y-3 rounded-lg bg-slate-900/50 p-4 border border-slate-700">
                  {/* Discount */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Chegirma
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={discount || ''}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')
                        }
                        className={`flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          discountType === 'percent'
                            ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {discountType === 'percent' ? (
                          <>
                            <Percent size={14} />%
                          </>
                        ) : (
                          <>
                            <DollarSign size={14} />
                            so'm
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Service Charge */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Servis haq (%)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={serviceCharge || ''}
                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        max="100"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                      />
                      <div className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 text-slate-400">
                        %
                      </div>
                    </div>
                  </div>

                  {/* Remove Item */}
                  {items.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Mahsulotni o'chirish
                      </label>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <button
                            key={item.product.id}
                            onClick={() => removeItem(item.product.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm hover:bg-red-500/10 hover:border-red-500/30 transition-colors group"
                          >
                            <span className="text-white">{item.product.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">x{item.quantity}</span>
                              <X
                                size={14}
                                className="text-slate-500 group-hover:text-red-400"
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} <span className="text-slate-500">x{item.quantity}</span>
                    </span>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Bill Summary */}
              <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Mahsulotlar:</span>
                  <span>{formatPrice(getCartTotal())}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>
                      Chegirma ({discountType === 'percent' ? `${discount}%` : 'qat\'iy'}):
                    </span>
                    <span>-{formatPrice(getDiscountAmount())}</span>
                  </div>
                )}

                {serviceCharge > 0 && (
                  <div className="flex justify-between text-sm text-blue-400">
                    <span>Servis haq ({serviceCharge}%):</span>
                    <span>+{formatPrice(getServiceChargeAmount())}</span>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold pt-2 border-t border-slate-700">
                  <span>Jami:</span>
                  <span className="text-orange-400">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <h3 className="text-lg font-bold mb-4">To'lov usulini tanlang</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'cash' as PaymentMethod, label: 'Naqd', icon: Banknote, color: 'green' },
                { id: 'card' as PaymentMethod, label: 'Karta', icon: CreditCard, color: 'blue' },
                { id: 'payme' as PaymentMethod, label: 'Payme', icon: Smartphone, color: 'cyan' },
                { id: 'click' as PaymentMethod, label: 'Click', icon: Smartphone, color: 'purple' },
                { id: 'uzum' as PaymentMethod, label: 'QR Kod', icon: QrCode, color: 'orange' },
              ].map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                      isSelected
                        ? `border-${method.color}-500 bg-${method.color}-500/10`
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    )}
                  >
                    <div className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full',
                      isSelected ? `bg-${method.color}-500/20` : 'bg-slate-700'
                    )}>
                      <Icon size={28} className={isSelected ? `text-${method.color}-400` : 'text-slate-400'} />
                    </div>
                    <span className="font-semibold">{method.label}</span>
                    {isSelected && (
                      <Check size={16} className={`text-${method.color}-400`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3">
              {/* Orqaga tugmasi */}
              <button
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-4 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
                Orqaga
              </button>

              {/* Buyurtma berish (to'lovsiz) */}
              <button
                onClick={handlePlaceOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-4 font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                <Check size={18} />
                Buyurtma berish
              </button>

              {/* Stol yopish (to'lov bilan) */}
              <button
                onClick={() => {
                  if (!paymentMethod) return;

                  // Naqd to'lov uchun qaytim kalkulyatorini ko'rsatish
                  if (paymentMethod === 'cash') {
                    setShowChangeCalculator(true);
                  } else {
                    handlePaymentSelect(paymentMethod);
                  }
                }}
                disabled={!paymentMethod}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentMethod && ['payme', 'click', 'uzum'].includes(paymentMethod) ? (
                  <>
                    <QrCode size={18} />
                    Stol yopish (QR to'lov)
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Stol yopish
                  </>
                )}
              </button>
            </div>

            {/* Change Calculator Modal */}
            {showChangeCalculator && paymentMethod === 'cash' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                      <Calculator className="h-8 w-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Naqd to'lov</h2>
                    <p className="mt-2 text-slate-400">Olingan summani kiriting</p>
                  </div>

                  <div className="mb-6 space-y-4">
                    {/* Total Amount */}
                    <div className="rounded-lg bg-slate-800/50 p-4">
                      <p className="text-sm text-slate-400">To'lov summasi</p>
                      <p className="text-3xl font-bold text-orange-400">{formatPrice(getTotal())}</p>
                    </div>

                    {/* Cash Received */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Olingan summa (so'm)
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white text-lg placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    {/* Change */}
                    {cashReceived && parseFloat(cashReceived) >= getTotal() && (
                      <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4 animate-in fade-in-0">
                        <p className="text-sm text-green-400">Qaytim</p>
                        <p className="text-3xl font-bold text-green-400">
                          {formatPrice(parseFloat(cashReceived) - getTotal())}
                        </p>
                      </div>
                    )}

                    {cashReceived && parseFloat(cashReceived) < getTotal() && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                        <p className="text-sm text-red-400">Yetarli emas</p>
                        <p className="text-lg font-bold text-red-400">
                          Yana {formatPrice(getTotal() - parseFloat(cashReceived))} kerak
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowChangeCalculator(false);
                        setCashReceived('');
                      }}
                      className="flex-1 rounded-xl border border-slate-700 py-3 font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={() => {
                        const received = parseFloat(cashReceived);
                        if (received >= getTotal()) {
                          setShowChangeCalculator(false);
                          handlePaymentSelect('cash');
                          setCashReceived('');
                        } else {
                          alert('Yetarli summa kiritilmagan!');
                        }
                      }}
                      disabled={!cashReceived || parseFloat(cashReceived) < getTotal()}
                      className="flex-1 rounded-xl bg-green-500 py-3 font-semibold text-white transition-all hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Tasdiqlash
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Receipt Step
  if (currentStep === 'receipt') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        {lockElements}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Chek</span>
          </div>
        </header>

        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Receipt */}
            <div id="receipt-content" className="rounded-xl border border-slate-700 bg-white text-slate-900 p-6 shadow-xl">
              <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                <h2 className="text-xl font-bold">{bizSettings?.name || 'OSHXONA'}</h2>
                {bizSettings?.address && <p className="text-xs text-slate-500 mt-1">{bizSettings.address}</p>}
                {bizSettings?.phone && <p className="text-xs text-slate-500">{bizSettings.phone}</p>}
              </div>

              <div className="border-b border-dashed border-slate-300 pb-3 mb-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Buyurtma №:</span>
                  <span className="font-mono font-semibold">{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sana:</span>
                  <span>{new Date().toLocaleString('uz-UZ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turi:</span>
                  <span className="font-medium">{orderType === 'dine-in' ? 'Shu yerda' : 'Olib ketish'}</span>
                </div>
                {orderType === 'dine-in' && selectedTable && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stol:</span>
                    <span className="font-bold text-orange-600">#{selectedTable.number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">To'lov:</span>
                  <span className="font-medium text-green-600">
                    {paymentMethod === 'cash' && 'Naqd'}
                    {paymentMethod === 'card' && 'Karta'}
                    {paymentMethod === 'payme' && 'Payme'}
                    {paymentMethod === 'click' && 'Click'}
                    {paymentMethod === 'uzum' && 'QR Kod'}
                  </span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 text-xs">
                      <th className="text-left pb-2">Mahsulot</th>
                      <th className="text-center pb-2">Soni</th>
                      <th className="text-right pb-2">Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.product.id} className="border-t border-slate-100">
                        <td className="py-2">
                          <span className="text-slate-400 text-xs mr-1">{index + 1}.</span>
                          {item.product.name}
                        </td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2 font-medium">
                          {new Intl.NumberFormat('uz-UZ').format(item.product.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span>JAMI:</span>
                <span>{formatPrice(getTotal())}</span>
              </div>

              <div className="mt-6 text-center border-t border-dashed border-slate-300 pt-4">
                <p className="text-sm font-medium">Xaridingiz uchun rahmat!</p>
                <p className="text-xs text-slate-500 mt-1">Yana kutib qolamiz</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-4 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
                Orqaga
              </button>
              <button
                onClick={handlePrintAndClose}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-semibold text-white hover:bg-green-600 transition-colors"
              >
                <Check size={16} />
                Tasdiqlash
                <Printer size={16} />
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #receipt-content, #receipt-content * { visibility: visible; }
            #receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 10mm;
            }
          }
        `}</style>
      </div>
    );
  }

  // Products Step
  return (
    <div className="flex h-screen bg-slate-950 text-white">
      {lockElements}
      {/* Left side - Products */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold">{bizSettings?.name || 'Oshxona POS'}</span>
              <p className="text-xs text-slate-500">
                {orderType === 'dine-in' && selectedTable && (
                  <span className="text-orange-400">Stol #{selectedTable.number}</span>
                )}
                {orderType === 'takeaway' && <span className="text-blue-400">Olib ketish</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-4 py-2 text-sm placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowQRScanner(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
              title="QR / Barcode skanerlash"
            >
              <ScanLine size={16} />
              Skanerlash
            </button>
          </div>
        </header>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 bg-slate-900/50 p-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              selectedCategory === null
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            )}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              )}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="flex flex-col items-center rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-center transition-all hover:border-orange-500 hover:bg-slate-800"
              >
                <div className="mb-3 w-full aspect-square overflow-hidden rounded-lg bg-slate-700/50">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="mb-1 font-medium text-sm">{product.name}</span>
                <span className="text-sm text-orange-400 font-semibold">{formatPrice(product.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="flex w-96 flex-col border-l border-slate-800 bg-slate-900">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-400" />
            <span className="font-semibold">Savat</span>
            {getItemCount() > 0 && (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium">
                {getItemCount()}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-slate-500 hover:text-red-400 transition-colors"
            >
              Tozalash
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <ShoppingCart className="mb-2 h-12 w-12" />
              <p className="font-medium">Savat bo'sh</p>
              <p className="text-sm">Mahsulot qo'shish uchun bosing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <p className="text-sm text-orange-400">{formatPrice(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {items.length > 0 && (
          <div className="border-t border-slate-800 p-4">
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Mahsulotlar</span>
                <span>{getItemCount()} ta</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Jami</span>
                <span className="text-orange-400">{formatPrice(getTotal())}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={handlePlaceOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                <Plus size={18} />
                Buyurtma qo'shish
              </button>
              <button
                onClick={handleGoToPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-orange-500/20"
              >
                <Check size={18} />
                Stolni yopish
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Integratsiya markazi */}
      <IntegrationHub
        isOpen={showIntegrationHub}
        onClose={() => setShowIntegrationHub(false)}
        onStatusChange={() => fetchData()}
      />

      {/* QR Skaner */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onProductFound={handleQRProductFound}
      />

      {/* Kam qolgan mahsulotlar */}
      <LowStockAlert
        isOpen={showLowStock}
        onClose={() => setShowLowStock(false)}
        items={lowStockItems}
      />
    </div>
  );
}
