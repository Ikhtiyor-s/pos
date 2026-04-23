import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEVICE_ID } from '../services/sync.service';

// ==========================================
// TYPES
// ==========================================

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface CachedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  mxikCode?: string | null;
  sortOrder?: number;
}

export interface CachedCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface CachedTable {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: string;
}

// ==========================================
// STORE
// ==========================================

interface OfflineState {
  // Meta
  deviceId: string;
  connectionStatus: ConnectionStatus;
  lastSyncAt: string | null;
  lastPullAt: string | null;

  // Cached data (server → local)
  products: CachedProduct[];
  categories: CachedCategory[];
  tables: CachedTable[];
  settings: any | null;

  // Sync stats (display only — real queue is in syncService)
  pendingCount: number;
  conflictCount: number;
  lastSyncError: string | null;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPendingCount: (count: number) => void;
  setConflictCount: (count: number) => void;
  setLastSyncError: (error: string | null) => void;

  // Cache update actions (from pullData)
  applyPullData: (data: {
    products: any[];
    categories: any[];
    tables: any[];
    settings: any;
    syncedAt: string;
  }) => void;

  // Table status local update (optimistic)
  updateTableStatus: (tableId: string, status: string) => void;

  // Product local update (optimistic)
  updateProductStock: (productId: string, delta: number) => void;

  // Getters
  getProductById: (id: string) => CachedProduct | undefined;
  getTableById: (id: string) => CachedTable | undefined;
  isOffline: () => boolean;
  hasPending: () => boolean;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      deviceId: DEVICE_ID,
      connectionStatus: navigator.onLine ? 'online' : 'offline',
      lastSyncAt: null,
      lastPullAt: null,
      products: [],
      categories: [],
      tables: [],
      settings: null,
      pendingCount: 0,
      conflictCount: 0,
      lastSyncError: null,

      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setPendingCount: (count) => set({ pendingCount: count }),
      setConflictCount: (count) => set({ conflictCount: count }),
      setLastSyncError: (error) => set({ lastSyncError: error }),

      applyPullData: (data) => {
        const products: CachedProduct[] = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.image || undefined,
          categoryId: p.categoryId,
          categoryName: p.category?.name || '',
          isActive: p.isActive,
          mxikCode: p.mxikCode || null,
          sortOrder: p.sortOrder || 0,
        }));

        const categories: CachedCategory[] = data.categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sortOrder: c.sortOrder || 0,
        }));

        const tables: CachedTable[] = data.tables.map((t: any) => ({
          id: t.id,
          number: t.number,
          name: t.name || undefined,
          capacity: t.capacity,
          status: t.status,
        }));

        set({
          products,
          categories,
          tables,
          settings: data.settings || null,
          lastPullAt: data.syncedAt,
          lastSyncAt: data.syncedAt,
        });
      },

      updateTableStatus: (tableId, status) => {
        set((state) => ({
          tables: state.tables.map(t => t.id === tableId ? { ...t, status } : t),
        }));
      },

      updateProductStock: (productId, delta) => {
        // Mahalliy ko'rsatish uchun (if stock tracking enabled)
        set((state) => ({
          products: state.products.map(p => p.id === productId ? { ...p } : p),
        }));
      },

      getProductById: (id) => get().products.find(p => p.id === id),
      getTableById: (id) => get().tables.find(t => t.id === id),
      isOffline: () => get().connectionStatus === 'offline',
      hasPending: () => get().pendingCount > 0,
    }),
    {
      name: 'pos-offline-v2',
      partialize: (state) => ({
        products: state.products,
        categories: state.categories,
        tables: state.tables,
        settings: state.settings,
        lastSyncAt: state.lastSyncAt,
        lastPullAt: state.lastPullAt,
      }),
    }
  )
);
