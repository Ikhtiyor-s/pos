import { Server } from 'socket.io';
import { OrderStatus } from '@oshxona/database';
import { LifecycleHook, OrderLifecycleEngine } from './lifecycle-engine.js';
import type { OrderContext } from './lifecycle-engine.js';

// ==========================================
// REAL-TIME SYNC MANAGER
// Socket.IO orqali barcha tizimlarga buyurtma holatini uzatish
//
// Room structure:
//   tenant:{tenantId}:kitchen  — Oshxona display
//   tenant:{tenantId}:pos      — Kassa terminali
//   tenant:{tenantId}:waiter   — Ofitsiant tableti
//   tenant:{tenantId}:admin    — Admin panel
//   tenant:{tenantId}:all      — Barchasi
// ==========================================

export class RealtimeSyncManager {
  private io: Server | null = null;

  initialize(io: Server): void {
    this.io = io;
    console.log('[RealtimeSync] Initialized');
  }

  // ==========================================
  // BROADCAST: Yangi buyurtma
  // ==========================================

  broadcastNewOrder(tenantId: string, order: any): void {
    if (!this.io) return;

    const rooms = this.getTenantRooms(tenantId);

    // Kitchen — tayyorlash uchun
    this.io.to(rooms.kitchen).emit('order:new', {
      ...order,
      _event: 'new',
      _timestamp: new Date().toISOString(),
    });

    // POS — kassa monitoring
    this.io.to(rooms.pos).emit('order:new', {
      ...order,
      _event: 'new',
      _timestamp: new Date().toISOString(),
    });

    // Admin — dashboard monitoring
    this.io.to(rooms.admin).emit('order:new', {
      ...order,
      _event: 'new',
      _timestamp: new Date().toISOString(),
    });

    // Waiter — ofitsiant tracking
    this.io.to(rooms.waiter).emit('order:new', {
      ...order,
      _event: 'new',
      _timestamp: new Date().toISOString(),
    });

    // Fallback: eski room lar uchun (backward compatibility)
    this.io.to('kitchen').emit('order:new', order);
    this.io.to('pos').emit('order:new', order);
    this.io.to('admin').emit('order:new', order);
    this.io.to('waiter').emit('order:new', order);
  }

  // ==========================================
  // BROADCAST: Status o'zgarishi
  // ==========================================

  broadcastStatusChange(
    tenantId: string,
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    order: any,
  ): void {
    if (!this.io) return;

    const rooms = this.getTenantRooms(tenantId);
    const payload = {
      orderId,
      fromStatus,
      toStatus,
      order,
      statusInfo: OrderLifecycleEngine.getNextStatuses(toStatus, order.source || 'POS_ORDER', order.type || 'DINE_IN'),
      _event: 'status_change',
      _timestamp: new Date().toISOString(),
    };

    // Broadcast to all rooms
    this.io.to(rooms.all).emit('order:status', payload);

    // Target-specific events
    switch (toStatus) {
      case 'CONFIRMED':
        this.io.to(rooms.kitchen).emit('order:confirmed', payload);
        break;
      case 'PREPARING':
        this.io.to(rooms.kitchen).emit('order:cooking', payload);
        this.io.to(rooms.pos).emit('order:cooking', payload);
        break;
      case 'READY':
        this.io.to(rooms.pos).emit('order:ready', payload);
        this.io.to(rooms.waiter).emit('order:ready', payload);
        this.io.to(rooms.kitchen).emit('order:ready', payload);
        break;
      case 'DELIVERING':
        this.io.to(rooms.admin).emit('order:delivering', payload);
        break;
      case 'COMPLETED':
        this.io.to(rooms.all).emit('order:completed', payload);
        break;
      case 'CANCELLED':
        this.io.to(rooms.all).emit('order:cancelled', payload);
        break;
    }

    // Fallback eski room lar uchun
    this.io.emit('order:status', { orderId, status: toStatus });
  }

  // ==========================================
  // BROADCAST: Item status o'zgarishi
  // ==========================================

  broadcastItemStatusChange(
    tenantId: string,
    orderId: string,
    itemId: string,
    status: string,
    item: any,
  ): void {
    if (!this.io) return;

    const rooms = this.getTenantRooms(tenantId);
    const payload = {
      orderId,
      itemId,
      status,
      item,
      _timestamp: new Date().toISOString(),
    };

    this.io.to(rooms.kitchen).emit('order:item:status', payload);
    this.io.to(rooms.pos).emit('order:item:status', payload);
    this.io.to(rooms.waiter).emit('order:item:status', payload);

    // Fallback
    this.io.to('kitchen').emit('order:item:status', payload);
    this.io.to('pos').emit('order:item:status', payload);
  }

  // ==========================================
  // BROADCAST: Payment
  // ==========================================

  broadcastPayment(
    tenantId: string,
    orderId: string,
    payment: { method: string; amount: number },
    paymentStatus: any,
  ): void {
    if (!this.io) return;

    const rooms = this.getTenantRooms(tenantId);
    const payload = {
      orderId,
      payment,
      paymentStatus,
      _timestamp: new Date().toISOString(),
    };

    this.io.to(rooms.pos).emit('order:payment', payload);
    this.io.to(rooms.admin).emit('order:payment', payload);
    this.io.to(rooms.waiter).emit('order:payment', payload);

    // Fallback
    this.io.emit('order:payment', { orderId, ...payment });
  }

  // ==========================================
  // BROADCAST: Table status
  // ==========================================

  broadcastTableStatus(tenantId: string, tableId: string, status: string): void {
    if (!this.io) return;

    const rooms = this.getTenantRooms(tenantId);
    const payload = { tableId, status, _timestamp: new Date().toISOString() };

    this.io.to(rooms.pos).emit('table:status', payload);
    this.io.to(rooms.waiter).emit('table:status', payload);
    this.io.to(rooms.admin).emit('table:status', payload);
  }

  // ==========================================
  // EXECUTE LIFECYCLE HOOKS
  // ==========================================

  async executeHooks(tenantId: string, hooks: LifecycleHook[], order: any): Promise<void> {
    for (const hook of hooks) {
      try {
        switch (hook.type) {
          case 'NOTIFY':
            // Socket broadcast allaqachon broadcastStatusChange da bajariladi
            break;

          case 'TABLE_FREE':
            if (hook.tableId) {
              this.broadcastTableStatus(tenantId, hook.tableId, 'CLEANING');
            }
            break;

          // PRINT va INVENTORY_DEDUCT — order.controller.ts da alohida handle qilinadi
          // Chunki ular async va error handling kerak
          default:
            break;
        }
      } catch (error) {
        console.error(`[RealtimeSync] Hook execution error:`, hook.type, error);
      }
    }
  }

  // ==========================================
  // TENANT ROOMS
  // ==========================================

  private getTenantRooms(tenantId: string) {
    return {
      kitchen: `tenant:${tenantId}:kitchen`,
      pos: `tenant:${tenantId}:pos`,
      waiter: `tenant:${tenantId}:waiter`,
      admin: `tenant:${tenantId}:admin`,
      all: `tenant:${tenantId}:all`,
    };
  }
}

export const realtimeSyncManager = new RealtimeSyncManager();
