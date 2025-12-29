import { Armchair, Bike, ShoppingBag, Users, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OrderType } from '@/types/order';
import { Table, mockTables } from '@/types/newOrder';

interface OrderTypeStepProps {
  selectedType: OrderType;
  onTypeChange: (type: OrderType) => void;
  selectedTable: Table | null;
  onTableChange: (table: Table | null) => void;
  deliveryAddress: string;
  onDeliveryAddressChange: (address: string) => void;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ORDER_TYPE_OPTIONS: {
  type: OrderType;
  icon: React.ReactNode;
  label: string;
  description: string;
}[] = [
  {
    type: 'dine-in',
    icon: <Armchair size={24} />,
    label: 'Stolda',
    description: 'Restoranda o\'tirish',
  },
  {
    type: 'delivery',
    icon: <Bike size={24} />,
    label: 'Yetkazib berish',
    description: 'Manzilga yetkazish',
  },
  {
    type: 'takeaway',
    icon: <ShoppingBag size={24} />,
    label: 'Olib ketish',
    description: 'O\'zi olib ketadi',
  },
];

const TABLE_STATUS_INFO: Record<Table['status'], { label: string; color: string }> = {
  free: { label: 'Bo\'sh', color: 'text-green-400' },
  occupied: { label: 'Band', color: 'text-red-400' },
  reserved: { label: 'Bron', color: 'text-amber-400' },
  cleaning: { label: 'Tozalanmoqda', color: 'text-blue-400' },
};

export function OrderTypeStep({
  selectedType,
  onTypeChange,
  selectedTable,
  onTableChange,
  deliveryAddress,
  onDeliveryAddressChange,
  deliveryNotes,
  onDeliveryNotesChange,
  onNext,
  onBack,
}: OrderTypeStepProps) {
  // Stollar bo'yicha filtr
  const freeTables = mockTables.filter((t) => t.status === 'free');
  const otherTables = mockTables.filter((t) => t.status !== 'free');

  // Validatsiya
  const canProceed = () => {
    if (selectedType === 'dine-in') {
      return selectedTable !== null;
    }
    if (selectedType === 'delivery') {
      return deliveryAddress.trim().length > 0;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Buyurtma turi tanlash */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-400">Buyurtma turi</h3>
        <div className="grid grid-cols-3 gap-3">
          {ORDER_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => onTypeChange(option.type)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                selectedType === option.type
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              )}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full',
                  selectedType === option.type
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-slate-700 text-slate-400'
                )}
              >
                {option.icon}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    'font-medium',
                    selectedType === option.type ? 'text-orange-400' : 'text-white'
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-slate-500">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dine-in: Stol tanlash */}
      {selectedType === 'dine-in' && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-400">
            Stol tanlash {selectedTable && <span className="text-green-400">✓</span>}
          </h3>

          {/* Bo'sh stollar */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-slate-500">Bo'sh stollar</p>
            <div className="grid grid-cols-5 gap-2">
              {freeTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => onTableChange(table)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border p-3 transition-all',
                    selectedTable?.id === table.id
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-slate-700 bg-slate-800/50 hover:border-green-500/50 hover:bg-green-500/10'
                  )}
                >
                  <span
                    className={cn(
                      'text-lg font-bold',
                      selectedTable?.id === table.id ? 'text-orange-400' : 'text-white'
                    )}
                  >
                    {table.number}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Users size={10} />
                    {table.capacity}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Band stollar */}
          {otherTables.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-slate-500">Boshqa stollar</p>
              <div className="grid grid-cols-5 gap-2">
                {otherTables.map((table) => {
                  const statusInfo = TABLE_STATUS_INFO[table.status];
                  return (
                    <div
                      key={table.id}
                      className="flex flex-col items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 opacity-60"
                    >
                      <span className="text-lg font-bold text-slate-500">
                        {table.number}
                      </span>
                      <span className={cn('text-xs', statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!selectedTable && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
              <AlertCircle size={14} />
              Stolni tanlang
            </div>
          )}
        </div>
      )}

      {/* Delivery: Manzil kiritish */}
      {selectedType === 'delivery' && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
              <MapPin size={14} />
              Yetkazish manzili *
            </label>
            <Input
              type="text"
              placeholder="Toshkent sh., tuman, ko'cha, uy..."
              value={deliveryAddress}
              onChange={(e) => onDeliveryAddressChange(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
            {!deliveryAddress && (
              <p className="mt-1 text-xs text-amber-400">Manzilni kiriting</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm text-slate-400">
              <Clock size={14} />
              Qo'shimcha izoh (ixtiyoriy)
            </label>
            <Input
              type="text"
              placeholder="Masalan: 5-qavat, kodni tering..."
              value={deliveryNotes}
              onChange={(e) => onDeliveryNotesChange(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Yetkazish narxi:</span>
              <span className="font-semibold text-white">15,000 so'm</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              * Masofaga qarab o'zgarishi mumkin
            </p>
          </div>
        </div>
      )}

      {/* Takeaway: Info */}
      {selectedType === 'takeaway' && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
              <ShoppingBag size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-white">Olib ketish</p>
              <p className="text-sm text-slate-400">
                Buyurtma tayyor bo'lganda xabarnoma yuboriladi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Harakatlar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-slate-600 text-slate-400"
        >
          Orqaga
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed()}
          className={cn(
            'bg-orange-500 hover:bg-orange-600 text-white',
            !canProceed() && 'opacity-50 cursor-not-allowed'
          )}
        >
          Davom etish
        </Button>
      </div>
    </div>
  );
}
