import { prisma, SmsType, SmsStatus, Prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';
import { redis } from '../../config/redis.js';

const ESKIZ_API = 'https://notify.eskiz.uz/api';

// OTP sozlamalari (env dan o'qiladi, default qiymatlar bor)
const OTP_TTL_SECONDS    = parseInt(process.env.OTP_EXPIRES_SECONDS  || '300');  // 5 daqiqa
const OTP_MAX_ATTEMPTS   = parseInt(process.env.OTP_MAX_ATTEMPTS     || '5');    // 5 urinish
const OTP_RATE_LIMIT     = parseInt(process.env.OTP_RATE_LIMIT_COUNT || '3');    // 3 ta so'rov
const OTP_RATE_WINDOW    = parseInt(process.env.OTP_RATE_LIMIT_WINDOW || '600'); // 10 daqiqa

export class SmsService {
  private static eskizToken: string | null = null;
  private static eskizTokenExpiresAt: number = 0;

  // ==========================================
  // OTP — Redis'da saqlash
  // ==========================================

  static async sendOtp(tenantId: string, phone: string) {
    const normalized = phone.replace(/\s+/g, '').replace(/^\+/, '');

    // Rate limit: bir telefon raqamidan 10 daqiqada max 3 ta so'rov
    const rateLimitKey = `otp:rate:${normalized}`;
    const requestCount = await redis.incr(rateLimitKey);
    if (requestCount === 1) {
      await redis.expire(rateLimitKey, OTP_RATE_WINDOW);
    }
    if (requestCount > OTP_RATE_LIMIT) {
      const ttl = await redis.ttl(rateLimitKey);
      throw new AppError(
        `Juda ko'p urinish. ${Math.ceil(ttl / 60)} daqiqadan keyin qaytadan urinib ko'ring.`,
        429
      );
    }

    // 6 xonali OTP generatsiya
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Redis'ga yozish: "otp:code:+998901234567" = "123456", 5 daqiqa
    const codeKey     = `otp:code:${normalized}`;
    const attemptsKey = `otp:attempts:${normalized}`;

    await redis.set(codeKey, code, 'EX', OTP_TTL_SECONDS);
    await redis.del(attemptsKey); // Yangi kod — eski urinishlarni tozalash

    // SMS yuborish
    const message = `Tasdiqlash kodi: ${code}. ${Math.ceil(OTP_TTL_SECONDS / 60)} daqiqa ichida foydalaning. Oshxona POS`;
    await this._sendSms(phone, message, 'OTP', tenantId);

    return { sent: true, expiresIn: OTP_TTL_SECONDS };
  }

  static async verifyOtp(phone: string, code: string) {
    const normalized = phone.replace(/\s+/g, '').replace(/^\+/, '');

    const codeKey     = `otp:code:${normalized}`;
    const attemptsKey = `otp:attempts:${normalized}`;

    // Kod mavjudligini tekshirish
    const savedCode = await redis.get(codeKey);
    if (!savedCode) {
      throw new AppError("OTP topilmadi yoki muddati tugagan. Qaytadan so'rang.", 400);
    }

    // Brute-force himoyasi: max 5 noto'g'ri urinish
    const attempts = parseInt((await redis.get(attemptsKey)) || '0');
    if (attempts >= OTP_MAX_ATTEMPTS) {
      const ttl = await redis.ttl(codeKey);
      throw new AppError(
        `Juda ko'p noto'g'ri urinish. ${Math.ceil(ttl / 60)} daqiqadan keyin qaytadan so'rang.`,
        429
      );
    }

    // Kodni solishtirish
    if (savedCode !== code.trim()) {
      // Noto'g'ri urinishni qayd qilish (TTL ni OTP bilan bir xil qilish)
      const ttl = await redis.ttl(codeKey);
      await redis.set(attemptsKey, String(attempts + 1), 'EX', ttl > 0 ? ttl : OTP_TTL_SECONDS);
      const remaining = OTP_MAX_ATTEMPTS - (attempts + 1);
      throw new AppError(
        `OTP noto'g'ri. ${remaining > 0 ? `${remaining} ta urinish qoldi.` : 'Qaytadan so\'rang.'}`,
        400
      );
    }

    // Muvaffaqiyatli: kodni va urinishlarni o'chirish
    await redis.del(codeKey, attemptsKey);

    return { verified: true };
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  static async sendOrderStatus(tenantId: string, phone: string, orderNumber: string, status: string) {
    const statusLabels: Record<string, string> = {
      NEW:        'qabul qilindi',
      CONFIRMED:  'tasdiqlandi',
      PREPARING:  'tayyorlanmoqda',
      READY:      'tayyor',
      DELIVERING: 'yetkazilmoqda',
      COMPLETED:  'bajarildi',
      CANCELLED:  'bekor qilindi',
    };

    const statusText = statusLabels[status] || status;
    const message = `Buyurtma #${orderNumber} ${statusText}. Oshxona POS`;

    await this._sendSms(phone, message, 'ORDER_STATUS', tenantId);

    return { sent: true };
  }

  static async sendReservationReminder(
    tenantId: string,
    phone: string,
    reservationData: {
      customerName: string;
      date: string;
      time: string;
      guestCount: number;
      confirmationCode?: string;
    }
  ) {
    const message =
      `Hurmatli ${reservationData.customerName}, ` +
      `${reservationData.date} kuni soat ${reservationData.time} da ` +
      `${reservationData.guestCount} kishilik broningiz bor.` +
      `${reservationData.confirmationCode ? ` Kod: ${reservationData.confirmationCode}` : ''} ` +
      `Oshxona POS`;

    await this._sendSms(phone, message, 'RESERVATION', tenantId);

    return { sent: true };
  }

  static async sendMarketingMessage(tenantId: string, phones: string[], message: string) {
    let sent = 0;
    let failed = 0;

    for (const phone of phones) {
      try {
        await this._sendSms(phone, message, 'MARKETING', tenantId);
        sent++;
      } catch {
        failed++;
      }
    }

    return { total: phones.length, sent, failed };
  }

  static async sendLoyaltyNotification(
    tenantId: string,
    phone: string,
    points: number,
    tier: string
  ) {
    const tierLabels: Record<string, string> = {
      BRONZE:   'Bronza',
      SILVER:   'Kumush',
      GOLD:     'Oltin',
      PLATINUM: 'Platina',
    };

    const tierText = tierLabels[tier] || tier;
    const message = `Tabriklaymiz! Sizda ${points} ball to'plandi. Darajangiz: ${tierText}. Oshxona POS`;

    await this._sendSms(phone, message, 'LOYALTY', tenantId);

    return { sent: true };
  }

  // ==========================================
  // LOGS & STATS
  // ==========================================

  static async getSmsLogs(
    tenantId: string,
    options: {
      type?: SmsType;
      phone?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page  = options.page  || 1;
    const limit = options.limit || 50;
    const skip  = (page - 1) * limit;

    const where: Prisma.SmsLogWhereInput = { tenantId };

    if (options.type)  where.type  = options.type;
    if (options.phone) where.phone = { contains: options.phone };

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo)   where.createdAt.lte = new Date(options.dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.smsLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.smsLog.count({ where }),
    ]);

    return { logs, page, limit, total };
  }

  static async getSmsStats(tenantId: string) {
    const [byType, totalCost, deliveryStats] = await Promise.all([
      prisma.smsLog.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { id: true },
      }),
      prisma.smsLog.aggregate({
        where: { tenantId },
        _sum: { cost: true },
        _count: { id: true },
      }),
      prisma.smsLog.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    const totalMessages  = totalCost._count.id;
    const deliveredCount = deliveryStats.find((s) => s.status === 'DELIVERED')?._count.id || 0;
    const deliveryRate   = totalMessages > 0
      ? parseFloat(((deliveredCount / totalMessages) * 100).toFixed(2))
      : 0;

    return {
      byType:        byType.map((t) => ({ type: t.type, count: t._count.id })),
      totalMessages,
      totalCost:     totalCost._sum.cost || 0,
      deliveryRate,
      byStatus:      deliveryStats.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }

  // ==========================================
  // INTERNAL: SMS YUBORISH (ESKIZ)
  // ==========================================

  static async _sendSms(phone: string, message: string, type: SmsType, tenantId: string) {
    const smsLog = await prisma.smsLog.create({
      data: { phone, message, type, status: 'PENDING', tenantId },
    });

    try {
      const token = await this._getEskizToken();

      // 8 soniyalik timeout — Eskiz sekin bo'lsa hang qilmasligi uchun
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      let response: Response;
      try {
        response = await fetch(`${ESKIZ_API}/message/sms/send`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mobile_phone: phone.replace(/\D/g, ''),
            message,
            from: '4546',
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      const result = await response.json() as { id?: string; status?: string };

      if (response.ok) {
        await prisma.smsLog.update({
          where: { id: smsLog.id },
          data: {
            status:     'SENT',
            externalId: result.id ? String(result.id) : null,
            sentAt:     new Date(),
            cost:       50,
          },
        });
        return { success: true, smsLogId: smsLog.id };
      } else {
        await prisma.smsLog.update({
          where: { id: smsLog.id },
          data: { status: 'FAILED' },
        });
        return { success: false, smsLogId: smsLog.id, error: result };
      }
    } catch (error) {
      await prisma.smsLog.update({
        where: { id: smsLog.id },
        data: { status: 'FAILED' },
      });

      const isTimeout = error instanceof Error && error.name === 'AbortError';
      return {
        success: false,
        smsLogId: smsLog.id,
        error: isTimeout ? 'Eskiz API timeout (8s)' : String(error),
      };
    }
  }

  private static async _getEskizToken(): Promise<string> {
    if (this.eskizToken && Date.now() < this.eskizTokenExpiresAt) {
      return this.eskizToken;
    }

    const email    = process.env.ESKIZ_EMAIL    || '';
    const password = process.env.ESKIZ_PASSWORD || '';

    if (!email || !password) {
      throw new AppError('ESKIZ_EMAIL yoki ESKIZ_PASSWORD .env da yo\'q', 500);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch(`${ESKIZ_API}/auth/login`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } finally {
      clearTimeout(timer);
    }

    const result = await response.json() as { data?: { token?: string } };

    if (!response.ok || !result.data?.token) {
      throw new AppError('Eskiz autentifikatsiya xatoligi', 500);
    }

    this.eskizToken = result.data.token;
    // 29 kun (token 30 kunlik, xavfsizlik uchun 1 kun oldin yangilanadi)
    this.eskizTokenExpiresAt = Date.now() + 29 * 24 * 60 * 60 * 1000;

    return this.eskizToken;
  }
}
