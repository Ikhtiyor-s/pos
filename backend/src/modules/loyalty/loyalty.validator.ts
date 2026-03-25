import { z } from 'zod';

// ==========================================
// LOYALTY PROGRAM
// ==========================================

export const setupProgramSchema = z.object({
  pointsPerSpend: z.number().positive('Har bir xaridga ball musbat bo\'lishi kerak').optional().default(1),
  currency: z.number().positive('Valyuta qiymati musbat bo\'lishi kerak').optional().default(1000),
  silverThreshold: z.number().int().positive().optional().default(500),
  goldThreshold: z.number().int().positive().optional().default(2000),
  platinumThreshold: z.number().int().positive().optional().default(5000),
  isActive: z.boolean().optional().default(true),
});

// ==========================================
// EARN / REDEEM
// ==========================================

export const earnPointsSchema = z.object({
  customerId: z.string({ required_error: 'Mijoz ID kiritilishi shart' }).uuid(),
  orderId: z.string({ required_error: 'Buyurtma ID kiritilishi shart' }).uuid(),
  orderTotal: z.number({ required_error: 'Buyurtma summasi kiritilishi shart' }).positive('Summa musbat bo\'lishi kerak'),
});

export const redeemPointsSchema = z.object({
  customerId: z.string({ required_error: 'Mijoz ID kiritilishi shart' }).uuid(),
  points: z.number({ required_error: 'Ball miqdori kiritilishi shart' }).int().positive('Ball musbat bo\'lishi kerak'),
  orderId: z.string({ required_error: 'Buyurtma ID kiritilishi shart' }).uuid(),
});

// ==========================================
// COUPONS
// ==========================================

export const createCouponSchema = z.object({
  code: z.string({ required_error: 'Kupon kodi kiritilishi shart' }).min(3).max(50),
  name: z.string({ required_error: 'Kupon nomi kiritilishi shart' }).min(2),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'FREE_ITEM'], {
    required_error: 'Chegirma turi tanlanishi shart',
  }),
  discountValue: z.number({ required_error: 'Chegirma qiymati kiritilishi shart' }).positive(),
  minOrderAmount: z.number().positive().optional(),
  maxDiscount: z.number().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().optional().default(1),
  startDate: z.string({ required_error: 'Boshlanish sanasi kiritilishi shart' }).datetime(),
  endDate: z.string({ required_error: 'Tugash sanasi kiritilishi shart' }).datetime(),
});

export const getCouponsQuerySchema = z.object({
  active: z.string().transform((val) => val === 'true').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const validateCouponSchema = z.object({
  code: z.string({ required_error: 'Kupon kodi kiritilishi shart' }),
  orderTotal: z.number({ required_error: 'Buyurtma summasi kiritilishi shart' }).positive(),
});

export const useCouponSchema = z.object({
  code: z.string({ required_error: 'Kupon kodi kiritilishi shart' }),
  orderId: z.string({ required_error: 'Buyurtma ID kiritilishi shart' }).uuid(),
  customerId: z.string().uuid().optional(),
});

export const getLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Types
export type SetupProgramInput = z.infer<typeof setupProgramSchema>;
export type EarnPointsInput = z.infer<typeof earnPointsSchema>;
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type GetCouponsQuery = z.infer<typeof getCouponsQuerySchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type UseCouponInput = z.infer<typeof useCouponSchema>;
