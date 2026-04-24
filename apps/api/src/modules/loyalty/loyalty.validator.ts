import { z } from 'zod';

export const setupProgramSchema = z.object({
  name: z.string().min(2).optional(),
  pointsPerSpend: z.number().positive().optional().default(1),
  currency: z.number().positive().optional().default(1000),
  pointsValue: z.number().positive().optional().default(100),
  minSumForPoint: z.number().positive().optional().default(1000),
  expiryDays: z.number().int().positive().optional().default(90),
  silverThreshold: z.number().int().positive().optional().default(500),
  goldThreshold: z.number().int().positive().optional().default(2000),
  platinumThreshold: z.number().int().positive().optional().default(5000),
  isActive: z.boolean().optional().default(true),
});

export const earnPointsSchema = z.object({
  customerId: z.string({ required_error: 'Mijoz ID kiritilishi shart' }).uuid(),
  orderId: z.string({ required_error: 'Buyurtma ID kiritilishi shart' }).uuid(),
  orderTotal: z.number({ required_error: 'Buyurtma summasi kiritilishi shart' }).positive(),
});

export const spendPointsSchema = z.object({
  customerId: z.string({ required_error: 'Mijoz ID kiritilishi shart' }).uuid(),
  points: z.number({ required_error: 'Ball miqdori kiritilishi shart' }).int().positive(),
  orderId: z.string({ required_error: 'Buyurtma ID kiritilishi shart' }).uuid(),
});

// Backwards compatible alias
export const redeemPointsSchema = spendPointsSchema;

export const calcMaxSpendableSchema = z.object({
  customerId: z.string().uuid(),
  orderTotal: z.coerce.number().positive(),
});

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50),
  name: z.string().min(2),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'FREE_ITEM']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional().default(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const getCouponsQuerySchema = z.object({
  active: z.string().transform((val) => val === 'true').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const validateCouponSchema = z.object({
  code: z.string(),
  orderTotal: z.number().positive(),
});

export const useCouponSchema = z.object({
  code: z.string(),
  orderId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
});

export const getLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type SetupProgramInput = z.infer<typeof setupProgramSchema>;
export type EarnPointsInput = z.infer<typeof earnPointsSchema>;
export type SpendPointsInput = z.infer<typeof spendPointsSchema>;
export type CalcMaxSpendableInput = z.infer<typeof calcMaxSpendableSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type GetCouponsQuery = z.infer<typeof getCouponsQuerySchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type UseCouponInput = z.infer<typeof useCouponSchema>;
