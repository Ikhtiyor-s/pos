import { prisma, PaymentMethod, PaymentStatus } from '@oshxona/database';

export class PaymentService {
  // Buyurtma topish va summa tekshirish
  // tenantId ixtiyoriy — payment providerlardan (Click, Payme, Uzum) kelganda tenantId yo'q
  static async findOrderForPayment(orderId: string, amountInUzs: number, tenantId?: string) {
    const where: any = { id: orderId };
    if (tenantId) where.tenantId = tenantId;

    const order = await prisma.order.findFirst({
      where,
      include: { payments: true, items: { include: { product: true } }, customer: true },
    });

    if (!order) return null;

    const orderTotal = Number(order.total);
    const paidAmount = order.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remaining = orderTotal - paidAmount;

    return { order, orderTotal, paidAmount, remaining };
  }

  // Buyurtmani orderNumber bo'yicha topish
  // tenantId ixtiyoriy — ichki koddan chaqirilganda tenantId beriladi, tashqi callbacklarda yo'q
  static async findOrderByNumber(orderNumber: string, tenantId?: string) {
    const where: any = { orderNumber };
    if (tenantId) where.tenantId = tenantId;

    return prisma.order.findFirst({
      where,
      include: { payments: true, items: { include: { product: true } }, customer: true },
    });
  }

  // PENDING payment yaratish
  // Payment modelda tenantId yo'q — tenant Order orqali aniqlanadi
  static async createPayment(data: {
    orderId: string;
    method: PaymentMethod;
    amount: number;
    reference?: string;
    transactionId?: string;
  }) {
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

  // Payment ni COMPLETED qilish
  static async completePayment(paymentId: string, providerData?: any) {
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        providerData: providerData || undefined,
      },
      include: { order: true },
    });

    return payment;
  }

  // Payment ni FAILED qilish
  static async failPayment(paymentId: string, reason: string) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        providerData: { error: reason } as any,
      },
    });
  }

  // Payment ni bekor qilish
  static async cancelPayment(paymentId: string, providerData?: any) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.CANCELLED,
        providerData: providerData || undefined,
      },
    });
  }

  // Payment ni refund qilish
  static async refundPayment(paymentId: string, providerData?: any) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        providerData: providerData || undefined,
      },
    });
  }

  // TransactionId bo'yicha payment topish
  static async findByTransactionId(transactionId: string) {
    return prisma.payment.findFirst({
      where: { transactionId },
      include: { order: true },
    });
  }

  // Reference bo'yicha payment topish
  static async findByReference(reference: string) {
    return prisma.payment.findFirst({
      where: { reference },
      include: { order: true },
    });
  }
}
