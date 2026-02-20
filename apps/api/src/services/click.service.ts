import crypto from 'crypto';
import { prisma, PaymentMethod } from '@oshxona/database';
import { PaymentService } from './payment.service.js';

export interface ClickParams {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_trans_id: string; // order ID
  amount: number;
  action: number; // 0 = prepare, 1 = complete
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id?: number;
}

export interface ClickResponse {
  click_trans_id: number;
  merchant_trans_id: string;
  merchant_prepare_id?: number;
  error: number;
  error_note: string;
}

export class ClickService {
  // Sign tekshirish
  static async verifySign(params: ClickParams): Promise<boolean> {
    const settings = await prisma.settings.findFirst();
    if (!settings?.clickEnabled || !settings.clickSecretKey || !settings.clickServiceId) {
      return false;
    }

    const signString = params.action === 0
      ? `${params.click_trans_id}${settings.clickServiceId}${settings.clickSecretKey}${params.merchant_trans_id}${params.amount}${params.action}${params.sign_time}`
      : `${params.click_trans_id}${settings.clickServiceId}${settings.clickSecretKey}${params.merchant_trans_id}${params.merchant_prepare_id}${params.amount}${params.action}${params.sign_time}`;

    const hash = crypto.createHash('md5').update(signString).digest('hex');
    return hash === params.sign_string;
  }

  // Prepare (action=0)
  static async handlePrepare(params: ClickParams): Promise<ClickResponse> {
    // Sign tekshirish
    const isValid = await ClickService.verifySign(params);
    if (!isValid) {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -1,
        error_note: 'SIGN CHECK FAILED!',
      };
    }

    // Buyurtma topish
    const result = await PaymentService.findOrderForPayment(params.merchant_trans_id, params.amount);
    if (!result) {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -5,
        error_note: 'Order not found',
      };
    }

    const { order, orderTotal } = result;

    // Summa tekshirish
    if (Math.abs(params.amount - orderTotal) > 1) {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -2,
        error_note: 'Incorrect parameter amount',
      };
    }

    // Buyurtma bekor qilingan bo'lsa
    if (order.status === 'CANCELLED') {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -9,
        error_note: 'Transaction cancelled',
      };
    }

    // Allaqachon to'langan tekshirish
    const existingPayment = await PaymentService.findByTransactionId(String(params.click_trans_id));
    if (existingPayment && existingPayment.status === 'COMPLETED') {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -4,
        error_note: 'Already paid',
      };
    }

    // Payment yaratish
    const payment = await PaymentService.createPayment({
      orderId: params.merchant_trans_id,
      method: PaymentMethod.CLICK,
      amount: params.amount,
      reference: String(params.click_trans_id),
      transactionId: String(params.click_trans_id),
    });

    return {
      click_trans_id: params.click_trans_id,
      merchant_trans_id: params.merchant_trans_id,
      merchant_prepare_id: parseInt(payment.id.slice(0, 8), 16), // Raqamli ID
      error: 0,
      error_note: 'Success',
    };
  }

  // Complete (action=1)
  static async handleComplete(params: ClickParams): Promise<ClickResponse> {
    // Sign tekshirish
    const isValid = await ClickService.verifySign(params);
    if (!isValid) {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -1,
        error_note: 'SIGN CHECK FAILED!',
      };
    }

    // Click xatolik yuborgan bo'lsa
    if (params.error < 0) {
      const payment = await PaymentService.findByTransactionId(String(params.click_trans_id));
      if (payment && payment.status === 'PENDING') {
        await PaymentService.cancelPayment(payment.id, { click_error: params.error });
      }
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -9,
        error_note: 'Transaction cancelled',
      };
    }

    // Payment topish
    const payment = await PaymentService.findByTransactionId(String(params.click_trans_id));
    if (!payment) {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        error: -6,
        error_note: 'Transaction not found',
      };
    }

    if (payment.status === 'COMPLETED') {
      return {
        click_trans_id: params.click_trans_id,
        merchant_trans_id: params.merchant_trans_id,
        merchant_prepare_id: params.merchant_prepare_id,
        error: -4,
        error_note: 'Already paid',
      };
    }

    // To'lovni yakunlash
    await PaymentService.completePayment(payment.id, {
      click_trans_id: params.click_trans_id,
      click_paydoc_id: params.click_paydoc_id,
    });

    return {
      click_trans_id: params.click_trans_id,
      merchant_trans_id: params.merchant_trans_id,
      merchant_prepare_id: params.merchant_prepare_id,
      error: 0,
      error_note: 'Success',
    };
  }
}
