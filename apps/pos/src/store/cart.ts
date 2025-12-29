import { create } from 'zustand';
import type { Product, OrderType } from '@oshxona/shared';

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  orderType: OrderType;
  customerPhone: string | null;
  notes: string | null;
  discount: number;
  discountPercent: number;

  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  setTable: (tableId: string | null) => void;
  setOrderType: (type: OrderType) => void;
  setCustomerPhone: (phone: string | null) => void;
  setNotes: (notes: string | null) => void;
  setDiscount: (amount: number) => void;
  setDiscountPercent: (percent: number) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  orderType: 'DINE_IN',
  customerPhone: null,
  notes: null,
  discount: 0,
  discountPercent: 0,

  addItem: (product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.product.id === product.id);

      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      return {
        items: [...state.items, { product, quantity: 1 }],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  updateItemNotes: (productId, notes) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      ),
    }));
  },

  setTable: (tableId) => set({ tableId }),
  setOrderType: (orderType) => set({ orderType }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setNotes: (notes) => set({ notes }),
  setDiscount: (discount) => set({ discount, discountPercent: 0 }),
  setDiscountPercent: (discountPercent) => set({ discountPercent, discount: 0 }),

  clearCart: () =>
    set({
      items: [],
      tableId: null,
      orderType: 'DINE_IN',
      customerPhone: null,
      notes: null,
      discount: 0,
      discountPercent: 0,
    }),

  getSubtotal: () => {
    return get().items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const { discount, discountPercent } = get();

    if (discountPercent > 0) {
      return subtotal - subtotal * (discountPercent / 100);
    }

    return subtotal - discount;
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
}));
