import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response.js';
import { nonborPosService } from '../services/nonbor-pos.service.js';
import { logger } from '../utils/logger.js';

export class NonborPosController {
  // POST /nonbor-pos/connect — username + password + nonborTenantId bilan ulanish
  static async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { username, password, nonborTenantId, posUrl } = req.body as {
        username: string;
        password: string;
        nonborTenantId: string;
        posUrl?: string;
      };

      if (!username?.trim() || !password?.trim() || !nonborTenantId?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'username, password va nonborTenantId kiritilishi shart',
        });
      }

      logger.info('[NonborPOS] Connect so\'rovi', { tenantId, username, nonborTenantId });

      const result = await nonborPosService.loginWithCredentials({
        username: username.trim(),
        password: password.trim(),
        nonborTenantId: nonborTenantId.trim(),
        posUrl,
        tenantId,
      });

      return successResponse(
        res,
        {
          connected: true,
          user: result.user,
          businessName: result.settings?.name ?? null,
          posUrl: posUrl || 'http://localhost:8088/api',
          synced: result.synced,
        },
        `Nonbor Admin POSga ulandi! ` +
        `${result.synced.categories} ta kategoriya, ` +
        `${result.synced.products} ta mahsulot, ` +
        `${result.synced.tables} ta stol import qilindi.`,
      );
    } catch (error) {
      const msg = (error as Error).message;
      logger.error('[NonborPOS] Connect xato', { error: msg });

      if (
        msg.toLowerCase().includes('noto\'g\'ri') ||
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('login yoki parol') ||
        msg.includes('401')
      ) {
        return res.status(401).json({ success: false, message: msg });
      }
      next(error);
    }
  }

  // POST /nonbor-pos/disconnect
  static async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await nonborPosService.disconnect(tenantId);
      logger.info('[NonborPOS] Disconnect', { tenantId });
      return successResponse(res, { connected: false }, 'Nonbor Admin POSdan uzildi');
    } catch (error) {
      next(error);
    }
  }

  // GET /nonbor-pos/status
  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const status = await nonborPosService.getStatus(tenantId);
      return successResponse(res, status);
    } catch (error) {
      next(error);
    }
  }

  // POST /nonbor-pos/sync — barcha ma'lumotlarni qayta yuklab olish
  static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      logger.info('[NonborPOS] Manual sync', { tenantId });

      const result = await nonborPosService.syncAll(tenantId);

      return successResponse(
        res,
        result,
        `Sync yakunlandi: ${result.categories} kategoriya, ${result.products} mahsulot, ${result.tables} stol`,
      );
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('ulanmagan')) {
        return res.status(400).json({ success: false, message: 'Nonbor Admin POS ulanmagan. Avval connect qiling.' });
      }
      next(error);
    }
  }

  // GET /nonbor-pos/dashboard
  static async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const period = (req.query.period as string) || 'today';
      const data = await nonborPosService.getDashboard(tenantId, period);
      return successResponse(res, data);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('ulanmagan')) {
        return res.status(400).json({ success: false, message: 'Nonbor Admin POS ulanmagan.' });
      }
      next(error);
    }
  }
}
