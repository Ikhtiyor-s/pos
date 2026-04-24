import { Request, Response, NextFunction } from 'express';
import { LoyaltyService } from './loyalty.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  setupProgramSchema,
  earnPointsSchema,
  spendPointsSchema,
  calcMaxSpendableSchema,
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
    } catch (e) { next(e); }
  }

  static async setupProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const config = setupProgramSchema.parse(req.body);
      const program = await LoyaltyService.setupProgram(tenantId, config);
      return successResponse(res, program, 'Loyalty dasturi sozlandi');
    } catch (e) { next(e); }
  }

  // ==========================================
  // CUSTOMER BALANCE
  // ==========================================

  static async getCustomerBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { customerId } = req.params;
      const balance = await LoyaltyService.getCustomerBalance(tenantId, customerId);
      return successResponse(res, balance);
    } catch (e) { next(e); }
  }

  static async calcMaxSpendable(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { customerId, orderTotal } = calcMaxSpendableSchema.parse(req.query);
      const result = await LoyaltyService.calcMaxSpendable(tenantId, customerId, orderTotal);
      return successResponse(res, result);
    } catch (e) { next(e); }
  }

  // ==========================================
  // POINTS
  // ==========================================

  static async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const account = await LoyaltyService.getAccount(tenantId, req.params.customerId);
      return successResponse(res, account);
    } catch (e) { next(e); }
  }

  static async earnPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { customerId, orderId, orderTotal } = earnPointsSchema.parse(req.body);
      const result = await LoyaltyService.earnPoints(tenantId, customerId, orderId, orderTotal);
      return successResponse(res, result, `${result.earnedPoints} ball qo'shildi`);
    } catch (e) { next(e); }
  }

  static async spendPoints(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { customerId, points, orderId } = spendPointsSchema.parse(req.body);
      const result = await LoyaltyService.spendPoints(tenantId, customerId, points, orderId);
      return successResponse(res, result, `${result.spentPoints} ball sarflandi`);
    } catch (e) { next(e); }
  }

  static async redeemPoints(req: Request, res: Response, next: NextFunction) {
    return LoyaltyController.spendPoints(req, res, next);
  }

  static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { limit } = getLeaderboardQuerySchema.parse(req.query);
      const leaderboard = await LoyaltyService.getLeaderboard(tenantId, limit);
      return successResponse(res, leaderboard);
    } catch (e) { next(e); }
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
    } catch (e) { next(e); }
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
    } catch (e) { next(e); }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { code, orderTotal } = validateCouponSchema.parse(req.body);
      const result = await LoyaltyService.validateCoupon(tenantId, code, orderTotal);
      return successResponse(res, result);
    } catch (e) { next(e); }
  }

  static async useCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { code, orderId, customerId } = useCouponSchema.parse(req.body);
      const result = await LoyaltyService.useCoupon(tenantId, code, orderId, customerId);
      return successResponse(res, result, 'Kupon qo\'llanildi');
    } catch (e) { next(e); }
  }
}
