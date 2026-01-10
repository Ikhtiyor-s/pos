import { useNavigate } from 'react-router-dom';
import { Users, Clock, Check } from 'lucide-react';

// Mock data - keyinchalik API'dan olinadi
const tables = [
  { id: '1', number: 1, capacity: 2, status: 'free', guestCount: 0 },
  { id: '2', number: 2, capacity: 4, status: 'occupied', guestCount: 3, orderTime: '15 min' },
  { id: '3', number: 3, capacity: 4, status: 'free', guestCount: 0 },
  { id: '4', number: 4, capacity: 6, status: 'reserved', guestCount: 5 },
  { id: '5', number: 5, capacity: 2, status: 'free', guestCount: 0 },
  { id: '6', number: 6, capacity: 4, status: 'occupied', guestCount: 2, orderTime: '8 min' },
  { id: '7', number: 7, capacity: 8, status: 'free', guestCount: 0 },
  { id: '8', number: 8, capacity: 4, status: 'free', guestCount: 0 },
  { id: '9', number: 9, capacity: 2, status: 'occupied', guestCount: 2, orderTime: '22 min' },
  { id: '10', number: 10, capacity: 6, status: 'free', guestCount: 0 },
];

export default function TablesPage() {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'free':
        return 'bg-green-500';
      case 'occupied':
        return 'bg-orange-500';
      case 'reserved':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'free':
        return 'Bo\'sh';
      case 'occupied':
        return 'Band';
      case 'reserved':
        return 'Bron';
      default:
        return '';
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stollar</h1>
            <p className="text-sm opacity-90">Stolni tanlang</p>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm"
          >
            Buyurtmalar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4">
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {tables.filter((t) => t.status === 'free').length}
          </div>
          <div className="text-xs text-green-700">Bo'sh</div>
        </div>
        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {tables.filter((t) => t.status === 'occupied').length}
          </div>
          <div className="text-xs text-orange-700">Band</div>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {tables.filter((t) => t.status === 'reserved').length}
          </div>
          <div className="text-xs text-blue-700">Bron</div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => navigate(`/menu/${table.id}`)}
              className="btn-touch relative overflow-hidden rounded-2xl bg-white p-6 shadow-md transition-all active:scale-95"
            >
              {/* Status indicator */}
              <div className={`absolute right-0 top-0 h-3 w-3 rounded-bl-lg ${getStatusColor(table.status)}`} />

              {/* Table number */}
              <div className="mb-3 text-3xl font-bold text-gray-800">
                {table.number}
              </div>

              {/* Table info */}
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{table.capacity} o'rin</span>
                </div>

                {table.status === 'occupied' && table.guestCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{table.guestCount} kishi</span>
                  </div>
                )}

                {table.status === 'occupied' && table.orderTime && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <span>{table.orderTime}</span>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className="mt-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium text-white ${getStatusColor(table.status)}`}
                >
                  {getStatusText(table.status)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
