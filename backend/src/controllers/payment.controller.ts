import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';
import { PaymeService } from '../services/payme.service.js';
import { ClickService, type ClickParams } from '../services/click.service.js';
import { UzumService } from '../services/uzum.service.js';
import { IntegrationService } from '../services/integration.service.js';

export class PaymentController {
  // ============ PAYME CALLBACK ============
  // POST /api/payments/payme/callback
  static async paymeCallback(req: Request, res: Response, next: NextFunction) {
    try {
      // Auth tekshirish
      const isValid = await PaymeService.verifyAuth(req.headers.authorization);
      if (!isValid) {
        return res.json({
          error: { code: -32504, message: { uz: 'Autentifikatsiya xatosi' } },
        });
      }

      const { method, params } = req.body;
      console.log(`[Payme] ${method}`, JSON.stringify(params).slice(0, 200));

      const result = await PaymeService.handleCallback(method, params);

      // Log
      await PaymentController.logPayment('payme', method, req.body, result);

      // Agar to'lov yakunlangan bo'lsa — event dispatch
      if (method === 'PerformTransaction' && result?.result?.state === 2) {
        IntegrationService.dispatchEvent('order:status', {
          event: 'payment:completed',
          provider: 'payme',
          transactionId: params.id,
        }).catch(console.error);
      }

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============ CLICK PREPARE ============
  // POST /api/payments/click/prepare
  static async clickPrepare(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.body as ClickParams;
      console.log(`[Click] Prepare`, JSON.stringify(params).slice(0, 200));

      const result = await ClickService.handlePrepare(params);

      await PaymentController.logPayment('click', 'prepare', params, result);

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============ CLICK COMPLETE ============
  // POST /api/payments/click/complete
  static async clickComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const params = req.body as ClickParams;
      console.log(`[Click] Complete`, JSON.stringify(params).slice(0, 200));

      const result = await ClickService.handleComplete(params);

      await PaymentController.logPayment('click', 'complete', params, result);

      // Agar to'lov muvaffaqiyatli
      if (result.error === 0 && params.action === 1) {
        IntegrationService.dispatchEvent('order:status', {
          event: 'payment:completed',
          provider: 'click',
          transactionId: String(params.click_trans_id),
        }).catch(console.error);
      }

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ============ UZUM CALLBACK ============
  // POST /api/payments/uzum/callback
  static async uzumCallback(req: Request, res: Response, next: NextFunction) {
    try {
      // Auth tekshirish
      const isValid = await UzumService.verifyRequest(req.headers['x-auth'] as string);
      if (!isValid) {
        return res.status(401).json({ error_code: -1, error_note: 'Authentication failed' });
      }

      const { method, params } = req.body;
      console.log(`[Uzum] ${method}`, JSON.stringify(params).slice(0, 200));

      let result;
      switch (method) {
        case 'check':
          result = await UzumService.handleCheck(params);
          break;
        case 'create':
          result = await UzumService.handleCreate(params);
          break;
        case 'confirm':
          result = await UzumService.handleConfirm(params);
          break;
        case 'reverse':
          result = await UzumService.handleReverse(params);
          break;
        default:
          result = { status: 400, data: { error_code: -1, error_note: 'Unknown method' } };
      }

      await PaymentController.logPayment('uzum', method, params, result.data);

      // Agar to'lov tasdiqlangan
      if (method === 'confirm' && result.data.error_code === 0) {
        IntegrationService.dispatchEvent('order:status', {
          event: 'payment:completed',
          provider: 'uzum',
          transactionId: params.transId,
        }).catch(console.error);
      }

      return res.status(result.status).json(result.data);
    } catch (error) {
      next(error);
    }
  }

  // ============ LOG HELPER ============
  private static async logPayment(service: string, method: string, payload: any, response: any) {
    try {
      // Service uchun webhook topish yoki yaratish
      let webhook = await prisma.webhook.findFirst({ where: { service } });
      if (!webhook) {
        // Webhook yaratish uchun tenantId kerak — orderId orqali topamiz
        const orderId = payload?.merchant_trans_id || payload?.account?.order_id || payload?.orderId;
        let tenantId: string | null = null;
        if (orderId) {
          const order = await prisma.order.findUnique({ where: { id: orderId }, select: { tenantId: true } });
          tenantId = order?.tenantId || null;
        }
        if (!tenantId) return; // Tenant aniqlanmasa log qilmaymiz

        webhook = await prisma.webhook.create({
          data: {
            tenantId,
            name: `${service.charAt(0).toUpperCase() + service.slice(1)} Payment`,
            url: 'incoming',
            events: ['payment:*'],
            service,
            isActive: true,
          },
        });
      }

      await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: `payment:${method}`,
          payload: payload as any,
          response: response as any,
          success: true,
          direction: 'incoming',
        },
      });
    } catch (err) {
      console.error(`[Payment Log] Xatolik:`, err);
    }
  }
}
