jest.mock('@oshxona/database', () => ({
  prisma: {
    inventoryItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inventoryTransaction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    order: { findFirst: jest.fn() },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    $queryRaw: jest.fn(),
  },
  Prisma: {},
  TransactionType: { IN: 'IN', OUT: 'OUT', ADJUST: 'ADJUST', WASTE: 'WASTE' },
}));

jest.mock('../../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { InventoryService } from '../../../services/inventory.service.js';
import { prisma } from '@oshxona/database';
import { AppError, ErrorCode } from '../../../middleware/errorHandler.js';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('InventoryService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('addTransaction', () => {
    const mockItem = { id: 'item-1', tenantId: 'tenant-1', quantity: 100, supplier: null, transactions: [] };

    it('should throw INVENTORY_INSUFFICIENT when stock is low for OUT', async () => {
      (mockPrisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue({
        ...mockItem, quantity: 5,
      });

      await expect(
        InventoryService.addTransaction('tenant-1', {
          itemId: 'item-1', type: 'OUT', quantity: 10, userId: 'user-1',
        }),
      ).rejects.toThrow(AppError);

      await expect(
        InventoryService.addTransaction('tenant-1', {
          itemId: 'item-1', type: 'OUT', quantity: 10, userId: 'user-1',
        }),
      ).rejects.toMatchObject({ code: ErrorCode.INVENTORY_INSUFFICIENT });
    });

    it('should create transaction and decrement for OUT type', async () => {
      (mockPrisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue({ ...mockItem, quantity: 50 });
      (mockPrisma.inventoryTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-1' });
      (mockPrisma.inventoryItem.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.$transaction as jest.Mock).mockImplementation((ops: any[]) => Promise.all(ops));

      const [tx] = await InventoryService.addTransaction('tenant-1', {
        itemId: 'item-1', type: 'OUT', quantity: 10, userId: 'user-1',
      });

      expect(tx.id).toBe('tx-1');
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: { decrement: 10 } } }),
      );
    });

    it('should increment for IN type', async () => {
      (mockPrisma.inventoryItem.findFirst as jest.Mock).mockResolvedValue({ ...mockItem, quantity: 10 });
      (mockPrisma.inventoryTransaction.create as jest.Mock).mockResolvedValue({ id: 'tx-2' });
      (mockPrisma.inventoryItem.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.$transaction as jest.Mock).mockImplementation((ops: any[]) => Promise.all(ops));

      await InventoryService.addTransaction('tenant-1', {
        itemId: 'item-1', type: 'IN', quantity: 20, userId: 'user-1',
      });

      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantity: { increment: 20 } } }),
      );
    });
  });

  describe('deductForOrder', () => {
    it('should return early if order not found', async () => {
      (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      await InventoryService.deductForOrder('order-1', 'user-1', 'tenant-1');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should batch all deductions in single transaction', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD-001',
        tenantId: 'tenant-1',
        items: [
          {
            quantity: 2,
            product: {
              name: 'Pizza',
              ingredients: [
                {
                  inventoryItemId: 'ing-1',
                  quantity: 0.3,
                  inventoryItem: { id: 'ing-1', name: 'Un', quantity: 10 },
                },
              ],
            },
          },
        ],
      };

      (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([]);

      await InventoryService.deductForOrder('order-1', 'user-1', 'tenant-1');

      // Bitta transaction chaqirilishi kerak (N+1 yo'q)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const transactionArgs = (mockPrisma.$transaction as jest.Mock).mock.calls[0][0];
      // 2 ta operation: 1 ta inventoryTransaction.create + 1 ta inventoryItem.update
      expect(transactionArgs).toHaveLength(2);
    });
  });

  describe('getLowStock', () => {
    it('should use raw query only (no findMany)', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'item-1', name: 'Un', quantity: 2, minQuantity: 10 },
      ]);

      const result = await InventoryService.getLowStock('tenant-1');

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrisma.inventoryItem.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
