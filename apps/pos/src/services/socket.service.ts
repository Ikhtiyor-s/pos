import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().accessToken;
    const role = useAuthStore.getState().user?.role?.toLowerCase();
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[POS] Socket ulandi:', this.socket?.id, 'rol:', role);
      // Rol bo'yicha to'g'ri room'ga qo'shilish
      this.socket?.emit('join:pos');
      if (role === 'waiter' || role === 'ofitsiant') {
        this.socket?.emit('join:waiter');
      }
      if (role === 'chef' || role === 'oshpaz' || role === 'kitchen') {
        this.socket?.emit('join:kitchen');
      }
      if (role === 'super_admin' || role === 'manager') {
        this.socket?.emit('join:admin');
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[POS] Socket ulanish xatosi:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[POS] Socket uzildi:', reason);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  onNewOrder(callback: (data: unknown) => void) {
    this.socket?.on('order:new', callback);
    return () => { this.socket?.off('order:new', callback); };
  }

  onOrderStatus(callback: (data: { orderId: string; status: string }) => void) {
    this.socket?.on('order:status', callback);
    return () => { this.socket?.off('order:status', callback); };
  }

  onItemStatus(callback: (data: { orderId: string; itemId: string; status: string }) => void) {
    this.socket?.on('order:item:status', callback);
    return () => { this.socket?.off('order:item:status', callback); };
  }

  onTableStatus(callback: (data: { tableId: string; status: string }) => void) {
    this.socket?.on('table:status', callback);
    return () => { this.socket?.off('table:status', callback); };
  }

  onOrderUpdated(callback: (data: unknown) => void) {
    this.socket?.on('order:updated', callback);
    return () => { this.socket?.off('order:updated', callback); };
  }
}

export const socketService = new SocketService();
