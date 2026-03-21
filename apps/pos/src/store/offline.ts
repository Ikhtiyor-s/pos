import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==========================================
// OFFLINE STORE — POS Offline Mode
// Internet yo'qda ishlash uchun lokal ma'lumotlar
// ==========================================

export type ConnectionStatus = 'online' | 'local' | 'offline';

interface CachedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
}

interface CachedTable {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: string;
}

interface CachedCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

interface OfflineOrder {
  id: string;
  orderNumber: string;
  tableId?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: string;
  source: string;
  createdAt: string;
  synced: boolean;
}

interface OfflineState {
  // Connection
  connectionStatus: ConnectionStatus;
  lastSyncAt: string | null;
  serverUrl: string;

  // Cached data
  products: CachedProduct[];
  categories: CachedCategory[];
  tables: CachedTable[];

  // Offline orders (sync queue)
  pendingOrders: OfflineOrder[];
  pendingStatusUpdates: Array<{ orderId: string; status: string; createdAt: string }>;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setServerUrl: (url: string) => void;

  // Cache actions
  cacheProducts: (products: CachedProduct[]) => void;
  cacheCategories: (categories: CachedCategory[]) => void;
  cacheTables: (tables: CachedTable[]) => void;
  updateTableStatus: (tableId: string, status: string) => void;

  // Offline order actions
  addPendingOrder: (order: OfflineOrder) => void;
  markOrderSynced: (orderId: string) => void;
  addPendingStatusUpdate: (orderId: string, status: string) => void;
  clearSyncedOrders: () => void;

  // Getters
  getPendingCount: () => number;
  isOffline: () => boolean;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      connectionStatus: 'online',
      lastSyncAt: null,
      serverUrl: '',
      products: [],
      categories: [],
      tables: [],
      pendingOrders: [],
      pendingStatusUpdates: [],

      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setServerUrl: (url) => set({ serverUrl: url }),

      cacheProducts: (products) => set({ products, lastSyncAt: new Date().toISOString() }),
      cacheCategories: (categories) => set({ categories }),
      cacheTables: (tables) => set({ tables }),

      updateTableStatus: (tableId, status) => {
        set((state) => ({
          tables: state.tables.map(t => t.id === tableId ? { ...t, status } : t),
        }));
      },

      addPendingOrder: (order) => {
        set((state) => ({
          pendingOrders: [...state.pendingOrders, order],
        }));
      },

      markOrderSynced: (orderId) => {
        set((state) => ({
          pendingOrders: state.pendingOrders.map(o =>
            o.id === orderId ? { ...o, synced: true } : o
          ),
        }));
      },

      addPendingStatusUpdate: (orderId, status) => {
        set((state) => ({
          pendingStatusUpdates: [
            ...state.pendingStatusUpdates,
            { orderId, status, createdAt: new Date().toISOString() },
          ],
        }));
      },

      clearSyncedOrders: () => {
        set((state) => ({
          pendingOrders: state.pendingOrders.filter(o => !o.synced),
          pendingStatusUpdates: [],
        }));
      },

      getPendingCount: () => {
        const { pendingOrders, pendingStatusUpdates } = get();
        return pendingOrders.filter(o => !o.synced).length + pendingStatusUpdates.length;
      },

      isOffline: () => get().connectionStatus === 'offline',
    }),
    {
      name: 'pos-offline-cache',
    }
  )
);
