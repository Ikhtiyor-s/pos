// ==========================================
// OFFLINE ORDER SERVICE
// Internet yo'qda buyurtma yaratish va boshqarish
// Unique ID generatsiya + duplicate prevention
// ==========================================

import { offlineStore, STORES } from './offline-store.js';
import { syncQueue } from './sync-queue.js';
import { networkDetector } from './network-detector.js';

export type OfflineSyncStatus = 'local' | 'synced' | 'syncing' | 'conflict';

export interface OfflineOrder {
  id: string;               // UUID — offline ham unique
  orderNumber: string;       // Device-specific prefix bilan
  source: string;
  type: string;
  status: string;
  tableId?: string;
  userId: string;
  items: OfflineOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  // Offline metadata
  syncStatus: OfflineSyncStatus;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  version: number;           // Optimistic locking
}

export interface OfflineOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: string;
}

export class OfflineOrderService {
  private deviceId: string;
  private orderCounter: number = 0;

  constructor() {
    this.deviceId = this.getDeviceId();
    this.loadCounter();
  }

  // ==========================================
  // DEVICE ID — har bir qurilma uchun unique
  // ==========================================

  private getDeviceId(): string {
    if (typeof localStorage === 'undefined') return 'server';
    let id = localStorage.getItem('pos-device-id');
    if (!id) {
      id = `DEV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem('pos-device-id', id);
    }
    return id;
  }

  // ==========================================
  // ORDER NUMBER — Device-specific, duplicate-proof
  // Format: OFF-DEV1A-20260320-0001
  // ==========================================

  private async loadCounter(): Promise<void> {
    const saved = await offlineStore.get<{ key: string; value: number }>(STORES.SETTINGS, 'orderCounter');
    this.orderCounter = saved?.value || 0;
  }

  private async generateOrderNumber(): Promise<string> {
    this.orderCounter++;
    await offlineStore.put(STORES.SETTINGS, { key: 'orderCounter', value: this.orderCounter });

    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const num = String(this.orderCounter).padStart(4, '0');
    const shortDevice = this.deviceId.replace('DEV-', '');

    return `OFF-${shortDevice}-${dateStr}-${num}`;
  }

  private generateId(): string {
    // UUID v4 — offline ham collision bo'lmaydi
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // ==========================================
  // CREATE ORDER (OFFLINE)
  // ==========================================

  async createOrder(data: {
    source: string;
    type: string;
    tableId?: string;
    userId: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      notes?: string;
    }>;
    notes?: string;
    discount?: number;
    taxRate?: number;
  }): Promise<OfflineOrder> {
    const orderId = this.generateId();
    const orderNumber = await this.generateOrderNumber();
    const now = new Date().toISOString();

    // Hisob-kitob
    let subtotal = 0;
    const items: OfflineOrderItem[] = data.items.map(item => {
      const total = item.price * item.quantity;
      subtotal += total;
      return {
        id: this.generateId(),
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total,
        notes: item.notes,
        status: 'PENDING',
      };
    });

    const discount = data.discount || 0;
    const taxRate = data.taxRate || 0;
    const tax = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + tax;

    const order: OfflineOrder = {
      id: orderId,
      orderNumber,
      source: data.source,
      type: data.type,
      status: 'NEW',
      tableId: data.tableId,
      userId: data.userId,
      items,
      subtotal,
      discount,
      tax,
      total,
      notes: data.notes,
      syncStatus: 'local',
      deviceId: this.deviceId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // IndexedDB ga saqlash
    await offlineStore.put(STORES.ORDERS, order);

    // Table statusini yangilash
    if (data.tableId && data.type === 'DINE_IN') {
      await this.updateTableStatus(data.tableId, 'OCCUPIED');
    }

    // Sync queue ga qo'shish
    await syncQueue.enqueue('order', 'CREATE', orderId, order);

    return order;
  }

  // ==========================================
  // UPDATE ORDER STATUS (OFFLINE)
  // ==========================================

  async updateOrderStatus(orderId: string, status: string): Promise<OfflineOrder | null> {
    const order = await offlineStore.get<OfflineOrder>(STORES.ORDERS, orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.version++;

    if (order.syncStatus === 'synced') {
      order.syncStatus = 'local'; // Qayta sync kerak
    }

    await offlineStore.put(STORES.ORDERS, order);
    await syncQueue.enqueue('order', 'UPDATE', orderId, { status, version: order.version });

    // Table bo'shatish
    if ((status === 'COMPLETED' || status === 'CANCELLED') && order.tableId) {
      await this.updateTableStatus(order.tableId, 'CLEANING');
    }

    return order;
  }

  // ==========================================
  // UPDATE ITEM STATUS (OFFLINE)
  // ==========================================

  async updateItemStatus(orderId: string, itemId: string, status: string): Promise<OfflineOrder | null> {
    const order = await offlineStore.get<OfflineOrder>(STORES.ORDERS, orderId);
    if (!order) return null;

    const item = order.items.find(i => i.id === itemId);
    if (!item) return null;

    item.status = status;
    order.updatedAt = new Date().toISOString();
    order.version++;

    // Barcha item READY bo'lsa, order READY
    const allReady = order.items.every(i => i.status === 'READY' || i.status === 'SERVED');
    if (allReady && order.status === 'PREPARING') {
      order.status = 'READY';
    }

    await offlineStore.put(STORES.ORDERS, order);
    await syncQueue.enqueue('order_item', 'UPDATE', itemId, {
      orderId, itemId, status, orderVersion: order.version,
    });

    return order;
  }

  // ==========================================
  // GET ORDERS (FROM LOCAL DB)
  // ==========================================

  async getOrders(filters?: {
    status?: string;
    tableId?: string;
  }): Promise<OfflineOrder[]> {
    let orders = await offlineStore.getAll<OfflineOrder>(STORES.ORDERS);

    if (filters?.status) {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters?.tableId) {
      orders = orders.filter(o => o.tableId === filters.tableId);
    }

    return orders.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getKitchenOrders(): Promise<OfflineOrder[]> {
    const orders = await offlineStore.getAll<OfflineOrder>(STORES.ORDERS);
    return orders
      .filter(o => ['NEW', 'CONFIRMED', 'PREPARING'].includes(o.status))
      .filter(o => o.items.some(i => i.status === 'PENDING' || i.status === 'PREPARING'))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getOrder(orderId: string): Promise<OfflineOrder | undefined> {
    return offlineStore.get<OfflineOrder>(STORES.ORDERS, orderId);
  }

  // ==========================================
  // TABLE STATUS
  // ==========================================

  private async updateTableStatus(tableId: string, status: string): Promise<void> {
    const table = await offlineStore.get<any>(STORES.TABLES, tableId);
    if (table) {
      table.status = status;
      await offlineStore.put(STORES.TABLES, table);
      await syncQueue.enqueue('table_status', 'UPDATE', tableId, { status });
    }
  }

  // ==========================================
  // CACHE MANAGEMENT — Serverdan mahalliy DB ga yuklash
  // ==========================================

  async cacheProducts(products: any[]): Promise<void> {
    await offlineStore.clear(STORES.PRODUCTS);
    await offlineStore.putMany(STORES.PRODUCTS, products);
  }

  async cacheCategories(categories: any[]): Promise<void> {
    await offlineStore.clear(STORES.CATEGORIES);
    await offlineStore.putMany(STORES.CATEGORIES, categories);
  }

  async cacheTables(tables: any[]): Promise<void> {
    await offlineStore.clear(STORES.TABLES);
    await offlineStore.putMany(STORES.TABLES, tables);
  }

  async getCachedProducts(): Promise<any[]> {
    return offlineStore.getAll(STORES.PRODUCTS);
  }

  async getCachedCategories(): Promise<any[]> {
    return offlineStore.getAll(STORES.CATEGORIES);
  }

  async getCachedTables(): Promise<any[]> {
    return offlineStore.getAll(STORES.TABLES);
  }

  // ==========================================
  // DUPLICATE PREVENTION
  // ==========================================

  async isDuplicate(orderNumber: string): Promise<boolean> {
    const orders = await offlineStore.getByIndex<OfflineOrder>(
      STORES.ORDERS, 'orderNumber', orderNumber
    );
    return orders.length > 0;
  }

  // ==========================================
  // SYNC HELPERS
  // ==========================================

  async markSynced(orderId: string, serverOrderId?: string): Promise<void> {
    const order = await offlineStore.get<OfflineOrder>(STORES.ORDERS, orderId);
    if (order) {
      order.syncStatus = 'synced';
      if (serverOrderId && serverOrderId !== orderId) {
        // Server boshqa ID bergan bo'lsa — mapping saqlash
        await offlineStore.put(STORES.SETTINGS, {
          key: `id-map:${orderId}`,
          value: serverOrderId,
        });
      }
      await offlineStore.put(STORES.ORDERS, order);
    }
  }

  async getUnsyncedCount(): Promise<number> {
    const orders = await offlineStore.getByIndex<OfflineOrder>(
      STORES.ORDERS, 'syncStatus', 'local'
    );
    return orders.length;
  }
}

export const offlineOrderService = new OfflineOrderService();
