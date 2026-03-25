import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface SocketUser {
  userId: string;
  role: string;
  tenantId: string | null;
}

export function setupSocket(io: Server) {
  // Socket autentifikatsiya middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret) as SocketUser;
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        socket.data.tenantId = decoded.tenantId;
      } catch {
        // Token yo'q yoki noto'g'ri — lekin ulanishga ruxsat beramiz
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const tenantId = socket.data.tenantId;
    console.log(`Client connected: ${socket.id} (tenant: ${tenantId || 'global'})`);

    // Tenant-scoped room helper
    const getTenantRoom = (room: string) => {
      return tenantId ? `tenant:${tenantId}:${room}` : room;
    };

    // Join rooms based on user role — tenant-scoped
    socket.on('join:kitchen', () => {
      const room = getTenantRoom('kitchen');
      socket.join(room);
      console.log(`${socket.id} joined ${room}`);
    });

    socket.on('join:pos', () => {
      const room = getTenantRoom('pos');
      socket.join(room);
      console.log(`${socket.id} joined ${room}`);
    });

    socket.on('join:admin', () => {
      const room = getTenantRoom('admin');
      socket.join(room);
      console.log(`${socket.id} joined ${room}`);
    });

    socket.on('join:waiter', () => {
      const room = getTenantRoom('waiter');
      socket.join(room);
      console.log(`${socket.id} joined ${room}`);
    });

    // Order events — tenant-scoped
    socket.on('order:new', (order) => {
      if (tenantId) {
        io.to(`tenant:${tenantId}:kitchen`).emit('order:new', order);
        io.to(`tenant:${tenantId}:admin`).emit('order:new', order);
        io.to(`tenant:${tenantId}:waiter`).emit('order:new', order);
      } else {
        io.to('kitchen').emit('order:new', order);
        io.to('admin').emit('order:new', order);
        io.to('waiter').emit('order:new', order);
      }
    });

    socket.on('order:status', (data) => {
      if (tenantId) {
        emitToTenant(io, tenantId, 'order:status', data);
      } else {
        io.emit('order:status', data);
      }
    });

    socket.on('order:item:status', (data) => {
      if (tenantId) {
        io.to(`tenant:${tenantId}:kitchen`).emit('order:item:status', data);
        io.to(`tenant:${tenantId}:pos`).emit('order:item:status', data);
      } else {
        io.to('kitchen').emit('order:item:status', data);
        io.to('pos').emit('order:item:status', data);
      }
    });

    // Table events — tenant-scoped
    socket.on('table:status', (data) => {
      if (tenantId) {
        emitToTenant(io, tenantId, 'table:status', data);
      } else {
        io.emit('table:status', data);
      }
    });

    // Inventory alerts — tenant-scoped
    socket.on('inventory:low', (data) => {
      if (tenantId) {
        io.to(`tenant:${tenantId}:admin`).emit('inventory:low', data);
      } else {
        io.to('admin').emit('inventory:low', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

// Tenant-scoped room ga emit qilish
export function emitToTenantRoom(io: Server, tenantId: string, room: string, event: string, data: unknown) {
  io.to(`tenant:${tenantId}:${room}`).emit(event, data);
}

// Tenant ning barcha roomlariga emit qilish
export function emitToTenant(io: Server, tenantId: string, event: string, data: unknown) {
  const rooms = ['kitchen', 'pos', 'admin', 'waiter'];
  for (const room of rooms) {
    io.to(`tenant:${tenantId}:${room}`).emit(event, data);
  }
}

// Legacy helper — backward compat
export function emitToRoom(io: Server, room: string, event: string, data: unknown) {
  io.to(room).emit(event, data);
}

export function emitToAll(io: Server, event: string, data: unknown) {
  io.emit(event, data);
}
