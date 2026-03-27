import React, { useState, useCallback } from 'react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/auth';
import { useCartStore } from '../../../store/cart';
import { orderService } from '../../../services/order.service';
import { LogOut, Clock, User, ChevronLeft, Search, X } from 'lucide-react';
import TouchButton from '../shared/TouchButton';
import TableView from './TableView';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import PaymentScreen from './PaymentScreen';

type Screen = 'tables' | 'products' | 'payment';

export default function TabletLayout() {
  const { user, logout } = useAuthStore();
  const { items, setTable, setOrderType, clearCart, getTotal, tableId, orderType } = useCartStore();

  const [currentScreen, setCurrentScreen] = useState<Screen>('tables');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentTableNumber, setCurrentTableNumber] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [time, setTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Clock
  React.useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTable = useCallback(
    (id: string, tableNumber: number) => {
      setTable(id);
      setOrderType('DINE_IN');
      setCurrentTableNumber(tableNumber);
      setCurrentScreen('products');
    },
    [setTable, setOrderType]
  );

  const handleTakeaway = useCallback(() => {
    setTable(null);
    setOrderType('TAKEAWAY');
    setCurrentTableNumber(null);
    setCurrentScreen('products');
  }, [setTable, setOrderType]);

  const handleSendToKitchen = useCallback(async () => {
    if (items.length === 0) return;

    setSending(true);
    try {
      const order = await orderService.create({
        type: orderType as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
        tableId: tableId || undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
      });
      setCurrentOrderId(order.id);
      alert('Buyurtma oshxonaga yuborildi!');
    } catch (err) {
      console.error('Buyurtma yuborishda xatolik:', err);
      alert('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } finally {
      setSending(false);
    }
  }, [items, orderType, tableId]);

  const handlePayment = useCallback(() => {
    if (!currentOrderId) {
      alert('Avval buyurtmani oshxonaga yuboring.');
      return;
    }
    setCurrentScreen('payment');
  }, [currentOrderId]);

  const handleCloseTable = useCallback(() => {
    if (items.length > 0) {
      if (!confirm('Savatda mahsulotlar bor. Stolni yopmoqchimisiz?')) return;
    }
    clearCart();
    setCurrentOrderId(null);
    setCurrentTableNumber(null);
    setCurrentScreen('tables');
  }, [items, clearCart]);

  const handlePaymentComplete = useCallback(() => {
    clearCart();
    setCurrentOrderId(null);
    setCurrentTableNumber(null);
    setCurrentScreen('tables');
  }, [clearCart]);

  const handleBackFromPayment = useCallback(() => {
    setCurrentScreen('products');
  }, []);

  const handleBackToTables = useCallback(() => {
    setCurrentScreen('tables');
  }, []);

  const total = getTotal();

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950">
      {/* Top Bar */}
      <header
        className={cn(
          'flex items-center justify-between px-4 py-2',
          'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
          'flex-shrink-0'
        )}
      >
        <div className="flex items-center gap-3">
          {currentScreen !== 'tables' && (
            <TouchButton
              variant="secondary"
              size="sm"
              icon={<ChevronLeft size={18} />}
              onClick={handleBackToTables}
            >
              Stollar
            </TouchButton>
          )}
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Oshxona POS
          </h1>
          {currentTableNumber && (
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold text-sm">
              Stol #{currentTableNumber}
            </span>
          )}
          {orderType === 'TAKEAWAY' && currentScreen !== 'tables' && (
            <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-semibold text-sm">
              Olib ketish
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          {currentScreen === 'products' && (
            searchOpen ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
                <div className="relative">
                  <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Qidirish..."
                    autoFocus
                    className={cn(
                      'w-48 h-9 pl-8 pr-3 rounded-lg text-sm',
                      'bg-gray-100 dark:bg-gray-800',
                      'text-gray-900 dark:text-gray-100',
                      'placeholder-gray-400',
                      'border border-gray-200 dark:border-gray-700',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500'
                    )}
                  />
                </div>
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <Search size={18} />
              </button>
            )
          )}

          {/* Time */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Clock size={16} />
            <span>
              {time.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* User */}
          {user && (
            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <User size={16} />
              <span>{user.name || user.firstName}</span>
            </div>
          )}

          {/* Logout */}
          <TouchButton variant="secondary" size="sm" icon={<LogOut size={16} />} onClick={logout}>
            Chiqish
          </TouchButton>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {currentScreen === 'tables' && (
          <div className="flex-1">
            <TableView onSelectTable={handleSelectTable} onTakeaway={handleTakeaway} />
          </div>
        )}

        {currentScreen === 'products' && (
          <>
            {/* Products Area */}
            <div className="flex-1 min-w-0">
              <ProductGrid
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            {/* Cart Panel */}
            <CartPanel
              onSendToKitchen={handleSendToKitchen}
              onPayment={handlePayment}
              onCloseTable={handleCloseTable}
            />
          </>
        )}

        {currentScreen === 'payment' && currentOrderId && (
          <div className="flex-1">
            <PaymentScreen
              orderId={currentOrderId}
              total={total}
              onComplete={handlePaymentComplete}
              onBack={handleBackFromPayment}
            />
          </div>
        )}
      </main>
    </div>
  );
}
