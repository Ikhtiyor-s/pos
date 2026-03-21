import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service.js';
import {
  listNotificationsSchema,
  markAsReadSchema,
  updateSettingsSchema,
  deleteOldSchema,
} from './notification.validator.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';

export class NotificationController {
  /**
   * GET / — Bildirishnomalar ro'yxati (pagination + filter)
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;

      const { query } = listNotificationsSchema.parse({ query: req.query });

      const result = await NotificationService.getNotifications(tenantId, {
        userId,
        isRead: query.isRead,
        type: query.type as any,
        page: query.page,
        limit: query.limit,
      });

      return paginatedResponse(
        res,
        result.notifications,
        result.page,
        result.limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /unread-count — O'qilmagan bildirishnomalar soni
   */
  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;

      const result = await NotificationService.getUnreadCount(userId, tenantId);

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /:id/read — Bildirishnomani o'qilgan deb belgilash
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { params } = markAsReadSchema.parse({ params: req.params });

      const notification = await NotificationService.markAsRead(params.id, tenantId);

      return successResponse(res, notification, 'Bildirishnoma o\'qildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /read-all — Barcha bildirishnomalarni o'qilgan deb belgilash
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;

      const result = await NotificationService.markAllAsRead(userId, tenantId);

      return successResponse(res, result, 'Barcha bildirishnomalar o\'qildi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /settings — Bildirishnoma sozlamalari
   */
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await NotificationService.getSettings(tenantId);

      return successResponse(res, settings);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /settings — Bildirishnoma sozlamalarini yangilash
   */
  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { body } = updateSettingsSchema.parse({ body: req.body });

      const settings = await NotificationService.updateSettings(tenantId, body);

      return successResponse(res, settings, 'Sozlamalar yangilandi');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /old — Eski bildirishnomalarni o'chirish
   */
  static async deleteOld(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { body } = deleteOldSchema.parse({ body: req.body });

      const result = await NotificationService.deleteOldNotifications(
        tenantId,
        body.daysOld
      );

      return successResponse(res, result, `${result.deleted} ta eski bildirishnoma o'chirildi`);
    } catch (error) {
      next(error);
    }
  }
}
