import { Server, Socket } from 'socket.io';

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join rooms based on user role
    socket.on('join:kitchen', () => {
      socket.join('kitchen');
      console.log(`👨‍🍳 ${socket.id} joined kitchen room`);
    });

    socket.on('join:pos', () => {
      socket.join('pos');
      console.log(`💳 ${socket.id} joined POS room`);
    });

    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`👑 ${socket.id} joined admin room`);
    });

    // Order events
    socket.on('order:new', (order) => {
      // Notify kitchen about new order
      io.to('kitchen').emit('order:new', order);
      // Notify admin
      io.to('admin').emit('order:new', order);
    });

    socket.on('order:status', (data) => {
      // Notify all connected clients
      io.emit('order:status', data);
    });

    socket.on('order:item:status', (data) => {
      io.to('kitchen').emit('order:item:status', data);
      io.to('pos').emit('order:item:status', data);
    });

    // Table events
    socket.on('table:status', (data) => {
      io.emit('table:status', data);
    });

    // Inventory alerts
    socket.on('inventory:low', (data) => {
      io.to('admin').emit('inventory:low', data);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

// Helper function to emit events
export function emitToRoom(io: Server, room: string, event: string, data: unknown) {
  io.to(room).emit(event, data);
}

export function emitToAll(io: Server, event: string, data: unknown) {
  io.emit(event, data);
}
