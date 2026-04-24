import { prisma, LoyaltyTier, Prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service.js';
import { SmsService } from '../sms/sms.service.js';

export class LoyaltyService {
  // ==========================================
  // PROGRAM
  // ==========================================

  static async setupProgram(
    tenantId: string,
    config: {
      name?: string;
      pointsPerSpend?: number;
      currency?: number;
      pointsValue?: number;
      minSumForPoint?: number;
      expiryDays?: number;
      silverThreshold?: number;
      goldThreshold?: number;
      platinumThreshold?: number;
      isActive?: boolean;
    }
  ) {
    const program = await prisma.loyaltyProgram.upsert({
      where: { tenantId },
      update: {
        ...(config.name !== undefined && { name: config.name }),
        ...(config.pointsPerSpend !== undefined && { pointsPerSpend: config.pointsPerSpend }),
        ...(config.currency !== undefined && { currency: config.currency }),
        ...(config.pointsValue !== undefined && { pointsValue: config.pointsValue }),
        ...(config.minSumForPoint !== undefined && { minSumForPoint: config.minSumForPoint }),
        ...(config.expiryDays !== undefined && { expiryDays: config.expiryDays }),
        ...(config.silverThreshold !== undefined && { silverThreshold: config.silverThreshold }),
        ...(config.goldThreshold !== undefined && { goldThreshold: config.goldThreshold }),
        ...(config.platinumThreshold !== undefined && { platinumThreshold: config.platinumThreshold }),
        ...(config.isActive !== undefined && { isActive: config.isActive }),
      },
      create: {
        tenantId,
        name: config.name ?? 'Sodiqlik dasturi',
        pointsPerSpend: config.pointsPerSpend ?? 1,
        currency: config.currency ?? 1000,
        pointsValue: config.pointsValue ?? 100,
        minSumForPoint: config.minSumForPoint ?? 1000,
        expiryDays: config.expiryDays ?? 90,
        silverThreshold: config.silverThreshold ?? 500,
        goldThreshold: config.goldThreshold ?? 2000,
        platinumThreshold: config.platinumThreshold ?? 5000,
        isActive: config.isActive ?? true,
      },
    });

    return program;
  }

  static async getProgram(tenantId: string) {
    const program = await prisma.loyaltyProgram.findUnique({ where: { tenantId } });
    if (!program) throw new AppError('Loyalty dasturi topilmadi', 404);
    return program;
  }

  // ==========================================
  // CUSTOMER BALANCE
  // ==========================================

  static async getCustomerBalance(tenantId: string, customerId: string) {
    const program = await prisma.loyaltyProgram.findUnique({ where: { tenantId } });

    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId_tenantId: { customerId, tenantId } },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (!account) {
      return {
        customerId,
        points: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: 'BRONZE' as LoyaltyTier,
        pointsValue: program ? Number(program.pointsValue) : 100,
        maxSpendableSum: 0,
        customer: null,
      };
    }

    const pointsValue = program ? Number(program.pointsValue) : 100;

    return {
      customerId,
      points: account.points,
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
      tier: account.tier,
      pointsValue,
      maxSpendableSum: account.points * pointsValue,
      customer: account.customer,
    };
  }

  // ==========================================
  // EARN POINTS
  // ==========================================

  static async earnPoints(
    tenantId: string,
    customerId: string,
    orderId: string,
    orderTotal: number
  ) {
    const program = await prisma.loyaltyProgram.findUnique({ where: { tenantId } });

    if (!program || !program.isActive) {
      return { earnedPoints: 0, message: 'Loyalty dasturi faol emas' };
    }

    const minSum = Number(program.minSumForPoint);
    if (orderTotal < minSum) {
      return { earnedPoints: 0, message: `Minimal summa ${minSum} so'm` };
    }

    const pointsPerSpend = Number(program.pointsPerSpend);
    const currency = Number(program.currency);
    const earnedPoints = Math.floor((orderTotal / currency) * pointsPerSpend);

    if (earnedPoints <= 0) {
      return { earnedPoints: 0, message: 'Ball hisoblash uchun yetarli summa emas' };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + program.expiryDays);

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

    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        type: 'EARN',
        points: earnedPoints,
        orderId,
        notes: `Buyurtma #${orderId.slice(0, 8)} uchun ${earnedPoints} ball`,
        expiresAt,
      },
    });

    const newTier = this.calculateTier(account.totalEarned, program);
    if (newTier !== account.tier) {
      await prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { tier: newTier },
      });
    }

    const pointsValue = Number(program.pointsValue);
    const discountSum = earnedPoints * pointsValue;

    // Notifications (non-blocking)
    this.sendEarnNotification(tenantId, customerId, earnedPoints, discountSum).catch(() => {});

    return {
      earnedPoints,
      totalPoints: account.points + earnedPoints,
      tier: newTier || account.tier,
      discountEquivalent: discountSum,
    };
  }

  // ==========================================
  // SPEND POINTS (FIFO)
  // ==========================================

  static async spendPoints(
    tenantId: string,
    customerId: string,
    points: number,
    orderId: string
  ) {
    const program = await prisma.loyaltyProgram.findUnique({ where: { tenantId } });
    if (!program || !program.isActive) {
      throw new AppError('Loyalty dasturi faol emas', 400);
    }

    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId_tenantId: { customerId, tenantId } },
    });

    if (!account) throw new AppError('Loyalty hisobi topilmadi', 404);
    if (account.points < points) {
      throw new AppError(`Yetarli ball mavjud emas. Joriy balans: ${account.points}`, 400);
    }

    // FIFO expiry check — expire oldest first
    await this.expireOldPoints(account.id);

    // Re-check after expiry
    const fresh = await prisma.loyaltyAccount.findUnique({ where: { id: account.id } });
    if (!fresh || fresh.points < points) {
      throw new AppError(`Ballar eskirgandan keyin yetarli emas`, 400);
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
        notes: `Buyurtma #${orderId.slice(0, 8)} uchun ${points} ball sarflandi`,
      },
    });

    const pointsValue = Number(program.pointsValue);

    return {
      spentPoints: points,
      remainingPoints: updated.points,
      discountAmount: points * pointsValue,
    };
  }

  // Backwards compatible alias
  static async redeemPoints(
    tenantId: string,
    customerId: string,
    points: number,
    orderId: string
  ) {
    return this.spendPoints(tenantId, customerId, points, orderId);
  }

  // ==========================================
  // FIFO EXPIRY — oldest EARN transactions first
  // ==========================================

  static async expireOldPoints(accountId: string) {
    const now = new Date();

    // Find expired EARN transactions that still have positive value
    const expiredTxns = await prisma.loyaltyTransaction.findMany({
      where: {
        accountId,
        type: 'EARN',
        expiresAt: { lte: now },
        points: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (expiredTxns.length === 0) return 0;

    let totalExpired = 0;

    for (const txn of expiredTxns) {
      // Mark this earn as expired (set points to 0)
      await prisma.loyaltyTransaction.update({
        where: { id: txn.id },
        data: { points: 0, notes: (txn.notes || '') + ' [eskirgan]' },
      });
      totalExpired += txn.points;
    }

    if (totalExpired > 0) {
      // Deduct expired points from account (can't go below 0)
      const account = await prisma.loyaltyAccount.findUnique({ where: { id: accountId } });
      const deduct = Math.min(totalExpired, account?.points ?? 0);

      await prisma.loyaltyAccount.update({
        where: { id: accountId },
        data: { points: { decrement: deduct } },
      });

      // Log expiry transaction
      await prisma.loyaltyTransaction.create({
        data: {
          accountId,
          type: 'EXPIRE',
          points: -deduct,
          notes: `${deduct} ball muddati tugaganligi sababli o'chirildi`,
        },
      });
    }

    return totalExpired;
  }

  // ==========================================
  // EXPIRE ALL TENANTS (cron)
  // ==========================================

  static async expireAllTenants() {
    const now = new Date();

    const expiredAccounts = await prisma.loyaltyTransaction.groupBy({
      by: ['accountId'],
      where: {
        type: 'EARN',
        expiresAt: { lte: now },
        points: { gt: 0 },
      },
    });

    let total = 0;
    for (const { accountId } of expiredAccounts) {
      const expired = await this.expireOldPoints(accountId);
      total += expired;
    }

    return { expiredAccounts: expiredAccounts.length, totalExpiredPoints: total };
  }

  // ==========================================
  // CALCULATE MAX SPENDABLE POINTS
  // ==========================================

  static async calcMaxSpendable(tenantId: string, customerId: string, orderTotal: number) {
    const program = await prisma.loyaltyProgram.findUnique({ where: { tenantId } });
    if (!program) return { maxPoints: 0, maxDiscount: 0 };

    const account = await prisma.loyaltyAccount.findUnique({
      where: { customerId_tenantId: { customerId, tenantId } },
    });

    if (!account || account.points <= 0) return { maxPoints: 0, maxDiscount: 0 };

    const pointsValue = Number(program.pointsValue);
    const maxDiscountByPoints = account.points * pointsValue;
    // Can't pay more than order total
    const maxDiscount = Math.min(maxDiscountByPoints, orderTotal);
    const maxPoints = Math.ceil(maxDiscount / pointsValue);

    return { maxPoints, maxDiscount };
  }

  // ==========================================
  // GET ACCOUNT
  // ==========================================

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

    if (!account) throw new AppError('Loyalty hisobi topilmadi', 404);
    return account;
  }

  static async getLeaderboard(tenantId: string, limit = 10) {
    return prisma.loyaltyAccount.findMany({
      where: { tenantId },
      orderBy: { totalEarned: 'desc' },
      take: limit,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  // ==========================================
  // COUPONS (unchanged)
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
    const existing = await prisma.coupon.findUnique({
      where: { code_tenantId: { code: data.code.toUpperCase(), tenantId } },
    });
    if (existing) throw new AppError('Bu kupon kodi allaqachon mavjud', 409);

    return prisma.coupon.create({
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
      prisma.coupon.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.coupon.count({ where }),
    ]);

    return { coupons, page, limit, total };
  }

  static async validateCoupon(tenantId: string, code: string, orderTotal: number) {
    const coupon = await prisma.coupon.findUnique({
      where: { code_tenantId: { code: code.toUpperCase(), tenantId } },
    });

    if (!coupon) throw new AppError('Kupon topilmadi', 404);
    if (!coupon.isActive) throw new AppError('Kupon faol emas', 400);

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

    const discountValue = Number(coupon.discountValue);
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderTotal * discountValue) / 100;
    } else if (coupon.discountType === 'FIXED_AMOUNT') {
      discount = discountValue;
    }

    const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;
    if (maxDiscount && discount > maxDiscount) discount = maxDiscount;
    if (discount > orderTotal) discount = orderTotal;

    return { valid: true, coupon, discount, finalTotal: orderTotal - discount };
  }

  static async useCoupon(tenantId: string, code: string, orderId: string, customerId?: string) {
    const validation = await this.validateCoupon(tenantId, code, Infinity);
    const coupon = validation.coupon;

    if (customerId && coupon.perUserLimit) {
      const userUsageCount = await prisma.couponUsage.count({
        where: { couponId: coupon.id, customerId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new AppError('Bu mijoz uchun kupon ishlatish limiti tugagan', 400);
      }
    }

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usageCount: { increment: 1 } },
    });

    return prisma.couponUsage.create({
      data: { couponId: coupon.id, customerId, orderId, discount: validation.discount },
    });
  }

  static getTierBenefits(tier: LoyaltyTier): number {
    const benefits: Record<LoyaltyTier, number> = {
      BRONZE: 0, SILVER: 3, GOLD: 5, PLATINUM: 10,
    };
    return benefits[tier] ?? 0;
  }

  // ==========================================
  // PRIVATE HELPERS
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

  private static async sendEarnNotification(
    tenantId: string,
    customerId: string,
    earnedPoints: number,
    discountSum: number
  ) {
    try {
      const account = await prisma.loyaltyAccount.findUnique({
        where: { customerId_tenantId: { customerId, tenantId } },
        select: { tier: true, customer: { select: { phone: true, firstName: true } } },
      });
      if (!account?.customer) return;

      const { phone, firstName } = account.customer;

      // SMS
      if (phone) {
        const name = firstName ? `${firstName}, s` : 'S';
        const msg = `${name}iz ${earnedPoints} ball yig'dingiz! ${discountSum.toLocaleString()} so'm chegirma olasiz 🎁`;
        await SmsService.sendLoyaltyNotification(tenantId, phone, earnedPoints, account.tier).catch(() => {});
      }

      // Telegram if linked
      const tgUser = await prisma.telegramUser.findFirst({
        where: { tenantId, customerId },
        select: { chatId: true },
      });
      if (tgUser?.chatId) {
        const name = firstName ? `${firstName}, s` : 'S';
        const tgMsg = `🎁 ${name}iz <b>${earnedPoints} ball</b> yig'dingiz!\n💰 <b>${discountSum.toLocaleString()} so'm</b> chegirma olasiz`;
        await TelegramBotService.sendMessage(tenantId, tgUser.chatId, tgMsg).catch(() => {});
      }
    } catch {
      // notification failure is non-critical
    }
  }
}
