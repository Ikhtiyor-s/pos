import { useState } from 'react';
import {
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Check,
  ArrowLeft,
  Printer,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/types/order';
import type { QuickOrderItem } from '@/types/quickOrder';

interface QuickPaymentStepProps {
  items: QuickOrderItem[];
  total: number;
  onBack: () => void;
  onSubmit: (paymentMethod: PaymentMethod) => void;
  isSubmitting: boolean;
}

// To'lov usullari
const paymentMethods = [
  {
    id: 'cash' as PaymentMethod,
    label: 'Naqd',
    description: 'Naqd pul bilan to\'lash',
    icon: Banknote,
    color: 'green',
    hasQR: false,
  },
  {
    id: 'card' as PaymentMethod,
    label: 'Karta',
    description: 'Bank kartasi orqali',
    icon: CreditCard,
    color: 'blue',
    hasQR: false,
  },
  {
    id: 'payme' as PaymentMethod,
    label: 'Payme',
    description: 'Payme ilovasi orqali',
    icon: Smartphone,
    color: 'cyan',
    hasQR: true,
  },
  {
    id: 'click' as PaymentMethod,
    label: 'Click',
    description: 'Click ilovasi orqali',
    icon: Smartphone,
    color: 'purple',
    hasQR: true,
  },
  {
    id: 'uzum' as PaymentMethod,
    label: 'QR Kod',
    description: 'QR kod skanerlash',
    icon: QrCode,
    color: 'orange',
    hasQR: true,
  },
];

// QR to'lov usullari
const QR_METHODS: PaymentMethod[] = ['payme', 'click', 'uzum'];

export function QuickPaymentStep({
  items,
  total,
  onBack,
  onSubmit,
  isSubmitting,
}: QuickPaymentStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrPaymentConfirmed, setQrPaymentConfirmed] = useState(false);

  // To'lov usulini tanlash
  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setShowQRCode(false);
    setQrPaymentConfirmed(false);
  };

  // To'lovni boshlash
  const handleStartPayment = () => {
    if (!selectedMethod) return;

    // QR to'lov usullari uchun QR kodni ko'rsatish
    if (QR_METHODS.includes(selectedMethod)) {
      setShowQRCode(true);
    } else {
      // Naqd yoki karta uchun to'g'ridan-to'g'ri chekka o'tish
      onSubmit(selectedMethod);
    }
  };

  // QR to'lov tasdiqlash
  const handleConfirmQRPayment = () => {
    setQrPaymentConfirmed(true);
  };

  // Chekka o'tish
  const handleProceedToReceipt = () => {
    if (selectedMethod) {
      onSubmit(selectedMethod);
    }
  };

  // QR sahifasidan orqaga
  const handleBackFromQR = () => {
    setShowQRCode(false);
    setQrPaymentConfirmed(false);
  };

  // QR kod ko'rinishi
  if (showQRCode && selectedMethod && QR_METHODS.includes(selectedMethod)) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-md">
            <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center">
              {/* QR kod sarlavhasi */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {selectedMethod === 'payme' && 'Payme orqali to\'lash'}
                  {selectedMethod === 'click' && 'Click orqali to\'lash'}
                  {selectedMethod === 'uzum' && 'Uzum orqali to\'lash'}
                </h3>
                <p className="text-slate-400 mt-2">
                  QR kodni skanerlang va to'lovni amalga oshiring
                </p>
              </div>

              {/* To'lov summasi */}
              <div className="mb-6 p-4 rounded-lg bg-slate-900/50">
                <p className="text-sm text-slate-400">To'lov summasi</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">
                  {new Intl.NumberFormat('uz-UZ').format(total)} so'm
                </p>
              </div>

              {/* QR kod */}
              <div
                className={cn(
                  "mx-auto w-56 h-56 rounded-xl flex items-center justify-center mb-6",
                  selectedMethod === 'payme' && "bg-[#00CCCC]",
                  selectedMethod === 'click' && "bg-[#00A4E6]",
                  selectedMethod === 'uzum' && "bg-[#7C3AED]"
                )}
              >
                <div className="bg-white p-4 rounded-lg">
                  <QrCode size={140} className="text-slate-900" />
                </div>
              </div>

              {/* Izoh */}
              <p className="text-sm text-slate-500 mb-6">
                {selectedMethod === 'payme' && 'Payme ilovasini oching va QR kodni skanerlang'}
                {selectedMethod === 'click' && 'Click ilovasini oching va QR kodni skanerlang'}
                {selectedMethod === 'uzum' && 'Uzum ilovasini oching va QR kodni skanerlang'}
              </p>

              {/* To'lov tasdiqlandi */}
              {qrPaymentConfirmed ? (
                <div className="animate-in fade-in-0 zoom-in-95 duration-300">
                  <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                    <CheckCircle size={24} />
                    <span className="text-lg font-medium">To'lov tasdiqlandi!</span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleConfirmQRPayment}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  <Check size={18} className="mr-2" />
                  To'lov qabul qilindi
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <div className="mx-auto max-w-md flex gap-3">
            <Button
              variant="outline"
              onClick={handleBackFromQR}
              className="flex-1 border-slate-700 text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} className="mr-2" />
              Orqaga
            </Button>
            <Button
              onClick={handleProceedToReceipt}
              disabled={!qrPaymentConfirmed}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
            >
              <Printer size={16} className="mr-2" />
              Chek chiqarish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Buyurtma xulosasi */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Buyurtma xulosasi</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-white">
                    {item.name} <span className="text-slate-500">x{item.quantity}</span>
                  </span>
                  <span className="text-white">
                    {new Intl.NumberFormat('uz-UZ').format(item.price * item.quantity)} so'm
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between">
              <span className="text-lg font-bold text-white">Jami:</span>
              <span className="text-lg font-bold text-orange-400">
                {new Intl.NumberFormat('uz-UZ').format(total)} so'm
              </span>
            </div>
          </div>

          {/* To'lov usulini tanlash */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">To'lov usulini tanlang</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;

                const colorClasses = {
                  green: {
                    selected: 'border-green-500 bg-green-500/10',
                    icon: 'bg-green-500/20 text-green-400',
                    badge: 'bg-green-500',
                  },
                  blue: {
                    selected: 'border-blue-500 bg-blue-500/10',
                    icon: 'bg-blue-500/20 text-blue-400',
                    badge: 'bg-blue-500',
                  },
                  cyan: {
                    selected: 'border-cyan-500 bg-cyan-500/10',
                    icon: 'bg-cyan-500/20 text-cyan-400',
                    badge: 'bg-cyan-500',
                  },
                  purple: {
                    selected: 'border-purple-500 bg-purple-500/10',
                    icon: 'bg-purple-500/20 text-purple-400',
                    badge: 'bg-purple-500',
                  },
                  orange: {
                    selected: 'border-orange-500 bg-orange-500/10',
                    icon: 'bg-orange-500/20 text-orange-400',
                    badge: 'bg-orange-500',
                  },
                };

                const colors = colorClasses[method.color as keyof typeof colorClasses];

                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                      isSelected
                        ? colors.selected
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
                        isSelected ? colors.icon : 'bg-slate-700 text-slate-400'
                      )}
                    >
                      <Icon size={24} />
                    </div>

                    {/* Label */}
                    <div className="text-center">
                      <p
                        className={cn(
                          'font-semibold',
                          isSelected ? 'text-white' : 'text-slate-300'
                        )}
                      >
                        {method.label}
                      </p>
                      <p className="text-xs text-slate-500">{method.description}</p>
                    </div>

                    {/* QR badge */}
                    {method.hasQR && (
                      <span className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                        QR
                      </span>
                    )}

                    {/* Selected indicator */}
                    {isSelected && (
                      <div
                        className={cn(
                          'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full',
                          colors.badge
                        )}
                      >
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer tugmalari */}
      <div className="border-t border-slate-700 p-4">
        <div className="mx-auto max-w-2xl flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 border-slate-700 text-slate-400 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Orqaga
          </Button>
          <Button
            onClick={handleStartPayment}
            disabled={!selectedMethod || isSubmitting}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Yuklanmoqda...
              </>
            ) : selectedMethod && QR_METHODS.includes(selectedMethod) ? (
              <>
                <QrCode size={16} className="mr-2" />
                QR kod ko'rsatish
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                To'lovni tasdiqlash
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
