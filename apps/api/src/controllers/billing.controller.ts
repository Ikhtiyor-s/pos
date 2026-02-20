import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.js';
import { successResponse } from '../utils/response.js';
import {
  createPlanSchema,
  updatePlanSchema,
  createSubscriptionSchema,
  updateResourcesSchema,
  overridePriceSchema,
  generateInvoiceSchema,
  payInvoiceSchema,
  invoiceQuerySchema,
} from '../validators/billing.validator.js';

export class BillingController {
  // ============ PLAN (GLOBAL — tenantId kerak emas) ============

  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.query;
      const plans = await BillingService.getAllPlans({
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });
      return successResponse(res, plans);
    } catch (error) {
      next(error);
    }
  }

  static async getPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await BillingService.getPlanById(req.params.id);
      return successResponse(res, plan);
    } catch (error) {
      next(error);
    }
  }

  static async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createPlanSchema.parse(req.body);
      const plan = await BillingService.createPlan(data);
      return successResponse(res, plan, 'Tarif rejasi yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updatePlanSchema.parse(req.body);
      const plan = await BillingService.updatePlan(req.params.id, data);
      return successResponse(res, plan, 'Tarif rejasi yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      await BillingService.deletePlan(req.params.id);
      return successResponse(res, null, 'Tarif rejasi o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  // ============ SUBSCRIPTION ============

  static async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const subscription = await BillingService.getSubscription(tenantId);
      return successResponse(res, subscription);
    } catch (error) {
      next(error);
    }
  }

  static async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.body.tenantId || req.user!.tenantId!;
      const data = createSubscriptionSchema.parse(req.body);
      const subscription = await BillingService.createSubscription(tenantId, data);
      return successResponse(res, subscription, 'Obuna yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateResources(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateResourcesSchema.parse(req.body);
      const subscription = await BillingService.updateResources(tenantId, data);
      return successResponse(res, subscription, 'Resurslar yangilandi, narx qayta hisoblandi');
    } catch (error) {
      next(error);
    }
  }

  static async overridePrice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = overridePriceSchema.parse(req.body);
      const subscription = await BillingService.overridePrice(tenantId, data);
      const msg =
        data.overridePrice !== null
          ? 'Narx qo\'lda belgilandi'
          : 'Narx avtomatik hisoblashga qaytarildi';
      return successResponse(res, subscription, msg);
    } catch (error) {
      next(error);
    }
  }

  // ============ USAGE ============

  static async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const usage = await BillingService.getUsage(tenantId);
      return successResponse(res, usage);
    } catch (error) {
      next(error);
    }
  }

  // ============ INVOICE (OYLIK TO'LOV) ============

  static async generateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = generateInvoiceSchema.parse(req.body);
      const invoice = await BillingService.generateInvoice(tenantId, data);
      return successResponse(res, invoice, 'Hisob-faktura yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = invoiceQuerySchema.parse(req.query);
      const result = await BillingService.getInvoices(tenantId, query);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await BillingService.getInvoiceById(req.params.id, tenantId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async payInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = payInvoiceSchema.parse(req.body);
      const invoice = await BillingService.payInvoice(req.params.id, tenantId, data);
      return successResponse(res, invoice, 'To\'lov muvaffaqiyatli qabul qilindi');
    } catch (error) {
      next(error);
    }
  }

  static async cancelInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const invoice = await BillingService.cancelInvoice(req.params.id, tenantId);
      return successResponse(res, invoice, 'Hisob-faktura bekor qilindi');
    } catch (error) {
      next(error);
    }
  }

  static async getInvoiceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const summary = await BillingService.getInvoiceSummary(tenantId);
      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }

  static async checkOverdue(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await BillingService.checkOverdueInvoices();
      return successResponse(res, result, `${result.updated} ta hisob-faktura muddati o'tgan deb belgilandi`);
    } catch (error) {
      next(error);
    }
  }
}
