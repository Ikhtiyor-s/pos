import { useState, useEffect, useCallback, useRef } from 'react';
import { syncService, type SyncOrderPayload, type ConflictRecord } from '../services/sync.service';
import { useOfflineStore } from '../store/offline';

// ==========================================
// useOfflineSync HOOK
// Offline sync holatini kuzatadi va boshqaradi
// ==========================================

export interface OfflineSyncState {
  isSyncing: boolean;
  isOnline: boolean;
  pendingOrdersCount: number;
  pendingStatusCount: number;
  pendingTotalCount: number;
  conflicts: ConflictRecord[];
  lastSyncAt: string | null;
  lastError: string | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>(() => {
    const s = syncService.getState();
    return {
      isSyncing: s.isSyncing,
      isOnline: navigator.onLine,
      pendingOrdersCount: s.pendingOrdersCount,
      pendingStatusCount: s.pendingStatusCount,
      pendingTotalCount: s.pendingOrdersCount + s.pendingStatusCount,
      conflicts: s.conflicts,
      lastSyncAt: s.lastSyncAt,
      lastError: s.lastError,
    };
  });

  const { setConnectionStatus, setPendingCount, setConflictCount, setLastSyncError } = useOfflineStore();
  const autoSyncStarted = useRef(false);

  // syncService dan state subscribe qilish
  useEffect(() => {
    const unsubscribe = syncService.subscribe((s) => {
      const online = navigator.onLine;
      const total = s.pendingOrdersCount + s.pendingStatusCount;

      setState({
        isSyncing: s.isSyncing,
        isOnline: online,
        pendingOrdersCount: s.pendingOrdersCount,
        pendingStatusCount: s.pendingStatusCount,
        pendingTotalCount: total,
        conflicts: s.conflicts,
        lastSyncAt: s.lastSyncAt,
        lastError: s.lastError,
      });

      // Zustand store ni ham yangilash (SyncStatusBar uchun)
      setConnectionStatus(s.isSyncing ? 'syncing' : online ? 'online' : 'offline');
      setPendingCount(total);
      setConflictCount(s.conflicts.length);
      setLastSyncError(s.lastError);
    });

    return unsubscribe;
  }, [setConnectionStatus, setPendingCount, setConflictCount, setLastSyncError]);

  // Auto-sync ni boshlash (bir marta)
  useEffect(() => {
    if (!autoSyncStarted.current) {
      autoSyncStarted.current = true;
      syncService.startAutoSync(30_000);
    }

    return () => {
      // Component unmount bo'lganda to'xtatmaymiz — app bo'yi davom etishi kerak
    };
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const manualSync = useCallback(async () => {
    return syncService.sync();
  }, []);

  const enqueueOrder = useCallback((order: SyncOrderPayload) => {
    syncService.enqueueOrder(order);
  }, []);

  const enqueueOrderStatus = useCallback((orderId: string, status: string, version: number) => {
    syncService.enqueueOrderStatus(orderId, status, version);
  }, []);

  const enqueueItemStatus = useCallback((orderId: string, itemId: string, status: string) => {
    syncService.enqueueItemStatus(orderId, itemId, status);
  }, []);

  const enqueueTableStatus = useCallback((tableId: string, status: string) => {
    syncService.enqueueTableStatus(tableId, status);
  }, []);

  const resolveConflict = useCallback((clientOrderId: string, strategy: 'keep-server' | 'keep-client') => {
    syncService.resolveConflict(clientOrderId, strategy);
  }, []);

  const clearAllConflicts = useCallback(() => {
    syncService.clearAllConflicts();
  }, []);

  return {
    ...state,
    manualSync,
    enqueueOrder,
    enqueueOrderStatus,
    enqueueItemStatus,
    enqueueTableStatus,
    resolveConflict,
    clearAllConflicts,
  };
}
