import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { prisma, OrderStatus, OrderType, ItemStatus } from '@oshxona/database';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { webhookService } from '../services/webhook.service.js';
import { nonborSyncService } from '../services/nonbor-sync.service.js';

export class WebhookController {
  // ============ CRUD ============

  // Barcha webhooklar
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

  // Bitta webhook
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const webhook = await prisma.webhook.findFirst({
        where: { id: req.params.id, tenantId },
        include: {
          logs: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!webhook) {
        return errorResponse(res, 'Webhook topilmadi', 404);
      }

      return successResponse(res, webhook);
    } catch (error) {
      next(error);
    }
  }

  // Yangi webhook yaratish
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

  // Webhook yangilash
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { name, url, secret, events, headers, service, isActive } = req.body;

      // Avval webhook shu tenantga tegishli ekanini tekshirish
      const existing = await prisma.webhook.findFirst({ where: { id: req.params.id, tenantId } });
      if (!existing) {
        return errorResponse(res, 'Webhook topilmadi', 404);
      }

      const webhook = await prisma.webhook.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(url !== undefined && { url }),
          ...(secret !== undefined && { secret }),
          ...(events !== undefined && { events }),
          ...(headers !== undefined && { headers }),
          ...(service !== undefined && { service }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return successResponse(res, webhook, 'Webhook yangilandi');
    } catch (error) {
      next(error);
    }
  }

  // Webhook o'chirish
  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      // Avval webhook shu tenantga tegishli ekanini tekshirish
      const existing = await prisma.webhook.findFirst({ where: { id: req.params.id, tenantId } });
      if (!existing) {
        return errorResponse(res, 'Webhook topilmadi', 404);
      }

      await prisma.webhook.delete({
        where: { id: req.params.id },
      });

      return successResponse(res, null, 'Webhook o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  // Webhook loglar
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '50' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const [logs, total] = await Promise.all([
        prisma.webhookLog.findMany({
          where: { webhookId: req.params.id },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.webhookLog.count({
          where: { webhookId: req.params.id },
        }),
      ]);

      return paginatedResponse(res, logs, parseInt(page as string), take, total);
    } catch (error) {
      next(error);
    }
  }

  // Test webhook (manual ping)
  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const webhook = await prisma.webhook.findUnique({
        where: { id: req.params.id },
      });

      if (!webhook) {
        return errorResponse(res, 'Webhook topilmadi', 404);
      }

      // Test event yuborish
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

  // ============ INCOMING WEBHOOK RECEIVER ============

  // Tashqi servislardan kelgan webhook
  // POST /api/webhook/receive/:service
  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const { service } = req.params;
      const payload = req.body;

      console.log(`[Webhook] Incoming: ${service}`, JSON.stringify(payload).slice(0, 200));

      // Signature tekshirish (agar webhook ro'yxatda bo'lsa)
      const webhook = await prisma.webhook.findFirst({
        where: { service, isActive: true },
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
            // Log xatolik
            if (webhook) {
              await prisma.webhookLog.create({
                data: {
                  webhookId: webhook.id,
                  event: 'incoming:invalid_signature',
                  payload: payload as any,
                  success: false,
                  direction: 'incoming',
                  error: 'Invalid signature',
                },
              });
            }
            return errorResponse(res, 'Invalid signature', 401);
          }
        }
      }

      // Servisga qarab ishlov berish
      let result: any;

      switch (service) {
        case 'nonbor':
          // Polling ni sekinlashtirish (webhook faol)
          nonborSyncService.notifyWebhookReceived();
          result = await WebhookController.handleNonborWebhook(req, payload);
          break;
        default:
          result = await WebhookController.handleGenericWebhook(req, service, payload);
          break;
      }

      // Incoming log
      if (webhook) {
        await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            event: `incoming:${service}`,
            payload: payload as any,
            success: true,
            direction: 'incoming',
          },
        });
      }

      return successResponse(res, result, 'Webhook qabul qilindi');
    } catch (error) {
      next(error);
    }
  }

  // Nonbor webhook handler
  private static async handleNonborWebhook(req: Request, payload: any) {
    const io = req.app.get('io') as Server;
    const { event, data } = payload;

    switch (event) {
      case 'order:new':
      case 'order.new': {
        // Yangi buyurtma keldi — sync service orqali import
        if (data?.id) {
          const settings = await prisma.settings.findFirst();
          if (settings?.nonborEnabled && settings.nonborSellerId) {
            // nonborSyncService orqali importni trigger qilish
            await nonborSyncService.manualSync();
          }
        }
        return { processed: true, action: 'order_sync_triggered' };
      }

      case 'order:status':
      case 'order.status': {
        // Nonbor dan status yangilandi
        if (data?.order_id && data?.state) {
          const order = await prisma.order.findFirst({
            where: { nonborOrderId: data.order_id },
          });

          if (order) {
            const statusMap: Record<string, OrderStatus> = {
              CHECKING: OrderStatus.NEW,
              ACCEPTED: OrderStatus.CONFIRMED,
              PREPARING: OrderStatus.PREPARING,
              READY: OrderStatus.READY,
              DELIVERING: OrderStatus.DELIVERING,
              DELIVERED: OrderStatus.COMPLETED,
              CANCELLED: OrderStatus.CANCELLED,
            };

            const newStatus = statusMap[data.state];
            if (newStatus && order.status !== newStatus) {
              const updated = await prisma.order.update({
                where: { id: order.id },
                data: { status: newStatus },
                include: {
                  items: { include: { product: true } },
                  customer: true,
                },
              });

              // Socket.IO broadcast
              io.emit('order:status', { orderId: order.id, status: newStatus });
              io.to('kitchen').emit('order:updated', updated);
              io.to('pos').emit('order:updated', updated);

              console.log(`[Webhook/Nonbor] Order #${data.order_id} → ${data.state}`);
              return { processed: true, action: 'status_updated', orderId: order.id };
            }
          }
        }
        return { processed: false, reason: 'order_not_found_or_same_status' };
      }

      case 'order:cancelled':
      case 'order.cancelled': {
        if (data?.order_id) {
          const order = await prisma.order.findFirst({
            where: { nonborOrderId: data.order_id },
          });

          if (order && order.status !== OrderStatus.CANCELLED) {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.CANCELLED },
            });

            // Barcha itemlarni ham cancel
            await prisma.orderItem.updateMany({
              where: { orderId: order.id },
              data: { status: ItemStatus.CANCELLED },
            });

            io.emit('order:status', { orderId: order.id, status: OrderStatus.CANCELLED });
            return { processed: true, action: 'order_cancelled' };
          }
        }
        return { processed: false, reason: 'order_not_found' };
      }

      default:
        return { processed: false, reason: 'unknown_event', event };
    }
  }

  // Generic webhook handler (har qanday servis uchun)
  private static async handleGenericWebhook(req: Request, service: string, payload: any) {
    const io = req.app.get('io') as Server;

    // Socket.IO orqali frontendga uzatish
    io.emit('webhook:incoming', {
      service,
      payload,
      timestamp: new Date().toISOString(),
    });

    return { processed: true, service, action: 'forwarded_to_socket' };
  }

  // Mavjud eventlar ro'yxati
  static async getAvailableEvents(_req: Request, res: Response, next: NextFunction) {
    try {
      const events = [
        { event: 'order:new', description: 'Yangi buyurtma yaratilganda' },
        { event: 'order:status', description: 'Buyurtma holati o\'zgarganda' },
        { event: 'order:cancelled', description: 'Buyurtma bekor qilinganda' },
        { event: 'order:completed', description: 'Buyurtma yakunlanganda' },
        { event: 'product:created', description: 'Yangi mahsulot qo\'shilganda' },
        { event: 'product:updated', description: 'Mahsulot yangilanganda' },
        { event: 'product:deleted', description: 'Mahsulot o\'chirilganda' },
      ];

      return successResponse(res, events);
    } catch (error) {
      next(error);
    }
  }
}
