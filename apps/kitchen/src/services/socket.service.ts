import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3005', {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[Kitchen] Socket connected');
      this.socket?.emit('join:kitchen');
    });

    this.socket.on('disconnect', () => {
      console.log('[Kitchen] Socket disconnected');
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
