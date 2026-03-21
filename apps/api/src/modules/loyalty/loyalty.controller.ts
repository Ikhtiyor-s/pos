import { Request, Response, NextFunction } from 'express';
import { LoyaltyService } from './loyalty.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  setupProgramSchema,
  earnPointsSchema,
  redeemPointsSchema,
  createCouponSchema,
  getCouponsQuerySchema,
  validateCouponSchema,
  useCouponSchema,
  getLeaderboardQuerySchema,
} from './loyalty.validator.js';

export class LoyaltyController {
  // ==========================================
  // PROGRAM
  // ==========================================

  static async getProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const program = await LoyaltyService.getProgram(tenantId);
      return successResponse(res, program);
    } catch (error) {
      next(error);
    }
  }

  static async setupProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const config = setupProgramSchema.parse(req.body);
      const program = await LoyaltyService.setupProgram(tenantId, config);
      return successResponse(res, program, 'Loyalty dasturi sozlandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // POINTS
  // ==========================================

  static async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const account = await LoyaltyService.getAccount(tenantId, req.params.customerId);
      return successResponse(res, account);
    } catch (error) {
      next(error);
    }
  }

  static async earnPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { customerId, orderId, orderTotal } = earnPointsSchema.parse(req.body);
      const result = await LoyaltyService.earnPoints(tenantId, customerId, orderId, orderTotal);
      return successResponse(res, result, 'Ballar qo\'shildi');
    } catch (error) {
      next(error);
    }
  }

  static async redeemPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { customerId, points, orderId } = redeemPointsSchema.parse(req.body);
      const result = await LoyaltyService.redeemPoints(tenantId, customerId, points, orderId);
      return successResponse(res, result, 'Ballar sarflandi');
    } catch (error) {
      next(error);
    }
  }

  static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { limit } = getLeaderboardQuerySchema.parse(req.query);
      const leaderboard = await LoyaltyService.getLeaderboard(tenantId, limit);
      return successResponse(res, leaderboard);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // COUPONS
  // ==========================================

  static async createCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createCouponSchema.parse(req.body);
      const coupon = await LoyaltyService.createCoupon(tenantId, data);
      return successResponse(res, coupon, 'Kupon yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getCoupons(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getCouponsQuerySchema.parse(req.query);
      const result = await LoyaltyService.getCoupons(tenantId, {
        active: query.active,
        page: query.page,
        limit: query.limit,
      });
      return paginatedResponse(res, result.coupons, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { code, orderTotal } = validateCouponSchema.parse(req.body);
      const result = await LoyaltyService.validateCoupon(tenantId, code, orderTotal);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async useCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { code, orderId, customerId } = useCouponSchema.parse(req.body);
      const result = await LoyaltyService.useCoupon(tenantId, code, orderId, customerId);
      return successResponse(res, result, 'Kupon qo\'llanildi');
    } catch (error) {
      next(error);
    }
  }
}
