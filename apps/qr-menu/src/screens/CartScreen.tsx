import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Minus, Plus, Trash2, User, Phone } from 'lucide-react';
import { useMenuStore } from '@/store/menu';

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + " so'm";
}

export default function CartScreen() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    setItemNotes,
    setShowCart,
    placeOrder,
    loading,
    error,
  } = useMenuStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handlePlaceOrder = () => {
    placeOrder(customerName, customerPhone);
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="min-h-screen bg-gray-50 pb-32"
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setShowCart(false)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Savat</h1>
          <span className="text-sm text-gray-400">({cart.length} ta)</span>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <p className="text-6xl mb-4">🛒</p>
          <p className="text-gray-500 text-center">Savat bo'sh</p>
          <button
            onClick={() => setShowCart(false)}
            className="mt-4 text-orange-500 font-semibold"
          >
            Menyuga qaytish
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">
          {/* Cart items */}
          {cart.map((item) => (
            <motion.div
              key={item.productId}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                      🍽
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                      {item.product.name}
                    </h3>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm font-bold text-orange-500 mt-0.5">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-full border border-orange-300 bg-orange-50 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <input
                type="text"
                value={item.notes}
                onChange={(e) => setItemNotes(item.productId, e.target.value)}
                placeholder="Izoh..."
                className="w-full mt-2 px-3 py-2 text-xs rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-orange-400 placeholder:text-gray-400"
              />
            </motion.div>
          ))}

          {/* Customer info */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Ma'lumotlaringiz (ixtiyoriy)
            </h3>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ismingiz"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Telefon raqamingiz"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Jami</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
              <span>Umumiy</span>
              <span className="text-orange-500">{formatPrice(subtotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Bottom bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-100 space-y-2">
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full py-3.5 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Yuborilmoqda...
              </span>
            ) : (
              `Buyurtma berish — ${formatPrice(subtotal)}`
            )}
          </button>
          <button
            onClick={() => setShowCart(false)}
            className="w-full py-2.5 text-orange-500 font-medium text-sm"
          >
            Menyuga qaytish
          </button>
        </div>
      )}
    </motion.div>
  );
}
