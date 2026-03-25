import { prisma, LoyaltyTier, Prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

export class LoyaltyService {
  // ==========================================
  // PROGRAM
  // ==========================================

  static async setupProgram(
    tenantId: string,
    config: {
      pointsPerSpend?: number;
      currency?: number;
      silverThreshold?: number;
      goldThreshold?: number;
      platinumThreshold?: number;
      isActive?: boolean;
    }
  ) {
    const program = await prisma.loyaltyProgram.upsert({
      where: { tenantId },
      update: {
        ...(config.pointsPerSpend !== undefined && { pointsPerSpend: config.pointsPerSpend }),
        ...(config.currency !== undefined && { currency: config.currency }),
        ...(config.silverThreshold !== undefined && { silverThreshold: config.silverThreshold }),
        ...(config.goldThreshold !== undefined && { goldThreshold: config.goldThreshold }),
        ...(config.platinumThreshold !== undefined && { platinumThreshold: config.platinumThreshold }),
        ...(config.isActive !== undefined && { isActive: config.isActive }),
      },
      create: {
        tenantId,
        pointsPerSpend: config.pointsPerSpend ?? 1,
        currency: config.currency ?? 1000,
        silverThreshold: config.silverThreshold ?? 500,
        goldThreshold: config.goldThreshold ?? 2000,
        platinumThreshold: config.platinumThreshold ?? 5000,
        isActive: config.isActive ?? true,
      },
    });

    return program;
  }

  static async getProgram(tenantId: string) {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    if (!program) {
      throw new AppError('Loyalty dasturi topilmadi', 404);
    }

    return program;
  }

  // ==========================================
  // POINTS
  // ==========================================

  static async earnPoints(
    tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number
  ) {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { tenantId },
    });

    if (!program || !program.isActive) {
      throw new AppError('Loyalty dasturi faol emas', 400);
    }

    const pointsPerSpend = Number(program.pointsPerSpend);
    const currency = Number(program.currency);
    const earnedPoints = Math.floor((orderTotal / currency) * pointsPerSpend);

    if (earnedPoints <= 0) {
      return { earnedPoints: 0, message: 'Yetarli summa emas' };
    }

    // Upsert loyalty account
    const account = await prisma.loyaltyAccount.upsert({
      where: { customerId_tenantId: { customerId, tenantId } },
      update: {
        points: { increment: earnedPoints },
        totalEarned: { increment: earnedPoints },
      },
      create: {
        customerId,
        tenantId,
        points: earnedPoints,
        totalEarned: earnedPoints,
      },
    });

    // Create transaction
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'EARN',
        points: earnedPoints,
        orderId,
        notes: `Buyurtma #${orderId} uchun ${earnedPoints} ball`,
      },
    });

    // Auto-upgrade tier
    const newTier = this.calculateTier(account.totalEarned, program);
    if (newTier !== account.tier) {
      await prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { tier: newTier },
      });
    }

    return {
      earnedPoints,
      totalPoints: account.points,
      tier: newTier || account.tier,
    };
  }

  static async redeemPoints(
    tenantId: string,
    customerId: string,
    points: number,
    orderId: string
  ) {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId_tenantId: { customerId, tenantId } },
    });

    if (!account) {
      throw new AppError('Loyalty hisobi topilmadi', 404);
    }

    if (account.points < points) {
      throw new AppError(`Yetarli ball mavjud emas. Joriy balans: ${account.points}`, 400);
    }

    const updated = await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { decrement: points },
        totalSpent: { increment: points },
      },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'REDEEM',
        points: -points,
        orderId,
        notes: `Buyurtma #${orderId} uchun ${points} ball sarflandi`,
      },
    });

    return {
      redeemedPoints: points,
      remainingPoints: updated.points,
    };
  }

  static async getAccount(tenantId: string, customerId: string) {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId_tenantId: { customerId, tenantId } },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!account) {
      throw new AppError('Loyalty hisobi topilmadi', 404);
    }

    return account;
  }

  static async getLeaderboard(tenantId: string, limit: number = 10) {
    const accounts = await prisma.loyaltyAccount.findMany({
      where: { tenantId },
      orderBy: { totalEarned: 'desc' },
      take: limit,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return accounts;
  }

  // ==========================================
  // COUPONS
  // ==========================================

  static async createCoupon(
    tenantId: string,
    data: {
      code: string;
      name: string;
      description?: string;
      discountType: string;
      discountValue: number;
      minOrderAmount?: number;
      maxDiscount?: number;
      usageLimit?: number;
      perUserLimit?: number;
      startDate: string;
      endDate: string;
    }
  ) {
    // Check unique code per tenant
    const existing = await prisma.coupon.findUnique({
      where: { code_tenantId: { code: data.code.toUpperCase(), tenantId } },
    });

    if (existing) {
      throw new AppError('Bu kupon kodi allaqachon mavjud', 409);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        discountType: data.discountType as any,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        perUserLimit: data.perUserLimit ?? 1,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        tenantId,
      },
    });

    return coupon;
  }

  static async getCoupons(
    tenantId: string,
    options: { active?: boolean; page?: number; limit?: number }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = { tenantId };

    if (options.active !== undefined) {
      where.isActive = options.active;
      if (options.active) {
        where.endDate = { gte: new Date() };
        where.startDate = { lte: new Date() };
      }
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons, page, limit, total };
  }

  static async validateCoupon(tenantId: string, code: string, orderTotal: number) {
    const coupon = await prisma.coupon.findUnique({
      where: { code_tenantId: { code: code.toUpperCase(), tenantId } },
    });

    if (!coupon) {
      throw new AppError('Kupon topilmadi', 404);
    }

    if (!coupon.isActive) {
      throw new AppError('Kupon faol emas', 400);
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new AppError('Kupon muddati tugagan yoki hali boshlanmagan', 400);
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('Kupon ishlatish limiti tugagan', 400);
    }

    const minOrderAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (orderTotal < minOrderAmount) {
      throw new AppError(`Minimal buyurtma summasi: ${minOrderAmount}`, 400);
    }

    // Calculate discount
    const discountValue = Number(coupon.discountValue);
    let discount = 0;

    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderTotal * discountValue) / 100;
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = discountValue;
    }

    const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }

    if (discount > orderTotal) {
      discount = orderTotal;
    }

    return {
      valid: true,
      coupon,
      discount,
      finalTotal: orderTotal - discount,
    };
  }

  static async useCoupon(
    tenantId: string,
    code: string,
    orderId: string,
    customerId?: string
  ) {
    const validation = await this.validateCoupon(tenantId, code, Infinity);
    const coupon = validation.coupon;

    // Check per-user limit
    if (customerId && coupon.perUserLimit) {
      const userUsageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, customerId },
      });

      if (userUsageCount >= coupon.perUserLimit) {
        throw new AppError('Bu mijoz uchun kupon ishlatish limiti tugagan', 400);
      }
    }

    // Increment usage
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usageCount: { increment: 1 } },
    });

    // Record usage
    const usage = await prisma.couponUsage.create({
      data: {
        couponId: coupon.id,
        customerId,
        orderId,
        discount: validation.discount,
      },
    });

    return usage;
  }

  static getTierBenefits(tier: LoyaltyTier): number {
    const benefits: Record<LoyaltyTier, number> = {
      BRONZE: 0,
      SILVER: 3,
      GOLD: 5,
      PLATINUM: 10,
    };

    return benefits[tier] ?? 0;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private static calculateTier(
    totalEarned: number,
    program: { silverThreshold: number; goldThreshold: number; platinumThreshold: number }
  ): LoyaltyTier {
    if (totalEarned >= program.platinumThreshold) return 'PLATINUM';
    if (totalEarned >= program.goldThreshold) return 'GOLD';
    if (totalEarned >= program.silverThreshold) return 'SILVER';
    return 'BRONZE';
  }
}
