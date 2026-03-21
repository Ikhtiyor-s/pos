import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import { useMenuStore } from '@/store/menu';
import type { Product } from '@/services/api';

interface Props {
  product: Product;
  onClose: () => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + " so'm";
}

export default function ProductDetailModal({ product, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const { addToCart } = useMenuStore();

  const handleAdd = () => {
    addToCart(product, quantity, notes);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Product image */}
        <div className="aspect-video bg-gray-100 relative overflow-hidden flex-shrink-0">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
              🍽
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>

          {product.description && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{product.description}</p>
          )}

          {/* Weight / Calories */}
          {(product.weight || product.calories) && (
            <div className="flex gap-4 mt-3">
              {product.weight && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {product.weight}
                </span>
              )}
              {product.calories && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                  {product.calories} kkal
                </span>
              )}
            </div>
          )}

          <p className="text-xl font-bold text-orange-500 mt-4">
            {formatPrice(product.price)}
          </p>

          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-5 mt-6">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-orange-400 active:scale-90 transition-all"
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full border-2 border-orange-400 bg-orange-50 flex items-center justify-center hover:bg-orange-100 active:scale-90 transition-all"
            >
              <Plus className="w-5 h-5 text-orange-500" />
            </button>
          </div>

          {/* Notes */}
          <div className="mt-5">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Izoh qo'shish (masalan: tuzsiz, achchiqsiz...)"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Add to cart button */}
        <div className="p-5 pt-0 flex-shrink-0">
          <button
            onClick={handleAdd}
            className="w-full py-3.5 bg-orange-500 text-white font-semibold rounded-2xl hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
          >
            <span>Savatga qo'shish</span>
            <span className="text-orange-200">|</span>
            <span>{formatPrice(product.price * quantity)}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
