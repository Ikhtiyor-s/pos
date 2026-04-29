import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = useAuthStore.getState().accessToken;
    // API port 3002 — to'g'ridan ulanamiz (dev'da proxy yo'q)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Kitchen] Socket ulandi:', this.socket?.id);
      this.socket?.emit('join:kitchen');
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Kitchen] Socket ulanish xatosi:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Kitchen] Socket uzildi:', reason);
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

  onOrderUpdated(callback: (data: unknown) => void) {
    this.socket?.on('order:updated', callback);
    return () => { this.socket?.off('order:updated', callback); };
  }
}

export const socketService = new SocketService();
