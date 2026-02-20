import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';
import { successResponse } from '../utils/response.js';
import { nonborApiService } from '../services/nonbor.service.js';
import { nonborSyncService } from '../services/nonbor-sync.service.js';
import { Server } from 'socket.io';

export class NonborController {
  // Nonbor bilan ulash
  static async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const { sellerId } = req.body;
      const tenantId = req.user!.tenantId!;

      if (!sellerId || typeof sellerId !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'sellerId (raqam) kiritilishi shart',
        });
      }

      // Nonbor API dan biznesni tekshirish
      let businessInfo = null;
      try {
        businessInfo = await nonborApiService.findBusinessById(sellerId);
      } catch (err) {
        return res.status(502).json({
          success: false,
          message: 'Nonbor API ga ulanishda xatolik',
        });
      }

      // Settings ga saqlash
      const settings = await prisma.settings.upsert({
        where: { tenantId },
        update: {
          nonborEnabled: true,
          nonborSellerId: sellerId,
          ...(businessInfo && {
            name: businessInfo.title || undefined,
            address: businessInfo.address || undefined,
            phone: businessInfo.phone_number || undefined,
            logo: businessInfo.logo || undefined,
          }),
        },
        create: {
          tenantId,
          name: businessInfo?.title || 'Oshxona',
          address: businessInfo?.address,
          phone: businessInfo?.phone_number,
          logo: businessInfo?.logo,
          nonborEnabled: true,
          nonborSellerId: sellerId,
          taxRate: 0,
          currency: 'UZS',
          orderPrefix: 'NB',
        },
      });

      // API client reset (yangi settings bilan)
      nonborApiService.resetClient();

      // Pollingni qayta ishga tushirish
      const io = req.app.get('io') as Server;
      await nonborSyncService.restartPolling(io);

      return successResponse(res, {
        enabled: true,
        sellerId,
        businessName: settings.name,
        businessAddress: settings.address,
        businessPhone: settings.phone,
        businessLogo: settings.logo,
      }, 'Nonbor bilan muvaffaqiyatli ulandi');
    } catch (error) {
      next(error);
    }
  }

  // Nonbor ulanish holati
  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({
        where: { tenantId },
      });

      if (!settings?.nonborEnabled) {
        return successResponse(res, {
          enabled: false,
          sellerId: null,
          businessName: null,
        });
      }

      // Nonbor dan status count olish
      let statusCount = null;
      try {
        if (settings.nonborSellerId) {
          statusCount = await nonborApiService.getOrderStatusCount(settings.nonborSellerId);
        }
      } catch {
        // Ignore - offline bo'lishi mumkin
      }

      return successResponse(res, {
        enabled: true,
        sellerId: settings.nonborSellerId,
        businessName: settings.name,
        businessAddress: settings.address,
        businessPhone: settings.phone,
        businessLogo: settings.logo,
        nonborOrderStats: statusCount,
      });
    } catch (error) {
      next(error);
    }
  }

  // Nonbordan uzish
  static async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      await prisma.settings.update({
        where: { tenantId },
        data: {
          nonborEnabled: false,
          nonborSellerId: null,
        },
      });

      // Pollingni to'xtatish
      nonborSyncService.stopPolling();
      nonborApiService.resetClient();

      return successResponse(res, { enabled: false }, 'Nonbordan uzildi');
    } catch (error) {
      next(error);
    }
  }

  // Manual sync
  static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({
        where: { tenantId },
      });

      if (!settings?.nonborEnabled || !settings.nonborSellerId) {
        return res.status(400).json({
          success: false,
          message: 'Nonbor integratsiya yoqilmagan',
        });
      }

      await nonborSyncService.manualSync();

      // Sync qilingan buyurtmalar sonini hisoblash
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nonborOrderCount = await prisma.order.count({
        where: {
          isNonborOrder: true,
          tenantId,
          createdAt: { gte: today },
        },
      });

      return successResponse(res, {
        synced: true,
        nonborOrdersToday: nonborOrderCount,
      }, 'Sync muvaffaqiyatli');
    } catch (error) {
      next(error);
    }
  }

  // Nonbor bizneslar ro'yxati (connect qilish uchun)
  static async listBusinesses(_req: Request, res: Response, next: NextFunction) {
    try {
      const businesses = await nonborApiService.getBusinesses();
      return successResponse(res, businesses);
    } catch (error) {
      next(error);
    }
  }
}
