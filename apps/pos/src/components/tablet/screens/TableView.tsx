import React, { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { tableService, type Table } from '../../../services/table.service';
import { ShoppingBag, RefreshCw, Users, Loader2 } from 'lucide-react';
import TouchButton from '../shared/TouchButton';

interface TableViewProps {
  onSelectTable: (tableId: string, tableNumber: number) => void;
  onTakeaway: () => void;
}

const statusColors: Record<Table['status'], string> = {
  FREE: 'bg-green-500/20 border-green-500 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  OCCUPIED: 'bg-red-500/20 border-red-500 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  RESERVED: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  CLEANING: 'bg-gray-400/20 border-gray-400 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400',
};

const statusLabels: Record<Table['status'], string> = {
  FREE: 'Bo\'sh',
  OCCUPIED: 'Band',
  RESERVED: 'Bron',
  CLEANING: 'Tozalanmoqda',
};

export default function TableView({ onSelectTable, onTakeaway }: TableViewProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const data = await tableService.getAll();
      setTables(data.filter((t) => t.isActive));
    } catch (err) {
      console.error('Stollarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stollar</h2>
        <div className="flex items-center gap-2">
          <TouchButton
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={18} />}
            onClick={fetchTables}
          >
            Yangilash
          </TouchButton>
          <TouchButton
            variant="primary"
            size="sm"
            icon={<ShoppingBag size={18} />}
            onClick={onTakeaway}
          >
            Olib ketish
          </TouchButton>
        </div>
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={40} className="animate-spin text-gray-400" />
          </div>
        ) : tables.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Stollar topilmadi
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {tables.map((table) => {
              const activeOrder = table.orders?.find(
                (o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS' || o.status === 'PREPARING'
              );

              return (
                <button
                  key={table.id}
                  onClick={() => onSelectTable(table.id, table.number)}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'min-w-[120px] min-h-[120px] p-3 rounded-2xl border-2',
                    'transition-all duration-100 active:scale-[0.95] select-none touch-manipulation',
                    statusColors[table.status]
                  )}
                >
                  {/* Table Number */}
                  <span className="text-3xl font-bold leading-none">{table.number}</span>

                  {/* Table Name */}
                  {table.name && (
                    <span className="text-xs mt-1 opacity-75 truncate max-w-full">{table.name}</span>
                  )}

                  {/* Capacity */}
                  <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                    <Users size={12} />
                    <span>{table.capacity}</span>
                  </div>

                  {/* Status */}
                  <span className="text-[10px] font-medium mt-1 uppercase tracking-wider opacity-60">
                    {statusLabels[table.status]}
                  </span>

                  {/* Active Order Total */}
                  {activeOrder && (
                    <span className="mt-1 text-xs font-semibold bg-white/30 dark:bg-black/20 px-2 py-0.5 rounded-full">
                      {activeOrder.total.toLocaleString('uz-UZ')} so'm
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
