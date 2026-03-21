// ==========================================
// OFFLINE STORE — IndexedDB wrapper
// Barcha modullar uchun lokal ma'lumotlar saqlash
// ==========================================

const DB_NAME = 'oshxona-pos-offline';
const DB_VERSION = 1;

// Object store nomlari
export const STORES = {
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  TABLES: 'tables',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
  SYNC_LOG: 'sync_log',
  USERS: 'users',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

export class OfflineStore {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  // ==========================================
  // DB INITIALIZATION
  // ==========================================

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Orders
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const orderStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
          orderStore.createIndex('orderNumber', 'orderNumber', { unique: false });
          orderStore.createIndex('status', 'status', { unique: false });
          orderStore.createIndex('tableId', 'tableId', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
          orderStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Order Items
        if (!db.objectStoreNames.contains(STORES.ORDER_ITEMS)) {
          const itemStore = db.createObjectStore(STORES.ORDER_ITEMS, { keyPath: 'id' });
          itemStore.createIndex('orderId', 'orderId', { unique: false });
        }

        // Products
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const prodStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          prodStore.createIndex('categoryId', 'categoryId', { unique: false });
        }

        // Categories
        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        }

        // Tables
        if (!db.objectStoreNames.contains(STORES.TABLES)) {
          db.createObjectStore(STORES.TABLES, { keyPath: 'id' });
        }

        // Settings
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Users
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        }

        // Sync Queue — online bo'lganda sync qilinadigan operatsiyalar
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
          syncStore.createIndex('entity', 'entity', { unique: false });
        }

        // Sync Log — bajarilgan sync tarixi
        if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
          const logStore = db.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('syncedAt', 'syncedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  async put<T>(store: StoreName, data: T): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      const request = objectStore.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async putMany<T>(store: StoreName, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      for (const item of items) {
        objectStore.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get<T>(store: StoreName, key: string | number): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(store: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(store: StoreName, indexName: string, value: any): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const index = tx.objectStore(store).index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(store: StoreName, key: string | number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const request = tx.objectStore(store).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(store: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const request = tx.objectStore(store).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(store: StoreName): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStore = new OfflineStore();
