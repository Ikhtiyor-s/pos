// ==========================================
// OFFLINE INDEXEDDB — POS offline storage
// Native IndexedDB API, library yo'q
// ==========================================

export type OperationType =
  | 'CREATE_ORDER'
  | 'UPDATE_ORDER'
  | 'CREATE_PAYMENT'
  | 'UPDATE_STATUS'
  | 'UPDATE_TABLE';

export type QueueStatus = 'pending' | 'processing' | 'failed' | 'conflict' | 'done';

export interface QueueItem {
  id: string;
  operation: OperationType;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: QueueStatus;
  lastError?: string;
  deviceId: string;
  resolvedAt?: number;
}

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
  updatedAt?: string;
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

export interface CachedOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  tableId?: string;
  tableNumber?: number;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DB SCHEMA
// ==========================================

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;

const STORES = {
  queue: 'queue',
  products: 'products',
  categories: 'categories',
  tables: 'tables',
  orders: 'orders',
  meta: 'meta',
} as const;

// ==========================================
// DB CLASS
// ==========================================

class OfflineDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  // ==========================================
  // INIT
  // ==========================================

  init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Queue store — offline operatsiyalar
        if (!db.objectStoreNames.contains(STORES.queue)) {
          const queueStore = db.createObjectStore(STORES.queue, { keyPath: 'id' });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('operation', 'operation', { unique: false });
        }

        // Products cache
        if (!db.objectStoreNames.contains(STORES.products)) {
          const prodStore = db.createObjectStore(STORES.products, { keyPath: 'id' });
          prodStore.createIndex('categoryId', 'categoryId', { unique: false });
          prodStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Categories cache
        if (!db.objectStoreNames.contains(STORES.categories)) {
          db.createObjectStore(STORES.categories, { keyPath: 'id' });
        }

        // Tables cache
        if (!db.objectStoreNames.contains(STORES.tables)) {
          const tableStore = db.createObjectStore(STORES.tables, { keyPath: 'id' });
          tableStore.createIndex('status', 'status', { unique: false });
        }

        // Orders cache (active orders only)
        if (!db.objectStoreNames.contains(STORES.orders)) {
          const orderStore = db.createObjectStore(STORES.orders, { keyPath: 'id' });
          orderStore.createIndex('status', 'status', { unique: false });
          orderStore.createIndex('tableId', 'tableId', { unique: false });
        }

        // Meta — lastSyncAt, deviceId, etc.
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => {
        this.initPromise = null;
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  private async getDB(): Promise<IDBDatabase> {
    return this.db ?? this.init();
  }

  // ==========================================
  // GENERIC HELPERS
  // ==========================================

  private tx(store: string, mode: IDBTransactionMode = 'readonly') {
    return this.getDB().then(db => {
      const tx = db.transaction(store, mode);
      return tx.objectStore(store);
    });
  }

  private request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.tx(storeName);
    return this.request(store.getAll());
  }

  private async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const store = await this.tx(storeName);
    return this.request(store.get(key));
  }

  private async put(storeName: string, value: any): Promise<void> {
    const store = await this.tx(storeName, 'readwrite');
    await this.request(store.put(value));
  }

  private async putMany(storeName: string, values: any[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (i >= values.length) { resolve(); return; }
        const req = store.put(values[i++]);
        req.onsuccess = next;
        req.onerror = () => reject(req.error);
      };
      next();
    });
  }

  private async delete(storeName: string, key: string): Promise<void> {
    const store = await this.tx(storeName, 'readwrite');
    await this.request(store.delete(key));
  }

  private async clear(storeName: string): Promise<void> {
    const store = await this.tx(storeName, 'readwrite');
    await this.request(store.clear());
  }

  private async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return this.request(index.getAll(value));
  }

  // ==========================================
  // QUEUE OPERATIONS
  // ==========================================

  async enqueue(item: Omit<QueueItem, 'retryCount' | 'status'>): Promise<void> {
    await this.put(STORES.queue, {
      ...item,
      retryCount: 0,
      status: 'pending' as QueueStatus,
    } satisfies QueueItem);
  }

  async getPendingQueue(): Promise<QueueItem[]> {
    const all = await this.getAll<QueueItem>(STORES.queue);
    return all
      .filter(i => i.status === 'pending' || i.status === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async getQueueItem(id: string): Promise<QueueItem | undefined> {
    return this.get<QueueItem>(STORES.queue, id);
  }

  async getAllQueue(): Promise<QueueItem[]> {
    const all = await this.getAll<QueueItem>(STORES.queue);
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  async updateQueueItem(id: string, updates: Partial<QueueItem>): Promise<void> {
    const item = await this.getQueueItem(id);
    if (!item) return;
    await this.put(STORES.queue, { ...item, ...updates });
  }

  async markQueueDone(id: string): Promise<void> {
    await this.updateQueueItem(id, { status: 'done', resolvedAt: Date.now() });
  }

  async markQueueFailed(id: string, error: string, retryCount: number): Promise<void> {
    await this.updateQueueItem(id, {
      status: retryCount >= 5 ? 'failed' : 'pending',
      lastError: error,
      retryCount,
    });
  }

  async markQueueConflict(id: string, error: string): Promise<void> {
    await this.updateQueueItem(id, { status: 'conflict', lastError: error });
  }

  async removeQueueItem(id: string): Promise<void> {
    await this.delete(STORES.queue, id);
  }

  // Done yozuvlarni tozalash (3 kundan eski)
  async purgeDoneQueue(): Promise<void> {
    const all = await this.getAll<QueueItem>(STORES.queue);
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const toDelete = all.filter(i => i.status === 'done' && (i.resolvedAt || 0) < cutoff);
    for (const item of toDelete) {
      await this.removeQueueItem(item.id);
    }
  }

  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingQueue();
    return pending.length;
  }

  // ==========================================
  // PRODUCTS CACHE
  // ==========================================

  async saveProducts(products: CachedProduct[]): Promise<void> {
    await this.clear(STORES.products);
    await this.putMany(STORES.products, products);
  }

  async getProducts(activeOnly = true): Promise<CachedProduct[]> {
    if (activeOnly) {
      return this.getByIndex<CachedProduct>(STORES.products, 'isActive', true);
    }
    return this.getAll<CachedProduct>(STORES.products);
  }

  async getProductById(id: string): Promise<CachedProduct | undefined> {
    return this.get<CachedProduct>(STORES.products, id);
  }

  // ==========================================
  // CATEGORIES CACHE
  // ==========================================

  async saveCategories(categories: CachedCategory[]): Promise<void> {
    await this.clear(STORES.categories);
    await this.putMany(STORES.categories, categories);
  }

  async getCategories(): Promise<CachedCategory[]> {
    const all = await this.getAll<CachedCategory>(STORES.categories);
    return all.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // ==========================================
  // TABLES CACHE
  // ==========================================

  async saveTables(tables: CachedTable[]): Promise<void> {
    await this.clear(STORES.tables);
    await this.putMany(STORES.tables, tables);
  }

  async getTables(): Promise<CachedTable[]> {
    const all = await this.getAll<CachedTable>(STORES.tables);
    return all.sort((a, b) => a.number - b.number);
  }

  async updateTableStatus(id: string, status: string): Promise<void> {
    const table = await this.get<CachedTable>(STORES.tables, id);
    if (table) {
      await this.put(STORES.tables, { ...table, status });
    }
  }

  // ==========================================
  // ORDERS CACHE
  // ==========================================

  async saveOrders(orders: CachedOrder[]): Promise<void> {
    await this.putMany(STORES.orders, orders);
  }

  async getActiveOrders(): Promise<CachedOrder[]> {
    const all = await this.getAll<CachedOrder>(STORES.orders);
    return all.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  }

  async upsertOrder(order: CachedOrder): Promise<void> {
    await this.put(STORES.orders, order);
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    const order = await this.get<CachedOrder>(STORES.orders, id);
    if (order) {
      await this.put(STORES.orders, { ...order, status, updatedAt: new Date().toISOString() });
    }
  }

  // ==========================================
  // META
  // ==========================================

  async getMeta(key: string): Promise<string | undefined> {
    const record = await this.get<{ key: string; value: string }>(STORES.meta, key);
    return record?.value;
  }

  async setMeta(key: string, value: string): Promise<void> {
    await this.put(STORES.meta, { key, value });
  }

  async getLastSyncAt(): Promise<string | null> {
    return (await this.getMeta('lastSyncAt')) ?? null;
  }

  async setLastSyncAt(value: string): Promise<void> {
    await this.setMeta('lastSyncAt', value);
  }

  // ==========================================
  // FULL CLEAR (logout uchun)
  // ==========================================

  async clearAll(): Promise<void> {
    await Promise.all([
      this.clear(STORES.queue),
      this.clear(STORES.products),
      this.clear(STORES.categories),
      this.clear(STORES.tables),
      this.clear(STORES.orders),
      this.clear(STORES.meta),
    ]);
  }
}

export const offlineDB = new OfflineDB();
