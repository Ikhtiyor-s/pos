import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';
import { successResponse } from '../utils/response.js';
import { nonborApiService, type NonborBusiness } from '../services/nonbor.service.js';
import { nonborSyncService } from '../services/nonbor-sync.service.js';
import { logger } from '../utils/logger.js';
import { Server } from 'socket.io';

export class NonborController {
  // Nonbor bilan ulash
  static async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const { sellerId, nonborToken, nonborApiUrl } = req.body;
      const tenantId = req.user!.tenantId!;

      if (!sellerId || typeof sellerId !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'sellerId (raqam) kiritilishi shart',
        });
      }

      if (nonborToken) {
        await prisma.settings.upsert({
          where: { tenantId },
          update: {
            nonborApiSecret: nonborToken,
            ...(nonborApiUrl ? { nonborApiUrl } : {}),
          },
          create: {
            tenantId,
            name: 'Oshxona',
            nonborApiSecret: nonborToken,
            nonborApiUrl: nonborApiUrl || 'https://test.nonbor.uz/api/v2',
            taxRate: 0,
            currency: 'UZS',
            orderPrefix: 'ORD',
          },
        });
        nonborApiService.resetClient();
      }

      let businessInfo: NonborBusiness | null = null;
      try {
        businessInfo = await nonborApiService.findBusinessById(sellerId);
      } catch (err) {
        logger.warn('[Nonbor] connect: biznes topilmadi', {
          sellerId,
          error: (err as Error).message,
        });
        return res.status(502).json({
          success: false,
          message: 'Nonbor API ga ulanishda xatolik',
        });
      }

      const settings = await prisma.settings.upsert({
        where: { tenantId },
        update: {
          nonborEnabled: true,
          nonborSellerId: sellerId,
          ...(businessInfo ? {
            name: businessInfo.title || undefined,
            address: businessInfo.address || undefined,
            phone: businessInfo.phone_number || undefined,
            logo: businessInfo.logo || undefined,
          } : {}),
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

      nonborApiService.resetClient();

      const io = req.app.get('io') as Server;
      await nonborSyncService.restartPolling(io);

      logger.info('[Nonbor] Tenant ulandi', { tenantId, sellerId });

      return successResponse(
        res,
        {
          enabled: true,
          sellerId,
          businessName: settings.name,
          businessAddress: settings.address,
          businessPhone: settings.phone,
          businessLogo: settings.logo,
        },
        'Nonbor bilan muvaffaqiyatli ulandi',
      );
    } catch (error) {
      next(error);
    }
  }

  // Nonbor ulanish holati
  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({ where: { tenantId } });

      if (!settings?.nonborEnabled) {
        return successResponse(res, { enabled: false, sellerId: null, businessName: null });
      }

      let statusCount: Record<string, number> | null = null;
      try {
        if (settings.nonborSellerId) {
          statusCount = await nonborApiService.getOrderStatusCount(settings.nonborSellerId);
        }
      } catch {
        // offline bo'lishi mumkin
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
        data: { nonborEnabled: false, nonborSellerId: null },
      });

      nonborSyncService.stopPolling();
      nonborApiService.resetClient();

      logger.info('[Nonbor] Tenant uzildi', { tenantId });

      return successResponse(res, { enabled: false }, 'Nonbordan uzildi');
    } catch (error) {
      next(error);
    }
  }

  // Manual sync
  static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({ where: { tenantId } });

      if (!settings?.nonborEnabled || !settings.nonborSellerId) {
        return res.status(400).json({ success: false, message: 'Nonbor integratsiya yoqilmagan' });
      }

      await nonborSyncService.manualSync();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nonborOrderCount = await prisma.order.count({
        where: { isNonborOrder: true, tenantId, createdAt: { gte: today } },
      });

      return successResponse(
        res,
        { synced: true, nonborOrdersToday: nonborOrderCount },
        'Sync muvaffaqiyatli',
      );
    } catch (error) {
      next(error);
    }
  }

  // Nonbor mahsulotlarni POSga import qilish
  static async pullProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({ where: { tenantId } });

      if (!settings?.nonborEnabled || !settings.nonborSellerId) {
        return res.status(400).json({ success: false, message: 'Nonbor integratsiya yoqilmagan' });
      }

      const result = await nonborApiService.pullProductsFromNonbor(tenantId);

      logger.info('[Nonbor] Mahsulotlar import qilindi', {
        tenantId,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
      });

      return successResponse(
        res,
        {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
        },
        `Mahsulotlar import qilindi: ${result.created} yangi, ${result.updated} yangilandi`,
      );
    } catch (error) {
      next(error);
    }
  }

  // Nonbor bizneslar ro'yxati
  static async listBusinesses(_req: Request, res: Response, next: NextFunction) {
    try {
      const businesses = await nonborApiService.getBusinesses();
      return successResponse(res, businesses);
    } catch (error) {
      next(error);
    }
  }

  // GET /nonbor/monitoring — monitoring paneli uchun to'liq holat
  static async monitoring(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const stats = nonborSyncService.getMonitoringStats();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [settings, nonborOrdersToday, totalNonborOrders] = await Promise.all([
        prisma.settings.findUnique({
          where: { tenantId },
          select: { nonborEnabled: true, nonborSellerId: true, name: true },
        }),
        prisma.order.count({ where: { isNonborOrder: true, tenantId, createdAt: { gte: today } } }),
        prisma.order.count({ where: { isNonborOrder: true, tenantId } }),
      ]);

      return successResponse(res, {
        ...stats,
        enabled:           settings?.nonborEnabled ?? false,
        sellerId:          settings?.nonborSellerId ?? null,
        businessName:      settings?.name ?? null,
        nonborOrdersToday,
        totalNonborOrders,
      }, 'Monitoring ma\'lumotlari');
    } catch (error) {
      next(error);
    }
  }

  // POST /nonbor/batch-sync-products — manual batch mahsulot sync
  static async batchSyncProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({ where: { tenantId } });
      if (!settings?.nonborEnabled || !settings.nonborSellerId) {
        return res.status(400).json({ success: false, message: 'Nonbor integratsiya yoqilmagan' });
      }

      const result = await nonborSyncService.manualBatchSync(tenantId);

      return successResponse(
        res,
        result,
        `Mahsulotlar yangilandi: ${result.updated} ta, o'tkazib yuborildi: ${result.skipped} ta`,
      );
    } catch (error) {
      next(error);
    }
  }
}
