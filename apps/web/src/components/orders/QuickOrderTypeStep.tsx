import { useState } from 'react';
import { Utensils, Package, Users, Check, Armchair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { OrderType } from '@/types/order';

interface TableData {
  id: string;
  number: number;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved';
}

interface QuickOrderTypeStepProps {
  onSelectType: (type: OrderType, table?: TableData) => void;
}

// Mock stollar
const mockTables: TableData[] = [
  { id: 'table-1', number: 1, capacity: 2, status: 'free' },
  { id: 'table-2', number: 2, capacity: 4, status: 'occupied' },
  { id: 'table-3', number: 3, capacity: 4, status: 'free' },
  { id: 'table-4', number: 4, capacity: 6, status: 'reserved' },
  { id: 'table-5', number: 5, capacity: 2, status: 'free' },
  { id: 'table-6', number: 6, capacity: 4, status: 'occupied' },
  { id: 'table-7', number: 7, capacity: 8, status: 'free' },
  { id: 'table-8', number: 8, capacity: 4, status: 'free' },
  { id: 'table-9', number: 9, capacity: 2, status: 'occupied' },
  { id: 'table-10', number: 10, capacity: 6, status: 'free' },
  { id: 'table-11', number: 11, capacity: 4, status: 'free' },
  { id: 'table-12', number: 12, capacity: 4, status: 'occupied' },
];

const orderTypes = [
  {
    id: 'dine-in' as OrderType,
    label: 'Shu yerda',
    description: 'Stolda ovqatlanish',
    icon: Utensils,
    color: 'orange',
  },
  {
    id: 'takeaway' as OrderType,
    label: 'Olib ketish',
    description: 'O\'zi olib ketadi',
    icon: Package,
    color: 'blue',
  },
];

export function QuickOrderTypeStep({ onSelectType }: QuickOrderTypeStepProps) {
  const [selectedType, setSelectedType] = useState<OrderType | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);

  // Bo'sh stollar
  const freeTables = mockTables.filter((t) => t.status === 'free');

  // Tur tanlash
  const handleTypeSelect = (type: OrderType) => {
    setSelectedType(type);
    setSelectedTable(null);

    // Agar olib ketish bo'lsa, to'g'ridan-to'g'ri davom etish
    if (type === 'takeaway') {
      onSelectType(type);
    }
  };

  // Stol tanlash va davom etish
  const handleTableSelect = (table: TableData) => {
    setSelectedTable(table);
  };

  // Davom etish
  const handleContinue = () => {
    if (selectedType === 'dine-in' && selectedTable) {
      onSelectType(selectedType, selectedTable);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Buyurtma turi */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyurtma turi</h3>
        <div className="grid grid-cols-2 gap-4">
          {orderTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type.id)}
                className={cn(
                  'relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                  isSelected
                    ? type.color === 'orange'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full',
                    isSelected
                      ? type.color === 'orange'
                        ? 'bg-orange-500/20'
                        : 'bg-blue-500/20'
                      : 'bg-gray-200'
                  )}
                >
                  <Icon
                    size={32}
                    className={cn(
                      isSelected
                        ? type.color === 'orange'
                          ? 'text-orange-400'
                          : 'text-blue-400'
                        : 'text-gray-500'
                    )}
                  />
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={cn(
                      'text-lg font-semibold',
                      isSelected ? 'text-gray-900' : 'text-gray-700'
                    )}
                  >
                    {type.label}
                  </p>
                  <p className="text-sm text-gray-400">{type.description}</p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div
                    className={cn(
                      'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full',
                      type.color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'
                    )}
                  >
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stol tanlash (faqat shu yerda uchun) */}
      {selectedType === 'dine-in' && (
        <div className="animate-in fade-in-0 slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Stol tanlang</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                <span className="text-gray-500">Bo'sh ({freeTables.length})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span className="text-gray-500">Band</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                <span className="text-gray-500">Bron</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {mockTables.map((table) => {
              const isFree = table.status === 'free';
              const isSelected = selectedTable?.id === table.id;

              return (
                <button
                  key={table.id}
                  onClick={() => isFree && handleTableSelect(table)}
                  disabled={!isFree}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all',
                    isFree
                      ? isSelected
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-gray-200 bg-white hover:border-green-500/50 hover:bg-green-500/10'
                      : table.status === 'occupied'
                      ? 'border-red-500/30 bg-red-500/10 cursor-not-allowed'
                      : 'border-yellow-500/30 bg-yellow-500/10 cursor-not-allowed'
                  )}
                >
                  <Armchair
                    size={24}
                    className={cn(
                      isFree
                        ? isSelected
                          ? 'text-orange-400'
                          : 'text-green-400'
                        : table.status === 'occupied'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    )}
                  />
                  <span
                    className={cn(
                      'mt-1 text-lg font-bold',
                      isFree
                        ? isSelected
                          ? 'text-orange-400'
                          : 'text-gray-900'
                        : 'text-gray-400'
                    )}
                  >
                    #{table.number}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-0.5">
                    <Users size={10} />
                    {table.capacity}
                  </span>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Davom etish tugmasi */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleContinue}
              disabled={!selectedTable}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8"
            >
              Davom etish
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
