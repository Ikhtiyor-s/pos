import { io, Socket } from 'socket.io-client';

export { tableService } from './table.service';
export { productService } from './product.service';
export { categoryService } from './product.service';
export { orderService } from './order.service';
export { authService } from './auth.service';

// Socket.IO service
class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3005', {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join:waiter');
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  onTableStatusUpdate(callback: (data: { tableId: string; status: string }) => void) {
    this.socket?.on('table:status', callback);
    return () => {
      this.socket?.off('table:status', callback);
    };
  }

  onOrderStatusUpdate(callback: (data: { orderId: string; status: string }) => void) {
    this.socket?.on('order:status', callback);
    return () => {
      this.socket?.off('order:status', callback);
    };
  }

  onNewOrder(callback: (data: { order: unknown }) => void) {
    this.socket?.on('order:new', callback);
    return () => {
      this.socket?.off('order:new', callback);
    };
  }

  emitTableStatus(tableId: string, status: string) {
    this.socket?.emit('table:status', { tableId, status });
  }
}

export const socketService = new SocketService();
