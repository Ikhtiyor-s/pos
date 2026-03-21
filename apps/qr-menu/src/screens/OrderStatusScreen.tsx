import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, ChefHat, Bell, RotateCcw } from 'lucide-react';
import { useMenuStore } from '@/store/menu';

const STATUS_STEPS = [
  { key: 'NEW', label: 'Qabul qilindi', icon: CheckCircle },
  { key: 'CONFIRMED', label: 'Tasdiqlandi', icon: Clock },
  { key: 'PREPARING', label: 'Tayyorlanmoqda', icon: ChefHat },
  { key: 'READY', label: 'Tayyor', icon: Bell },
];

function getStatusIndex(status: string | null): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderStatusScreen() {
  const { orderNumber, orderStatus, checkOrderStatus, resetOrder } = useMenuStore();

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkOrderStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkOrderStatus]);

  const currentStep = getStatusIndex(orderStatus);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center px-6 pt-16 pb-8"
    >
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200 mb-6"
      >
        <CheckCircle className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold text-gray-900 text-center"
      >
        Sizning buyurtmangiz qabul qilindi!
      </motion.h1>

      {orderNumber && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-gray-500 mt-2"
        >
          Buyurtma raqami: <span className="font-bold text-gray-900">#{orderNumber}</span>
        </motion.p>
      )}

      {/* Status timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-sm mt-10 bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-gray-700 mb-6">Buyurtma holati</h2>

        <div className="space-y-0">
          {STATUS_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.key} className="flex items-start gap-4">
                {/* Icon & Line */}
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted ? '#f97316' : '#e5e7eb',
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrent ? 'ring-4 ring-orange-100' : ''
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isCompleted ? 'text-white' : 'text-gray-400'}`} />
                  </motion.div>
                  {index < STATUS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-8 ${
                        index < currentStep ? 'bg-orange-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="pt-2">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-orange-500 mt-0.5"
                    >
                      Hozirgi holat
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Auto refresh note */}
      <p className="text-xs text-gray-400 mt-6 flex items-center gap-1">
        <RotateCcw className="w-3 h-3" />
        Har 10 soniyada yangilanadi
      </p>

      {/* New order button */}
      <button
        onClick={resetOrder}
        className="mt-8 px-8 py-3 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200"
      >
        Yangi buyurtma
      </button>
    </motion.div>
  );
}
