import { useState } from 'react';
import {
  Banknote,
  CreditCard,
  Smartphone,
  CheckCircle,
  Split,
  Printer,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/types/order';
import { NewOrderData, SplitPayment } from '@/types/newOrder';

interface PaymentStepProps {
  orderData: NewOrderData;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  selectedMethod: PaymentMethod | null;
  onMethodChange: (method: PaymentMethod) => void;
  splitPayments: SplitPayment[];
  onSplitPaymentsChange: (payments: SplitPayment[]) => void;
  isSplitPayment: boolean;
  onSplitToggle: (enabled: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const PAYMENT_METHODS: {
  method: PaymentMethod;
  icon: React.ReactNode;
  label: string;
  description: string;
}[] = [
  {
    method: 'cash',
    icon: <Banknote size={24} />,
    label: 'Naqd pul',
    description: 'Kassada to\'lash',
  },
  {
    method: 'card',
    icon: <CreditCard size={24} />,
    label: 'Bank kartasi',
    description: 'Terminal orqali',
  },
  {
    method: 'payme',
    icon: <Smartphone size={24} />,
    label: 'Payme',
    description: 'QR kod orqali',
  },
  {
    method: 'click',
    icon: <Smartphone size={24} />,
    label: 'Click',
    description: 'QR kod orqali',
  },
  {
    method: 'uzum',
    icon: <Smartphone size={24} />,
    label: 'Uzum Bank',
    description: 'QR kod orqali',
  },
];

export function PaymentStep({
  orderData,
  subtotal,
  deliveryFee,
  discount,
  total,
  selectedMethod,
  onMethodChange,
  splitPayments,
  onSplitPaymentsChange,
  isSplitPayment,
  onSplitToggle,
  onBack,
  onSubmit,
  isSubmitting,
}: PaymentStepProps) {
  const [cashReceived, setCashReceived] = useState<number>(0);

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  // Qaytim hisoblash
  const change = cashReceived > total ? cashReceived - total : 0;

  // Split to'lovdagi jami
  const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const splitRemaining = total - splitTotal;

  // Split to'lov qo'shish
  const addSplitPayment = (method: PaymentMethod) => {
    if (splitRemaining <= 0) return;

    const existingIndex = splitPayments.findIndex((p) => p.method === method);
    if (existingIndex >= 0) {
      // Mavjud usulni yangilash
      const updated = [...splitPayments];
      updated[existingIndex].amount += 10000; // 10,000 qo'shish
      onSplitPaymentsChange(updated);
    } else {
      // Yangi usul qo'shish
      onSplitPaymentsChange([
        ...splitPayments,
        { method, amount: Math.min(splitRemaining, 10000) },
      ]);
    }
  };

  // Split to'lov miqdorini o'zgartirish
  const updateSplitAmount = (method: PaymentMethod, amount: number) => {
    const updated = splitPayments.map((p) =>
      p.method === method ? { ...p, amount: Math.max(0, amount) } : p
    );
    onSplitPaymentsChange(updated.filter((p) => p.amount > 0));
  };

  // To'lov qilish mumkinmi
  const canSubmit = () => {
    if (isSplitPayment) {
      return splitTotal >= total;
    }
    return selectedMethod !== null;
  };

  return (
    <div className="space-y-4">
      {/* Buyurtma xulosasi */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-2">
        <h3 className="font-medium text-white mb-3">Buyurtma xulosasi</h3>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Mahsulotlar ({orderData.items.length} ta):
          </span>
          <span className="text-white">{formatPrice(subtotal)} so'm</span>
        </div>

        {deliveryFee > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Yetkazish:</span>
            <span className="text-white">{formatPrice(deliveryFee)} so'm</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-400">Chegirma:</span>
            <span className="text-green-400">-{formatPrice(discount)} so'm</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="font-medium text-white">To'lanishi kerak:</span>
          <span className="text-2xl font-bold text-orange-400">
            {formatPrice(total)} so'm
          </span>
        </div>
      </div>

      {/* Split to'lov toggle */}
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 p-3">
        <div className="flex items-center gap-2">
          <Split size={18} className="text-slate-400" />
          <span className="text-sm text-white">Bo'lib to'lash</span>
        </div>
        <button
          onClick={() => onSplitToggle(!isSplitPayment)}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors',
            isSplitPayment ? 'bg-orange-500' : 'bg-slate-700'
          )}
        >
          <span
            className={cn(
              'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
              isSplitPayment ? 'left-6' : 'left-1'
            )}
          />
        </button>
      </div>

      {/* To'lov usullari */}
      {!isSplitPayment ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-400">To'lov usuli</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.method}
                onClick={() => onMethodChange(pm.method)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                  selectedMethod === pm.method
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full',
                    selectedMethod === pm.method
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {pm.icon}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      'font-medium text-sm',
                      selectedMethod === pm.method ? 'text-orange-400' : 'text-white'
                    )}
                  >
                    {pm.label}
                  </p>
                  <p className="text-xs text-slate-500">{pm.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Naqd pul uchun qaytim */}
          {selectedMethod === 'cash' && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">
                  Qabul qilingan summa
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseInt(e.target.value) || 0)}
                  className="bg-slate-700 border-slate-600 text-white text-lg"
                />
              </div>

              {/* Tez summa tugmalari */}
              <div className="flex flex-wrap gap-2">
                {[total, 50000, 100000, 200000, 500000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashReceived(amount)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      cashReceived === amount
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white'
                    )}
                  >
                    {formatPrice(amount)}
                  </button>
                ))}
              </div>

              {change > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <span className="text-slate-400">Qaytim:</span>
                  <span className="text-xl font-bold text-green-400">
                    {formatPrice(change)} so'm
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Split to'lov */
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-400">
            Bo'lib to'lash ({formatPrice(splitRemaining)} qoldi)
          </h3>

          {/* Tanlangan to'lovlar */}
          {splitPayments.length > 0 && (
            <div className="space-y-2 mb-4">
              {splitPayments.map((payment) => {
                const methodInfo = PAYMENT_METHODS.find(
                  (m) => m.method === payment.method
                );
                return (
                  <div
                    key={payment.method}
                    className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400">
                      {methodInfo?.icon}
                    </div>
                    <span className="text-sm text-white flex-1">
                      {methodInfo?.label}
                    </span>
                    <Input
                      type="number"
                      value={payment.amount}
                      onChange={(e) =>
                        updateSplitAmount(
                          payment.method,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-sm text-right"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* To'lov usullarini qo'shish */}
          {splitRemaining > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.method}
                  onClick={() => addSplitPayment(pm.method)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-800/30 p-2 text-slate-400 hover:border-orange-500/50 hover:text-orange-400"
                >
                  {pm.icon}
                  <span className="text-xs">{pm.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Split progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-400">To'langan:</span>
              <span className="text-white">{formatPrice(splitTotal)} so'm</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all"
                style={{ width: `${Math.min((splitTotal / total) * 100, 100)}%` }}
              />
            </div>
            {splitRemaining > 0 && (
              <p className="mt-1 text-xs text-amber-400">
                Yana {formatPrice(splitRemaining)} so'm kerak
              </p>
            )}
          </div>
        </div>
      )}

      {/* Harakatlar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="border-slate-600 text-slate-400"
        >
          Orqaga
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={isSubmitting || !canSubmit()}
            className="border-slate-600 text-slate-400"
          >
            <Printer size={16} className="mr-2" />
            Chek
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit()}
            className={cn(
              'bg-green-500 hover:bg-green-600 text-white min-w-[140px]',
              (!canSubmit() || isSubmitting) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <CheckCircle size={16} className="mr-2" />
                Buyurtmani saqlash
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
