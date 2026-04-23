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
// STORE — lightweight display state only
// Real data is in IndexedDB (offlineDB)
// ==========================================

interface OfflineState {
  deviceId: string;
  connectionStatus: ConnectionStatus;
  lastSyncAt: string | null;
  lastPullAt: string | null;

  // Display counters (synced from syncService)
  pendingCount: number;
  syncProgress: number;
  conflictCount: number;
  lastSyncError: string | null;

  // Settings cache (small, ok in localStorage)
  settings: any | null;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setPendingCount: (count: number) => void;
  setSyncProgress: (progress: number) => void;
  setConflictCount: (count: number) => void;
  setLastSyncError: (error: string | null) => void;
  setLastSyncAt: (at: string) => void;
  setLastPullAt: (at: string) => void;
  setSettings: (settings: any) => void;

  applyPullData: (data: { settings?: any; syncedAt: string }) => void;

  isOffline: () => boolean;
  hasPending: () => boolean;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      deviceId: DEVICE_ID,
      connectionStatus: (navigator?.onLine ?? true) ? 'online' : 'offline',
      lastSyncAt: null,
      lastPullAt: null,
      pendingCount: 0,
      syncProgress: 0,
      conflictCount: 0,
      lastSyncError: null,
      settings: null,

      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setPendingCount: (count) => set({ pendingCount: count }),
      setSyncProgress: (progress) => set({ syncProgress: progress }),
      setConflictCount: (count) => set({ conflictCount: count }),
      setLastSyncError: (error) => set({ lastSyncError: error }),
      setLastSyncAt: (at) => set({ lastSyncAt: at }),
      setLastPullAt: (at) => set({ lastPullAt: at }),
      setSettings: (settings) => set({ settings }),

      applyPullData: (data) => {
        set({
          settings: data.settings || get().settings,
          lastPullAt: data.syncedAt,
          lastSyncAt: data.syncedAt,
        });
      },

      isOffline: () => get().connectionStatus === 'offline',
      hasPending: () => get().pendingCount > 0,
    }),
    {
      name: 'pos-offline-v3',
      partialize: (state) => ({
        settings: state.settings,
        lastSyncAt: state.lastSyncAt,
        lastPullAt: state.lastPullAt,
      }),
    }
  )
);
