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
  TrendingUp,
  ShoppingBag,
  Edit3,
  LayoutDashboard,
  Grid3X3,
  List,
  Eye,
  EyeOff,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Boxes,
  ScanLine,
  Camera,
  Info,
  Tag,
  Loader2,
} from 'lucide-react';
import api from './services/api';
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

function isWaiterRole(role?: string) {
  const r = role?.toLowerCase() || '';
  return ['waiter', 'ofitsiant'].includes(r);
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

  // Admin Dashboard states
  type AdminTab = 'dashboard' | 'products' | 'orders' | 'tables' | 'staff' | 'reports' | 'inventory' | 'settings';
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardPeriod, setDashboardPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', costPrice: '', categoryId: '', description: '', barcode: '', mxikCode: '', stockQuantity: '', weight: '' });
  const [productSaving, setProductSaving] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [mxikLoading, setMxikLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<any>(null);
  const [mxikResult, setMxikResult] = useState<any>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [allOrders, setAllOrders] = useState<any[]>([]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (period: 'today' | 'week' | 'month' | 'year') => {
    setDashboardLoading(true);
    try {
      const { data } = await api.get(`/dashboard?period=${period}`);
      setDashboardData(data.data || data);
    } catch (err) {
      console.error('[Admin] Dashboard yuklashda xatolik:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Fetch admin products
  const fetchAdminProducts = useCallback(async () => {
    try {
      const { data: response } = await api.get('/products', { params: { limit: 500 } });
      setAdminProducts(response.data?.data || response.data || []);
    } catch (err) {
      console.error('[Admin] Mahsulotlarni yuklashda xatolik:', err);
    }
  }, []);

  // Fetch all orders
  const fetchAllOrders = useCallback(async () => {
    try {
      const { data: response } = await api.get('/orders', { params: { limit: 100 } });
      const orders = response.data?.data || response.data || [];
      setAllOrders(Array.isArray(orders) ? orders : []);
    } catch (err) {
      console.error('[Admin] Buyurtmalarni yuklashda xatolik:', err);
    }
  }, []);

  // Admin tab change effect
  useEffect(() => {
    if (!isAuthenticated || !currentShift) return;
    const role = user?.role?.toLowerCase();
    if (!isAdminRole(role)) return;

    if (adminTab === 'dashboard') {
      fetchDashboard(dashboardPeriod);
    } else if (adminTab === 'products') {
      fetchAdminProducts();
    } else if (adminTab === 'orders') {
      fetchAllOrders();
    } else if (adminTab === 'reports') {
      // Reports tab uses the Reports component
    }
  }, [adminTab, dashboardPeriod, isAuthenticated, currentShift, user?.role, fetchDashboard, fetchAdminProducts, fetchAllOrders]);

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

  // Lock tugmasi va overlay (barcha ekranlarda ko'rinadi)
  const lockElements = (
    <>
      {!isLocked && (
        <button
          onClick={() => setIsLocked(true)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full glass-strong border border-white/60 text-gray-500 hover:text-gray-700 hover:bg-white/70 transition-all shadow-lg"
        >
          <Lock size={18} />
        </button>
      )}
      {isLocked && (
        <div
          className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col items-center justify-center cursor-pointer select-none"
          onClick={() => setIsLocked(false)}
        >
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="flex h-24 w-24 items-center justify-center rounded-full glass-strong border-2 border-white/80 shadow-xl">
              <Lock size={40} className="text-gray-500" />
            </div>
            <p className="text-gray-600 text-lg font-medium">Ekran bloklangan</p>
            <p className="text-gray-500 text-sm">Ochish uchun bosing</p>
          </div>
        </div>
      )}
    </>
  );

  // Chef/Kitchen View - dedicated view for kitchen staff
  if (isChefRole(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-green-50">
        {/* Kitchen Header */}
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-md">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Oshxona</span>
              <p className="text-xs text-gray-600">Buyurtmalar paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={16} />
              <span className="text-sm">
                {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl glass-strong border border-white/60 px-3 py-1.5">
              <span className="text-xs font-medium text-gray-700">{user?.name}</span>
              <span className="text-[10px] text-gray-500 capitalize">Oshpaz</span>
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
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card border border-white/60 shadow-lg mb-4">
                  <ChefHat className="h-12 w-12 text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-700">Hozircha buyurtma yo'q</p>
                <p className="text-sm text-gray-500">Yangi buyurtmalar bu yerda ko'rinadi</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className={cn(
                      'glass-card rounded-2xl p-5 transition-all',
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
                          <span className="text-lg font-bold text-gray-900">Stol #{order.tableNumber}</span>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">Olib ketish</span>
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

                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <Timer size={12} />
                      <span>{order.time}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-3 py-2">
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

  // Waiter View - stollarni ko'rish va buyurtma olish
  if (isWaiterRole(userRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-purple-50">
        {lockElements}
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 shadow-md">
              <Utensils className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Ofitsiant</span>
              <p className="text-xs text-gray-600">Stollar va buyurtmalar</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={16} />
              <span className="text-sm">
                {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button
              onClick={() => setShowOrderTypeModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={16} />
              Yangi buyurtma
            </button>
            <div className="flex items-center gap-2 rounded-xl glass-card px-2.5 py-1">
              <span className="text-xs font-medium text-gray-700">{user?.name}</span>
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

        {/* Order Type Modal */}
        {showOrderTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl glass-strong p-6 shadow-2xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Buyurtma turini tanlang</h3>
              <div className="space-y-3">
                <button
                  onClick={() => { setShowOrderTypeModal(false); handleSelectOrderType('takeaway'); }}
                  className="relative flex w-full items-center gap-4 rounded-xl border-2 border-purple-200/60 bg-purple-50/50 p-4 transition-all hover:border-purple-400"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                    <Package className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-gray-900">Olib ketish</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowOrderTypeModal(false); setOrderType('dine-in'); }}
                  className="relative flex w-full items-center gap-4 rounded-xl border-2 border-orange-200/60 bg-orange-50/50 p-4 transition-all hover:border-orange-400"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
                    <Utensils className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-gray-900">Shu yerda</p>
                  </div>
                </button>
              </div>
              <button onClick={() => setShowOrderTypeModal(false)} className="mt-4 w-full rounded-xl glass-card py-3 text-gray-600 hover:text-gray-900 transition-colors">
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="mx-auto max-w-6xl">
            {/* Stol tanlash - dine-in tanlanganda */}
            {orderType === 'dine-in' && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Stol tanlang</h2>
                <div className="grid grid-cols-4 gap-4">
                  {tables.map((table) => {
                    const isFree = table.status === 'free';
                    const isSelected = selectedTable?.id === table.id;
                    return (
                      <button key={table.id} onClick={() => isFree && setSelectedTable(table)} disabled={!isFree}
                        className={cn('flex flex-col items-center rounded-2xl border-2 p-6 transition-all shadow-md',
                          isFree ? isSelected ? 'border-purple-400 bg-purple-50/50' : 'glass-card hover:border-purple-300'
                          : 'border-red-200/60 bg-red-50/40 cursor-not-allowed'
                        )}>
                        <span className={cn('text-3xl font-bold', isFree ? (isSelected ? 'text-purple-500' : 'text-gray-900') : 'text-gray-500')}>#{table.number}</span>
                        <span className="text-sm text-gray-600 flex items-center gap-1 mt-1"><Users size={12} />{table.capacity}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedTable && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => handleSelectOrderType('dine-in', selectedTable)}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 px-8 py-3 font-semibold text-white shadow-md hover:shadow-lg transition-all">
                      Davom etish <Check size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Faol buyurtmalar */}
            <h2 className="text-xl font-bold text-gray-900 mb-4">Faol buyurtmalar</h2>
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card shadow-lg mb-4">
                  <Utensils className="h-12 w-12 text-gray-500" />
                </div>
                <p className="text-lg font-medium text-gray-700">Hozircha buyurtma yo'q</p>
                <p className="text-sm text-gray-600">Yangi buyurtma qo'shish uchun tugmani bosing</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOrders.map((order) => (
                  <div key={order.orderId}
                    className={cn('rounded-2xl border p-5 shadow-lg transition-all',
                      order.status === 'READY' ? 'bg-green-50/60 border-green-200/60' : 'glass-card'
                    )}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-gray-900">
                        {order.tableNumber > 0 ? `Stol #${order.tableNumber}` : 'Olib ketish'}
                      </span>
                      <div className={cn('rounded-full px-3 py-1 text-xs font-medium',
                        order.status === 'NEW' ? 'bg-orange-500/10 text-orange-600' :
                        order.status === 'PREPARING' ? 'bg-yellow-500/10 text-yellow-700' :
                        order.status === 'READY' ? 'bg-green-500/10 text-green-600' :
                        'bg-blue-500/10 text-blue-600'
                      )}>
                        {order.status === 'NEW' && 'Yangi'}
                        {order.status === 'CONFIRMED' && 'Tasdiqlangan'}
                        {order.status === 'PREPARING' && 'Tayyorlanmoqda'}
                        {order.status === 'READY' && 'Tayyor!'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{order.items} ta mahsulot • {formatPrice(order.total)}</div>
                    {order.status === 'READY' && (
                      <div className="flex items-center gap-2 rounded-xl bg-green-100/60 border border-green-200/60 py-2 px-3 text-sm font-medium text-green-600">
                        <CheckCircle size={16} />
                        Mijozga olib boring!
                      </div>
                    )}
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

  // Order Detail Step - Faol stol buyurtmalarini ko'rsatish
  if (currentStep === 'order-detail' && currentOrder && selectedTable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
        {lockElements}
        {/* Header */}
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg glass-strong border border-white/60 text-gray-600 hover:text-gray-900 hover:bg-white/70 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">Stol #{selectedTable.number}</span>
              <p className="text-xs text-gray-600">{currentOrder.time} dan</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} />
            <span className="text-sm">
              {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        <div className="p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Buyurtma ma'lumotlari */}
            <div className="rounded-2xl glass-card border border-white/60 shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Buyurtma tafsilotlari</h2>
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
                    className="flex items-center justify-between rounded-xl glass-strong border border-white/60 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                        <Utensils className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-sm text-gray-600">{formatPrice(item.product.price)} x {item.quantity}</p>
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
                <div className="flex justify-between text-gray-600">
                  <span>Mahsulotlar soni:</span>
                  <span className="font-medium">{getItemCount()} ta</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-gray-900">
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
    // ============ ADMIN DASHBOARD ============
    if (isAdminRole(userRole)) {
      const adminTabs: { id: AdminTab; label: string; icon: any }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'products', label: 'Mahsulotlar', icon: Package },
        { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag },
        { id: 'tables', label: 'Stollar', icon: Grid3X3 },
        { id: 'staff', label: 'Xodimlar', icon: Users },
        { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
        { id: 'inventory', label: 'Ombor', icon: Boxes },
        { id: 'settings', label: 'Sozlamalar', icon: Settings },
      ];

      const handleProductSave = async () => {
        if (!productForm.name || !productForm.price) return;
        setProductSaving(true);
        try {
          const payload: any = {
            name: productForm.name,
            price: parseFloat(productForm.price),
            costPrice: productForm.costPrice ? parseFloat(productForm.costPrice) : undefined,
            categoryId: productForm.categoryId || undefined,
            description: productForm.description || undefined,
            barcode: productForm.barcode || undefined,
            mxikCode: productForm.mxikCode || undefined,
            stockQuantity: productForm.stockQuantity ? parseInt(productForm.stockQuantity) : undefined,
            weight: productForm.weight || undefined,
          };
          if (editingProduct) {
            await api.put(`/products/${editingProduct.id}`, payload);
          } else {
            await api.post('/products', payload);
          }
          setShowProductModal(false);
          setEditingProduct(null);
          setProductForm({ name: '', price: '', costPrice: '', categoryId: '', description: '', barcode: '', mxikCode: '', stockQuantity: '', weight: '' });
          setBarcodeResult(null);
          setMxikResult(null);
          fetchAdminProducts();
          fetchData(); // refresh main products list too
        } catch (err) {
          console.error('[Admin] Mahsulot saqlashda xatolik:', err);
          alert('Xatolik! Mahsulot saqlanmadi.');
        } finally {
          setProductSaving(false);
        }
      };

      const handleProductDelete = async (id: string) => {
        if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
        try {
          await api.delete(`/products/${id}`);
          fetchAdminProducts();
          fetchData();
        } catch (err) {
          console.error('[Admin] Mahsulot o\'chirishda xatolik:', err);
          alert("Xatolik! Mahsulot o'chirilmadi.");
        }
      };

      const openEditProduct = (product: any) => {
        setEditingProduct(product);
        setProductForm({
          name: product.name || '',
          price: String(product.price || ''),
          costPrice: String(product.costPrice || ''),
          categoryId: product.categoryId || '',
          description: product.description || '',
          barcode: product.barcode || '',
          mxikCode: product.mxikCode || '',
          stockQuantity: String(product.stockQuantity || ''),
          weight: String(product.weight || ''),
        });
        setBarcodeResult(null);
        setMxikResult(null);
        setShowProductModal(true);
      };

      const openNewProduct = () => {
        setEditingProduct(null);
        setProductForm({ name: '', price: '', costPrice: '', categoryId: '', description: '', barcode: '', mxikCode: '', stockQuantity: '', weight: '' });
        setBarcodeResult(null);
        setMxikResult(null);
        setShowProductModal(true);
      };

      const filteredAdminProducts = adminProducts.filter((p: any) => {
        const matchesSearch = adminProductSearch ? p.name?.toLowerCase().includes(adminProductSearch.toLowerCase()) : true;
        const matchesCategory = selectedCategoryFilter === 'all' ? true : p.categoryId === selectedCategoryFilter;
        return matchesSearch && matchesCategory;
      });

      const statusBadge = (status: string) => {
        const map: Record<string, { bg: string; text: string; label: string }> = {
          'NEW': { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Yangi' },
          'CONFIRMED': { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Tasdiqlangan' },
          'PREPARING': { bg: 'bg-yellow-500/10', text: 'text-yellow-700', label: 'Tayyorlanmoqda' },
          'READY': { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Tayyor' },
          'COMPLETED': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Yakunlangan' },
          'CANCELLED': { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Bekor qilingan' },
        };
        const s = map[status] || { bg: 'bg-gray-500/10', text: 'text-gray-600', label: status };
        return <span className={cn('rounded-full px-3 py-1 text-xs font-medium', s.bg, s.text)}>{s.label}</span>;
      };

      return (
        <div className="flex h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
          {lockElements}

          {/* ===== LEFT SIDEBAR ===== */}
          <aside className={cn(
            'flex flex-col bg-slate-900 text-white transition-all duration-300 shrink-0',
            adminSidebarCollapsed ? 'w-[72px]' : 'w-[250px]'
          )}>
            {/* Sidebar Header */}
            <div className="flex h-16 items-center gap-3 px-4 border-b border-white/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
                <UtensilsCrossed className="h-4 w-4 text-white" />
              </div>
              {!adminSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{bizSettings?.name || 'Oshxona POS'}</p>
                  <p className="text-[10px] text-slate-400">Admin Panel</p>
                </div>
              )}
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = adminTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAdminTab(tab.id)}
                    title={adminSidebarCollapsed ? tab.label : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!adminSidebarCollapsed && <span className="truncate">{tab.label}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="border-t border-white/10 p-3 space-y-2">
              {/* Low stock alert */}
              {lowStockItems.length > 0 && !adminSidebarCollapsed && (
                <button
                  onClick={() => setShowLowStock(true)}
                  className="flex w-full items-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                >
                  <AlertTriangle size={14} className="shrink-0" />
                  <span className="truncate">Kam qoldi: {lowStockItems.length}</span>
                </button>
              )}
              {lowStockItems.length > 0 && adminSidebarCollapsed && (
                <button
                  onClick={() => setShowLowStock(true)}
                  title={`Kam qoldi: ${lowStockItems.length}`}
                  className="flex w-full items-center justify-center rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-2 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                >
                  <AlertTriangle size={16} />
                </button>
              )}

              {/* Integration button */}
              {!adminSidebarCollapsed && (
                <button
                  onClick={() => setShowIntegrationHub(true)}
                  className="flex w-full items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Store size={14} className="shrink-0" />
                  <span className="truncate">Integratsiyalar</span>
                  {activeIntegrations > 0 && (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
                      {activeIntegrations}
                    </span>
                  )}
                </button>
              )}

              {/* User info */}
              <div className={cn(
                'flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2',
                adminSidebarCollapsed && 'justify-center px-2'
              )}>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                {!adminSidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate text-slate-300">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                  </div>
                )}
                <button
                  onClick={() => { logout(); localStorage.removeItem('pos-auth'); }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                  title="Chiqish"
                >
                  <LogOut size={13} />
                </button>
              </div>

              {/* Collapse toggle */}
              <button
                onClick={() => setAdminSidebarCollapsed(!adminSidebarCollapsed)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs text-slate-500 hover:bg-white/10 hover:text-white transition-colors"
              >
                {adminSidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
                {!adminSidebarCollapsed && <span>Yopish</span>}
              </button>
            </div>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <header className="flex h-14 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm shrink-0">
              <h1 className="text-lg font-bold text-gray-900">
                {adminTabs.find(t => t.id === adminTab)?.label || 'Dashboard'}
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Clock size={14} />
                  <span>
                    {new Date().toLocaleDateString('uz-UZ', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })} {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </header>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-7xl">

              {/* ====== TAB 1: DASHBOARD ====== */}
              {adminTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Period selector */}
                  <div className="flex items-center gap-2">
                    {([
                      { id: 'today' as const, label: 'Bugun' },
                      { id: 'week' as const, label: 'Hafta' },
                      { id: 'month' as const, label: 'Oy' },
                      { id: 'year' as const, label: 'Yil' },
                    ]).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setDashboardPeriod(p.id)}
                        className={cn(
                          'rounded-xl px-4 py-2 text-sm font-medium transition-all',
                          dashboardPeriod === p.id
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                            : 'glass-strong border border-white/60 text-gray-700 hover:bg-white/70'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                    {dashboardLoading && (
                      <span className="ml-2 text-sm text-gray-500">Yuklanmoqda...</span>
                    )}
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Daromad</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.revenue != null ? formatPrice(dashboardData.revenue) : '--'}
                      </p>
                    </div>

                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                          <ShoppingBag className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Buyurtmalar soni</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.orderCount ?? '--'}
                      </p>
                    </div>

                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                          <DollarSign className="h-5 w-5 text-orange-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">O'rtacha chek</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.avgCheck != null ? formatPrice(dashboardData.avgCheck) : '--'}
                      </p>
                    </div>

                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">Yakunlangan</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData?.completedOrders ?? '--'}
                      </p>
                    </div>
                  </div>

                  {/* Two column layout: top products + recent orders */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products */}
                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 mahsulotlar</h3>
                      {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.topProducts.slice(0, 5).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-600">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-gray-900">{item.name || item.productName || 'Noma\'lum'}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900">{item.quantity || item.count || 0} ta</p>
                                {item.revenue != null && <p className="text-xs text-gray-500">{formatPrice(item.revenue)}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-8">Ma'lumot yo'q</p>
                      )}
                    </div>

                    {/* Recent Orders */}
                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">So'nggi 5 buyurtma</h3>
                      {dashboardData?.recentOrders && dashboardData.recentOrders.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.recentOrders.slice(0, 5).map((order: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                                  <ShoppingBag className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {order.table?.number ? `Stol #${order.table.number}` : order.type === 'TAKEAWAY' ? 'Olib ketish' : `#${(order.id || '').slice(-6)}`}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-orange-500">{formatPrice(order.total || 0)}</p>
                                {statusBadge(order.status || 'NEW')}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-8">Ma'lumot yo'q</p>
                      )}
                    </div>
                  </div>

                  {/* Orders by Status */}
                  {dashboardData?.ordersByStatus && (
                    <div className="glass-card rounded-2xl border border-white/60 p-5 shadow-lg">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Buyurtmalar holati</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.entries(dashboardData.ordersByStatus).map(([status, count]: [string, any]) => (
                          <div key={status} className="rounded-xl glass-strong border border-white/60 p-3 text-center">
                            {statusBadge(status)}
                            <p className="mt-2 text-2xl font-bold text-gray-900">{count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ====== TAB 2: PRODUCTS ====== */}
              {adminTab === 'products' && (
                <div className="space-y-5">
                  {/* Top Bar: Search + Add Button + Count */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Mahsulot qidirish..."
                          value={adminProductSearch}
                          onChange={(e) => setAdminProductSearch(e.target.value)}
                          className="w-full rounded-xl bg-white/80 border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:outline-none transition-all"
                        />
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600">
                        <Package size={13} />
                        {filteredAdminProducts.length} ta
                      </span>
                    </div>
                    <button
                      onClick={openNewProduct}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all"
                    >
                      <Plus size={16} />
                      Yangi mahsulot
                    </button>
                  </div>

                  {/* Category Filter Cards */}
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium border-2 whitespace-nowrap transition-all shrink-0',
                        selectedCategoryFilter === 'all'
                          ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                          : 'border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300 hover:bg-white'
                      )}
                    >
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        selectedCategoryFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                      )}>
                        <Grid3X3 size={15} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-xs">Barchasi</div>
                        <div className="text-[10px] opacity-70">{adminProducts.length} ta</div>
                      </div>
                    </button>
                    {categories.map((cat) => {
                      const count = adminProducts.filter((p: any) => p.categoryId === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategoryFilter(cat.id)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium border-2 whitespace-nowrap transition-all shrink-0',
                            selectedCategoryFilter === cat.id
                              ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                              : 'border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300 hover:bg-white'
                          )}
                        >
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                            selectedCategoryFilter === cat.id ? 'bg-orange-500 text-white' : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
                          )}>
                            {cat.icon ? cat.icon : cat.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-xs">{cat.name}</div>
                            <div className="text-[10px] opacity-70">{count} ta</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Product Cards Grid */}
                  {filteredAdminProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <Package size={48} className="mb-3 opacity-40" />
                      <p className="text-lg font-medium">Mahsulot topilmadi</p>
                      <p className="text-sm mt-1">Qidiruv yoki kategoriya filtrini o'zgartiring</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredAdminProducts.map((product: any) => {
                        const cat = categories.find((c) => c.id === product.categoryId);
                        return (
                          <div
                            key={product.id}
                            className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                          >
                            {/* Product Image / Placeholder */}
                            <div className="relative h-36 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 flex items-center justify-center overflow-hidden">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <UtensilsCrossed size={36} className="text-orange-300" />
                              )}
                              {/* Status Badge */}
                              <div className="absolute top-2 right-2">
                                {product.isActive !== false ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                                    <Eye size={10} /> Faol
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-400 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                                    <EyeOff size={10} /> Nofaol
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-3.5">
                              <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{product.name}</h4>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{cat?.name || 'Kategoriyasiz'}</p>

                              <div className="flex items-baseline gap-2 mt-2">
                                <span className="text-orange-500 font-bold text-sm">{formatPrice(product.price)}</span>
                                {product.costPrice && (
                                  <span className="text-gray-400 text-[11px] line-through">{formatPrice(product.costPrice)}</span>
                                )}
                              </div>

                              {product.barcode && (
                                <p className="text-[10px] text-gray-400 mt-1.5 font-mono bg-gray-50 rounded px-1.5 py-0.5 inline-block">{product.barcode}</p>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => openEditProduct(product)}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-blue-600 py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors"
                                  title="Tahrirlash"
                                >
                                  <Edit3 size={13} /> Tahrirlash
                                </button>
                                <button
                                  onClick={() => handleProductDelete(product.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
                                  title="O'chirish"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ===== Product Add/Edit Modal ===== */}
                  {showProductModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowProductModal(false); setEditingProduct(null); }}>
                      <div
                        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 shadow-2xl mx-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
                          <h3 className="text-xl font-bold text-gray-900">
                            {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
                          </h3>
                          <button
                            onClick={() => { setShowProductModal(false); setEditingProduct(null); }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="p-6 space-y-5">
                          {/* Barcode Section */}
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                              <ScanLine size={16} className="text-orange-500" />
                              Shtrix kod (Barcode)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={productForm.barcode}
                                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                                placeholder="Shtrix kodni kiriting yoki skanerlang..."
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none font-mono"
                              />
                              <button
                                onClick={async () => {
                                  if (!productForm.barcode) return;
                                  setBarcodeLoading(true);
                                  setBarcodeResult(null);
                                  try {
                                    const { data } = await api.get('/mxik/scan/' + productForm.barcode);
                                    setBarcodeResult(data.data || data);
                                    if (data.data?.name || data.name) {
                                      setProductForm((prev: any) => ({ ...prev, name: prev.name || data.data?.name || data.name || '' }));
                                    }
                                  } catch (err) {
                                    setBarcodeResult({ error: true, message: 'Mahsulot topilmadi' });
                                  } finally {
                                    setBarcodeLoading(false);
                                  }
                                }}
                                disabled={!productForm.barcode || barcodeLoading}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                              >
                                {barcodeLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                Qidirish
                              </button>
                            </div>
                            {/* Barcode Result */}
                            {barcodeResult && !barcodeResult.error && (
                              <div className="mt-3 flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                                {barcodeResult.image && (
                                  <img src={barcodeResult.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-blue-800">{barcodeResult.name || barcodeResult.product_name || 'Nomi topildi'}</p>
                                  {barcodeResult.brand && <p className="text-xs text-blue-600 mt-0.5">Brend: {barcodeResult.brand}</p>}
                                  {barcodeResult.description && <p className="text-xs text-blue-500 mt-0.5 truncate">{barcodeResult.description}</p>}
                                </div>
                                <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                              </div>
                            )}
                            {barcodeResult && barcodeResult.error && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-600">
                                <AlertTriangle size={14} />
                                {barcodeResult.message || 'Mahsulot topilmadi'}
                              </div>
                            )}
                          </div>

                          {/* Product Name */}
                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Mahsulot nomi *</label>
                            <input
                              type="text"
                              value={productForm.name}
                              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                              placeholder="Mahsulot nomini kiriting"
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                            />
                          </div>

                          {/* Price & Cost Price */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Narxi (so'm) *</label>
                              <input
                                type="number"
                                value={productForm.price}
                                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                placeholder="0"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tannarxi (so'm)</label>
                              <input
                                type="number"
                                value={productForm.costPrice}
                                onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                                placeholder="0"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Category */}
                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Kategoriya</label>
                            <select
                              value={productForm.categoryId}
                              onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                            >
                              <option value="">Kategoriyani tanlang...</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Description */}
                          <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tavsif</label>
                            <textarea
                              value={productForm.description}
                              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                              placeholder="Qisqacha tavsif (ixtiyoriy)..."
                              rows={2}
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none"
                            />
                          </div>

                          {/* MXIK Section */}
                          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                              <Tag size={16} className="text-blue-500" />
                              MXIK kodi (Soliq tasnifi)
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={productForm.mxikCode}
                                onChange={(e) => setProductForm({ ...productForm, mxikCode: e.target.value })}
                                placeholder="MXIK kodni kiriting..."
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-mono"
                              />
                              <button
                                onClick={async () => {
                                  if (!productForm.mxikCode) return;
                                  setMxikLoading(true);
                                  setMxikResult(null);
                                  try {
                                    const { data } = await api.get('/mxik/lookup/' + productForm.mxikCode);
                                    setMxikResult(data.data || data);
                                  } catch (err) {
                                    setMxikResult({ error: true, message: 'Tasnif soliq bazasida topilmadi' });
                                  } finally {
                                    setMxikLoading(false);
                                  }
                                }}
                                disabled={!productForm.mxikCode || mxikLoading}
                                className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                              >
                                {mxikLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Tekshirish
                              </button>
                              <button
                                onClick={async () => {
                                  if (!productForm.name) return;
                                  setMxikLoading(true);
                                  setMxikResult(null);
                                  try {
                                    const { data } = await api.get('/mxik/search?q=' + encodeURIComponent(productForm.name));
                                    setMxikResult(data.data || data);
                                  } catch (err) {
                                    setMxikResult({ error: true, message: 'Qidirishda xatolik' });
                                  } finally {
                                    setMxikLoading(false);
                                  }
                                }}
                                disabled={!productForm.name || mxikLoading}
                                className="flex items-center gap-1.5 rounded-xl bg-gray-600 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                              >
                                <Search size={14} />
                                Qidirish
                              </button>
                            </div>
                            {/* MXIK Result */}
                            {mxikResult && !mxikResult.error && (
                              <div className="mt-3 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                                <Info size={16} className="text-blue-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-mono text-blue-700">{mxikResult.code || mxikResult.mxikCode || productForm.mxikCode}</p>
                                  <p className="text-sm font-medium text-blue-800 mt-0.5">{mxikResult.name || mxikResult.groupName || 'Tasnif topildi'}</p>
                                </div>
                              </div>
                            )}
                            {mxikResult && mxikResult.error && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-600">
                                <AlertTriangle size={14} />
                                {mxikResult.message || 'Tasnif soliq bazasida topilmadi'}
                              </div>
                            )}
                          </div>

                          {/* Stock & Weight */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Ombordagi miqdor</label>
                              <input
                                type="number"
                                value={productForm.stockQuantity}
                                onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                                placeholder="0"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Og'irlik / Hajm</label>
                              <input
                                type="text"
                                value={productForm.weight}
                                onChange={(e) => setProductForm({ ...productForm, weight: e.target.value })}
                                placeholder="Masalan: 500g, 1L"
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                              />
                            </div>
                          </div>

                          {/* Image Preview from barcode lookup */}
                          {barcodeResult && !barcodeResult.error && barcodeResult.image && (
                            <div className="flex items-center gap-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                              <img src={barcodeResult.image} alt="Mahsulot rasmi" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">Barcode orqali topilgan rasm</p>
                                <p className="text-xs text-gray-400 mt-0.5">Rasm avtomatik saqlangan</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3">
                          <button
                            onClick={() => { setShowProductModal(false); setEditingProduct(null); }}
                            className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            Bekor qilish
                          </button>
                          <button
                            onClick={handleProductSave}
                            disabled={!productForm.name || !productForm.price || productSaving}
                            className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {productSaving ? 'Saqlanmoqda...' : editingProduct ? 'Saqlash' : 'Qo\'shish'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ====== TAB 3: ORDERS ====== */}
              {adminTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Barcha buyurtmalar</h2>
                    <button
                      onClick={fetchAllOrders}
                      className="flex items-center gap-2 rounded-xl glass-strong border border-white/60 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white/70 transition-colors"
                    >
                      <List size={16} />
                      Yangilash
                    </button>
                  </div>

                  {/* Active orders (view only for admin) */}
                  {activeOrders.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Faol buyurtmalar</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeOrders.map((order) => (
                          <div
                            key={order.orderId}
                            className={cn(
                              'relative flex flex-col glass-card rounded-2xl border-2 p-4 shadow-lg',
                              order.awaitingPayment
                                ? 'border-yellow-300/50'
                                : 'border-orange-200/50'
                            )}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-lg',
                                  order.awaitingPayment ? 'bg-yellow-500/10' : 'bg-orange-500/10'
                                )}>
                                  {order.awaitingPayment ? <DollarSign className="h-5 w-5 text-yellow-600" /> : <Utensils className="h-5 w-5 text-orange-500" />}
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-gray-900">
                                    {order.tableNumber > 0 ? `Stol #${order.tableNumber}` : 'Olib ketish'}
                                  </p>
                                  <p className="text-xs text-gray-600">{order.time}</p>
                                </div>
                              </div>
                              {statusBadge(order.status)}
                            </div>
                            {/* Show order items */}
                            <div className="space-y-1 mb-3">
                              {order.orderItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                                  <span>{item.name}</span>
                                  <span className="font-medium">x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-sm border-t border-gray-200/60 pt-2">
                              <span className="text-gray-600">{order.items} ta mahsulot</span>
                              <span className="text-lg font-bold text-orange-500">{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All orders from API */}
                  {allOrders.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Barcha buyurtmalar tarixi</h3>
                      <div className="glass-card rounded-2xl border border-white/60 shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/40 glass-strong">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Turi</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stol</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mahsulotlar</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Summa</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Holat</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vaqt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allOrders.map((order: any) => (
                                <tr key={order.id} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                                  <td className="px-5 py-3 text-sm font-mono text-gray-600">#{(order.id || '').slice(-6)}</td>
                                  <td className="px-5 py-3 text-sm text-gray-700">{order.type === 'DINE_IN' ? 'Shu yerda' : order.type === 'TAKEAWAY' ? 'Olib ketish' : order.type || '-'}</td>
                                  <td className="px-5 py-3 text-sm text-gray-700">{order.table?.number ? `#${order.table.number}` : '-'}</td>
                                  <td className="px-5 py-3 text-sm text-gray-700">{order.items?.length || 0} ta</td>
                                  <td className="px-5 py-3 text-sm font-semibold text-orange-500">{formatPrice(order.total || 0)}</td>
                                  <td className="px-5 py-3">{statusBadge(order.status || 'NEW')}</td>
                                  <td className="px-5 py-3 text-sm text-gray-600">
                                    {order.createdAt ? new Date(order.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeOrders.length === 0 && allOrders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl glass-card border border-white/60 shadow-lg mb-4">
                        <ShoppingBag className="h-12 w-12 text-gray-500" />
                      </div>
                      <p className="text-lg font-medium text-gray-700">Buyurtmalar yo'q</p>
                      <p className="text-sm text-gray-500">Hozircha buyurtmalar yo'q</p>
                    </div>
                  )}
                </div>
              )}

              {/* ====== TAB 4: TABLES (view only for admin) ====== */}
              {adminTab === 'tables' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Stollar</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-green-500"></span>
                        <span className="text-gray-600">Bo'sh ({tables.filter(t => t.status === 'free').length})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-red-500"></span>
                        <span className="text-gray-600">Band ({tables.filter(t => t.status === 'occupied').length})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                        <span className="text-gray-600">Bron ({tables.filter(t => t.status === 'reserved').length})</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {tables.map((table) => {
                      const isFree = table.status === 'free';
                      const tableOrder = activeOrders.find(o => o.tableId === table.id);
                      return (
                        <div
                          key={table.id}
                          className={cn(
                            'glass-card relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all',
                            isFree
                              ? 'border-green-200/60 bg-green-50/30'
                              : table.status === 'occupied'
                              ? 'border-red-200/60 bg-red-50/30'
                              : 'border-yellow-200/60 bg-yellow-50/30'
                          )}
                        >
                          <span className={cn(
                            'text-3xl font-bold',
                            isFree ? 'text-green-600' : table.status === 'occupied' ? 'text-red-500' : 'text-yellow-600'
                          )}>
                            #{table.number}
                          </span>
                          <span className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Users size={12} />
                            {table.capacity}
                          </span>
                          {tableOrder && (
                            <div className="mt-2 text-center">
                              <p className="text-xs font-semibold text-orange-500">{formatPrice(tableOrder.total)}</p>
                              {statusBadge(tableOrder.status)}
                            </div>
                          )}
                          {table.status !== 'free' && !tableOrder && (
                            <span className={cn(
                              'absolute -top-1 -right-1 flex h-5 items-center rounded-full px-2 text-[10px] font-medium text-white',
                              table.status === 'occupied' ? 'bg-red-500' : 'bg-yellow-500'
                            )}>
                              {table.status === 'occupied' ? 'Band' : 'Bron'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ====== TAB 5: STAFF ====== */}
              {adminTab === 'staff' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Xodimlar</h2>
                  </div>
                  <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-8">
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass-strong border border-white/60 shadow-lg mb-4">
                        <Users className="h-10 w-10 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-700">Xodimlar bo'limi</p>
                      <p className="text-sm text-gray-500 mt-1">Tez orada xodimlar boshqaruvi qo'shiladi</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ====== TAB 6: REPORTS ====== */}
              {adminTab === 'reports' && (
                <Reports onBack={() => setAdminTab('dashboard')} />
              )}

              {/* ====== TAB 7: INVENTORY ====== */}
              {adminTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Ombor</h2>
                  </div>
                  {lowStockItems.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-yellow-700 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Kam qolgan mahsulotlar ({lowStockItems.length})
                      </h3>
                      <div className="glass-card rounded-2xl border border-white/60 shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-white/40 glass-strong">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mahsulot</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Joriy miqdor</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Minimal miqdor</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Holat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lowStockItems.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                                  <td className="px-5 py-3 font-medium text-gray-900">{item.name || item.productName || 'Noma\'lum'}</td>
                                  <td className="px-5 py-3 text-sm text-red-500 font-semibold">{item.currentStock ?? item.quantity ?? 0}</td>
                                  <td className="px-5 py-3 text-sm text-gray-600">{item.minStock ?? item.minimumStock ?? '-'}</td>
                                  <td className="px-5 py-3">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">
                                      <AlertCircle size={12} /> Kam
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-8">
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl glass-strong border border-white/60 shadow-lg mb-4">
                          <Boxes className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-700">Ombor holati yaxshi</p>
                        <p className="text-sm text-gray-500 mt-1">Barcha mahsulotlar yetarli miqdorda</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ====== TAB 8: SETTINGS ====== */}
              {adminTab === 'settings' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Sozlamalar</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Business info */}
                    <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Biznes ma'lumotlari</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center rounded-xl glass-strong border border-white/60 px-4 py-3">
                          <span className="text-sm text-gray-600">Nomi</span>
                          <span className="text-sm font-medium text-gray-900">{bizSettings?.name || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center rounded-xl glass-strong border border-white/60 px-4 py-3">
                          <span className="text-sm text-gray-600">Manzil</span>
                          <span className="text-sm font-medium text-gray-900">{bizSettings?.address || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center rounded-xl glass-strong border border-white/60 px-4 py-3">
                          <span className="text-sm text-gray-600">Telefon</span>
                          <span className="text-sm font-medium text-gray-900">{bizSettings?.phone || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrations */}
                    <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Integratsiyalar</h3>
                      <button
                        onClick={() => setShowIntegrationHub(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Store size={16} />
                        Integratsiyalarni boshqarish
                        {activeIntegrations > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold">
                            {activeIntegrations}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              </div>
            </div>
          </div>

          {/* Integratsiya markazi */}
          <IntegrationHub
            isOpen={showIntegrationHub}
            onClose={() => setShowIntegrationHub(false)}
            onStatusChange={() => fetchData()}
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

    // ============ NON-ADMIN (Cashier) ORDER TYPE VIEW ============
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
        {lockElements}
        {/* Header */}
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{bizSettings?.name || 'Oshxona POS'}</span>
            <div className="ml-3 flex items-center gap-2 rounded-xl glass-strong border border-white/60 px-2.5 py-1">
              <span className="text-xs font-medium text-gray-700">{user?.name}</span>
              <span className="text-[10px] text-gray-500 capitalize">({user?.role?.replace('_', ' ')})</span>
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
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={16} />
              <span className="text-sm">
                {new Date().toLocaleDateString('uz-UZ', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })} {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {(isCashierRole(userRole) || isWaiterRole(userRole)) && (
              <button
                onClick={() => setShowOrderTypeModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={16} />
                Buyurtma berish
              </button>
            )}
          </div>
        </header>

        {/* Order Type Modal */}
        {showOrderTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl glass-strong border border-white/60 p-6 shadow-2xl">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Buyurtma turini tanlang</h3>
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
                    <p className="text-lg font-bold text-gray-900">Olib ketish</p>
                    <p className="text-sm font-semibold text-gray-600">O'zi olib ketadi</p>
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
                    <p className="text-lg font-bold text-gray-900">Shu yerda</p>
                    <p className="text-sm font-semibold text-gray-600">Stolda ovqatlanish</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowOrderTypeModal(false)}
                className="mt-6 w-full rounded-xl glass-strong border border-white/60 py-3 text-gray-600 transition-colors hover:bg-white/70 hover:text-gray-900"
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
                        <h2 className="text-xl font-bold text-gray-900">To'lov kutayotgan stollar</h2>
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
                            className="group relative flex flex-col glass-card rounded-2xl border-2 border-yellow-300/50 p-4 transition-all hover:border-yellow-400 hover:bg-yellow-100/50 shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                                  <DollarSign className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div className="text-left">
                                  <p className="text-lg font-bold text-gray-900">
                                    Stol #{order.tableNumber}
                                  </p>
                                  <p className="text-xs text-gray-600">{order.time}</p>
                                </div>
                              </div>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 animate-pulse">
                                <AlertCircle size={14} className="text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{order.items} ta mahsulot</span>
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
                      <h2 className="text-xl font-bold text-gray-900">Ochiq stollar</h2>
                      <span className="text-sm text-gray-600">
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
                            className="group relative flex flex-col rounded-2xl border-2 border-orange-200/50 glass-card p-4 transition-all hover:border-orange-400 hover:bg-orange-50/50 shadow-lg"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                                  <Utensils className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="text-left">
                                  <p className="text-lg font-bold text-gray-900">
                                    Stol #{order.tableNumber}
                                  </p>
                                  <p className="text-xs text-gray-600">{order.time}</p>
                                </div>
                              </div>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 animate-pulse">
                                <Clock size={14} className="text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{order.items} ta mahsulot</span>
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
                  <h2 className="text-xl font-bold text-gray-900">Stol tanlang</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-green-500"></span>
                      <span className="text-gray-600">Bo'sh</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-500"></span>
                      <span className="text-gray-600">Band</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                      <span className="text-gray-600">Bron</span>
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
                          'glass-card relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all',
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
                          isFree ? (isSelected ? 'text-orange-500' : 'text-gray-900') : 'text-gray-500'
                        )}>
                          #{table.number}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1 mt-1">
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
          <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">QR To'lov</span>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <div className="rounded-2xl glass-card border border-white/60 shadow-lg p-8 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {paymentMethod === 'payme' && "Payme orqali to'lash"}
                  {paymentMethod === 'click' && "Click orqali to'lash"}
                  {paymentMethod === 'uzum' && "Uzum orqali to'lash"}
                </h3>
                <p className="text-gray-600 mb-6">QR kodni skanerlang</p>

                <div className="mb-6 p-4 rounded-xl glass-strong border border-white/60">
                  <p className="text-sm font-semibold text-gray-600">To'lov summasi</p>
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl glass-strong border border-white/60 py-3 text-gray-600 hover:text-gray-900 hover:bg-white/70 transition-colors"
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
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">To'lov</span>
          </div>
          <div className="text-gray-600">
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
            <div className="rounded-2xl glass-card border border-white/60 shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Buyurtma xulosasi</h3>
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
                <div className="mb-4 space-y-3 rounded-xl glass-strong border border-white/60 p-4">
                  {/* Discount */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Chegirma
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={discount || ''}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="flex-1 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        onClick={() =>
                          setDiscountType(discountType === 'percent' ? 'fixed' : 'percent')
                        }
                        className={`flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          discountType === 'percent'
                            ? 'border-orange-400 bg-orange-50 text-orange-500'
                            : 'border-gray-200 bg-white/70 text-gray-600 hover:text-gray-900'
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
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Servis haq (%)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={serviceCharge || ''}
                        onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        max="100"
                        className="flex-1 rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none"
                      />
                      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white/70 px-4 text-gray-600">
                        %
                      </div>
                    </div>
                  </div>

                  {/* Remove Item */}
                  {items.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Mahsulotni o'chirish
                      </label>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <button
                            key={item.product.id}
                            onClick={() => removeItem(item.product.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white/70 p-2 text-sm hover:bg-red-50 hover:border-red-300 transition-colors group"
                          >
                            <span className="text-gray-900">{item.product.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">x{item.quantity}</span>
                              <X
                                size={14}
                                className="text-gray-500 group-hover:text-red-400"
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
                      {item.product.name} <span className="text-gray-500">x{item.quantity}</span>
                    </span>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Bill Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200/60 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
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

                <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200/60 text-gray-900">
                  <span>Jami:</span>
                  <span className="text-orange-500">{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <h3 className="text-lg font-bold text-gray-900 mb-4">To'lov usulini tanlang</h3>
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
                      'glass-card flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all',
                      isSelected
                        ? `border-${method.color}-400 bg-${method.color}-50/50`
                        : 'border-white/60 bg-white/40 hover:border-gray-300'
                    )}
                  >
                    <div className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full',
                      isSelected ? `bg-${method.color}-500/10` : 'bg-gray-100/80'
                    )}>
                      <Icon size={28} className={isSelected ? `text-${method.color}-500` : 'text-gray-500'} />
                    </div>
                    <span className="font-semibold text-gray-900">{method.label}</span>
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
                className="w-full flex items-center justify-center gap-2 rounded-xl glass-strong border border-white/60 py-4 text-gray-600 hover:text-gray-900 hover:bg-white/70 transition-colors"
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
                <div className="w-full max-w-md rounded-2xl glass-strong border border-white/60 p-6 shadow-2xl">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                      <Calculator className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Naqd to'lov</h2>
                    <p className="mt-2 text-gray-600">Olingan summani kiriting</p>
                  </div>

                  <div className="mb-6 space-y-4">
                    {/* Total Amount */}
                    <div className="rounded-xl glass-strong border border-white/60 p-4">
                      <p className="text-sm font-semibold text-gray-600">To'lov summasi</p>
                      <p className="text-3xl font-bold text-orange-500">{formatPrice(getTotal())}</p>
                    </div>

                    {/* Cash Received */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Olingan summa (so'm)
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-200 bg-white/70 px-4 py-3 text-gray-900 text-lg placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
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
                      className="flex-1 rounded-xl glass-strong border border-white/60 py-3 font-semibold text-gray-600 transition-colors hover:bg-white/70 hover:text-gray-900"
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
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Chek</span>
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
                className="flex-1 flex items-center justify-center gap-2 rounded-xl glass-strong border border-white/60 py-4 text-gray-600 hover:text-gray-900 hover:bg-white/70 transition-colors"
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
        <header className="flex h-16 items-center justify-between glass-strong border-b border-white/40 px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-lg glass-strong border border-white/60 text-gray-600 hover:text-gray-900 hover:bg-white/70 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">{bizSettings?.name || 'Oshxona POS'}</span>
              <p className="text-xs text-gray-600">
                {orderType === 'dine-in' && selectedTable && (
                  <span className="text-orange-500">Stol #{selectedTable.number}</span>
                )}
                {orderType === 'takeaway' && <span className="text-blue-500">Olib ketish</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-xl glass-strong border border-white/60 pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-orange-400 focus:outline-none"
              />
            </div>
            {/* QR Scanner — faqat admin panelda ishlatiladi, POS dan olib tashlandi */}
          </div>
        </header>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto glass-card border-b border-white/40 p-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
              selectedCategory === null
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                : 'glass-strong border border-white/60 text-gray-700 hover:bg-white/70 hover:text-gray-900'
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
                  : 'glass-strong border border-white/60 text-gray-700 hover:bg-white/70 hover:text-gray-900'
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
                className="flex flex-col items-center rounded-2xl glass-card border border-white/50 p-3 text-center transition-all hover:bg-white/50 hover:shadow-md hover:border-orange-200 shadow-sm"
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
                    <Utensils className="h-10 w-10 text-gray-500" />
                  )}
                </div>
                <span className="mb-1 font-medium text-sm text-gray-900">{product.name}</span>
                <span className="text-sm text-orange-500 font-semibold">{formatPrice(product.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="flex w-96 flex-col glass-strong border-l border-white/40">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/40 px-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-gray-900">Savat</span>
            {getItemCount() > 0 && (
              <span className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2 py-0.5 text-xs font-medium text-white">
                {getItemCount()}
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
              <ShoppingCart className="mb-2 h-12 w-12" />
              <p className="font-medium">Savat bo'sh</p>
              <p className="text-sm">Mahsulot qo'shish uchun bosing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 rounded-xl glass-strong border border-white/60 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-orange-500">{formatPrice(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 border border-white/80 text-gray-700 hover:bg-white/80 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60 border border-white/80 text-gray-700 hover:bg-white/80 transition-colors"
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
              <div className="flex justify-between text-sm text-gray-600">
                <span>Mahsulotlar</span>
                <span>{getItemCount()} ta</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900">
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
