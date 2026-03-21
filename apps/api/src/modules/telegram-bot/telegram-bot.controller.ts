import { Request, Response, NextFunction } from 'express';
import { TelegramBotService } from './telegram-bot.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { prisma } from '@oshxona/database';
import {
  webhookParamsSchema,
  setupWebhookSchema,
  broadcastSchema,
  getTelegramUsersQuerySchema,
} from './telegram-bot.validator.js';

export class TelegramBotController {
  // ==========================================
  // WEBHOOK (Telegram tomonidan chaqiriladi — auth yo'q)
  // ==========================================

  static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = webhookParamsSchema.parse(req.params);
      const update = req.body;

      // Telegram webhook'ga tez javob berish kerak
      const result = await TelegramBotService.handleWebhook(tenantId, update);

      // Telegram har doim 200 kutadi
      return res.status(200).json(result);
    } catch (error) {
      // Telegram xatoliklarda ham 200 kutadi, aks holda qayta yuboradi
      console.error('Telegram webhook xatolik:', error);
      return res.status(200).json({ ok: false });
    }
  }

  // ==========================================
  // SETUP WEBHOOK
  // ==========================================

  static async setupWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhookUrl } = setupWebhookSchema.parse(req.body);
      const result = await TelegramBotService.setupWebhook(webhookUrl);
      return successResponse(res, result, 'Webhook sozlandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // BROADCAST
  // ==========================================

  static async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { message } = broadcastSchema.parse(req.body);
      const result = await TelegramBotService.broadcastMessage(tenantId, message);
      return successResponse(res, result, `${result.sent} ta foydalanuvchiga yuborildi`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // TELEGRAM USERS
  // ==========================================

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getTelegramUsersQuerySchema.parse(req.query);
      const page = query.page;
      const limit = query.limit;
      const skip = (page - 1) * limit;

      const where: { tenantId: string; isActive?: boolean } = { tenantId };
      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const [users, total] = await Promise.all([
        prisma.telegramUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        }),
        prisma.telegramUser.count({ where }),
      ]);

      return paginatedResponse(res, users, page, limit, total);
    } catch (error) {
      next(error);
    }
  }
}
