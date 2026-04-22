import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

interface SocketUser {
  userId: string;
  role: string;
  tenantId: string | null;
}

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Autentifikatsiya talab qilinadi'));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Server konfiguratsiya xatosi'));
      }
      const decoded = jwt.verify(token, secret) as SocketUser;
      socket.data.userId = decoded.userId;
      socket.data.role = decoded.role;
      socket.data.tenantId = decoded.tenantId;
      next();
    } catch {
      return next(new Error('Yaroqsiz yoki muddati o\'tgan token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const tenantId = socket.data.tenantId;
    logger.info('Socket connected', { socketId: socket.id, tenantId: tenantId || 'global' });

    const getTenantRoom = (room: string) =>
      tenantId ? `tenant:${tenantId}:${room}` : room;

    socket.on('join:kitchen', () => {
      const room = getTenantRoom('kitchen');
      socket.join(room);
      logger.debug('Socket joined room', { socketId: socket.id, room });
    });

    socket.on('join:pos', () => {
      const room = getTenantRoom('pos');
      socket.join(room);
      logger.debug('Socket joined room', { socketId: socket.id, room });
    });

    socket.on('join:admin', () => {
      const room = getTenantRoom('admin');
      socket.join(room);
      logger.debug('Socket joined room', { socketId: socket.id, room });
    });

    socket.on('join:waiter', () => {
      const room = getTenantRoom('waiter');
      socket.join(room);
      logger.debug('Socket joined room', { socketId: socket.id, room });
    });

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

    socket.on('table:status', (data) => {
      if (tenantId) {
        emitToTenant(io, tenantId, 'table:status', data);
      } else {
        io.emit('table:status', data);
      }
    });

    socket.on('inventory:low', (data) => {
      if (tenantId) {
        io.to(`tenant:${tenantId}:admin`).emit('inventory:low', data);
      } else {
        io.to('admin').emit('inventory:low', data);
      }
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { socketId: socket.id });
    });
  });
}

export function emitToTenantRoom(io: Server, tenantId: string, room: string, event: string, data: unknown) {
  io.to(`tenant:${tenantId}:${room}`).emit(event, data);
}

export function emitToTenant(io: Server, tenantId: string, event: string, data: unknown) {
  const rooms = ['kitchen', 'pos', 'admin', 'waiter'];
  for (const room of rooms) {
    io.to(`tenant:${tenantId}:${room}`).emit(event, data);
  }
}

export function emitToRoom(io: Server, room: string, event: string, data: unknown) {
  io.to(room).emit(event, data);
}

export function emitToAll(io: Server, event: string, data: unknown) {
  io.emit(event, data);
}
