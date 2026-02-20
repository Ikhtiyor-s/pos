import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewOrderStep, NEW_ORDER_STEPS } from '@/types/newOrder';

interface OrderStepperProps {
  currentStep: NewOrderStep;
  completedSteps: NewOrderStep[];
  onStepClick?: (step: NewOrderStep) => void;
}

export function OrderStepper({
  currentStep,
  completedSteps,
  onStepClick,
}: OrderStepperProps) {
  const currentIndex = NEW_ORDER_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between px-2">
      {NEW_ORDER_STEPS.map((step, index) => {
        const isActive = step.key === currentStep;
        const isCompleted = completedSteps.includes(step.key);
        const isPast = index < currentIndex;
        const isClickable = isCompleted || isPast;

        return (
          <div key={step.key} className="flex items-center flex-1">
            {/* Step */}
            <button
              onClick={() => isClickable && onStepClick?.(step.key)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 transition-all',
                isActive && 'bg-orange-500/20',
                isClickable && !isActive && 'hover:bg-gray-200/50 cursor-pointer',
                !isClickable && 'cursor-default'
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                  isActive && 'bg-orange-500 text-white',
                  isCompleted && !isActive && 'bg-green-500 text-white',
                  !isActive && !isCompleted && 'bg-gray-200 text-gray-500'
                )}
              >
                {isCompleted && !isActive ? (
                  <Check size={16} />
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-sm font-medium hidden sm:block',
                  isActive && 'text-orange-400',
                  isCompleted && !isActive && 'text-green-600',
                  !isActive && !isCompleted && 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector */}
            {index < NEW_ORDER_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 rounded-full transition-all',
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
