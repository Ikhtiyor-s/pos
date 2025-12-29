import { useState, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderStepper } from './OrderStepper';
import { CustomerStep } from './CustomerStep';
import { OrderTypeStep } from './OrderTypeStep';
import { MenuStep } from './MenuStep';
import { CartStep } from './CartStep';
import { PaymentStep } from './PaymentStep';
import {
  NewOrderData,
  NewOrderStep,
  NewOrderItem,
  Table,
} from '@/types/newOrder';
import { Order } from '@/types/order';
import { Product } from '@/types/product';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

// Boshlang'ich buyurtma holati
const initialOrderData: NewOrderData = {
  customer: null,
  type: 'dine-in',
  tableId: undefined,
  tableNumber: undefined,
  deliveryAddress: '',
  deliveryNotes: '',
  items: [],
  paymentMethod: null,
  splitPayments: [],
  isSplitPayment: false,
  discountPercent: 0,
  discountAmount: 0,
  notes: '',
};

export function NewOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: NewOrderModalProps) {
  // State
  const [currentStep, setCurrentStep] = useState<NewOrderStep>('customer');
  const [completedSteps, setCompletedSteps] = useState<NewOrderStep[]>([]);
  const [orderData, setOrderData] = useState<NewOrderData>(initialOrderData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hisoblashlar
  const calculations = useMemo(() => {
    const subtotal = orderData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = orderData.type === 'delivery' ? 15000 : 0;

    // Chegirma
    let discount = 0;
    if (orderData.discountPercent > 0) {
      discount = Math.round(subtotal * (orderData.discountPercent / 100));
    } else if (orderData.discountAmount > 0) {
      discount = orderData.discountAmount;
    }

    const total = subtotal + deliveryFee - discount;

    return { subtotal, deliveryFee, discount, total };
  }, [orderData]);

  // Step completedga qo'shish
  const markStepCompleted = (step: NewOrderStep) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  // Keyingi stepga o'tish
  const goToNextStep = (from: NewOrderStep) => {
    markStepCompleted(from);
    const steps: NewOrderStep[] = ['customer', 'type', 'menu', 'cart', 'payment'];
    const currentIndex = steps.indexOf(from);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  // Oldingi stepga o'tish
  const goToPrevStep = () => {
    const steps: NewOrderStep[] = ['customer', 'type', 'menu', 'cart', 'payment'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Mahsulot qo'shish
  const handleAddItem = useCallback((product: Product) => {
    const newItem: NewOrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    };

    setOrderData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  }, []);

  // Mahsulot miqdorini yangilash
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    setOrderData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
  }, []);

  // Mahsulotni o'chirish
  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  }, []);

  // Mahsulot izohini yangilash
  const handleUpdateItemNotes = useCallback((itemId: string, notes: string) => {
    setOrderData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      ),
    }));
  }, []);

  // Buyurtmani yuborish
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Yangi buyurtma yaratish
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        type: orderData.type,
        status: 'new',
        customerId: orderData.customer?.id,
        customerName: orderData.customer?.name,
        customerPhone: orderData.customer?.phone,
        tableId: orderData.tableId,
        tableNumber: orderData.tableNumber,
        deliveryAddress: orderData.deliveryAddress || undefined,
        deliveryNotes: orderData.deliveryNotes || undefined,
        items: orderData.items.map((item) => ({
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
        deliveryFee: calculations.deliveryFee,
        discount: calculations.discount,
        discountPercent: orderData.discountPercent,
        tax: 0,
        total: calculations.total,
        paymentMethod: orderData.isSplitPayment
          ? orderData.splitPayments[0]?.method
          : orderData.paymentMethod || undefined,
        paymentStatus: 'pending',
        notes: orderData.notes,
        userId: '1',
        userName: 'Kassir',
        createdAt: new Date().toISOString(),
        estimatedTime: 20,
      };

      onOrderCreated(newOrder);
      handleClose();
    } catch (error) {
      console.error('Buyurtma yaratishda xatolik:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modalni yopish va reset qilish
  const handleClose = () => {
    setOrderData(initialOrderData);
    setCurrentStep('customer');
    setCompletedSteps([]);
    setIsSubmitting(false);
    onClose();
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
          'relative w-full rounded-xl bg-slate-900 shadow-2xl border border-slate-700',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'flex flex-col',
          currentStep === 'menu'
            ? 'max-w-6xl h-[90vh]'
            : 'max-w-2xl max-h-[90vh]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Yangi buyurtma</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {orderData.items.length > 0 && (
                <>
                  {orderData.items.length} ta mahsulot •{' '}
                  {new Intl.NumberFormat('uz-UZ').format(calculations.total)} so'm
                </>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="border-b border-slate-700 px-6 py-3">
          <OrderStepper
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={setCurrentStep}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Customer Step */}
          {currentStep === 'customer' && (
            <CustomerStep
              selectedCustomer={orderData.customer}
              onSelectCustomer={(customer) =>
                setOrderData((prev) => ({ ...prev, customer }))
              }
              onNext={() => goToNextStep('customer')}
              onSkip={() => goToNextStep('customer')}
            />
          )}

          {/* Order Type Step */}
          {currentStep === 'type' && (
            <OrderTypeStep
              selectedType={orderData.type}
              onTypeChange={(type) =>
                setOrderData((prev) => ({
                  ...prev,
                  type,
                  tableId: type !== 'dine-in' ? undefined : prev.tableId,
                  tableNumber: type !== 'dine-in' ? undefined : prev.tableNumber,
                }))
              }
              selectedTable={
                orderData.tableId
                  ? ({
                      id: orderData.tableId,
                      number: orderData.tableNumber!,
                      capacity: 4,
                      status: 'free',
                    } as Table)
                  : null
              }
              onTableChange={(table) =>
                setOrderData((prev) => ({
                  ...prev,
                  tableId: table?.id,
                  tableNumber: table?.number,
                }))
              }
              deliveryAddress={orderData.deliveryAddress || ''}
              onDeliveryAddressChange={(address) =>
                setOrderData((prev) => ({ ...prev, deliveryAddress: address }))
              }
              deliveryNotes={orderData.deliveryNotes || ''}
              onDeliveryNotesChange={(notes) =>
                setOrderData((prev) => ({ ...prev, deliveryNotes: notes }))
              }
              onNext={() => goToNextStep('type')}
              onBack={goToPrevStep}
            />
          )}

          {/* Menu Step */}
          {currentStep === 'menu' && (
            <MenuStep
              items={orderData.items}
              onAddItem={handleAddItem}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onNext={() => goToNextStep('menu')}
              onBack={goToPrevStep}
            />
          )}

          {/* Cart Step */}
          {currentStep === 'cart' && (
            <CartStep
              items={orderData.items}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onUpdateItemNotes={handleUpdateItemNotes}
              discountPercent={orderData.discountPercent}
              discountAmount={orderData.discountAmount}
              onDiscountChange={(percent, amount) =>
                setOrderData((prev) => ({
                  ...prev,
                  discountPercent: percent,
                  discountAmount: amount,
                }))
              }
              notes={orderData.notes || ''}
              onNotesChange={(notes) =>
                setOrderData((prev) => ({ ...prev, notes }))
              }
              orderType={orderData.type}
              onNext={() => goToNextStep('cart')}
              onBack={goToPrevStep}
            />
          )}

          {/* Payment Step */}
          {currentStep === 'payment' && (
            <PaymentStep
              orderData={orderData}
              subtotal={calculations.subtotal}
              deliveryFee={calculations.deliveryFee}
              discount={calculations.discount}
              total={calculations.total}
              selectedMethod={orderData.paymentMethod}
              onMethodChange={(method) =>
                setOrderData((prev) => ({ ...prev, paymentMethod: method }))
              }
              splitPayments={orderData.splitPayments}
              onSplitPaymentsChange={(payments) =>
                setOrderData((prev) => ({ ...prev, splitPayments: payments }))
              }
              isSplitPayment={orderData.isSplitPayment}
              onSplitToggle={(enabled) =>
                setOrderData((prev) => ({
                  ...prev,
                  isSplitPayment: enabled,
                  paymentMethod: enabled ? null : prev.paymentMethod,
                }))
              }
              onBack={goToPrevStep}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
