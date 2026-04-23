import api from './api';
import { offlineDB, type QueueItem, type OperationType } from './offline-db';

// ==========================================
// RE-EXPORT types for backward compatibility
// ==========================================

export type { QueueItem, OperationType };

export interface SyncOrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: string;
}

export interface SyncOrderPayload {
  id: string;
  orderNumber: string;
  source: string;
  type: string;
  status: string;
  tableId?: string;
  userId: string;
  items: SyncOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  deviceId: string;
  version: number;
  createdAt: string;
}

export interface ConflictRecord {
  queueId: string;
  operation: OperationType;
  body: any;
  serverData: any;
  detectedAt: string;
}

export interface SyncResult {
  success: boolean;
  action: 'created' | 'updated' | 'conflict' | 'duplicate' | 'skipped' | 'error';
  serverId?: string;
  conflictData?: any;
  message: string;
}

export interface BulkSyncResult {
  total: number;
  synced: number;
  conflicts: number;
  errors: number;
  results: Array<{ clientId: string; result: SyncResult }>;
}

export interface PullDataResult {
  products: any[];
  categories: any[];
  tables: any[];
  recentOrders: any[];
  settings: any;
  syncedAt: string;
  counts: { products: number; categories: number; tables: number; activeOrders: number };
}

// ==========================================
// DEVICE ID
// ==========================================

function getDeviceId(): string {
  let deviceId = localStorage.getItem('pos-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('pos-device-id', deviceId);
  }
  return deviceId;
}

export const DEVICE_ID = getDeviceId();

// ==========================================
// SYNC STATE
// ==========================================

export interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  syncProgress: number;
  conflicts: ConflictRecord[];
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

// ==========================================
// OFFLINE SYNC SERVICE (IndexedDB)
// ==========================================

class OfflineSyncService {
  private listeners: SyncListener[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private syncProgress = 0;
  private conflicts: ConflictRecord[] = [];
  private lastError: string | null = null;
  private pendingCount = 0;
  private swRegistration: ServiceWorkerRegistration | null = null;

  // ==========================================
  // INIT
  // ==========================================

  async init(): Promise<void> {
    await offlineDB.init();
    this.pendingCount = await offlineDB.getPendingCount();
    this.notify();
    this.registerServiceWorker();
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // SW dan kelgan xabarlar
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleSwMessage(event.data);
      });
    } catch {
      // SW ishlamasa ham davom etamiz
    }
  }

  private handleSwMessage(msg: any) {
    if (!msg?.type) return;
    switch (msg.type) {
      case 'SYNC_STARTED':
        this.isSyncing = true;
        this.syncProgress = 0;
        this.notify();
        break;
      case 'SYNC_COMPLETE':
        this.isSyncing = false;
        this.syncProgress = 100;
        if (msg.synced > 0) {
          offlineDB.setLastSyncAt(new Date().toISOString());
        }
        this.refreshPendingCount();
        break;
      case 'SYNC_ERROR':
        this.isSyncing = false;
        this.lastError = msg.error;
        this.notify();
        break;
    }
  }

  // ==========================================
  // OBSERVER PATTERN
  // ==========================================

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    // Darhol joriy state bilan chaqirish
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  getState(): SyncState {
    return {
      isSyncing: this.isSyncing,
      lastSyncAt: null,
      pendingCount: this.pendingCount,
      syncProgress: this.syncProgress,
      conflicts: this.conflicts,
      lastError: this.lastError,
    };
  }

  private async refreshPendingCount() {
    this.pendingCount = await offlineDB.getPendingCount();
    this.notify();
  }

  // ==========================================
  // ENQUEUE OPERATIONS
  // ==========================================

  async enqueueOrder(order: SyncOrderPayload): Promise<void> {
    const existing = await offlineDB.getQueueItem(order.id);
    if (existing && existing.status !== 'failed') return;

    await offlineDB.enqueue({
      id: order.id,
      operation: 'CREATE_ORDER',
      url: '/api/sync/orders',
      method: 'POST',
      body: { ...order, deviceId: DEVICE_ID },
      timestamp: Date.now(),
      maxRetries: 5,
      deviceId: DEVICE_ID,
    });

    // Optimistic: local IDB ga ham saqlash
    await offlineDB.upsertOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      tableId: order.tableId,
      items: order.items,
      createdAt: order.createdAt,
      updatedAt: order.createdAt,
    });

    await this.refreshPendingCount();
    this.triggerBackgroundSync();
  }

  async enqueueOrderUpdate(orderId: string, updates: Partial<SyncOrderPayload>, version: number): Promise<void> {
    const id = `update-${orderId}-${Date.now()}`;
    await offlineDB.enqueue({
      id,
      operation: 'UPDATE_ORDER',
      url: `/api/orders/${orderId}`,
      method: 'PUT',
      body: { ...updates, version, deviceId: DEVICE_ID },
      timestamp: Date.now(),
      maxRetries: 5,
      deviceId: DEVICE_ID,
    });
    await this.refreshPendingCount();
    this.triggerBackgroundSync();
  }

  async enqueuePayment(orderId: string, paymentData: {
    method: string;
    amount: number;
    reference?: string;
  }): Promise<void> {
    const id = `payment-${orderId}-${Date.now()}`;
    await offlineDB.enqueue({
      id,
      operation: 'CREATE_PAYMENT',
      url: `/api/payments`,
      method: 'POST',
      body: { orderId, ...paymentData, deviceId: DEVICE_ID },
      timestamp: Date.now(),
      maxRetries: 5,
      deviceId: DEVICE_ID,
    });
    await this.refreshPendingCount();
    this.triggerBackgroundSync();
  }

  async enqueueOrderStatus(orderId: string, status: string, version: number): Promise<void> {
    // Bir xil order uchun eskilarni olib tashlaymiz (last-write-wins)
    const all = await offlineDB.getAllQueue();
    const old = all.find(
      i => i.operation === 'UPDATE_STATUS' && i.body?.orderId === orderId && i.status === 'pending'
    );
    if (old) await offlineDB.removeQueueItem(old.id);

    const id = `status-order-${orderId}-${Date.now()}`;
    await offlineDB.enqueue({
      id,
      operation: 'UPDATE_STATUS',
      url: `/api/sync/order-status`,
      method: 'POST',
      body: { orderId, status, version, deviceId: DEVICE_ID },
      timestamp: Date.now(),
      maxRetries: 5,
      deviceId: DEVICE_ID,
    });

    await offlineDB.updateOrderStatus(orderId, status);
    await this.refreshPendingCount();
    this.triggerBackgroundSync();
  }

  async enqueueTableStatus(tableId: string, status: string): Promise<void> {
    const all = await offlineDB.getAllQueue();
    const old = all.find(
      i => i.operation === 'UPDATE_TABLE' && i.body?.tableId === tableId && i.status === 'pending'
    );
    if (old) await offlineDB.removeQueueItem(old.id);

    const id = `status-table-${tableId}-${Date.now()}`;
    await offlineDB.enqueue({
      id,
      operation: 'UPDATE_TABLE',
      url: `/api/sync/table-status`,
      method: 'POST',
      body: { tableId, status, deviceId: DEVICE_ID },
      timestamp: Date.now(),
      maxRetries: 5,
      deviceId: DEVICE_ID,
    });

    await offlineDB.updateTableStatus(tableId, status);
    await this.refreshPendingCount();
    this.triggerBackgroundSync();
  }

  // ==========================================
  // BACKGROUND SYNC TRIGGER
  // ==========================================

  private triggerBackgroundSync() {
    const reg = this.swRegistration as any;
    if (reg?.sync) {
      reg.sync.register(SYNC_TAG).catch(() => {
        // Background Sync qo'llab-quvvatlanmasa — manual sync
        if (navigator.onLine) {
          setTimeout(() => this.sync(), 500);
        }
      });
    } else if (navigator.onLine) {
      setTimeout(() => this.sync(), 500);
    }
  }

  // ==========================================
  // MANUAL SYNC (fallback)
  // ==========================================

  async sync(): Promise<{ synced: number; conflicts: number; errors: number }> {
    if (this.isSyncing || !navigator.onLine) return { synced: 0, conflicts: 0, errors: 0 };

    try {
      await api.get('/sync/health');
    } catch {
      return { synced: 0, conflicts: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.syncProgress = 0;
    this.lastError = null;
    this.notify();

    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      const pending = await offlineDB.getPendingQueue();
      const total = pending.length;
      if (total === 0) return { synced: 0, conflicts: 0, errors: 0 };

      const BATCH_SIZE = 20;
      let processed = 0;

      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);

        const res = await api.post('/sync/batch', {
          operations: batch.map(item => ({
            queueId: item.id,
            operation: item.operation,
            url: item.url,
            method: item.method,
            body: item.body,
            deviceId: item.deviceId,
          })),
        });

        const results: Array<{ queueId: string; success: boolean; conflict: boolean; message: string; data?: any }> =
          res.data?.data?.results || [];

        for (const r of results) {
          if (r.success) {
            await offlineDB.markQueueDone(r.queueId);
            synced++;
          } else if (r.conflict) {
            await offlineDB.markQueueConflict(r.queueId, r.message);
            const item = batch.find(b => b.id === r.queueId);
            if (item) {
              this.conflicts.push({
                queueId: r.queueId,
                operation: item.operation,
                body: item.body,
                serverData: r.data,
                detectedAt: new Date().toISOString(),
              });
            }
            conflicts++;
          } else {
            const item = batch.find(b => b.id === r.queueId);
            if (item) {
              await offlineDB.markQueueFailed(r.queueId, r.message, item.retryCount + 1);
            }
            errors++;
          }
        }

        processed += batch.length;
        this.syncProgress = Math.round((processed / total) * 100);
        this.notify();
      }

      await offlineDB.setLastSyncAt(new Date().toISOString());
      await offlineDB.purgeDoneQueue();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Sync xatosi';
      errors++;
    } finally {
      this.isSyncing = false;
      this.syncProgress = 100;
      await this.refreshPendingCount();
    }

    return { synced, conflicts, errors };
  }

  // ==========================================
  // PULL (server → IDB cache)
  // ==========================================

  async pull(since?: string): Promise<PullDataResult | null> {
    try {
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      params.set('deviceId', DEVICE_ID);

      const res = await api.get(`/sync/pull?${params.toString()}`);
      const data: PullDataResult = res.data?.data;

      if (data) {
        // IDB ga saqlash
        if (data.products?.length) {
          await offlineDB.saveProducts(data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            image: p.image || undefined,
            categoryId: p.categoryId,
            categoryName: p.category?.name || '',
            isActive: p.isActive,
            mxikCode: p.mxikCode || null,
            sortOrder: p.sortOrder || 0,
            updatedAt: p.updatedAt,
          })));
        }

        if (data.categories?.length) {
          await offlineDB.saveCategories(data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            sortOrder: c.sortOrder || 0,
          })));
        }

        if (data.tables?.length) {
          await offlineDB.saveTables(data.tables.map((t: any) => ({
            id: t.id,
            number: t.number,
            name: t.name || undefined,
            capacity: t.capacity,
            status: t.status,
          })));
        }

        if (data.recentOrders?.length) {
          await offlineDB.saveOrders(data.recentOrders.map((o: any) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            total: Number(o.total),
            tableId: o.tableId || undefined,
            tableNumber: o.table?.number,
            items: o.items || [],
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
          })));
        }

        // Auth token ni SW uchun IDB ga saqlash
        const stored = localStorage.getItem('pos-auth');
        if (stored) {
          const token = JSON.parse(stored)?.state?.accessToken;
          if (token) await offlineDB.setMeta('authToken', token);
        }

        await offlineDB.setLastSyncAt(data.syncedAt);
      }

      return data;
    } catch {
      return null;
    }
  }

  // ==========================================
  // OFFLINE DATA ACCESS (IDB dan)
  // ==========================================

  async getOfflineProducts() {
    return offlineDB.getProducts(true);
  }

  async getOfflineCategories() {
    return offlineDB.getCategories();
  }

  async getOfflineTables() {
    return offlineDB.getTables();
  }

  async getOfflineOrders() {
    return offlineDB.getActiveOrders();
  }

  // ==========================================
  // AUTO SYNC
  // ==========================================

  startAutoSync(intervalMs = 30_000) {
    if (this.syncTimer) return;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if (navigator.onLine) {
      setTimeout(() => this.sync(), 2000);
    }

    this.syncTimer = setInterval(async () => {
      if (navigator.onLine && (await offlineDB.getPendingCount()) > 0) {
        this.sync();
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.notify();
    setTimeout(() => this.sync(), 1000);
  };

  private handleOffline = () => {
    this.notify();
  };

  // ==========================================
  // CONFLICT RESOLUTION
  // ==========================================

  resolveConflict(queueId: string, strategy: 'keep-server' | 'keep-client') {
    const idx = this.conflicts.findIndex(c => c.queueId === queueId);
    if (idx === -1) return;

    const conflict = this.conflicts[idx];

    if (strategy === 'keep-client') {
      // Re-queue with higher version
      offlineDB.enqueue({
        id: `force-${queueId}-${Date.now()}`,
        operation: conflict.operation,
        url: conflict.body.url || '/api/sync/batch',
        method: 'POST',
        body: { ...conflict.body, version: Date.now(), _forceOverwrite: true },
        timestamp: Date.now(),
        maxRetries: 3,
        deviceId: DEVICE_ID,
      });
      this.refreshPendingCount();
    }

    // keep-server — conflict ni olib tashlaymiz, server versiyasi qoladi
    offlineDB.markQueueDone(queueId);
    this.conflicts.splice(idx, 1);
    this.notify();
  }

  clearAllConflicts() {
    for (const c of this.conflicts) {
      offlineDB.markQueueDone(c.queueId);
    }
    this.conflicts = [];
    this.notify();
  }

  // ==========================================
  // HELPERS
  // ==========================================

  async getPendingTotalCount(): Promise<number> {
    return offlineDB.getPendingCount();
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  async clearAll(): Promise<void> {
    await offlineDB.clearAll();
    this.conflicts = [];
    this.pendingCount = 0;
    this.notify();
  }
}

const SYNC_TAG = 'pos-sync';
export const syncService = new OfflineSyncService();
