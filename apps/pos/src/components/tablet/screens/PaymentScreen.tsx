import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { useCartStore } from '../../../store/cart';
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Printer,
  CheckCircle,
} from 'lucide-react';
import TouchButton from '../shared/TouchButton';
import NumPad from '../shared/NumPad';

type PaymentMethod = 'CASH' | 'CARD' | 'PAYME' | 'CLICK' | 'UZUM';

interface PaymentScreenProps {
  orderId: string;
  total: number;
  onComplete: () => void;
  onBack: () => void;
}

const paymentMethods: { key: PaymentMethod; label: string; icon: React.ReactNode; color: string }[] = [
  {
    key: 'CASH',
    label: 'Naqd',
    icon: <Banknote size={28} />,
    color: 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white',
  },
  {
    key: 'CARD',
    label: 'Karta',
    icon: <CreditCard size={28} />,
    color: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white',
  },
  {
    key: 'PAYME',
    label: 'Payme',
    icon: <Smartphone size={28} />,
    color: 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white',
  },
  {
    key: 'CLICK',
    label: 'Click',
    icon: <Smartphone size={28} />,
    color: 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white',
  },
  {
    key: 'UZUM',
    label: 'Uzum',
    icon: <Smartphone size={28} />,
    color: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white',
  },
];

export default function PaymentScreen({ orderId, total, onComplete, onBack }: PaymentScreenProps) {
  const { items } = useCartStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);

  const cashValue = parseFloat(cashAmount) || 0;
  const change = cashValue - total;

  const handlePay = async () => {
    if (!selectedMethod) return;

    setProcessing(true);
    try {
      const { default: api } = await import('../../../services/api');
      await api.post(`/orders/${orderId}/payments`, {
        method: selectedMethod,
        amount: selectedMethod === 'CASH' ? cashValue : total,
      });
      setPaid(true);
    } catch (err) {
      console.error('To\'lov xatoligi:', err);
      alert('To\'lov amalga oshmadi. Qaytadan urinib ko\'ring.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = async () => {
    try {
      const { default: api } = await import('../../../services/api');
      await api.post(`/orders/${orderId}/print`);
    } catch (err) {
      console.error('Chop etishda xatolik:', err);
    }
  };

  const handleCashSubmit = () => {
    if (cashValue >= total) {
      handlePay();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <TouchButton variant="secondary" size="sm" icon={<ArrowLeft size={18} />} onClick={onBack}>
          Orqaga
        </TouchButton>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">To'lov</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Order Summary */}
        <div className="w-[300px] flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Buyurtma tafsilotlari</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex justify-between text-sm text-gray-700 dark:text-gray-300"
              >
                <span>
                  {item.product.name} x{item.quantity}
                </span>
                <span className="font-medium">
                  {(item.product.price * item.quantity).toLocaleString('uz-UZ')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100">
              <span>Jami:</span>
              <span>{total.toLocaleString('uz-UZ')} so'm</span>
            </div>
          </div>
        </div>

        {/* Right: Payment Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {paid ? (
            /* Payment Complete */
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <CheckCircle size={80} className="text-green-500" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                To'lov qabul qilindi!
              </h3>
              {selectedMethod === 'CASH' && change > 0 && (
                <p className="text-xl text-orange-600 dark:text-orange-400 font-semibold">
                  Qaytim: {change.toLocaleString('uz-UZ')} so'm
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <TouchButton
                  variant="secondary"
                  size="lg"
                  icon={<Printer size={22} />}
                  onClick={handlePrint}
                >
                  Chop etish
                </TouchButton>
                <TouchButton variant="success" size="lg" onClick={onComplete}>
                  Yakunlash
                </TouchButton>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Payment Method Selection */}
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  To'lov usulini tanlang
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.key}
                      onClick={() => {
                        setSelectedMethod(method.key);
                        setCashAmount('');
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
                        'min-h-[100px] transition-all duration-100',
                        'active:scale-[0.95] touch-manipulation select-none',
                        'border-2',
                        selectedMethod === method.key
                          ? cn(method.color, 'border-transparent ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-900')
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                      )}
                    >
                      {method.icon}
                      <span className="text-sm font-semibold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Numpad */}
              {selectedMethod === 'CASH' && (
                <div className="max-w-[320px]">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Naqd pul miqdori
                  </h3>
                  <NumPad value={cashAmount} onChange={setCashAmount} onSubmit={handleCashSubmit} />

                  {cashValue > 0 && (
                    <div
                      className={cn(
                        'mt-3 p-3 rounded-xl text-center font-bold text-lg',
                        change >= 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {change >= 0
                        ? `Qaytim: ${change.toLocaleString('uz-UZ')} so'm`
                        : `Yetarli emas: ${Math.abs(change).toLocaleString('uz-UZ')} so'm`}
                    </div>
                  )}

                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[total, Math.ceil(total / 1000) * 1000, Math.ceil(total / 5000) * 5000].map(
                      (amount, i) => (
                        <button
                          key={i}
                          onClick={() => setCashAmount(String(amount))}
                          className={cn(
                            'min-h-[44px] rounded-lg text-sm font-medium',
                            'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                            'hover:bg-gray-200 dark:hover:bg-gray-700',
                            'active:scale-[0.95] transition-transform touch-manipulation select-none'
                          )}
                        >
                          {amount.toLocaleString('uz-UZ')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              {selectedMethod && selectedMethod !== 'CASH' && (
                <TouchButton
                  variant="success"
                  size="lg"
                  className="w-full max-w-[320px]"
                  onClick={handlePay}
                  disabled={processing}
                >
                  {processing ? 'Kutilmoqda...' : `${total.toLocaleString('uz-UZ')} so'm to'lash`}
                </TouchButton>
              )}

              {selectedMethod === 'CASH' && cashValue >= total && (
                <TouchButton
                  variant="success"
                  size="lg"
                  className="w-full max-w-[320px]"
                  onClick={handlePay}
                  disabled={processing}
                >
                  {processing ? 'Kutilmoqda...' : 'To\'lovni tasdiqlash'}
                </TouchButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
