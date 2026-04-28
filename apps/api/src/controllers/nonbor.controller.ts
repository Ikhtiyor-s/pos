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

  // ─────────────────────────────────────────────────────────────────
  // POST /nonbor/login-connect
  // Restoran admin email + parol bilan Nonborga kiradi →
  // JWT token olinadi → mahsulotlar + kategoriyalar import qilinadi
  // ─────────────────────────────────────────────────────────────────
  static async loginConnect(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId  = req.user!.tenantId!;
      const { email, password, apiUrl } = req.body as {
        email:    string;
        password: string;
        apiUrl?:  string;
      };

      if (!email?.trim() || !password?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email va parol kiritilishi shart',
        });
      }

      logger.info('[Nonbor] loginConnect so\'rovi', { tenantId, email });

      const result = await nonborApiService.loginWithCredentials({
        email:    email.trim(),
        password: password.trim(),
        apiUrl,
        tenantId,
      });

      // Polling qayta ishga tushirish
      try {
        const io = req.app.get('io') as Server;
        await nonborSyncService.restartPolling(io);
      } catch (e) {
        logger.warn('[Nonbor] Polling qayta ishga tushirishda xato', { error: (e as Error).message });
      }

      return successResponse(
        res,
        {
          connected:    true,
          sellerId:     result.sellerId,
          businessName: result.businessInfo?.title ?? null,
          businessAddress: result.businessInfo?.address ?? null,
          apiUrl:       apiUrl || 'https://test.nonbor.uz/api/v2',
          import: {
            categories: result.categories,
            products: {
              created: result.products.created,
              updated: result.products.updated,
              skipped: result.products.skipped,
              errors:  result.products.errors.length,
            },
          },
        },
        `Nonborga ulandi! ${result.products.created} ta yangi mahsulot, ` +
        `${result.products.updated} ta yangilandi, ${result.categories} ta kategoriya import qilindi.`,
      );
    } catch (error) {
      const msg = (error as Error).message;
      logger.error('[Nonbor] loginConnect xato', { error: msg });

      // Auth xatolari uchun 401
      if (
        msg.toLowerCase().includes('parol') ||
        msg.toLowerCase().includes('invalid credentials') ||
        msg.toLowerCase().includes('login yoki parol') ||
        msg.toLowerCase().includes('noto\'g\'ri') ||
        msg.includes('401')
      ) {
        return res.status(401).json({ success: false, message: msg });
      }
      next(error);
    }
  }

  // POST /nonbor/refresh-products — faqat mahsulotlarni qayta import qilish
  static async refreshProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;

      const settings = await prisma.settings.findUnique({ where: { tenantId } });
      if (!settings?.nonborEnabled) {
        return res.status(400).json({ success: false, message: 'Nonbor integratsiya yoqilmagan. Avval ulanib oling.' });
      }

      logger.info('[Nonbor] refreshProducts boshlandi', { tenantId });

      const result = await nonborApiService.pullProductsFromNonbor(tenantId);

      return successResponse(res, result,
        `Mahsulotlar yangilandi: ${result.created} yangi, ${result.updated} o'zgartirildi`);
    } catch (error) {
      next(error);
    }
  }
}
