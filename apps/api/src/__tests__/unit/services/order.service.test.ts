import { OrderService } from '../../../services/order.service.js';

// Mock modules
jest.mock('@oshxona/database', () => ({
  prisma: {
    settings: { findFirst: jest.fn() },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: { findMany: jest.fn() },
    table: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
  OrderStatus: {
    NEW: 'NEW', CONFIRMED: 'CONFIRMED', PREPARING: 'PREPARING',
    READY: 'READY', DELIVERING: 'DELIVERING', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED',
  },
  ItemStatus: { PENDING: 'PENDING', PREPARING: 'PREPARING', READY: 'READY', SERVED: 'SERVED' },
  TableStatus: { FREE: 'FREE', OCCUPIED: 'OCCUPIED', RESERVED: 'RESERVED', CLEANING: 'CLEANING' },
  Prisma: {},
}));

jest.mock('../../../config/redis.js', () => ({
  redis: {
    incr: jest.fn().mockResolvedValue(1),
    pexpire: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../services/inventory.service.js', () => ({
  InventoryService: { deductForOrder: jest.fn() },
}));

import { prisma, OrderStatus, TableStatus } from '@oshxona/database';
import { redis } from '../../../config/redis.js';
import { AppError } from '../../../middleware/errorHandler.js';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOrderNumber', () => {
    it('should generate unique order number with Redis INCR', async () => {
      (mockPrisma.settings.findFirst as jest.Mock).mockResolvedValue({ orderPrefix: 'ORD', taxRate: 0 });
      (mockRedis.incr as jest.Mock).mockResolvedValue(1);
      (mockRedis.pexpire as jest.Mock).mockResolvedValue(1);

      const orderNumber = await OrderService.generateOrderNumber('tenant-1');

      expect(orderNumber).toMatch(/^ORD-\d{8}-0001$/);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should use default prefix ORD if no settings', async () => {
      (mockPrisma.settings.findFirst as jest.Mock).mockResolvedValue(null);
      (mockRedis.incr as jest.Mock).mockResolvedValue(5);

      const orderNumber = await OrderService.generateOrderNumber('tenant-1');
      expect(orderNumber).toMatch(/^ORD-\d{8}-0005$/);
    });

    it('should set expire only on first key (seq === 1)', async () => {
      (mockPrisma.settings.findFirst as jest.Mock).mockResolvedValue(null);
      (mockRedis.incr as jest.Mock).mockResolvedValue(2); // seq = 2 — expire chaqirilmasin

      await OrderService.generateOrderNumber('tenant-1');
      expect(mockRedis.pexpire).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should limit page size to 100', async () => {
      (mockPrisma.order.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.order.count as jest.Mock).mockResolvedValue(0);

      await OrderService.getAll('tenant-1', { limit: 500 });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should filter by status when provided', async () => {
      (mockPrisma.order.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.order.count as jest.Mock).mockResolvedValue(0);

      await OrderService.getAll('tenant-1', { status: OrderStatus.NEW });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'NEW' }) }),
      );
    });
  });

  describe('updateStatus', () => {
    const mockOrder = {
      id: 'order-1', tenantId: 'tenant-1', status: 'NEW',
      tableId: 'table-1', userId: 'user-1',
      items: [], payments: [], table: {}, customer: {},
    };

    it('should allow valid status transitions', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

      const result = await OrderService.updateStatus('tenant-1', 'order-1', OrderStatus.CONFIRMED);
      expect(result.status).toBe('CONFIRMED');
    });

    it('should throw AppError for invalid status transition', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      await expect(
        OrderService.updateStatus('tenant-1', 'order-1', OrderStatus.COMPLETED),
      ).rejects.toThrow(AppError);
    });

    it('should update table to CLEANING when order completed', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue({
        ...mockOrder, status: 'READY',
      });
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'COMPLETED' });
      (mockPrisma.table.update as jest.Mock).mockResolvedValue({});

      await OrderService.updateStatus('tenant-1', 'order-1', OrderStatus.COMPLETED);

      expect(mockPrisma.table.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CLEANING' } }),
      );
    });
  });
});
