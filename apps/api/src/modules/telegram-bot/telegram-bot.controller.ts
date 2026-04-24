import { Request, Response, NextFunction } from 'express';
import { TelegramBotService } from './telegram-bot.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { z } from 'zod';
import {
  setupWebhookSchema,
  broadcastSchema,
  getTelegramUsersQuerySchema,
} from './telegram-bot.validator.js';

// ==========================================
// TELEGRAM BOT CONTROLLER
// ==========================================

export class TelegramBotController {

  // ==========================================
  // WEBHOOK — by botToken (Telegram → API)
  // ==========================================

  static async webhookByToken(req: Request, res: Response) {
    try {
      const botToken = req.params.botToken;
      if (!botToken) return res.status(200).json({ ok: false });

      const tenantId = await TelegramBotService.getTenantByToken(botToken);
      if (!tenantId) return res.status(200).json({ ok: false, reason: 'tenant not found' });

      await TelegramBotService.handleWebhook(tenantId, req.body);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[TG] webhookByToken error:', e);
      return res.status(200).json({ ok: false });
    }
  }

  // ==========================================
  // WEBHOOK — by tenantId (legacy)
  // ==========================================

  static async webhookByTenant(req: Request, res: Response) {
    try {
      const tenantId = req.params.tenantId;
      await TelegramBotService.handleWebhook(tenantId, req.body);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[TG] webhookByTenant error:', e);
      return res.status(200).json({ ok: false });
    }
  }

  // ==========================================
  // SETUP WEBHOOK
  // ==========================================

  static async setupWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { appUrl } = z.object({ appUrl: z.string().url() }).parse(req.body);
      const result = await TelegramBotService.setupWebhook(tenantId, appUrl);
      return successResponse(res, result, 'Webhook sozlandi');
    } catch (e) { next(e); }
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
    } catch (e) { next(e); }
  }

  // ==========================================
  // USERS
  // ==========================================

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getTelegramUsersQuerySchema.parse(req.query);
      const result = await TelegramBotService.getUsers(tenantId, {
        page: query.page, limit: query.limit, isActive: query.isActive,
      });
      return paginatedResponse(res, result.users, result.page, result.limit, result.total);
    } catch (e) { next(e); }
  }

  // ==========================================
  // STAFF CHATS
  // ==========================================

  static async getChats(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const chats = await TelegramBotService.getChats(tenantId);
      return successResponse(res, chats);
    } catch (e) { next(e); }
  }

  static async addChat(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = z.object({
        chatId: z.string().min(1),
        title: z.string().optional(),
        type: z.enum(['private', 'group', 'supergroup', 'channel']).optional(),
        role: z.enum(['ADMIN', 'MANAGER', 'KITCHEN', 'CASHIER', 'STAFF']).optional(),
        events: z.array(z.string()).optional(),
      }).parse(req.body);

      const chat = await TelegramBotService.addChat(tenantId, data);
      return successResponse(res, chat, 'Chat qo\'shildi', 201);
    } catch (e) { next(e); }
  }

  static async removeChat(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await TelegramBotService.removeChat(req.params.chatId, tenantId);
      return successResponse(res, null, 'Chat o\'chirildi');
    } catch (e) { next(e); }
  }

  // ==========================================
  // MANUAL NOTIFICATIONS (test)
  // ==========================================

  static async sendShiftReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await TelegramBotService.sendShiftReport(tenantId);
      return successResponse(res, null, 'Smena hisoboti yuborildi');
    } catch (e) { next(e); }
  }
}
