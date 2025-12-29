import { ArrowLeft, Printer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QuickOrderItem } from '@/types/quickOrder';
import type { OrderType, PaymentMethod } from '@/types/order';

interface ReceiptStepProps {
  items: QuickOrderItem[];
  subtotal: number;
  total: number;
  notes: string;
  orderType: OrderType;
  tableNumber?: number;
  paymentMethod: PaymentMethod;
  onBack: () => void;
  onSubmitAndPrint: () => void;
  isSubmitting: boolean;
}

// To'lov usuli nomlari
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Naqd',
  card: 'Karta',
  payme: 'Payme',
  click: 'Click',
  uzum: 'QR Kod',
};

export function ReceiptStep({
  items,
  subtotal,
  total,
  notes,
  orderType,
  tableNumber,
  paymentMethod,
  onBack,
  onSubmitAndPrint,
  isSubmitting,
}: ReceiptStepProps) {
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  const currentDate = new Date().toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-md">
          {/* Chek ko'rinishi */}
          <div
            id="receipt-content"
            className="rounded-xl border border-slate-700 bg-white text-slate-900 p-6 shadow-xl"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
              <h2 className="text-xl font-bold">🍽️ OSHXONA</h2>
              <p className="text-sm text-slate-500 mt-1">Restoran POS Tizimi</p>
              <div className="mt-3 text-xs text-slate-500">
                <p>Toshkent sh., Chilonzor t.</p>
                <p>Tel: +998 90 123 45 67</p>
              </div>
            </div>

            {/* Buyurtma ma'lumotlari */}
            <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Buyurtma №:</span>
                <span className="font-mono font-semibold">{orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Sana:</span>
                <span>{currentDate}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Turi:</span>
                <span className="font-medium">
                  {orderType === 'dine-in' ? 'Shu yerda' : 'Olib ketish'}
                </span>
              </div>
              {orderType === 'dine-in' && tableNumber && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-500">Stol:</span>
                  <span className="font-bold text-orange-600">#{tableNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">To'lov:</span>
                <span className="font-medium text-green-600">
                  {PAYMENT_METHOD_LABELS[paymentMethod]}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-500">Kassir:</span>
                <span>Kassir</span>
              </div>
            </div>

            {/* Mahsulotlar */}
            <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs">
                    <th className="text-left pb-2">Mahsulot</th>
                    <th className="text-center pb-2">Soni</th>
                    <th className="text-right pb-2">Narxi</th>
                    <th className="text-right pb-2">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-2 pr-2">
                        <span className="text-slate-400 text-xs mr-1">{index + 1}.</span>
                        {item.name}
                      </td>
                      <td className="text-center py-2">{item.quantity}</td>
                      <td className="text-right py-2 text-slate-500 text-xs">
                        {new Intl.NumberFormat('uz-UZ').format(item.price)}
                      </td>
                      <td className="text-right py-2 font-medium">
                        {new Intl.NumberFormat('uz-UZ').format(
                          item.price * item.quantity
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Izoh */}
            {notes && (
              <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                <p className="text-xs text-slate-500">Izoh:</p>
                <p className="text-sm mt-1">{notes}</p>
              </div>
            )}

            {/* Jami */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Oraliq jami:</span>
                <span>{new Intl.NumberFormat('uz-UZ').format(subtotal)} so'm</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span>JAMI:</span>
                <span>{new Intl.NumberFormat('uz-UZ').format(total)} so'm</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center border-t border-dashed border-slate-300 pt-4">
              <p className="text-sm font-medium">Xaridingiz uchun rahmat!</p>
              <p className="text-xs text-slate-500 mt-1">
                Yana kutib qolamiz
              </p>
              <div className="mt-4 text-xs text-slate-400">
                ═══════════════════════════
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer tugmalari */}
      <div className="border-t border-slate-700 p-4">
        <div className="mx-auto max-w-md flex gap-3">
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
            onClick={onSubmitAndPrint}
            disabled={isSubmitting}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Yuklanmoqda...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Tasdiqlash
                <Printer size={16} className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Print uchun style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10mm;
            margin: 0;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
