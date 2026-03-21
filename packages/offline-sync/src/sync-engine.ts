// ==========================================
// SYNC ENGINE — Queue processor
// Online bo'lganda lokal ma'lumotlarni serverga sync qiladi
// ==========================================

import { syncQueue, SyncQueueItem } from './sync-queue.js';
import { networkDetector } from './network-detector.js';

type SyncHandler = (item: SyncQueueItem) => Promise<{
  success: boolean;
  serverVersion?: number;
  error?: string;
  conflict?: boolean;
}>;

interface SyncEngineConfig {
  syncInterval: number;     // Sync interval (ms) — default 5000
  batchSize: number;        // Bir vaqtda nechta item sync qilish
  retryDelay: number;       // Failed item qayta urinish orasidagi vaqt
  onSyncStart?: () => void;
  onSyncComplete?: (synced: number, failed: number) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (item: SyncQueueItem) => void;
}

export class SyncEngine {
  private handlers = new Map<string, SyncHandler>();
  private config: SyncEngineConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  constructor(config?: Partial<SyncEngineConfig>) {
    this.config = {
      syncInterval: 5000,
      batchSize: 10,
      retryDelay: 2000,
      ...config,
    };
  }

  // ==========================================
  // HANDLER REGISTRATION
  // ==========================================

  registerHandler(entityOperation: string, handler: SyncHandler): void {
    this.handlers.set(entityOperation, handler);
  }

  // ==========================================
  // START/STOP
  // ==========================================

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      if (networkDetector.isOnline() && !this.isSyncing) {
        this.processQueue().catch(console.error);
      }
    }, this.config.syncInterval);

    // Network qayta ulanishda darhol sync
    networkDetector.onStatusChange((online) => {
      if (online && !this.isSyncing) {
        this.processQueue().catch(console.error);
      }
    });

    console.log('[SyncEngine] Started, interval:', this.config.syncInterval, 'ms');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[SyncEngine] Stopped');
  }

  // ==========================================
  // QUEUE PROCESSING
  // ==========================================

  async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (!networkDetector.isOnline()) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    this.config.onSyncStart?.();

    let synced = 0;
    let failed = 0;

    try {
      const pending = await syncQueue.getPending();
      const batch = pending.slice(0, this.config.batchSize);

      for (const item of batch) {
        if (!item.id) continue;

        const handlerKey = `${item.entity}:${item.operation}`;
        const handler = this.handlers.get(handlerKey);

        if (!handler) {
          console.warn(`[SyncEngine] Handler topilmadi: ${handlerKey}`);
          await syncQueue.markFailed(item.id, `Handler topilmadi: ${handlerKey}`);
          failed++;
          continue;
        }

        try {
          await syncQueue.markSyncing(item.id);
          const result = await handler(item);

          if (result.success) {
            await syncQueue.markCompleted(item.id);
            synced++;
          } else if (result.conflict) {
            await syncQueue.markConflict(item.id, result.serverVersion || 0);
            this.config.onConflict?.(item);
            failed++;
          } else {
            await syncQueue.markFailed(item.id, result.error || 'Unknown error');
            failed++;
          }
        } catch (error: any) {
          await syncQueue.markFailed(item.id, error.message);
          failed++;
        }
      }
    } finally {
      this.isSyncing = false;
      this.config.onSyncComplete?.(synced, failed);
    }

    return { synced, failed };
  }

  // ==========================================
  // FORCE SYNC
  // ==========================================

  async forceSync(): Promise<{ synced: number; failed: number }> {
    return this.processQueue();
  }

  // ==========================================
  // STATUS
  // ==========================================

  async getStatus(): Promise<{
    pending: number;
    failed: number;
    conflicts: number;
    isSyncing: boolean;
    isOnline: boolean;
  }> {
    const [pending, failedItems, conflicts] = await Promise.all([
      syncQueue.getPending(),
      syncQueue.getFailed(),
      syncQueue.getConflicts(),
    ]);

    return {
      pending: pending.length,
      failed: failedItems.length,
      conflicts: conflicts.length,
      isSyncing: this.isSyncing,
      isOnline: networkDetector.isOnline(),
    };
  }
}

export const syncEngine = new SyncEngine();
