import { prisma, PaymentMethod, PaymentStatus } from '@oshxona/database';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const IDEMPOTENCY_TTL = 86_400; // 24 soat (seconds)

export class PaymentService {
  static async findOrderForPayment(orderId: string, amountInUzs: number, tenantId?: string) {
    const where: any = { id: orderId };
    if (tenantId) where.tenantId = tenantId;

    const order = await prisma.order.findFirst({
      where,
      include: {
        payments: true,
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!order) return null;

    const orderTotal = Number(order.total);
    const paidAmount = order.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return { order, orderTotal, paidAmount, remaining: orderTotal - paidAmount };
  }

  static async findOrderByNumber(orderNumber: string, tenantId?: string) {
    const where: any = { orderNumber };
    if (tenantId) where.tenantId = tenantId;
    return prisma.order.findFirst({
      where,
      include: { payments: true, items: { include: { product: true } }, customer: true },
    });
  }

  // Idempotency key bilan PENDING payment yaratish
  // Bir xil key bilan ikki marta chaqirilsa — birinchisi qaytariladi
  static async createPayment(data: {
    orderId: string;
    method: PaymentMethod;
    amount: number;
    reference?: string;
    transactionId?: string;
    idempotencyKey?: string;
  }) {
    // Idempotency tekshiruvi
    if (data.idempotencyKey) {
      const cacheKey = `idem:payment:${data.idempotencyKey}`;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const existingPayment = await prisma.payment.findUnique({ where: { id: cached } });
          if (existingPayment) {
            logger.info('Idempotent payment returned', { idempotencyKey: data.idempotencyKey, paymentId: cached });
            return existingPayment;
          }
        }
      } catch {
        // Redis xatosi — davom etamiz
      }

      const payment = await prisma.payment.create({
        data: {
          orderId: data.orderId,
          method: data.method,
          amount: data.amount,
          status: PaymentStatus.PENDING,
          reference: data.reference || null,
          transactionId: data.transactionId || null,
        },
      });

      try {
        await redis.setex(cacheKey, IDEMPOTENCY_TTL, payment.id);
      } catch {
        // Ignore
      }

      logger.info('Payment created', { paymentId: payment.id, orderId: data.orderId, method: data.method, amount: data.amount });
      return payment;
    }

    // Idempotency key yo'q — oddiy yaratish
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method,
        amount: data.amount,
        status: PaymentStatus.PENDING,
        reference: data.reference || null,
        transactionId: data.transactionId || null,
      },
    });
  }

  static async completePayment(paymentId: string, providerData?: any) {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.COMPLETED, providerData: providerData ?? undefined },
      include: { order: true },
    });

    logger.info('Payment completed', { paymentId, orderId: payment.orderId });
    return payment;
  }

  static async failPayment(paymentId: string, reason: string) {
    logger.warn('Payment failed', { paymentId, reason });
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, providerData: { error: reason } as any },
    });
  }

  static async cancelPayment(paymentId: string, providerData?: any) {
    logger.info('Payment cancelled', { paymentId });
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CANCELLED, providerData: providerData ?? undefined },
    });
  }

  static async refundPayment(paymentId: string, providerData?: any) {
    logger.info('Payment refunded', { paymentId });
    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED, providerData: providerData ?? undefined },
    });
  }

  static async findByTransactionId(transactionId: string) {
    return prisma.payment.findFirst({
      where: { transactionId },
      include: { order: true },
    });
  }

  static async findByReference(reference: string) {
    return prisma.payment.findFirst({
      where: { reference },
      include: { order: true },
    });
  }
}
