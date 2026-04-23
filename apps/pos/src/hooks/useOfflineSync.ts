import { useState, useEffect, useCallback, useRef } from 'react';
import {
  syncService,
  type SyncState,
  type SyncOrderPayload,
  type ConflictRecord,
} from '../services/sync.service';
import { useOfflineStore } from '../store/offline';

// ==========================================
// useOfflineSync HOOK
// ==========================================

export interface OfflineSyncHookState extends SyncState {
  isOnline: boolean;
  pendingTotalCount: number;
}

export function useOfflineSync() {
  const [state, setState] = useState<SyncState>(syncService.getState());
  const {
    setConnectionStatus,
    setPendingCount,
    setSyncProgress,
    setConflictCount,
    setLastSyncError,
    setLastSyncAt,
  } = useOfflineStore();
  const autoSyncStarted = useRef(false);

  // syncService dan subscribe
  useEffect(() => {
    const unsubscribe = syncService.subscribe((s) => {
      setState(s);
      const online = navigator.onLine;
      setConnectionStatus(s.isSyncing ? 'syncing' : online ? 'online' : 'offline');
      setPendingCount(s.pendingCount);
      setSyncProgress(s.syncProgress);
      setConflictCount(s.conflicts.length);
      setLastSyncError(s.lastError);
      if (s.lastSyncAt) setLastSyncAt(s.lastSyncAt);
    });
    return unsubscribe;
  }, [setConnectionStatus, setPendingCount, setSyncProgress, setConflictCount, setLastSyncError, setLastSyncAt]);

  // Auto-sync ni bir marta boshlash
  useEffect(() => {
    if (!autoSyncStarted.current) {
      autoSyncStarted.current = true;
      syncService.startAutoSync(30_000);
    }
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const manualSync = useCallback(() => syncService.sync(), []);

  const enqueueOrder = useCallback(
    (order: SyncOrderPayload) => syncService.enqueueOrder(order),
    []
  );

  const enqueueOrderStatus = useCallback(
    (orderId: string, status: string, version: number) =>
      syncService.enqueueOrderStatus(orderId, status, version),
    []
  );

  const enqueueTableStatus = useCallback(
    (tableId: string, status: string) => syncService.enqueueTableStatus(tableId, status),
    []
  );

  const enqueuePayment = useCallback(
    (orderId: string, data: { method: string; amount: number; reference?: string }) =>
      syncService.enqueuePayment(orderId, data),
    []
  );

  const resolveConflict = useCallback(
    (queueId: string, strategy: 'keep-server' | 'keep-client') =>
      syncService.resolveConflict(queueId, strategy),
    []
  );

  const clearAllConflicts = useCallback(() => syncService.clearAllConflicts(), []);

  // Offline data getters
  const getOfflineProducts = useCallback(() => syncService.getOfflineProducts(), []);
  const getOfflineCategories = useCallback(() => syncService.getOfflineCategories(), []);
  const getOfflineTables = useCallback(() => syncService.getOfflineTables(), []);
  const getOfflineOrders = useCallback(() => syncService.getOfflineOrders(), []);

  return {
    ...state,
    isOnline: navigator.onLine,
    pendingTotalCount: state.pendingCount,
    manualSync,
    enqueueOrder,
    enqueueOrderStatus,
    enqueueTableStatus,
    enqueuePayment,
    resolveConflict,
    clearAllConflicts,
    getOfflineProducts,
    getOfflineCategories,
    getOfflineTables,
    getOfflineOrders,
  };
}
