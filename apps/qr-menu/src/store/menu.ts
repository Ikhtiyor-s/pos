import { create } from 'zustand';
import {
  getMenuByTable,
  placeOrder as placeOrderApi,
  getOrderStatus,
  type TenantInfo,
  type TableInfo,
  type Category,
  type Product,
  type OrderResponse,
} from '@/services/api';

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  notes: string;
}

interface MenuState {
  // Data
  tenant: TenantInfo | null;
  table: TableInfo | null;
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  orderResponse: OrderResponse | null;

  // UI state
  loading: boolean;
  error: string | null;
  activeCategory: string | null;
  showCart: boolean;

  // Actions
  loadMenu: (qrCode: string) => Promise<void>;
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  setActiveCategory: (categoryId: string | null) => void;
  setShowCart: (show: boolean) => void;
  placeOrder: (customerName?: string, customerPhone?: string) => Promise<void>;
  checkOrderStatus: () => Promise<void>;
  resetOrder: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  // Initial state
  tenant: null,
  table: null,
  categories: [],
  products: [],
  cart: [],
  orderId: null,
  orderNumber: null,
  orderStatus: null,
  orderResponse: null,
  loading: false,
  error: null,
  activeCategory: null,
  showCart: false,

  loadMenu: async (qrCode: string) => {
    set({ loading: true, error: null });
    try {
      const data = await getMenuByTable(qrCode);
      const cats = (data.categories || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const prods = (data.products || []).filter((p: any) => p.available !== false && p.isActive !== false);
      set({
        tenant: data.tenant,
        table: data.table,
        categories: cats,
        products: prods,
        activeCategory: cats.length > 0 ? cats[0].id : null,
        loading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Menyu yuklanmadi. Qaytadan urinib ko'ring.";
      set({ error: message, loading: false });
    }
  },

  addToCart: (product: Product, quantity = 1, notes = '') => {
    const { cart } = get();
    const existing = cart.find((item) => item.productId === product.id);

    if (existing) {
      set({
        cart: cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
            : item,
        ),
      });
    } else {
      set({
        cart: [...cart, { productId: product.id, product, quantity, notes }],
      });
    }
  },

  removeFromCart: (productId: string) => {
    set({ cart: get().cart.filter((item) => item.productId !== productId) });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    });
  },

  setItemNotes: (productId: string, notes: string) => {
    set({
      cart: get().cart.map((item) =>
        item.productId === productId ? { ...item, notes } : item,
      ),
    });
  },

  clearCart: () => set({ cart: [] }),

  setActiveCategory: (categoryId: string | null) => set({ activeCategory: categoryId }),

  setShowCart: (show: boolean) => set({ showCart: show }),

  placeOrder: async (customerName?: string, customerPhone?: string) => {
    const { table, cart } = get();
    if (!table || cart.length === 0) return;

    set({ loading: true, error: null });
    try {
      const response = await placeOrderApi({
        tableId: table.id,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
      });

      set({
        orderId: response.id,
        orderNumber: response.orderNumber,
        orderStatus: response.status,
        orderResponse: response,
        cart: [],
        showCart: false,
        loading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Buyurtma yuborilmadi. Qaytadan urinib ko'ring.";
      set({ error: message, loading: false });
    }
  },

  checkOrderStatus: async () => {
    const { orderId } = get();
    if (!orderId) return;

    try {
      const response = await getOrderStatus(orderId);
      set({
        orderStatus: response.status,
        orderResponse: response,
      });
    } catch {
      // Silently fail status check
    }
  },

  resetOrder: () => {
    set({
      orderId: null,
      orderNumber: null,
      orderStatus: null,
      orderResponse: null,
      showCart: false,
    });
  },
}));
