import api from './api';

// ==========================================
// TYPES
// ==========================================

export type SyncAction = 'created' | 'updated' | 'conflict' | 'duplicate' | 'skipped' | 'error';

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

export interface StatusUpdatePayload {
  type: 'order' | 'item' | 'table';
  orderId?: string;
  itemId?: string;
  tableId?: string;
  status: string;
  version?: number;
  queuedAt: string;
}

export interface SyncResult {
  success: boolean;
  action: SyncAction;
  serverId?: string;
  serverVersion?: number;
  conflictData?: any;
  message: string;
}

export interface BulkSyncResult {
  total: number;
  synced: number;
  conflicts: number;
  duplicates: number;
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

export interface ConflictRecord {
  clientOrder: SyncOrderPayload;
  serverData: any;
  detectedAt: string;
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
// SYNC STATE (lightweight — store'ga bog'lanmaydi)
// ==========================================

type SyncListener = (state: SyncState) => void;

interface SyncState {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingOrdersCount: number;
  pendingStatusCount: number;
  conflicts: ConflictRecord[];
  lastError: string | null;
}

// ==========================================
// OFFLINE SYNC SERVICE
// ==========================================

class OfflineSyncService {
  private listeners: SyncListener[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private conflicts: ConflictRecord[] = [];
  private lastError: string | null = null;

  // ==========================================
  // OBSERVER PATTERN — React hook bilan ishlatish uchun
  // ==========================================

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
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
      lastSyncAt: localStorage.getItem('pos-last-sync-at'),
      pendingOrdersCount: this.getPendingOrders().length,
      pendingStatusCount: this.getPendingStatuses().length,
      conflicts: this.conflicts,
      lastError: this.lastError,
    };
  }

  // ==========================================
  // QUEUE MANAGEMENT (localStorage)
  // ==========================================

  getPendingOrders(): SyncOrderPayload[] {
    try {
      return JSON.parse(localStorage.getItem('pos-sync-orders') || '[]');
    } catch {
      return [];
    }
  }

  private savePendingOrders(orders: SyncOrderPayload[]) {
    localStorage.setItem('pos-sync-orders', JSON.stringify(orders));
    this.notify();
  }

  getPendingStatuses(): StatusUpdatePayload[] {
    try {
      return JSON.parse(localStorage.getItem('pos-sync-statuses') || '[]');
    } catch {
      return [];
    }
  }

  private savePendingStatuses(statuses: StatusUpdatePayload[]) {
    localStorage.setItem('pos-sync-statuses', JSON.stringify(statuses));
    this.notify();
  }

  // Yangi buyurtmani queue ga qo'shish
  enqueueOrder(order: SyncOrderPayload) {
    const orders = this.getPendingOrders();
    const exists = orders.find(o => o.id === order.id);
    if (!exists) {
      orders.push({ ...order, deviceId: DEVICE_ID });
      this.savePendingOrders(orders);
    }
  }

  // Order status ni queue ga qo'shish
  enqueueOrderStatus(orderId: string, status: string, version: number) {
    const statuses = this.getPendingStatuses();
    // Existing status for same order ni yozib chiqamiz (last-write-wins)
    const filtered = statuses.filter(
      s => !(s.type === 'order' && s.orderId === orderId)
    );
    filtered.push({ type: 'order', orderId, status, version, queuedAt: new Date().toISOString() });
    this.savePendingStatuses(filtered);
  }

  // Item status ni queue ga qo'shish
  enqueueItemStatus(orderId: string, itemId: string, status: string) {
    const statuses = this.getPendingStatuses();
    const filtered = statuses.filter(
      s => !(s.type === 'item' && s.itemId === itemId)
    );
    filtered.push({ type: 'item', orderId, itemId, status, queuedAt: new Date().toISOString() });
    this.savePendingStatuses(filtered);
  }

  // Table status ni queue ga qo'shish
  enqueueTableStatus(tableId: string, status: string) {
    const statuses = this.getPendingStatuses();
    const filtered = statuses.filter(
      s => !(s.type === 'table' && s.tableId === tableId)
    );
    filtered.push({ type: 'table', tableId, status, queuedAt: new Date().toISOString() });
    this.savePendingStatuses(filtered);
  }

  // ==========================================
  // SYNC
  // ==========================================

  async sync(): Promise<{ synced: number; conflicts: number; errors: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { synced: 0, conflicts: 0, errors: 0 };
    }

    // Server tirik ekanini tekshirish
    try {
      await api.get('/sync/health');
    } catch {
      return { synced: 0, conflicts: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      // 1. Buyurtmalarni sync qilish
      const orders = this.getPendingOrders();
      if (orders.length > 0) {
        const batchResult = await this.syncOrdersBatch(orders);
        synced += batchResult.synced;
        conflicts += batchResult.conflicts;
        errors += batchResult.errors;

        // Muvaffaqiyatli sync bo'lganlarni olib tashlaymiz
        const failedIds = new Set(
          batchResult.results
            .filter(r => r.result.action === 'error')
            .map(r => r.clientId)
        );
        const conflictIds = new Set(
          batchResult.results
            .filter(r => r.result.action === 'conflict')
            .map(r => r.clientId)
        );

        // Conflict larni saqlaymiz
        for (const r of batchResult.results) {
          if (r.result.action === 'conflict') {
            const clientOrder = orders.find(o => o.id === r.clientId);
            if (clientOrder) {
              this.conflicts.push({
                clientOrder,
                serverData: r.result.conflictData,
                detectedAt: new Date().toISOString(),
              });
            }
          }
        }

        // Faqat muvaffaqiyatli va conflict bo'lmaganlarni olib tashlaymiz
        const remaining = orders.filter(o => failedIds.has(o.id));
        this.savePendingOrders(remaining);

        // Conflict larni ham olib tashlaymiz (user hal qilishi kerak)
        if (conflictIds.size > 0) {
          const withoutConflicts = orders.filter(o => !conflictIds.has(o.id));
          this.savePendingOrders(withoutConflicts);
        }
      }

      // 2. Status o'zgarishlarini sync qilish
      const statuses = this.getPendingStatuses();
      if (statuses.length > 0) {
        const statusResults = await this.syncStatusesBatch(statuses);
        synced += statusResults.synced;
        errors += statusResults.errors;

        const failedStatuses = statuses.filter((_, i) => statusResults.failedIndexes.has(i));
        this.savePendingStatuses(failedStatuses);
      }

      // 3. lastSyncAt ni yangilash
      if (synced > 0 || orders.length === 0) {
        localStorage.setItem('pos-last-sync-at', new Date().toISOString());
      }
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Sync xatosi';
      errors++;
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { synced, conflicts, errors };
  }

  private async syncOrdersBatch(orders: SyncOrderPayload[]): Promise<BulkSyncResult & { results: Array<{ clientId: string; result: SyncResult }> }> {
    const BATCH_SIZE = 20;
    const allResults: Array<{ clientId: string; result: SyncResult }> = [];
    let totalSynced = 0, totalConflicts = 0, totalErrors = 0;

    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);
      const res = await api.post('/sync/orders', { orders: batch });
      const data: BulkSyncResult = res.data?.data || { total: 0, synced: 0, conflicts: 0, duplicates: 0, errors: 0, results: [] };
      totalSynced += data.synced;
      totalConflicts += data.conflicts;
      totalErrors += data.errors;
      allResults.push(...(data.results || []));
    }

    return {
      total: orders.length,
      synced: totalSynced,
      conflicts: totalConflicts,
      duplicates: 0,
      errors: totalErrors,
      results: allResults,
    };
  }

  private async syncStatusesBatch(statuses: StatusUpdatePayload[]): Promise<{ synced: number; errors: number; failedIndexes: Set<number> }> {
    let synced = 0;
    let errors = 0;
    const failedIndexes = new Set<number>();

    for (let i = 0; i < statuses.length; i++) {
      const s = statuses[i];
      try {
        if (s.type === 'order' && s.orderId) {
          await api.post('/sync/order-status', {
            orderId: s.orderId,
            status: s.status,
            version: s.version || 0,
          });
          synced++;
        } else if (s.type === 'item' && s.orderId && s.itemId) {
          await api.post('/sync/item-status', {
            orderId: s.orderId,
            itemId: s.itemId,
            status: s.status,
          });
          synced++;
        } else if (s.type === 'table' && s.tableId) {
          await api.post('/sync/table-status', {
            tableId: s.tableId,
            status: s.status,
          });
          synced++;
        }
      } catch (err: any) {
        // 409 Conflict — serverda allaqachon yangi versiya bor, client versiyasini tashlaymiz
        if (err?.response?.status !== 409) {
          failedIndexes.add(i);
          errors++;
        }
      }
    }

    return { synced, errors, failedIndexes };
  }

  // ==========================================
  // PULL (server → local cache)
  // ==========================================

  async pull(since?: string): Promise<PullDataResult | null> {
    try {
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      params.set('deviceId', DEVICE_ID);

      const res = await api.get(`/sync/pull?${params.toString()}`);
      const data: PullDataResult = res.data?.data;

      if (data) {
        localStorage.setItem('pos-last-sync-at', data.syncedAt);
      }

      return data;
    } catch {
      return null;
    }
  }

  // ==========================================
  // AUTO SYNC
  // ==========================================

  startAutoSync(intervalMs = 30_000) {
    if (this.syncTimer) return;

    // Online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Dastlab bir sync qilish
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 2000);
    }

    this.syncTimer = setInterval(() => {
      if (navigator.onLine && this.getPendingTotalCount() > 0) {
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
    // Internet qayta kelganda darhol sync qilish
    setTimeout(() => this.sync(), 1000);
  };

  private handleOffline = () => {
    this.notify();
  };

  // ==========================================
  // CONFLICT RESOLUTION
  // ==========================================

  resolveConflict(clientOrderId: string, strategy: 'keep-server' | 'keep-client') {
    const conflictIndex = this.conflicts.findIndex(c => c.clientOrder.id === clientOrderId);
    if (conflictIndex === -1) return;

    const conflict = this.conflicts[conflictIndex];

    if (strategy === 'keep-client') {
      // Client versiyasini force push qilish (version ni serverdan yuqori qilamiz)
      const forceOrder = {
        ...conflict.clientOrder,
        version: Date.now(),
      };
      this.enqueueOrder(forceOrder);
      this.sync();
    }
    // keep-server — faqat conflict ni olib tashlaymiz

    this.conflicts.splice(conflictIndex, 1);
    this.notify();
  }

  clearAllConflicts() {
    this.conflicts = [];
    this.notify();
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getPendingTotalCount(): number {
    return this.getPendingOrders().length + this.getPendingStatuses().length;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  clearAll() {
    localStorage.removeItem('pos-sync-orders');
    localStorage.removeItem('pos-sync-statuses');
    this.conflicts = [];
    this.notify();
  }
}

export const syncService = new OfflineSyncService();
