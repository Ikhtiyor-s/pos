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
  LogOut,
  DollarSign,
  Percent,
  X,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Calculator,
  Store,
  ChefHat,
  Play,
  Timer,
} from 'lucide-react';
import { productService, categoryService, type Product as ApiProduct, type Category as ApiCategory } from './services/product.service';
import { tableService, type Table as ApiTable } from './services/table.service';
import { orderService, type Order as ApiOrder } from './services/order.service';
import { socketService } from './services/socket.service';
import { settingsService, type BusinessSettings } from './services/settings.service';
import { IntegrationHub } from './components/IntegrationHub';
// QR Scanner — faqat admin panelda ishlatiladi
import { LowStockAlert } from './components/LowStockAlert';
import { inventoryService, type LowStockItem } from './services/inventory.service';

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

// Role helpers
function isAdminRole(role?: string) {
  const r = role?.toLowerCase() || '';
  return ['super_admin', 'admin', 'manager', 'owner'].includes(r);
}

function isCashierRole(role?: string) {
  const r = role?.toLowerCase() || '';
  return r === 'cashier' || r === 'kassir';
}

function isChefRole(role?: string) {
  const r = role?.toLowerCase() || '';
  return ['chef', 'oshpaz', 'cook', 'kitchen'].includes(r);
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

export default function App() {
  const { isAuthenticated, currentShift, user, logout } = useAuthStore();
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

  // QR Skaner — POS dan olib tashlandi

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

      // Fetch active orders (status filtrsiz — client-side filter qilamiz)
      const apiOrders = await orderService.getAll();
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
      alert('Buyurtma oshxonaga yuborildi!');
      // fetchData alohida try/catch ichida — xato bo'lsa ham buyurtma yuborilgan
      try { await fetchData(); } catch { /* ignore refresh errors */ }
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
    try { await fetchData(); } catch { /* ignore refresh errors */ }
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

  const userRole = user?.role?.toLowerCase();

  // Login check
  if (!isAuthenticated || !currentShift) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Chef/Kitchen View - dedicated view for kitchen staff
  if (isChefRole(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-green-50">
        {/* Kitchen Header */}
        <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-800">Oshxona</span>
              <p className="text-xs text-gray-500">Buyurtmalar paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={16} />
              <span className="text-sm">
                {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-3 py-1.5">
              <span className="text-xs font-medium text-gray-600">{user?.name}</span>
              <span className="text-[10px] text-gray-400 capitalize">Oshpaz</span>
              <button
                onClick={() => { logout(); localStorage.removeItem('pos-auth'); }}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="Chiqish"
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="mx-auto max-w-6xl">
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg mb-4">
                  <ChefHat className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-600">Hozircha buyurtma yo'q</p>
                <p className="text-sm text-gray-400">Yangi buyurtmalar bu yerda ko'rinadi</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className={cn(
                      'rounded-2xl border backdrop-blur-xl p-5 shadow-lg transition-all',
                      order.status === 'NEW'
                        ? 'bg-orange-50/60 border-orange-200/60'
                        : order.status === 'CONFIRMED'
                        ? 'bg-blue-50/60 border-blue-200/60'
                        : order.status === 'PREPARING'
                        ? 'bg-yellow-50/60 border-yellow-200/60'
                        : 'bg-green-50/60 border-green-200/60'
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {order.tableNumber > 0 ? (
                          <span className="text-lg font-bold text-gray-800">Stol #{order.tableNumber}</span>
                        ) : (
                          <span className="text-lg font-bold text-gray-800">Olib ketish</span>
                        )}
                      </div>
                      <div className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                        order.status === 'NEW' ? 'bg-orange-500/10 text-orange-600' :
                        order.status === 'CONFIRMED' ? 'bg-blue-500/10 text-blue-600' :
                        order.status === 'PREPARING' ? 'bg-yellow-500/10 text-yellow-700' :
                        'bg-green-500/10 text-green-600'
                      )}>
                        {order.status === 'NEW' && 'Yangi'}
                        {order.status === 'CONFIRMED' && 'Tasdiqlangan'}
                        {order.status === 'PREPARING' && 'Tayyorlanmoqda'}
                        {order.status === 'READY' && 'Tayyor'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Timer size={12} />
                      <span>{order.time}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-3 py-2">
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-200/80 px-2 text-xs font-bold text-gray-700">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'NEW' && (
                        <button
                          onClick={async () => {
                            try {
                              await orderService.updateStatus(order.orderId, 'CONFIRMED');
                              await fetchData();
                            } catch { /* ignore */ }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                        >
                          <Check size={16} />
                          Qabul qilish
                        </button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={async () => {
                            try {
                              await orderService.updateStatus(order.orderId, 'PREPARING');
                              await fetchData();
                            } catch { /* ignore */ }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                        >
                          <Play size={16} />
                          Tayyorlash
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button
                          onClick={async () => {
                            try {
                              await orderService.updateStatus(order.orderId, 'READY');
                              await fetchData();
                            } catch { /* ignore */ }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                        >
                          <CheckCircle size={16} />
                          Tayyor!
                        </button>
                      )}
                      {order.status === 'READY' && (
                        <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-100/60 border border-green-200/60 py-2.5 text-sm font-medium text-green-600">
                          <CheckCircle size={16} />
                          Tayyor - Kassir kutilmoqda
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Reports page (only for admin/manager)
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
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-white/60 text-gray-400 hover:text-gray-700 hover:bg-white/70 transition-all shadow-lg"
        >
          <Lock size={18} />
        </button>
      )}

      {/* Lock overlay - to'liq ekran */}
      {isLocked && (
        <div
          className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col items-center justify-center cursor-pointer select-none"
          onClick={() => setIsLocked(false)}
        >
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/60 backdrop-blur-xl border-2 border-white/80 shadow-xl">
              <Lock size={40} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">Ekran bloklangan</p>
            <p className="text-gray-400 text-sm">Ochish uchun bosing</p>
          </div>
        </div>
      )}
    </>
  );

  // Order Detail Step - Faol stol buyurtmalarini ko'rsatish
  if (currentStep === 'order-detail' && currentOrder && selectedTable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
        {lockElements}
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 backdrop-blur-sm border border-white/60 text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-800">Stol #{selectedTable.number}</span>
              <p className="text-xs text-gray-500">{currentOrder.time} dan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Clock size={16} />
            <span className="text-sm">
              {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        <div className="p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Buyurtma ma'lumotlari */}
            <div className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Buyurtma tafsilotlari</h2>
                <div className="flex items-center gap-2 rounded-full bg-green-500/10 border border-green-200/50 px-3 py-1">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-green-600">Faol</span>
                </div>
              </div>

              {/* Mahsulotlar ro'yxati */}
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                        <Utensils className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.product.name}</p>
                        <p className="text-sm text-gray-500">{formatPrice(item.product.price)} x {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-orange-500">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Umumiy hisob */}
              <div className="border-t border-gray-200/60 pt-4 space-y-2">
                <div className="flex justify-between text-gray-500">
                  <span>Mahsulotlar soni:</span>
                  <span className="font-medium">{getItemCount()} ta</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-gray-800">
                  <span>Jami summa:</span>
                  <span className="text-orange-500">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            {/* Tugmalar */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setCurrentStep('products')}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-4 font-semibold text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={18} />
                Qo'shish
              </button>
              <button
                onClick={handleGoToPayment}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 font-semibold text-white shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
        {lockElements}
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {currentStep !== 'order-type' && (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 backdrop-blur-sm border border-white/60 text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">{bizSettings?.name || 'Oshxona POS'}</span>
            <div className="ml-3 flex items-center gap-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-2.5 py-1">
              <span className="text-xs font-medium text-gray-600">{user?.name}</span>
              <span className="text-[10px] text-gray-400 capitalize">({user?.role?.replace('_', ' ')})</span>
              <button
                onClick={() => { logout(); localStorage.removeItem('pos-auth'); }}
                className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                title="Chiqish"
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={16} />
              <span className="text-sm">
                {new Date().toLocaleDateString('uz-UZ', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })} {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {currentStep === 'order-type' && (
              <>
                {/* Kam qolgan mahsulotlar - faqat admin uchun */}
                {isAdminRole(userRole) && lowStockItems.length > 0 && (
                  <button
                    onClick={() => setShowLowStock(true)}
                    className="flex items-center gap-2 rounded-xl bg-yellow-500/10 backdrop-blur-sm border border-yellow-300/40 px-3 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-500/20 transition-colors animate-pulse"
                    title="Kam qolgan mahsulotlar"
                  >
                    <AlertTriangle size={16} />
                    Kam: {lowStockItems.length}
                  </button>
                )}
                {/* Integratsiya markazi - faqat admin uchun */}
                {isAdminRole(userRole) && (
                  <button
                    onClick={() => setShowIntegrationHub(true)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl backdrop-blur-sm px-3 py-2 text-sm font-medium transition-colors',
                      activeIntegrations > 0
                        ? 'bg-green-500/10 border border-green-300/40 text-green-600 hover:bg-green-500/20'
                        : 'bg-white/50 border border-white/60 text-gray-500 hover:bg-white/70 hover:text-gray-800'
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
                )}
                {/* Hisobotlar - faqat admin uchun */}
                {isAdminRole(userRole) && (
                  <button
                    onClick={() => setCurrentStep('reports')}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <BarChart3 size={16} />
                    Hisobotlar
                  </button>
                )}
                {/* Buyurtma berish - admin va kassir uchun */}
                {(isAdminRole(userRole) || isCashierRole(userRole)) && (
                  <button
                    onClick={() => setShowOrderTypeModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus size={16} />
                    Buyurtma berish
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* Order Type Modal */}
        {showOrderTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 shadow-2xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-800">Buyurtma turini tanlang</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowOrderTypeModal(false);
                    handleSelectOrderType('takeaway');
                  }}
                  className="relative flex w-full items-center gap-4 rounded-xl border-2 border-blue-200/60 bg-blue-50/50 backdrop-blur-sm p-4 transition-all hover:border-blue-400 hover:bg-blue-100/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-gray-800">Olib ketish</p>
                    <p className="text-sm text-gray-500">O'zi olib ketadi</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowOrderTypeModal(false);
                    setOrderType('dine-in');
                  }}
                  className="relative flex w-full items-center gap-4 rounded-xl border-2 border-orange-200/60 bg-orange-50/50 backdrop-blur-sm p-4 transition-all hover:border-orange-400 hover:bg-orange-100/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                    <Utensils className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-gray-800">Shu yerda</p>
                    <p className="text-sm text-gray-500">Stolda ovqatlanish</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowOrderTypeModal(false)}
                className="mt-6 w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 py-3 text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-800"
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
                        <h2 className="text-xl font-bold text-gray-800">To'lov kutayotgan stollar</h2>
                        <span className="flex h-6 items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-300/40 px-2 text-xs font-medium text-yellow-600 animate-pulse">
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
                            className="group relative flex flex-col rounded-2xl border-2 border-yellow-300/50 bg-yellow-50/40 backdrop-blur-xl p-4 transition-all hover:border-yellow-400 hover:bg-yellow-100/50 shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                                  <DollarSign className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div className="text-left">
                                  <p className="text-lg font-bold text-gray-800">
                                    Stol #{order.tableNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">{order.time}</p>
                                </div>
                              </div>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 animate-pulse">
                                <AlertCircle size={14} className="text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">{order.items} ta mahsulot</span>
                              <span className="text-lg font-bold text-yellow-600">
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
                      <h2 className="text-xl font-bold text-gray-800">Ochiq stollar</h2>
                      <span className="text-sm text-gray-500">
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
                            className="group relative flex flex-col rounded-2xl border-2 border-orange-200/50 bg-white/40 backdrop-blur-xl p-4 transition-all hover:border-orange-400 hover:bg-orange-50/50 shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                                  <Utensils className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="text-left">
                                  <p className="text-lg font-bold text-gray-800">
                                    Stol #{order.tableNumber}
                                  </p>
                                  <p className="text-xs text-gray-500">{order.time}</p>
                                </div>
                              </div>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 animate-pulse">
                                <Clock size={14} className="text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">{order.items} ta mahsulot</span>
                              <span className="text-lg font-bold text-orange-500">
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
                  <h2 className="text-xl font-bold text-gray-800">Stol tanlang</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-green-500"></span>
                      <span className="text-gray-500">Bo'sh</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-500"></span>
                      <span className="text-gray-500">Band</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                      <span className="text-gray-500">Bron</span>
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
                          'relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all backdrop-blur-xl shadow-md',
                          isFree
                            ? isSelected
                              ? 'border-orange-400 bg-orange-50/50'
                              : 'border-white/60 bg-white/40 hover:border-green-300'
                            : table.status === 'occupied'
                            ? 'border-red-200/60 bg-red-50/40 cursor-not-allowed'
                            : 'border-yellow-200/60 bg-yellow-50/40 cursor-not-allowed'
                        )}
                      >
                        <span className={cn(
                          'text-3xl font-bold',
                          isFree ? (isSelected ? 'text-orange-500' : 'text-gray-800') : 'text-gray-400'
                        )}>
                          #{table.number}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Users size={12} />
                          {table.capacity}
                        </span>
                        {isSelected && (
                          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 shadow-md">
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
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-3 font-semibold text-white shadow-md hover:shadow-lg transition-all"
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
        <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col">
          {lockElements}
          <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">QR To'lov</span>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg p-8 text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {paymentMethod === 'payme' && "Payme orqali to'lash"}
                  {paymentMethod === 'click' && "Click orqali to'lash"}
                  {paymentMethod === 'uzum' && "Uzum orqali to'lash"}
                </h3>
                <p className="text-gray-500 mb-6">QR kodni skanerlang</p>

                <div className="mb-6 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60">
                  <p className="text-sm text-gray-500">To'lov summasi</p>
                  <p className="text-4xl font-bold text-orange-500 mt-1">{formatPrice(getTotal())}</p>
                </div>

                <div className={cn(
                  'mx-auto w-64 h-64 rounded-2xl flex items-center justify-center mb-6 shadow-lg',
                  paymentMethod === 'payme' && 'bg-[#00CCCC]',
                  paymentMethod === 'click' && 'bg-[#00A4E6]',
                  paymentMethod === 'uzum' && 'bg-[#7C3AED]'
                )}>
                  <div className="bg-white p-4 rounded-xl">
                    <QrCode size={160} className="text-gray-900" />
                  </div>
                </div>

                {qrConfirmed ? (
                  <div className="animate-in fade-in-0 duration-300">
                    <div className="flex items-center justify-center gap-2 text-green-500 mb-4">
                      <CheckCircle size={24} />
                      <span className="text-lg font-medium">To'lov tasdiqlandi!</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmQR}
                    className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-4 font-semibold text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Check size={18} className="inline mr-2" />
                    To'lov qabul qilindi
                  </button>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { setShowQR(false); setPaymentMethod(null); setQrConfirmed(false); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 py-3 text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Orqaga
                </button>
                <button
                  onClick={handleProceedToReceipt}
                  disabled={!qrConfirmed}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col">
        {lockElements}
        <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">To'lov</span>
          </div>
          <div className="text-gray-500">
            {orderType === 'dine-in' && selectedTable && (
              <span className="text-orange-500 font-medium">Stol #{selectedTable.number}</span>
            )}
            {orderType === 'takeaway' && (
              <span className="text-blue-500 font-medium">Olib ketish</span>
            )}
          </div>
        </header>

        <div className="flex-1 p-8">
          <div className="mx-auto max-w-3xl">
            {/* Order Summary */}
            <div className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Buyurtma xulosasi</h3>
                <button
                  onClick={() => setShowBillEditor(!showBillEditor)}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all"
                >
                  <DollarSign size={14} />
                  {showBillEditor ? 'Berkitish' : 'Tahrirlash'}
                </button>
              </div>

              {/* Bill Editor */}
              {showBillEditor && (
                <div className="mb-4 space-y-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 p-4">
                  {/* Discount */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Chegirma
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={discount || ''}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')
                        }
                        className={`flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          discountType === 'percent'
                            ? 'border-orange-400 bg-orange-50 text-orange-500'
                            : 'border-gray-200 bg-white/70 text-gray-500 hover:text-gray-800'
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
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Servis haq (%)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={serviceCharge || ''}
                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        max="100"
                        className="flex-1 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                      />
                      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white/70 px-4 text-gray-500">
                        %
                      </div>
                    </div>
                  </div>

                  {/* Remove Item */}
                  {items.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-600">
                        Mahsulotni o'chirish
                      </label>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <button
                            key={item.product.id}
                            onClick={() => removeItem(item.product.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white/70 p-2 text-sm hover:bg-red-50 hover:border-red-300 transition-colors group"
                          >
                            <span className="text-gray-800">{item.product.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">x{item.quantity}</span>
                              <X
                                size={14}
                                className="text-gray-400 group-hover:text-red-400"
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
                  <div key={item.product.id} className="flex justify-between text-sm text-gray-700">
                    <span>
                      {item.product.name} <span className="text-gray-400">x{item.quantity}</span>
                    </span>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Bill Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200/60 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Mahsulotlar:</span>
                  <span>{formatPrice(getCartTotal())}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-500">
                    <span>
                      Chegirma ({discountType === 'percent' ? `${discount}%` : 'qat\'iy'}):
                    </span>
                    <span>-{formatPrice(getDiscountAmount())}</span>
                  </div>
                )}

                {serviceCharge > 0 && (
                  <div className="flex justify-between text-sm text-blue-500">
                    <span>Servis haq ({serviceCharge}%):</span>
                    <span>+{formatPrice(getServiceChargeAmount())}</span>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200/60 text-gray-800">
                  <span>Jami:</span>
                  <span className="text-orange-500">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <h3 className="text-lg font-bold text-gray-800 mb-4">To'lov usulini tanlang</h3>
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
                      'flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all backdrop-blur-xl shadow-md',
                      isSelected
                        ? `border-${method.color}-400 bg-${method.color}-50/50`
                        : 'border-white/60 bg-white/40 hover:border-gray-300'
                    )}
                  >
                    <div className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full',
                      isSelected ? `bg-${method.color}-500/10` : 'bg-gray-100/80'
                    )}>
                      <Icon size={28} className={isSelected ? `text-${method.color}-500` : 'text-gray-400'} />
                    </div>
                    <span className="font-semibold text-gray-800">{method.label}</span>
                    {isSelected && (
                      <Check size={16} className={`text-${method.color}-500`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3">
              {/* Orqaga tugmasi */}
              <button
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 py-4 text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
              >
                <ArrowLeft size={16} />
                Orqaga
              </button>

              {/* Buyurtma berish (to'lovsiz) */}
              <button
                onClick={handlePlaceOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-4 font-semibold text-white shadow-md hover:shadow-lg transition-all"
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-4 font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 p-6 shadow-2xl">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                      <Calculator className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Naqd to'lov</h2>
                    <p className="mt-2 text-gray-500">Olingan summani kiriting</p>
                  </div>

                  <div className="mb-6 space-y-4">
                    {/* Total Amount */}
                    <div className="rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 p-4">
                      <p className="text-sm text-gray-500">To'lov summasi</p>
                      <p className="text-3xl font-bold text-orange-500">{formatPrice(getTotal())}</p>
                    </div>

                    {/* Cash Received */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-600">
                        Olingan summa (so'm)
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-200 bg-white/70 px-4 py-3 text-gray-800 text-lg placeholder:text-gray-400 focus:border-green-500 focus:outline-none"
                        autoFocus
                      />
                    </div>

                    {/* Change */}
                    {cashReceived && parseFloat(cashReceived) >= getTotal() && (
                      <div className="rounded-xl bg-green-50/60 border border-green-200/60 p-4 animate-in fade-in-0">
                        <p className="text-sm text-green-600">Qaytim</p>
                        <p className="text-3xl font-bold text-green-600">
                          {formatPrice(parseFloat(cashReceived) - getTotal())}
                        </p>
                      </div>
                    )}

                    {cashReceived && parseFloat(cashReceived) < getTotal() && (
                      <div className="rounded-xl bg-red-50/60 border border-red-200/60 p-4">
                        <p className="text-sm text-red-500">Yetarli emas</p>
                        <p className="text-lg font-bold text-red-500">
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
                      className="flex-1 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 py-3 font-semibold text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-800"
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
                      className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col">
        {lockElements}
        <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Chek</span>
          </div>
        </header>

        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full max-w-md">
            {/* Receipt */}
            <div id="receipt-content" className="rounded-2xl border border-white/60 bg-white text-gray-900 p-6 shadow-xl">
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
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 py-4 text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
              >
                <ArrowLeft size={16} />
                Orqaga
              </button>
              <button
                onClick={handlePrintAndClose}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-4 font-semibold text-white shadow-md hover:shadow-lg transition-all"
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
    <div className="flex h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
      {lockElements}
      {/* Left side - Products */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between bg-white/60 backdrop-blur-xl border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/50 backdrop-blur-sm border border-white/60 text-gray-500 hover:text-gray-800 hover:bg-white/70 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800">{bizSettings?.name || 'Oshxona POS'}</span>
              <p className="text-xs text-gray-500">
                {orderType === 'dine-in' && selectedTable && (
                  <span className="text-orange-500">Stol #{selectedTable.number}</span>
                )}
                {orderType === 'takeaway' && <span className="text-blue-500">Olib ketish</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 pl-10 pr-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none"
              />
            </div>
            {/* QR Scanner — faqat admin panelda ishlatiladi, POS dan olib tashlandi */}
          </div>
        </header>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto bg-white/30 backdrop-blur-md border-b border-white/40 p-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
              selectedCategory === null
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                : 'bg-white/50 backdrop-blur-sm border border-white/60 text-gray-600 hover:bg-white/70 hover:text-gray-800'
            )}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                  : 'bg-white/50 backdrop-blur-sm border border-white/60 text-gray-600 hover:bg-white/70 hover:text-gray-800'
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
                className="flex flex-col items-center rounded-2xl bg-white/30 backdrop-blur-md border border-white/50 p-3 text-center transition-all hover:bg-white/50 hover:shadow-md hover:border-orange-200 shadow-sm"
              >
                <div className="mb-3 w-full aspect-square overflow-hidden rounded-xl bg-gray-100/50 flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Rasm yuklanmasa, placeholder rasm qo'yish
                        const img = e.target as HTMLImageElement;
                        img.onerror = null;
                        img.src = '';
                        img.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Utensils className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <span className="mb-1 font-medium text-sm text-gray-800">{product.name}</span>
                <span className="text-sm text-orange-500 font-semibold">{formatPrice(product.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="flex w-96 flex-col bg-white/50 backdrop-blur-xl border-l border-white/40">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/40 px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-gray-800">Savat</span>
            {getItemCount() > 0 && (
              <span className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-xs font-medium text-white">
                {getItemCount()}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
              <ShoppingCart className="mb-2 h-12 w-12" />
              <p className="font-medium">Savat bo'sh</p>
              <p className="text-sm">Mahsulot qo'shish uchun bosing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{item.product.name}</p>
                    <p className="text-sm text-orange-500">{formatPrice(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 border border-white/80 text-gray-600 hover:bg-white/80 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 border border-white/80 text-gray-600 hover:bg-white/80 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors"
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
          <div className="border-t border-white/40 p-4">
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Mahsulotlar</span>
                <span>{getItemCount()} ta</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-800">
                <span>Jami</span>
                <span className="text-orange-500">{formatPrice(getTotal())}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={handlePlaceOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={18} />
                Buyurtma qo'shish
              </button>
              <button
                onClick={handleGoToPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-orange-500/20"
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

      {/* QR Skaner — POS dan olib tashlandi */}

      {/* Kam qolgan mahsulotlar */}
      <LowStockAlert
        isOpen={showLowStock}
        onClose={() => setShowLowStock(false)}
        items={lowStockItems}
      />
    </div>
  );
}
