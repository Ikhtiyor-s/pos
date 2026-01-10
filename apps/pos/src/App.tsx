import { useState } from 'react';
import { useCartStore } from './store/cart';
import { cn } from './lib/utils';
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
} from 'lucide-react';

// Demo kategoriyalar
const categories = [
  { id: '1', name: 'Osh va taomlar', slug: 'osh', icon: '🍛' },
  { id: '2', name: 'Salatlar', slug: 'salat', icon: '🥗' },
  { id: '3', name: "Sho'rvalar", slug: 'shorva', icon: '🍲' },
  { id: '4', name: 'Ichimliklar', slug: 'ichimlik', icon: '🍵' },
  { id: '5', name: 'Shirinliklar', slug: 'shirinlik', icon: '🍰' },
];

// Demo mahsulotlar
const products = [
  { id: '1', name: "O'zbek oshi", price: 45000, categoryId: '1', cookTime: 25, image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400' },
  { id: '2', name: 'Samarqand oshi', price: 50000, categoryId: '1', cookTime: 30, image: 'https://images.unsplash.com/photo-1645177628172-a94c30a5d4f8?w=400' },
  { id: '3', name: 'Manti', price: 35000, categoryId: '1', cookTime: 20, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400' },
  { id: '4', name: 'Shashlik (1 shish)', price: 25000, categoryId: '1', cookTime: 15, image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400' },
  { id: '5', name: "Lag'mon", price: 38000, categoryId: '1', cookTime: 20, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400' },
  { id: '6', name: 'Chuchvara', price: 32000, categoryId: '1', cookTime: 18, image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400' },
  { id: '7', name: 'Achichuk', price: 15000, categoryId: '2', cookTime: 5, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
  { id: '8', name: 'Shakarob', price: 18000, categoryId: '2', cookTime: 5, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
  { id: '9', name: "Ovqat salati", price: 22000, categoryId: '2', cookTime: 10, image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400' },
  { id: '10', name: "Sho'rva", price: 30000, categoryId: '3', cookTime: 15, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' },
  { id: '11', name: 'Mastava', price: 28000, categoryId: '3', cookTime: 15, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400' },
  { id: '12', name: 'Norin', price: 35000, categoryId: '3', cookTime: 12, image: 'https://images.unsplash.com/photo-1623341214825-9f4f963727da?w=400' },
  { id: '13', name: "Ko'k choy", price: 8000, categoryId: '4', cookTime: 3, image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400' },
  { id: '14', name: 'Qora choy', price: 8000, categoryId: '4', cookTime: 3, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400' },
  { id: '15', name: 'Kompot', price: 6000, categoryId: '4', cookTime: 1, image: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400' },
  { id: '16', name: 'Limonad', price: 12000, categoryId: '4', cookTime: 1, image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=400' },
  { id: '17', name: 'Chak-chak', price: 15000, categoryId: '5', cookTime: 0, image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400' },
  { id: '18', name: 'Halvo', price: 12000, categoryId: '5', cookTime: 0, image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400' },
];

// Mock stollar
const tables = [
  { id: '1', number: 1, capacity: 2, status: 'free' as const },
  { id: '2', number: 2, capacity: 4, status: 'occupied' as const },
  { id: '3', number: 3, capacity: 4, status: 'free' as const },
  { id: '4', number: 4, capacity: 6, status: 'reserved' as const },
  { id: '5', number: 5, capacity: 2, status: 'free' as const },
  { id: '6', number: 6, capacity: 4, status: 'occupied' as const },
  { id: '7', number: 7, capacity: 8, status: 'free' as const },
  { id: '8', number: 8, capacity: 4, status: 'free' as const },
];

type OrderType = 'dine-in' | 'takeaway';
type PaymentMethod = 'cash' | 'card' | 'payme' | 'click' | 'uzum';
type Step = 'order-type' | 'products' | 'payment' | 'receipt';

interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved';
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('order-type');
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrConfirmed, setQrConfirmed] = useState(false);

  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
    getItemCount,
  } = useCartStore();

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

  const handlePrintAndClose = () => {
    window.print();
    // Reset everything
    clearCart();
    setCurrentStep('order-type');
    setOrderType(null);
    setSelectedTable(null);
    setPaymentMethod(null);
    setShowQR(false);
    setQrConfirmed(false);
  };

  const handleBack = () => {
    if (currentStep === 'products') {
      setCurrentStep('order-type');
      setOrderType(null);
      setSelectedTable(null);
    } else if (currentStep === 'payment') {
      setCurrentStep('products');
    } else if (currentStep === 'receipt') {
      setCurrentStep('payment');
      setPaymentMethod(null);
    }
  };

  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  // Order Type Step
  if (currentStep === 'order-type') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Oshxona POS</span>
          </div>
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
        </header>

        <div className="p-8">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Order Type Selection */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Buyurtma turini tanlang</h2>
              <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => setOrderType('dine-in')}
                  className={cn(
                    'relative flex flex-col items-center gap-4 rounded-2xl border-2 p-8 transition-all',
                    orderType === 'dine-in'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  )}
                >
                  <div className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-full',
                    orderType === 'dine-in' ? 'bg-orange-500/20' : 'bg-slate-700'
                  )}>
                    <Utensils size={40} className={orderType === 'dine-in' ? 'text-orange-400' : 'text-slate-400'} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">Shu yerda</p>
                    <p className="text-sm text-slate-500">Stolda ovqatlanish</p>
                  </div>
                  {orderType === 'dine-in' && (
                    <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleSelectOrderType('takeaway')}
                  className={cn(
                    'relative flex flex-col items-center gap-4 rounded-2xl border-2 p-8 transition-all',
                    orderType === 'takeaway'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  )}
                >
                  <div className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-full',
                    orderType === 'takeaway' ? 'bg-blue-500/20' : 'bg-slate-700'
                  )}>
                    <Package size={40} className={orderType === 'takeaway' ? 'text-blue-400' : 'text-slate-400'} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">Olib ketish</p>
                    <p className="text-sm text-slate-500">O'zi olib ketadi</p>
                  </div>
                  {orderType === 'takeaway' && (
                    <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Table Selection */}
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
              <h3 className="text-lg font-bold mb-4">Buyurtma xulosasi</h3>
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
              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between">
                <span className="text-xl font-bold">Jami:</span>
                <span className="text-xl font-bold text-orange-400">{formatPrice(getTotal())}</span>
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

            <div className="mt-8 flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-700 py-4 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={16} />
                Orqaga
              </button>
              <button
                onClick={() => paymentMethod && handlePaymentSelect(paymentMethod)}
                disabled={!paymentMethod}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-4 font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentMethod && ['payme', 'click', 'uzum'].includes(paymentMethod) ? (
                  <>
                    <QrCode size={18} />
                    QR kod ko'rsatish
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    To'lovni tasdiqlash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Receipt Step
  if (currentStep === 'receipt') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
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
                <h2 className="text-xl font-bold">🍽️ OSHXONA</h2>
                <p className="text-sm text-slate-500 mt-1">Restoran POS Tizimi</p>
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
              <span className="text-lg font-bold">Oshxona POS</span>
              <p className="text-xs text-slate-500">
                {orderType === 'dine-in' && selectedTable && (
                  <span className="text-orange-400">Stol #{selectedTable.number}</span>
                )}
                {orderType === 'takeaway' && <span className="text-blue-400">Olib ketish</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
                <span>Jami</span>
                <span>{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>To'lov</span>
                <span className="text-orange-400">{formatPrice(getTotal())}</span>
              </div>
            </div>
            <button
              onClick={handleGoToPayment}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              To'lovga o'tish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
