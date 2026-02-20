import { X, AlertTriangle, Package } from 'lucide-react';
import type { LowStockItem } from '../services/inventory.service';

interface LowStockAlertProps {
  isOpen: boolean;
  onClose: () => void;
  items: LowStockItem[];
}

export function LowStockAlert({ isOpen, onClose, items }: LowStockAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20">
              <AlertTriangle size={16} className="text-yellow-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Kam qolgan mahsulotlar</h2>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-xs font-bold text-white">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items list */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Package size={40} className="mb-2" />
              <p className="font-medium">Hammasi yetarli</p>
              <p className="text-sm">Kam qolgan mahsulot yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const ratio = item.minQuantity > 0 ? item.quantity / item.minQuantity : 1;
                const isOutOfStock = item.quantity <= 0;
                const isCritical = ratio <= 0.3;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 ${
                      isOutOfStock
                        ? 'border-red-500/30 bg-red-500/5'
                        : isCritical
                        ? 'border-yellow-500/30 bg-yellow-500/5'
                        : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-xs text-slate-500">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          isOutOfStock ? 'text-red-400' : isCritical ? 'text-yellow-400' : 'text-slate-300'
                        }`}>
                          {item.quantity} {item.unit}
                        </p>
                        <p className="text-xs text-slate-500">min: {item.minQuantity} {item.unit}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOutOfStock
                            ? 'bg-red-500'
                            : isCritical
                            ? 'bg-yellow-500'
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
                      />
                    </div>

                    {/* Status */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        isOutOfStock ? 'text-red-400' : isCritical ? 'text-yellow-400' : 'text-orange-400'
                      }`}>
                        {isOutOfStock ? 'Tugagan' : isCritical ? 'Juda kam' : 'Kam qolgan'}
                      </span>
                      {item.supplierName && (
                        <span className="text-xs text-slate-500">
                          Yetkazuvchi: {item.supplierName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-700 py-3 font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
