jest.mock('@oshxona/database', () => ({
  prisma: {
    order: { findFirst: jest.fn() },
    payment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
  },
  PaymentMethod: { CASH: 'CASH', CARD: 'CARD', PAYME: 'PAYME' },
  PaymentStatus: { PENDING: 'PENDING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', CANCELLED: 'CANCELLED', REFUNDED: 'REFUNDED' },
}));

jest.mock('../../../config/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  },
}));

jest.mock('../../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { PaymentService } from '../../../services/payment.service.js';
import { prisma, PaymentMethod } from '@oshxona/database';
import { redis } from '../../../config/redis.js';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('PaymentService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createPayment', () => {
    it('should create payment without idempotency key', async () => {
      const mockPayment = { id: 'pay-1', orderId: 'order-1', status: 'PENDING' };
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await PaymentService.createPayment({
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amount: 50000,
      });

      expect(result.id).toBe('pay-1');
      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    });

    it('should return cached payment for duplicate idempotency key', async () => {
      const existingPaymentId = 'existing-pay-1';
      (mockRedis.get as jest.Mock).mockResolvedValue(existingPaymentId);
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue({
        id: existingPaymentId, status: 'PENDING',
      });

      const result = await PaymentService.createPayment({
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amount: 50000,
        idempotencyKey: 'order_1_attempt_1',
      });

      expect(result.id).toBe(existingPaymentId);
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should create new payment and cache idempotency key', async () => {
      const mockPayment = { id: 'pay-new', orderId: 'order-1', status: 'PENDING' };
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      await PaymentService.createPayment({
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amount: 50000,
        idempotencyKey: 'order_1_attempt_2',
      });

      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'idem:payment:order_1_attempt_2',
        86400,
        'pay-new',
      );
    });
  });

  describe('findOrderForPayment', () => {
    it('should calculate remaining amount correctly', async () => {
      (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue({
        id: 'order-1',
        total: 100000,
        payments: [
          { status: 'COMPLETED', amount: 30000 },
          { status: 'FAILED', amount: 50000 },
        ],
        items: [],
        customer: null,
      });

      const result = await PaymentService.findOrderForPayment('order-1', 70000);

      expect(result?.orderTotal).toBe(100000);
      expect(result?.paidAmount).toBe(30000);
      expect(result?.remaining).toBe(70000);
    });
  });
});
