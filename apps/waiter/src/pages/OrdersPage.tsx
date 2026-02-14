import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Check } from 'lucide-react';

// Mock orders
const orders = [
  {
    id: '1',
    tableNumber: 2,
    items: [
      { name: "O'zbek oshi", quantity: 2, price: 45000 },
      { name: "Ko'k choy", quantity: 2, price: 8000 },
    ],
    total: 106000,
    status: 'preparing',
    time: '15 min',
  },
  {
    id: '2',
    tableNumber: 6,
    items: [
      { name: 'Manti', quantity: 1, price: 35000 },
      { name: 'Achichuk', quantity: 1, price: 15000 },
    ],
    total: 50000,
    status: 'ready',
    time: '8 min',
  },
  {
    id: '3',
    tableNumber: 9,
    items: [
      { name: 'Shashlik', quantity: 3, price: 25000 },
      { name: "Sho'rva", quantity: 1, price: 30000 },
    ],
    total: 105000,
    status: 'new',
    time: '22 min',
  },
];

export default function OrdersPage() {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500';
      case 'preparing':
        return 'bg-yellow-500';
      case 'ready':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Yangi';
      case 'preparing':
        return 'Tayyorlanmoqda';
      case 'ready':
        return 'Tayyor';
      default:
        return '';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-white">
        <button onClick={() => navigate('/tables')} className="btn-touch rounded-full p-2 hover:bg-white/10">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Faol Buyurtmalar</h1>
          <p className="text-xs opacity-90">{orders.length} ta buyurtma</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-md">
              {/* Order Header */}
              <div className="flex items-center justify-between bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold">
                    {order.tableNumber}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Stol #{order.tableNumber}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{order.time}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium text-white ${getStatusColor(order.status)}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>

              {/* Order Items */}
              <div className="divide-y divide-gray-100 p-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                        {item.quantity}
                      </span>
                      <span className="text-gray-800">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-600">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Order Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Jami:</div>
                <div className="text-xl font-bold text-gray-800">{formatPrice(order.total)}</div>
              </div>

              {/* Actions */}
              {order.status === 'ready' && (
                <div className="flex gap-2 p-4 pt-0">
                  <button className="btn-touch flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-3 font-medium text-white">
                    <Check className="mr-2 inline h-5 w-5" />
                    Berildi
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
