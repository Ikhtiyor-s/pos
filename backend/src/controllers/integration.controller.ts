import { Request, Response, NextFunction } from 'express';
import { IntegrationService } from '../services/integration.service.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

export class IntegrationController {
  // Barcha integratsiyalar holati
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const statuses = await IntegrationService.getAllStatuses(tenantId);
      return successResponse(res, statuses);
    } catch (error) {
      next(error);
    }
  }

  // Bitta integratsiya holati
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const status = await IntegrationService.getStatus(tenantId, req.params.id);
      if (!status) {
        return errorResponse(res, 'Integratsiya topilmadi', 404);
      }
      return successResponse(res, status);
    } catch (error) {
      next(error);
    }
  }

  // Konfiguratsiya yangilash
  static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await IntegrationService.updateConfig(tenantId, req.params.id, req.body);
      const status = await IntegrationService.getStatus(tenantId, req.params.id);
      return successResponse(res, status, 'Konfiguratsiya yangilandi');
    } catch (error) {
      next(error);
    }
  }

  // Yoqish/o'chirish
  static async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return errorResponse(res, 'enabled field boolean bo\'lishi kerak');
      }

      await IntegrationService.toggle(tenantId, req.params.id, enabled);
      const status = await IntegrationService.getStatus(tenantId, req.params.id);
      return successResponse(res, status, `Integratsiya ${enabled ? 'yoqildi' : 'o\'chirildi'}`);
    } catch (error) {
      next(error);
    }
  }

  // Ulanish testi
  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await IntegrationService.testConnection(tenantId, req.params.id);
      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  // Integratsiya loglari
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page = '1', limit = '20' } = req.query;
      const result = await IntegrationService.getLogs(
        tenantId,
        req.params.id,
        parseInt(page as string),
        parseInt(limit as string)
      );
      return paginatedResponse(
        res,
        result.logs as any[],
        parseInt(page as string),
        parseInt(limit as string),
        result.total
      );
    } catch (error) {
      next(error);
    }
  }
}
