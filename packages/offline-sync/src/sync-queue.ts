// ==========================================
// SYNC QUEUE — Offline operatsiyalarni navbatga qo'yish
// Online bo'lganda ketma-ket sync qilish
// ==========================================

import { offlineStore, STORES } from './offline-store.js';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncEntity = 'order' | 'order_item' | 'payment' | 'table_status';
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';

export interface SyncQueueItem {
  id?: number; // Auto-increment
  entity: SyncEntity;
  operation: SyncOperation;
  entityId: string;
  data: any;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  createdAt: string;
  syncedAt?: string;
  // Conflict resolution
  localVersion: number;
  serverVersion?: number;
}

export class SyncQueue {
  // ==========================================
  // ENQUEUE — Operatsiyani navbatga qo'shish
  // ==========================================

  async enqueue(
    entity: SyncEntity,
    operation: SyncOperation,
    entityId: string,
    data: any,
  ): Promise<SyncQueueItem> {
    // Bir xil entity+operation uchun mavjud pending itemni yangilash
    const existing = await this.findPending(entity, entityId);
    if (existing && operation === 'UPDATE') {
      // Oxirgi ma'lumot bilan yangilash (last-write-wins for pending)
      const updated: SyncQueueItem = {
        ...existing,
        data: { ...existing.data, ...data },
        createdAt: new Date().toISOString(),
      };
      await offlineStore.put(STORES.SYNC_QUEUE, updated);
      return updated;
    }

    const item: SyncQueueItem = {
      entity,
      operation,
      entityId,
      data,
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
      localVersion: Date.now(),
    };

    await offlineStore.put(STORES.SYNC_QUEUE, item);
    return item;
  }

  // ==========================================
  // GET PENDING — Sync kutayotgan itemlar
  // ==========================================

  async getPending(): Promise<SyncQueueItem[]> {
    return offlineStore.getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'status', 'pending');
  }

  async getFailed(): Promise<SyncQueueItem[]> {
    return offlineStore.getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'status', 'failed');
  }

  async getConflicts(): Promise<SyncQueueItem[]> {
    return offlineStore.getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'status', 'conflict');
  }

  async getAll(): Promise<SyncQueueItem[]> {
    return offlineStore.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  }

  async getQueueSize(): Promise<number> {
    return offlineStore.count(STORES.SYNC_QUEUE);
  }

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  async markSyncing(id: number): Promise<void> {
    const item = await offlineStore.get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (item) {
      item.status = 'syncing';
      await offlineStore.put(STORES.SYNC_QUEUE, item);
    }
  }

  async markCompleted(id: number): Promise<void> {
    const item = await offlineStore.get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (item) {
      item.status = 'completed';
      item.syncedAt = new Date().toISOString();
      // Log ga ko'chirish
      await offlineStore.put(STORES.SYNC_LOG, {
        entity: item.entity,
        operation: item.operation,
        entityId: item.entityId,
        syncedAt: item.syncedAt,
      });
      // Queue dan o'chirish
      await offlineStore.delete(STORES.SYNC_QUEUE, id);
    }
  }

  async markFailed(id: number, error: string): Promise<void> {
    const item = await offlineStore.get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (item) {
      item.retryCount++;
      item.errorMessage = error;
      item.status = item.retryCount >= item.maxRetries ? 'failed' : 'pending';
      await offlineStore.put(STORES.SYNC_QUEUE, item);
    }
  }

  async markConflict(id: number, serverVersion: number): Promise<void> {
    const item = await offlineStore.get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (item) {
      item.status = 'conflict';
      item.serverVersion = serverVersion;
      await offlineStore.put(STORES.SYNC_QUEUE, item);
    }
  }

  // ==========================================
  // CONFLICT RESOLUTION
  // ==========================================

  async resolveConflict(id: number, strategy: 'local' | 'server'): Promise<void> {
    const item = await offlineStore.get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (!item) return;

    if (strategy === 'local') {
      // Lokal versiya bilan qayta sync qilish
      item.status = 'pending';
      item.retryCount = 0;
      await offlineStore.put(STORES.SYNC_QUEUE, item);
    } else {
      // Server versiyasi qabul — lokal o'chirish
      await offlineStore.delete(STORES.SYNC_QUEUE, id);
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async findPending(entity: SyncEntity, entityId: string): Promise<SyncQueueItem | undefined> {
    const pending = await this.getPending();
    return pending.find(p => p.entity === entity && p.entityId === entityId);
  }

  async clearCompleted(): Promise<void> {
    const all = await this.getAll();
    for (const item of all) {
      if (item.status === 'completed' && item.id) {
        await offlineStore.delete(STORES.SYNC_QUEUE, item.id);
      }
    }
  }
}

export const syncQueue = new SyncQueue();
