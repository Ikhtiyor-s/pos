import { useState } from 'react';
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Users,
  Clock,
  QrCode,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Phone,
  Calendar,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Stol holatlari
type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

interface Hall {
  id: string;
  name: string;
  description?: string;
}

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
  status: TableStatus;
  hallId: string;
  currentOrder?: {
    id: string;
    total: number;
    itemsCount: number;
    startTime: string;
  };
  reservedFor?: {
    name: string;
    time: string;
    phone: string;
  };
}

interface TableFormData {
  number: number;
  name: string;
  capacity: number;
  hallId: string;
}

// Mock halls
const mockHalls: Hall[] = [
  { id: 'h1', name: 'Ichki zal', description: 'Asosiy restoran zali' },
  { id: 'h2', name: 'Yozgi zal', description: 'Tashqi ochiq joy' },
  { id: 'h3', name: 'VIP xona', description: 'Maxsus VIP mehmonlar uchun' },
];

interface ReservationFormData {
  name: string;
  phone: string;
  time: string;
  date: string;
  guests: number;
}

// Mock data
const mockTables: Table[] = [
  { id: '1', number: 1, name: 'Oyna yonida', capacity: 4, status: 'OCCUPIED', hallId: 'h1', currentOrder: { id: 'ORD-001', total: 285000, itemsCount: 5, startTime: '14:30' } },
  { id: '2', number: 2, name: 'Tashqi joy', capacity: 6, status: 'FREE', hallId: 'h2' },
  { id: '3', number: 3, name: 'VIP 1', capacity: 8, status: 'RESERVED', hallId: 'h3', reservedFor: { name: 'Alisher', time: '19:00', phone: '+998901234567' } },
  { id: '4', number: 4, name: 'Markazda', capacity: 4, status: 'OCCUPIED', hallId: 'h1', currentOrder: { id: 'ORD-002', total: 156000, itemsCount: 3, startTime: '15:15' } },
  { id: '5', number: 5, name: 'Bog\'da', capacity: 4, status: 'CLEANING', hallId: 'h2' },
  { id: '6', number: 6, name: 'Burchak', capacity: 2, status: 'FREE', hallId: 'h1' },
  { id: '7', number: 7, name: 'VIP 2', capacity: 10, status: 'FREE', hallId: 'h3' },
  { id: '8', number: 8, name: 'Oshxona yonida', capacity: 4, status: 'OCCUPIED', hallId: 'h1', currentOrder: { id: 'ORD-003', total: 420000, itemsCount: 8, startTime: '13:45' } },
  { id: '9', number: 9, name: 'Kirish yonida', capacity: 4, status: 'FREE', hallId: 'h1' },
  { id: '10', number: 10, name: 'Orqa tomon', capacity: 6, status: 'RESERVED', hallId: 'h2', reservedFor: { name: 'Bobur', time: '20:30', phone: '+998909876543' } },
  { id: '11', number: 11, name: 'Balkon', capacity: 4, status: 'FREE', hallId: 'h2' },
  { id: '12', number: 12, name: 'Xususiy xona', capacity: 12, status: 'OCCUPIED', hallId: 'h3', currentOrder: { id: 'ORD-004', total: 890000, itemsCount: 15, startTime: '12:00' } },
];

const statusConfig: Record<TableStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  FREE: { label: 'Bo\'sh', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  OCCUPIED: { label: 'Band', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Users },
  RESERVED: { label: 'Bron', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Clock },
  CLEANING: { label: 'Tozalanmoqda', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: RefreshCw },
};

export function TablesPage() {
  const [tables, setTables] = useState<Table[]>(mockTables);
  const [halls, setHalls] = useState<Hall[]>(mockHalls);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'ALL'>('ALL');
  const [hallFilter, setHallFilter] = useState<string>('ALL');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [hallFormData, setHallFormData] = useState({ name: '', description: '' });

  // Form states
  const [formData, setFormData] = useState<TableFormData>({ number: 0, name: '', capacity: 4, hallId: 'h1' });
  const [reservationData, setReservationData] = useState<ReservationFormData>({
    name: '', phone: '', time: '', date: '', guests: 2
  });

  // Filtrlangan stollar
  const filteredTables = tables.filter((table) => {
    const matchesSearch =
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.number.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter;
    const matchesHall = hallFilter === 'ALL' || table.hallId === hallFilter;
    return matchesSearch && matchesStatus && matchesHall;
  });

  // Statistika
  const stats = {
    total: tables.length,
    free: tables.filter((t) => t.status === 'FREE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
    cleaning: tables.filter((t) => t.status === 'CLEANING').length,
  };

  const handleStatusChange = (tableId: string, newStatus: TableStatus) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          const updated = { ...t, status: newStatus };
          if (newStatus === 'FREE') {
            delete updated.currentOrder;
            delete updated.reservedFor;
          }
          return updated;
        }
        return t;
      })
    );
    setActiveDropdown(null);
  };

  // Hall management
  const handleAddHall = () => {
    setHallFormData({ name: '', description: '' });
    setIsHallModalOpen(true);
  };

  const handleSaveHall = () => {
    if (!hallFormData.name) return;
    const newHall: Hall = {
      id: `h${Date.now()}`,
      name: hallFormData.name,
      description: hallFormData.description || undefined,
    };
    setHalls((prev) => [...prev, newHall]);
    setIsHallModalOpen(false);
  };

  const handleDeleteHall = (hallId: string) => {
    if (tables.some((t) => t.hallId === hallId)) {
      alert('Bu zalda stollar bor! Avval stollarni ko\'chiring.');
      return;
    }
    setHalls((prev) => prev.filter((h) => h.id !== hallId));
  };

  // Add new table
  const handleAddTable = () => {
    const maxNumber = Math.max(...tables.map(t => t.number), 0);
    setFormData({ number: maxNumber + 1, name: '', capacity: 4, hallId: halls[0]?.id || 'h1' });
    setIsAddModalOpen(true);
  };

  const handleSaveNewTable = () => {
    const newTable: Table = {
      id: String(Date.now()),
      number: formData.number,
      name: formData.name || `Stol ${formData.number}`,
      capacity: formData.capacity,
      status: 'FREE',
      hallId: formData.hallId,
    };
    setTables((prev) => [...prev, newTable]);
    setIsAddModalOpen(false);
    setFormData({ number: 0, name: '', capacity: 4, hallId: halls[0]?.id || 'h1' });
  };

  // Edit table
  const handleEditTable = (table: Table) => {
    setSelectedTable(table);
    setFormData({ number: table.number, name: table.name, capacity: table.capacity, hallId: table.hallId });
    setIsEditModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSaveEditTable = () => {
    if (!selectedTable) return;
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? { ...t, number: formData.number, name: formData.name, capacity: formData.capacity, hallId: formData.hallId }
          : t
      )
    );
    setIsEditModalOpen(false);
    setSelectedTable(null);
  };

  // Delete table
  const handleDeleteTable = (table: Table) => {
    setSelectedTable(table);
    setIsDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const handleConfirmDelete = () => {
    if (!selectedTable) return;
    setTables((prev) => prev.filter((t) => t.id !== selectedTable.id));
    setIsDeleteModalOpen(false);
    setSelectedTable(null);
  };

  // Reserve table
  const handleReserveTable = (table: Table) => {
    setSelectedTable(table);
    setReservationData({ name: '', phone: '', time: '', date: '', guests: 2 });
    setIsReserveModalOpen(true);
    setActiveDropdown(null);
  };

  const handleConfirmReservation = () => {
    if (!selectedTable) return;
    setTables((prev) =>
      prev.map((t) =>
        t.id === selectedTable.id
          ? {
              ...t,
              status: 'RESERVED' as TableStatus,
              reservedFor: {
                name: reservationData.name,
                phone: reservationData.phone,
                time: reservationData.time,
              },
            }
          : t
      )
    );
    setIsReserveModalOpen(false);
    setSelectedTable(null);
  };

  // QR Code
  const handleShowQR = (table: Table) => {
    setSelectedTable(table);
    setIsQRModalOpen(true);
    setActiveDropdown(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stollar</h1>
          <p className="text-sm text-gray-500">Restoran stollarini boshqarish</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddHall}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#FF5722] px-4 py-2.5 text-sm font-medium text-[#FF5722] hover:bg-orange-50 transition-colors"
          >
            <Plus size={18} />
            <span>Yangi zal</span>
          </button>
          <button
            onClick={handleAddTable}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
          >
            <Plus size={18} />
            <span>Yangi stol</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Grid3X3 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Jami stollar</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.free}</p>
              <p className="text-xs text-gray-500">Bo'sh</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.occupied}</p>
              <p className="text-xs text-gray-500">Band</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.reserved}</p>
              <p className="text-xs text-gray-500">Bron</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.cleaning}</p>
              <p className="text-xs text-gray-500">Tozalanmoqda</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hall Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setHallFilter('ALL')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors border',
            hallFilter === 'ALL'
              ? 'bg-[#FF5722] text-white border-[#FF5722]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          Barcha zallar ({tables.length})
        </button>
        {halls.map((hall) => {
          const count = tables.filter((t) => t.hallId === hall.id).length;
          return (
            <button
              key={hall.id}
              onClick={() => setHallFilter(hall.id)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors border group relative',
                hallFilter === hall.id
                  ? 'bg-[#FF5722] text-white border-[#FF5722]'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {hall.name} ({count})
              {hallFilter === hall.id && count === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHall(hall.id);
                    setHallFilter('ALL');
                  }}
                  className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-white hover:bg-white/50"
                >
                  <X size={10} />
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-[#FF5722] focus:outline-none focus:ring-1 focus:ring-[#FF5722]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
            {(['ALL', 'FREE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === status
                    ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {status === 'ALL' ? 'Barchasi' : statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors',
              viewMode === 'grid'
                ? 'bg-gray-100 text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Grid3X3 size={16} />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors',
              viewMode === 'list'
                ? 'bg-gray-100 text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List size={16} />
            <span className="hidden sm:inline">Ro'yxat</span>
          </button>
        </div>
      </div>

      {/* Tables Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={table.id}
                className={cn(
                  'group relative rounded-xl bg-white p-5 shadow-sm border-2 transition-all hover:shadow-md cursor-pointer',
                  table.status === 'FREE' && 'border-green-200 hover:border-green-400',
                  table.status === 'OCCUPIED' && 'border-orange-200 hover:border-orange-400',
                  table.status === 'RESERVED' && 'border-blue-200 hover:border-blue-400',
                  table.status === 'CLEANING' && 'border-purple-200 hover:border-purple-400'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold', config.bgColor, config.color)}>
                      {table.number}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Stol {table.number}</h3>
                      <p className="text-xs text-gray-500">{table.name}</p>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === table.id ? null : table.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeDropdown === table.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg bg-white py-1 shadow-lg border border-gray-100">
                        <button
                          onClick={() => handleEditTable(table)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={14} />
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => handleShowQR(table)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <QrCode size={14} />
                          QR kod
                        </button>
                        {table.status === 'FREE' && (
                          <button
                            onClick={() => handleReserveTable(table)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                          >
                            <Clock size={14} />
                            Bron qilish
                          </button>
                        )}
                        <hr className="my-1" />
                        {table.status !== 'FREE' && (
                          <button
                            onClick={() => handleStatusChange(table.id, 'FREE')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                          >
                            <CheckCircle size={14} />
                            Bo'shatish
                          </button>
                        )}
                        {table.status === 'FREE' && (
                          <button
                            onClick={() => handleStatusChange(table.id, 'OCCUPIED')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50"
                          >
                            <Users size={14} />
                            Band qilish
                          </button>
                        )}
                        {table.status !== 'CLEANING' && (
                          <button
                            onClick={() => handleStatusChange(table.id, 'CLEANING')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50"
                          >
                            <RefreshCw size={14} />
                            Tozalash
                          </button>
                        )}
                        <hr className="my-1" />
                        <button
                          onClick={() => handleDeleteTable(table)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                          O'chirish
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Capacity */}
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{table.capacity} kishi</span>
                </div>

                {/* Status Badge */}
                <div className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', config.bgColor, config.color)}>
                  <StatusIcon size={12} />
                  {config.label}
                </div>

                {/* Order Info (if occupied) */}
                {table.status === 'OCCUPIED' && table.currentOrder && (
                  <div className="mt-4 rounded-lg bg-orange-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-orange-700">{table.currentOrder.id}</span>
                      <span className="text-xs text-orange-600">{table.currentOrder.startTime} dan beri</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-orange-600">{table.currentOrder.itemsCount} ta buyurtma</span>
                      <span className="text-sm font-bold text-orange-700">
                        {table.currentOrder.total.toLocaleString()} so'm
                      </span>
                    </div>
                  </div>
                )}

                {/* Reservation Info */}
                {table.status === 'RESERVED' && table.reservedFor && (
                  <div className="mt-4 rounded-lg bg-blue-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-700">{table.reservedFor.name}</span>
                      <span className="text-xs text-blue-600">{table.reservedFor.time}</span>
                    </div>
                    <span className="text-xs text-blue-500">{table.reservedFor.phone}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nomi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sig'imi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Holati</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ma'lumot</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTables.map((table) => {
                const config = statusConfig[table.status];
                const StatusIcon = config.icon;

                return (
                  <tr key={table.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold', config.bgColor, config.color)}>
                        {table.number}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-800">{table.name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users size={14} />
                        <span className="text-sm">{table.capacity} kishi</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', config.bgColor, config.color)}>
                        <StatusIcon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {table.status === 'OCCUPIED' && table.currentOrder && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-800">{table.currentOrder.total.toLocaleString()} so'm</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-500">{table.currentOrder.startTime}</span>
                        </div>
                      )}
                      {table.status === 'RESERVED' && table.reservedFor && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-800">{table.reservedFor.name}</span>
                          <span className="text-gray-400 mx-1">•</span>
                          <span className="text-gray-500">{table.reservedFor.time}</span>
                        </div>
                      )}
                      {(table.status === 'FREE' || table.status === 'CLEANING') && (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditTable(table)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Tahrirlash"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleShowQR(table)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="QR kod"
                        >
                          <QrCode size={16} />
                        </button>
                        {table.status === 'FREE' && (
                          <button
                            onClick={() => handleReserveTable(table)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                            title="Bron qilish"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTable(table)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredTables.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 shadow-sm border border-gray-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <XCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">Stollar topilmadi</h3>
          <p className="text-sm text-gray-500">Qidiruv so'rovingizga mos stollar yo'q</p>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveDropdown(null)}
        />
      )}

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Yangi stol qo'shish</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zal</label>
                <select
                  value={formData.hallId}
                  onChange={(e) => setFormData({ ...formData, hallId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                >
                  {halls.map((hall) => (
                    <option key={hall.id} value={hall.id}>{hall.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stol raqami</label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stol nomi</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: VIP xona, Balkon..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sig'imi (kishi)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveNewTable}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-white hover:brightness-110"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {isEditModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Stolni tahrirlash</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zal</label>
                <select
                  value={formData.hallId}
                  onChange={(e) => setFormData({ ...formData, hallId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                >
                  {halls.map((hall) => (
                    <option key={hall.id} value={hall.id}>{hall.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stol raqami</label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stol nomi</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sig'imi (kishi)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveEditTable}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-white hover:brightness-110"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <Trash2 className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Stolni o'chirish</h2>
              <p className="text-gray-500 mb-6">
                <span className="font-semibold">Stol {selectedTable.number}</span> ni o'chirishni tasdiqlaysizmi?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-white hover:bg-red-600"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {isReserveModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Stol {selectedTable.number} ni bron qilish</h2>
              <button onClick={() => setIsReserveModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mijoz ismi</label>
                <input
                  type="text"
                  value={reservationData.name}
                  onChange={(e) => setReservationData({ ...reservationData, name: e.target.value })}
                  placeholder="Ism familiya"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={reservationData.phone}
                    onChange={(e) => setReservationData({ ...reservationData, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sana</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={reservationData.date}
                      onChange={(e) => setReservationData({ ...reservationData, date: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vaqti</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="time"
                      value={reservationData.time}
                      onChange={(e) => setReservationData({ ...reservationData, time: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mehmonlar soni</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={reservationData.guests}
                    onChange={(e) => setReservationData({ ...reservationData, guests: parseInt(e.target.value) || 1 })}
                    min="1"
                    max={selectedTable.capacity}
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Maksimal: {selectedTable.capacity} kishi</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsReserveModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmReservation}
                disabled={!reservationData.name || !reservationData.phone || !reservationData.time}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bron qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hall Modal */}
      {isHallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Yangi zal qo'shish</h2>
              <button onClick={() => setIsHallModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zal nomi *</label>
                <input
                  type="text"
                  value={hallFormData.name}
                  onChange={(e) => setHallFormData({ ...hallFormData, name: e.target.value })}
                  placeholder="Masalan: Yozgi terassa"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tavsif</label>
                <input
                  type="text"
                  value={hallFormData.description}
                  onChange={(e) => setHallFormData({ ...hallFormData, description: e.target.value })}
                  placeholder="Qisqacha tavsif"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                />
              </div>
            </div>

            {/* Mavjud zallar */}
            {halls.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Mavjud zallar</p>
                <div className="space-y-2">
                  {halls.map((hall) => {
                    const count = tables.filter((t) => t.hallId === hall.id).length;
                    return (
                      <div key={hall.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{hall.name}</p>
                          <p className="text-xs text-gray-500">{count} ta stol</p>
                        </div>
                        <button
                          onClick={() => handleDeleteHall(hall.id)}
                          disabled={count > 0}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={count > 0 ? 'Avval stollarni ko\'chiring' : 'O\'chirish'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsHallModalOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Yopish
              </button>
              <button
                onClick={handleSaveHall}
                disabled={!hallFormData.name}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQRModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">QR kod - Stol {selectedTable.number}</h2>
              <button onClick={() => setIsQRModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="text-center">
              {/* QR Code Placeholder */}
              <div className="mx-auto w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">QR kod</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Mijozlar bu QR kodni skanlab menyu va buyurtmaga kirishi mumkin
              </p>
              <button className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50">
                <Download size={18} />
                QR kodni yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
