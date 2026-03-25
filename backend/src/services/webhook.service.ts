import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '@oshxona/database';

// Webhook eventlar ro'yxati
export type WebhookEvent =
  | 'order:new'
  | 'order:status'
  | 'order:cancelled'
  | 'order:completed'
  | 'product:created'
  | 'product:updated'
  | 'product:deleted';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}

class WebhookService {
  // HMAC signature yaratish
  private createSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  // Webhook eventni trigger qilish
  async emit(event: WebhookEvent, data: any) {
    try {
      // Shu event uchun faol webhooklarni topish
      const webhooks = await prisma.webhook.findMany({
        where: {
          isActive: true,
          events: { has: event },
        },
      });

      if (webhooks.length === 0) return;

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      // Barcha webhooklarga parallel yuborish
      const promises = webhooks.map((webhook) =>
        this.sendWebhook(webhook, payload)
      );

      await Promise.allSettled(promises);
    } catch (err) {
      console.error(`[Webhook] Emit xatolik (${event}):`, err);
    }
  }

  // Bitta webhookga yuborish
  private async sendWebhook(
    webhook: { id: string; url: string; secret: string | null; headers: any; name: string },
    payload: WebhookPayload
  ) {
    const startTime = Date.now();
    const payloadStr = JSON.stringify(payload);

    try {
      // Headerlar tayyorlash
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
      };

      // HMAC signature qo'shish
      if (webhook.secret) {
        headers['X-Webhook-Signature'] = this.createSignature(payloadStr, webhook.secret);
      }

      // Qo'shimcha custom headerlar
      if (webhook.headers && typeof webhook.headers === 'object') {
        Object.assign(headers, webhook.headers);
      }

      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 10000,
      });

      const duration = Date.now() - startTime;

      // Muvaffaqiyatli log
      await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: payload.event,
          payload: payload as any,
          response: { status: response.status, data: response.data } as any,
          statusCode: response.status,
          success: true,
          direction: 'outgoing',
          duration,
        },
      });

      console.log(`[Webhook] ✓ ${webhook.name} → ${payload.event} (${duration}ms)`);
    } catch (err: any) {
      const duration = Date.now() - startTime;

      // Xatolik log
      await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: payload.event,
          payload: payload as any,
          response: err.response?.data ? (err.response.data as any) : null,
          statusCode: err.response?.status || null,
          success: false,
          direction: 'outgoing',
          error: err.message,
          duration,
        },
      });

      console.error(`[Webhook] ✗ ${webhook.name} → ${payload.event}: ${err.message}`);
    }
  }

  // Incoming webhook ni tekshirish (signature verification)
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.createSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }
}

export const webhookService = new WebhookService();
