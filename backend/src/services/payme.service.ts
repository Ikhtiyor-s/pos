import { prisma, PaymentMethod } from '@oshxona/database';
import { PaymentService } from './payment.service.js';

// Payme xato kodlari
const PaymeError = {
  InvalidAmount: { code: -31001, message: { uz: 'Noto\'g\'ri summa' } },
  OrderNotFound: { code: -31050, message: { uz: 'Buyurtma topilmadi' } },
  CantPerform: { code: -31008, message: { uz: 'Bajarib bo\'lmaydi' } },
  TransactionNotFound: { code: -31003, message: { uz: 'Tranzaksiya topilmadi' } },
  AlreadyPaid: { code: -31060, message: { uz: 'Allaqachon to\'langan' } },
  CantCancel: { code: -31007, message: { uz: 'Bekor qilib bo\'lmaydi' } },
  AuthError: { code: -32504, message: { uz: 'Autentifikatsiya xatosi' } },
};

interface PaymeParams {
  id: string;
  amount: number;
  account?: { order_id?: string };
  time?: number;
  reason?: number;
}

export class PaymeService {
  // BasicAuth tekshirish
  static async verifyAuth(authHeader: string | undefined): Promise<boolean> {
    if (!authHeader?.startsWith('Basic ')) return false;

    const settings = await prisma.settings.findFirst();
    if (!settings?.paymeEnabled || !settings.paymeMerchantId || !settings.paymeSecretKey) {
      return false;
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const [merchantId, key] = decoded.split(':');

    return merchantId === settings.paymeMerchantId && key === settings.paymeSecretKey;
  }

  // JSON-RPC request handler
  static async handleCallback(method: string, params: PaymeParams): Promise<any> {
    switch (method) {
      case 'CheckPerformTransaction':
        return PaymeService.checkPerformTransaction(params);
      case 'CreateTransaction':
        return PaymeService.createTransaction(params);
      case 'PerformTransaction':
        return PaymeService.performTransaction(params);
      case 'CancelTransaction':
        return PaymeService.cancelTransaction(params);
      case 'CheckTransaction':
        return PaymeService.checkTransaction(params);
      default:
        return { error: { code: -32601, message: { uz: 'Metod topilmadi' } } };
    }
  }

  // Buyurtmani to'lash mumkinligini tekshirish
  private static async checkPerformTransaction(params: PaymeParams) {
    const orderId = params.account?.order_id;
    if (!orderId) {
      return { error: PaymeError.OrderNotFound };
    }

    const result = await PaymentService.findOrderForPayment(orderId, params.amount / 100);
    if (!result) {
      return { error: PaymeError.OrderNotFound };
    }

    const { order, orderTotal } = result;
    const amountInUzs = params.amount / 100;

    if (Math.abs(amountInUzs - orderTotal) > 1) {
      return { error: PaymeError.InvalidAmount };
    }

    if (order.status === 'CANCELLED') {
      return { error: PaymeError.CantPerform };
    }

    return { result: { allow: true } };
  }

  // Tranzaksiya yaratish
  private static async createTransaction(params: PaymeParams) {
    const orderId = params.account?.order_id;
    if (!orderId) {
      return { error: PaymeError.OrderNotFound };
    }

    // Mavjud tranzaksiyani tekshirish
    const existing = await PaymentService.findByTransactionId(params.id);
    if (existing) {
      if (existing.status === 'PENDING') {
        return {
          result: {
            create_time: existing.createdAt.getTime(),
            transaction: existing.id,
            state: 1,
          },
        };
      }
      return { error: PaymeError.CantPerform };
    }

    const result = await PaymentService.findOrderForPayment(orderId, params.amount / 100);
    if (!result) {
      return { error: PaymeError.OrderNotFound };
    }

    const amountInUzs = params.amount / 100;
    if (Math.abs(amountInUzs - result.orderTotal) > 1) {
      return { error: PaymeError.InvalidAmount };
    }

    const payment = await PaymentService.createPayment({
      orderId,
      method: PaymentMethod.PAYME,
      amount: amountInUzs,
      reference: params.id,
      transactionId: params.id,
    });

    return {
      result: {
        create_time: payment.createdAt.getTime(),
        transaction: payment.id,
        state: 1,
      },
    };
  }

  // Tranzaksiyani bajarish (to'lovni yakunlash)
  private static async performTransaction(params: PaymeParams) {
    const payment = await PaymentService.findByTransactionId(params.id);
    if (!payment) {
      return { error: PaymeError.TransactionNotFound };
    }

    if (payment.status === 'COMPLETED') {
      return {
        result: {
          perform_time: payment.updatedAt.getTime(),
          transaction: payment.id,
          state: 2,
        },
      };
    }

    if (payment.status !== 'PENDING') {
      return { error: PaymeError.CantPerform };
    }

    const completed = await PaymentService.completePayment(payment.id, {
      payme_id: params.id,
      performed_at: new Date().toISOString(),
    });

    return {
      result: {
        perform_time: completed.updatedAt.getTime(),
        transaction: completed.id,
        state: 2,
      },
    };
  }

  // Tranzaksiyani bekor qilish
  private static async cancelTransaction(params: PaymeParams) {
    const payment = await PaymentService.findByTransactionId(params.id);
    if (!payment) {
      return { error: PaymeError.TransactionNotFound };
    }

    if (payment.status === 'CANCELLED') {
      return {
        result: {
          cancel_time: payment.updatedAt.getTime(),
          transaction: payment.id,
          state: -1,
        },
      };
    }

    if (payment.status === 'COMPLETED') {
      // Refund
      const refunded = await PaymentService.refundPayment(payment.id, {
        reason: params.reason,
        cancelled_at: new Date().toISOString(),
      });
      return {
        result: {
          cancel_time: refunded.updatedAt.getTime(),
          transaction: refunded.id,
          state: -2,
        },
      };
    }

    const cancelled = await PaymentService.cancelPayment(payment.id, {
      reason: params.reason,
    });

    return {
      result: {
        cancel_time: cancelled.updatedAt.getTime(),
        transaction: cancelled.id,
        state: -1,
      },
    };
  }

  // Tranzaksiya holatini tekshirish
  private static async checkTransaction(params: PaymeParams) {
    const payment = await PaymentService.findByTransactionId(params.id);
    if (!payment) {
      return { error: PaymeError.TransactionNotFound };
    }

    const stateMap: Record<string, number> = {
      PENDING: 1,
      COMPLETED: 2,
      CANCELLED: -1,
      REFUNDED: -2,
      FAILED: -1,
    };

    return {
      result: {
        create_time: payment.createdAt.getTime(),
        perform_time: payment.status === 'COMPLETED' ? payment.updatedAt.getTime() : 0,
        cancel_time: ['CANCELLED', 'REFUNDED'].includes(payment.status) ? payment.updatedAt.getTime() : 0,
        transaction: payment.id,
        state: stateMap[payment.status] || 1,
        reason: null,
      },
    };
  }
}
