import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.js';

export function checkPlanLimit(feature: string) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (_req as any).user?.tenantId;
      if (!tenantId) {
        // SUPER_ADMIN — limit yo'q
        return next();
      }

      const result = await BillingService.checkLimit(tenantId, feature);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          message: result.message || 'Tarif rejasi limiti tugadi',
          code: 'PLAN_LIMIT_EXCEEDED',
        });
      }

      next();
    } catch (error) {
      // Agar billing tekshiruv xato bersa — tizimni buzmaydi
      console.error('[PlanLimit] Tekshiruvda xatolik:', error);
      next();
    }
  };
}
