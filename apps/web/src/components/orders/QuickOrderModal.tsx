import { useState, useMemo, useCallback } from 'react';
import { X, ShoppingCart, Receipt, Utensils, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickOrderTypeStep } from './QuickOrderTypeStep';
import { ProductSelectionStep } from './ProductSelectionStep';
import { QuickPaymentStep } from './QuickPaymentStep';
import { ReceiptStep } from './ReceiptStep';
import type { QuickOrderItem, QuickOrderStep } from '@/types/quickOrder';
import type { Order, OrderType, PaymentMethod } from '@/types/order';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

// Step ma'lumotlari
const STEPS = [
  { id: 'type' as QuickOrderStep, label: 'Turi', icon: Utensils },
  { id: 'products' as QuickOrderStep, label: 'Mahsulotlar', icon: ShoppingCart },
  { id: 'payment' as QuickOrderStep, label: 'To\'lov', icon: CreditCard },
  { id: 'receipt' as QuickOrderStep, label: 'Chek', icon: Receipt },
];

// Mock stollar
interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved';
}

export function QuickOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: QuickOrderModalProps) {
  // State
  const [currentStep, setCurrentStep] = useState<QuickOrderStep>('type');
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [items, setItems] = useState<QuickOrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hisoblashlar
  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const total = subtotal;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, total, itemCount };
  }, [items]);

  // Mahsulot qo'shish
  const handleAddItem = useCallback((product: { id: string; name: string; price: number }) => {
    setItems((prev) => {
      const existingItem = prev.find((item) => item.productId === product.id);
      if (existingItem) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  // Mahsulot miqdorini yangilash
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  // Mahsulotni o'chirish
  const handleRemoveItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Savatchani tozalash
  const handleClearCart = useCallback(() => {
    setItems([]);
    setNotes('');
  }, []);

  // Order type tanlash
  const handleSelectOrderType = (type: OrderType, table?: TableData) => {
    setOrderType(type);
    if (table) {
      setSelectedTable(table);
    }
    setCurrentStep('products');
  };

  // To'lovga o'tish
  const handleGoToPayment = () => {
    if (items.length === 0) return;
    setCurrentStep('payment');
  };

  // To'lov usuli tanlash va chekka o'tish
  const handlePaymentSubmit = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setCurrentStep('receipt');
  };

  // Buyurtmani yuborish va chop etish
  const handleSubmitAndPrint = async () => {
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        type: orderType || 'dine-in',
        status: 'new',
        tableId: selectedTable?.id,
        tableNumber: selectedTable?.number,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          notes: item.notes,
          status: 'pending' as const,
        })),
        subtotal: calculations.subtotal,
        deliveryFee: 0,
        discount: 0,
        discountPercent: 0,
        tax: 0,
        total: calculations.total,
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: 'paid',
        notes: notes,
        userId: '1',
        userName: 'Kassir',
        createdAt: new Date().toISOString(),
        estimatedTime: 15,
      };

      // Chop etish (brauzer print dialog)
      window.print();

      onOrderCreated(newOrder);
      handleClose();
    } catch (error) {
      console.error('Buyurtma yaratishda xatolik:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modalni yopish va reset
  const handleClose = () => {
    setItems([]);
    setNotes('');
    setOrderType(null);
    setSelectedTable(null);
    setPaymentMethod(null);
    setCurrentStep('type');
    setIsSubmitting(false);
    onClose();
  };

  // Step completed tekshirish
  const isStepCompleted = (stepId: QuickOrderStep) => {
    const stepOrder = ['type', 'products', 'payment', 'receipt'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);
    return stepIndex < currentIndex;
  };

  // Step ga o'tish mumkinmi
  const canGoToStep = (stepId: QuickOrderStep) => {
    if (stepId === 'type') return true;
    if (stepId === 'products') return orderType !== null;
    if (stepId === 'payment') return orderType !== null && items.length > 0;
    if (stepId === 'receipt') return orderType !== null && items.length > 0 && paymentMethod !== null;
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full rounded-xl bg-white shadow-2xl border border-gray-200',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'flex flex-col',
          currentStep === 'type' ? 'max-w-2xl h-[80vh]' :
          currentStep === 'payment' ? 'max-w-3xl h-[85vh]' :
          currentStep === 'receipt' ? 'max-w-2xl h-[85vh]' :
          'max-w-6xl h-[90vh]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Tezkor buyurtma</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {orderType === 'dine-in' && selectedTable && (
                  <span className="text-orange-400">Stol #{selectedTable.number}</span>
                )}
                {orderType === 'takeaway' && (
                  <span className="text-blue-400">Olib ketish</span>
                )}
                {calculations.itemCount > 0 && (
                  <>
                    {orderType && ' • '}
                    {calculations.itemCount} ta mahsulot •{' '}
                    {new Intl.NumberFormat('uz-UZ').format(calculations.total)} so'm
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = isStepCompleted(step.id);

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => canGoToStep(step.id) && setCurrentStep(step.id)}
                    disabled={!canGoToStep(step.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-orange-500 text-white'
                        : isCompleted
                        ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30'
                        : canGoToStep(step.id)
                        ? 'bg-white text-gray-500 hover:text-gray-900 cursor-pointer'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className="mx-1 h-px w-4 bg-gray-200" />
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'type' && (
            <QuickOrderTypeStep
              onSelectType={handleSelectOrderType}
            />
          )}

          {currentStep === 'products' && (
            <ProductSelectionStep
              items={items}
              onAddItem={handleAddItem}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              notes={notes}
              onNotesChange={setNotes}
              subtotal={calculations.subtotal}
              total={calculations.total}
              onGoToReceipt={handleGoToPayment}
            />
          )}

          {currentStep === 'payment' && (
            <QuickPaymentStep
              items={items}
              total={calculations.total}
              onBack={() => setCurrentStep('products')}
              onSubmit={handlePaymentSubmit}
              isSubmitting={false}
            />
          )}

          {currentStep === 'receipt' && (
            <ReceiptStep
              items={items}
              subtotal={calculations.subtotal}
              total={calculations.total}
              notes={notes}
              orderType={orderType || 'dine-in'}
              tableNumber={selectedTable?.number}
              paymentMethod={paymentMethod || 'cash'}
              onBack={() => setCurrentStep('payment')}
              onSubmitAndPrint={handleSubmitAndPrint}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
