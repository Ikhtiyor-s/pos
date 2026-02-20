import { prisma, PaymentMethod } from '@oshxona/database';
import { PaymentService } from './payment.service.js';

interface UzumParams {
  serviceId?: number;
  transId?: string;
  amount?: number;
  orderId?: string;
  [key: string]: any;
}

export class UzumService {
  // Secret key tekshirish
  static async verifyRequest(authHeader: string | undefined): Promise<boolean> {
    const settings = await prisma.settings.findFirst();
    if (!settings?.uzumEnabled || !settings.uzumSecretKey) {
      return false;
    }
    return authHeader === settings.uzumSecretKey;
  }

  // Check — buyurtma mavjudligini tekshirish
  static async handleCheck(params: UzumParams) {
    const orderId = params.orderId;
    if (!orderId) {
      return { status: 400, data: { error_code: -1, error_note: 'orderId majburiy' } };
    }

    const result = await PaymentService.findOrderForPayment(orderId, params.amount || 0);
    if (!result) {
      return { status: 200, data: { error_code: -5, error_note: 'Buyurtma topilmadi' } };
    }

    return {
      status: 200,
      data: {
        error_code: 0,
        error_note: 'Success',
        order: {
          id: result.order.id,
          orderNumber: result.order.orderNumber,
          amount: result.orderTotal,
          status: result.order.status,
        },
      },
    };
  }

  // Create — tranzaksiya yaratish
  static async handleCreate(params: UzumParams) {
    const orderId = params.orderId;
    const transId = params.transId;

    if (!orderId || !transId) {
      return { status: 400, data: { error_code: -1, error_note: 'orderId va transId majburiy' } };
    }

    // Mavjud tranzaksiya tekshirish
    const existing = await PaymentService.findByTransactionId(transId);
    if (existing) {
      return {
        status: 200,
        data: { error_code: 0, error_note: 'Tranzaksiya allaqachon yaratilgan', transId },
      };
    }

    const result = await PaymentService.findOrderForPayment(orderId, params.amount || 0);
    if (!result) {
      return { status: 200, data: { error_code: -5, error_note: 'Buyurtma topilmadi' } };
    }

    const payment = await PaymentService.createPayment({
      orderId,
      method: PaymentMethod.UZUM,
      amount: params.amount || result.orderTotal,
      reference: transId,
      transactionId: transId,
    });

    return {
      status: 200,
      data: { error_code: 0, error_note: 'Success', paymentId: payment.id, transId },
    };
  }

  // Confirm — to'lovni tasdiqlash
  static async handleConfirm(params: UzumParams) {
    const transId = params.transId;
    if (!transId) {
      return { status: 400, data: { error_code: -1, error_note: 'transId majburiy' } };
    }

    const payment = await PaymentService.findByTransactionId(transId);
    if (!payment) {
      return { status: 200, data: { error_code: -3, error_note: 'Tranzaksiya topilmadi' } };
    }

    if (payment.status === 'COMPLETED') {
      return { status: 200, data: { error_code: 0, error_note: 'Allaqachon tasdiqlangan' } };
    }

    await PaymentService.completePayment(payment.id, {
      uzum_trans_id: transId,
      confirmed_at: new Date().toISOString(),
    });

    return { status: 200, data: { error_code: 0, error_note: 'Success' } };
  }

  // Reverse — to'lovni qaytarish
  static async handleReverse(params: UzumParams) {
    const transId = params.transId;
    if (!transId) {
      return { status: 400, data: { error_code: -1, error_note: 'transId majburiy' } };
    }

    const payment = await PaymentService.findByTransactionId(transId);
    if (!payment) {
      return { status: 200, data: { error_code: -3, error_note: 'Tranzaksiya topilmadi' } };
    }

    if (payment.status === 'REFUNDED' || payment.status === 'CANCELLED') {
      return { status: 200, data: { error_code: 0, error_note: 'Allaqachon bekor qilingan' } };
    }

    await PaymentService.refundPayment(payment.id, {
      uzum_trans_id: transId,
      reversed_at: new Date().toISOString(),
    });

    return { status: 200, data: { error_code: 0, error_note: 'Success' } };
  }
}
