import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { prisma, OrderStatus, ItemStatus } from '@oshxona/database';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { webhookService } from '../services/webhook.service.js';
import { nonborSyncService } from '../services/nonbor-sync.service.js';
import { webhookProviderService, type ProviderHandleResult } from '../services/webhook-provider.service.js';

export class WebhookController {
  // ============================================================
  // CRUD — authenticated routes (req.user.tenantId ishlatiladi)
  // ============================================================

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const tenantId = req.user!.tenantId!;
      const [webhooks, total] = await Promise.all([
        prisma.webhook.findMany({
          where: { tenantId },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { logs: true } } },
        }),
        prisma.webhook.count({ where: { tenantId } }),
      ]);

      return paginatedResponse(res, webhooks, parseInt(page as string), take, total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.id, tenantId },
        include: { logs: { take: 20, orderBy: { createdAt: 'desc' } } },
      });

      if (!webhook) return errorResponse(res, 'Webhook topilmadi', 404);
      return successResponse(res, webhook);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, url, secret, events, headers, service } = req.body;

      if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
        return errorResponse(res, 'name, url va events majburiy');
      }

      const webhook = await prisma.webhook.create({
        data: {
          tenantId: req.user!.tenantId!,
          name,
          url,
          secret: secret || null,
          events,
          headers: headers || null,
          service: service || null,
        },
      });

      return successResponse(res, webhook, 'Webhook yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { name, url, secret, events, headers, service, isActive } = req.body;

      const existing = await prisma.webhook.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!existing) return errorResponse(res, 'Webhook topilmadi', 404);

      const webhook = await prisma.webhook.update({
        where: { id: req.params.id },
        data: {
          ...(name     !== undefined && { name }),
          ...(url      !== undefined && { url }),
          ...(secret   !== undefined && { secret }),
          ...(events   !== undefined && { events }),
          ...(headers  !== undefined && { headers }),
          ...(service  !== undefined && { service }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return successResponse(res, webhook, 'Webhook yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const existing = await prisma.webhook.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!existing) return errorResponse(res, 'Webhook topilmadi', 404);

      await prisma.webhook.delete({ where: { id: req.params.id } });

      return successResponse(res, null, "Webhook o'chirildi");
    } catch (error) {
      next(error);
    }
  }

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page = '1', limit = '50' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      // Webhook shu tenantga tegishli ekanini tekshirish
      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.id, tenantId },
        select: { id: true },
      });
      if (!webhook) return errorResponse(res, 'Webhook topilmadi', 404);

      const [logs, total] = await Promise.all([
        prisma.webhookLog.findMany({
          where: { webhookId: webhook.id },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.webhookLog.count({ where: { webhookId: webhook.id } }),
      ]);

      return paginatedResponse(res, logs, parseInt(page as string), take, total);
    } catch (error) {
      next(error);
    }
  }

  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      // tenantId tekshirish: boshqa tenantning webhook'ini test qilib bo'lmaydi
      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!webhook) return errorResponse(res, 'Webhook topilmadi', 404);

      await webhookService.emit('order:new', {
        test: true,
        message: 'Bu test webhook xabari',
        timestamp: new Date().toISOString(),
      });

      return successResponse(res, { sent: true }, 'Test webhook yuborildi');
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableEvents(_req: Request, res: Response, next: NextFunction) {
    try {
      const events = [
        { event: 'order:new',       description: 'Yangi buyurtma yaratilganda' },
        { event: 'order:status',    description: "Buyurtma holati o'zgarganda" },
        { event: 'order:cancelled', description: 'Buyurtma bekor qilinganda' },
        { event: 'order:completed', description: 'Buyurtma yakunlanganda' },
        { event: 'product:created', description: "Yangi mahsulot qo'shilganda" },
        { event: 'product:updated', description: 'Mahsulot yangilanganda' },
        { event: 'product:deleted', description: "Mahsulot o'chirilganda" },
      ];
      return successResponse(res, events);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================
  // INCOMING WEBHOOK RECEIVER — tashqi servislardan (auth yo'q)
  // POST /api/webhook/receive/:service?tenantId=<uuid>
  //
  // MUHIM: tenantId URL query parametrida bo'lishi shart.
  // Nonbor webhook URL misoli:
  //   https://api.example.com/api/webhook/receive/nonbor?tenantId=abc123
  // Har tenant Nonbor admin panelida o'zining tenantId'li URL'ni kiritadi.
  // ============================================================

  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const { service } = req.params;
      const payload = req.body;

      // ── tenantId validatsiyasi ─────────────────────────────
      const tenantId = (req.query.tenantId as string | undefined)?.trim();
      if (!tenantId) {
        return errorResponse(
          res,
          'tenantId query parametri majburiy. URL: /receive/nonbor?tenantId=<uuid>',
          400
        );
      }

      // tenantId haqiqiy ekanini tekshirish
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, isActive: true },
      });
      if (!tenant || !tenant.isActive) {
        return errorResponse(res, 'Tenant topilmadi yoki faol emas', 403);
      }

      // ── Signature tekshirish (webhook shu tenantga tegishli) ──
      const webhook = await prisma.webhook.findFirst({
        where: { service, isActive: true, tenantId },
      });

      if (webhook?.secret) {
        const signature = req.headers['x-webhook-signature'] as string;
        if (signature) {
          const isValid = webhookService.verifySignature(
            JSON.stringify(payload),
            signature,
            webhook.secret
          );
          if (!isValid) {
            if (webhook) {
              await prisma.webhookLog.create({
                data: {
                  webhookId: webhook.id,
                  event:     'incoming:invalid_signature',
                  payload:   payload as object,
                  success:   false,
                  direction: 'incoming',
                  error:     'Invalid signature',
                },
              });
            }
            return errorResponse(res, 'Invalid signature', 401);
          }
        }
      }

      // ── Servisga qarab ishlov berish ──────────────────────
      let result: unknown;

      switch (service) {
        case 'nonbor':
          nonborSyncService.notifyWebhookReceived();
          result = await WebhookController.handleNonborWebhook(req, payload, tenantId);
          break;

        case 'yandex-eats':
        case 'express24':
        case 'delivery-club': {
          const providerResult: ProviderHandleResult =
            await webhookProviderService.handleIncoming(service, payload, tenantId, req);
          result = providerResult;
          break;
        }

        default:
          result = await WebhookController.handleGenericWebhook(req, service, payload);
          break;
      }

      if (webhook) {
        await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            event:     `incoming:${service}`,
            payload:   payload as object,
            success:   true,
            direction: 'incoming',
          },
        });
      }

      return successResponse(res, result, 'Webhook qabul qilindi');
    } catch (error) {
      next(error);
    }
  }

  // ── Nonbor webhook handler ──────────────────────────────────
  // tenantId har bir DB so'roviga qo'shiladi — cross-tenant o'zgartirishdan himoya
  private static async handleNonborWebhook(
    req: Request,
    payload: { event?: string; data?: Record<string, unknown> },
    tenantId: string
  ) {
    const io   = req.app.get('io') as Server;
    const event = payload.event ?? '';
    const data  = payload.data ?? {};

    switch (event) {
      // ── Yangi buyurtma ──────────────────────────────────────
      case 'order:new':
      case 'order.new': {
        if (data?.id) {
          const settings = await prisma.settings.findUnique({
            where: { tenantId },
          });
          if (settings?.nonborEnabled && settings.nonborSellerId) {
            await nonborSyncService.manualSync();
          }
        }
        return { processed: true, action: 'order_sync_triggered' };
      }

      // ── Status yangilash ────────────────────────────────────
      case 'order:status':
      case 'order.status': {
        const nonborOrderId = typeof data.order_id === 'number' ? data.order_id : null;
        const state         = typeof data.state    === 'string' ? data.state    : null;

        if (!nonborOrderId || !state) {
          return { processed: false, reason: 'missing_order_id_or_state' };
        }

        // tenantId majburiy — boshqa tenantning orderi o'zgartirilmaydi
        const order = await prisma.order.findFirst({
          where: { nonborOrderId, tenantId },
        });

        if (!order) {
          return { processed: false, reason: 'order_not_found' };
        }

        const statusMap: Record<string, OrderStatus> = {
          CHECKING:   OrderStatus.NEW,
          ACCEPTED:   OrderStatus.CONFIRMED,
          PREPARING:  OrderStatus.PREPARING,
          READY:      OrderStatus.READY,
          DELIVERING: OrderStatus.DELIVERING,
          DELIVERED:  OrderStatus.COMPLETED,
          CANCELLED:  OrderStatus.CANCELLED,
        };

        const newStatus = statusMap[state];
        if (!newStatus || order.status === newStatus) {
          return { processed: false, reason: 'unknown_state_or_no_change' };
        }

        // update by id xavfsiz — order allaqachon tenantId bilan topilgan
        const updated = await prisma.order.update({
          where: { id: order.id },
          data:  { status: newStatus },
          include: {
            items:    { include: { product: true } },
            customer: true,
          },
        });

        io.to(tenantId).emit('order:status',  { orderId: order.id, status: newStatus });
        io.to(tenantId).emit('order:updated', updated);
        io.to(`${tenantId}:kitchen`).emit('order:updated', updated);

        return { processed: true, action: 'status_updated', orderId: order.id };
      }

      // ── Bekor qilish ────────────────────────────────────────
      case 'order:cancelled':
      case 'order.cancelled': {
        const nonborOrderId = typeof data.order_id === 'number' ? data.order_id : null;

        if (!nonborOrderId) {
          return { processed: false, reason: 'missing_order_id' };
        }

        // tenantId majburiy — boshqa tenantning orderi o'zgartirilmaydi
        const order = await prisma.order.findFirst({
          where: { nonborOrderId, tenantId },
        });

        if (!order) {
          return { processed: false, reason: 'order_not_found' };
        }

        if (order.status === OrderStatus.CANCELLED) {
          return { processed: false, reason: 'already_cancelled' };
        }

        // Tranzaksiya — order + itemlar bir vaqtda cancel
        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data:  { status: OrderStatus.CANCELLED },
          }),
          prisma.orderItem.updateMany({
            where: { orderId: order.id },
            data:  { status: ItemStatus.CANCELLED },
          }),
        ]);

        io.to(tenantId).emit('order:status', {
          orderId: order.id,
          status:  OrderStatus.CANCELLED,
        });

        return { processed: true, action: 'order_cancelled', orderId: order.id };
      }

      default:
        return { processed: false, reason: 'unknown_event', event };
    }
  }

  private static async handleGenericWebhook(
    req: Request,
    service: string,
    payload: unknown
  ) {
    const io = req.app.get('io') as Server;
    io.emit('webhook:incoming', { service, payload, timestamp: new Date().toISOString() });
    return { processed: true, service, action: 'forwarded_to_socket' };
  }
}
