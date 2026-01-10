import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Check } from 'lucide-react';

// Mock data
const categories = [
  { id: '1', name: 'Osh va taomlar', icon: '🍛' },
  { id: '2', name: 'Salatlar', icon: '🥗' },
  { id: '3', name: "Sho'rvalar", icon: '🍲' },
  { id: '4', name: 'Ichimliklar', icon: '🍵' },
  { id: '5', name: 'Shirinliklar', icon: '🍰' },
];

const products = [
  { id: '1', name: "O'zbek oshi", price: 45000, categoryId: '1', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=200' },
  { id: '2', name: 'Samarqand oshi', price: 50000, categoryId: '1', image: 'https://images.unsplash.com/photo-1645177628172-a94c30a5d4f8?w=200' },
  { id: '3', name: 'Manti', price: 35000, categoryId: '1', image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=200' },
  { id: '4', name: 'Shashlik', price: 25000, categoryId: '1', image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=200' },
  { id: '7', name: 'Achichuk', price: 15000, categoryId: '2', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200' },
  { id: '8', name: 'Shakarob', price: 18000, categoryId: '2', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200' },
  { id: '10', name: "Sho'rva", price: 30000, categoryId: '3', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200' },
  { id: '13', name: "Ko'k choy", price: 8000, categoryId: '4', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=200' },
  { id: '17', name: 'Chak-chak', price: 15000, categoryId: '5', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=200' },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function MenuPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('1');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const filteredProducts = products.filter((p) => p.categoryId === selectedCategory);

  const addToCart = (product: typeof products[0]) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  const handleConfirmOrder = () => {
    alert('Buyurtma yuborildi!');
    setCart([]);
    navigate('/tables');
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 text-white">
        <button onClick={() => navigate('/tables')} className="btn-touch rounded-full p-2 hover:bg-white/10">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">Stol #{tableId}</h1>
          <p className="text-xs opacity-90">Buyurtma qabul qiling</p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="btn-touch relative rounded-full p-2 hover:bg-white/10"
        >
          <ShoppingCart className="h-6 w-6" />
          {getTotalItems() > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-orange-500">
              {getTotalItems()}
            </span>
          )}
        </button>
      </div>

      {/* Categories */}
      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`btn-touch whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="btn-touch group overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-lg active:scale-95"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-3 text-left">
                <h3 className="mb-1 text-sm font-semibold text-gray-800">{product.name}</h3>
                <p className="text-sm font-bold text-orange-500">{formatPrice(product.price)}</p>
              </div>
              <div className="absolute right-2 top-2 rounded-full bg-orange-500 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Plus className="h-4 w-4 text-white" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Overlay */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCart(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Buyurtma</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400">
                ×
              </button>
            </div>

            {/* Cart Items */}
            <div className="mb-6 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="btn-touch rounded-full bg-gray-200 p-1 hover:bg-gray-300"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="btn-touch rounded-full bg-orange-500 p-1 text-white hover:bg-orange-600"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white">
              <span className="text-lg font-bold">Jami:</span>
              <span className="text-2xl font-bold">{formatPrice(getTotalPrice())}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setCart([])}
                className="btn-touch flex-1 rounded-xl bg-gray-200 py-3 font-medium text-gray-700 hover:bg-gray-300"
              >
                <Trash2 className="mr-2 inline h-5 w-5" />
                Tozalash
              </button>
              <button
                onClick={handleConfirmOrder}
                className="btn-touch flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 py-3 font-medium text-white hover:from-orange-600 hover:to-pink-600"
              >
                <Check className="mr-2 inline h-5 w-5" />
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
