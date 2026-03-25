import { prisma, SmsType, SmsStatus, Prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

const ESKIZ_API = 'https://notify.eskiz.uz/api';

// OTP cache (production'da Redis ishlatiladi)
const otpCache = new Map<string, { code: string; expiresAt: number }>();

export class SmsService {
  private static eskizToken: string | null = null;
  private static eskizTokenExpiresAt: number = 0;

  // ==========================================
  // OTP
  // ==========================================

  static async sendOtp(tenantId: string, phone: string) {
    // 6 xonali OTP generatsiya qilish
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Cache'ga saqlash (5 daqiqa)
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpCache.set(phone, { code, expiresAt });

    // SMS yuborish
    const message = `Tasdiqlash kodi: ${code}. 5 daqiqa ichida foydalaning.`;
    await this._sendSms(phone, message, 'OTP', tenantId);

    return { sent: true, expiresIn: 300 };
  }

  static async verifyOtp(phone: string, code: string) {
    const cached = otpCache.get(phone);

    if (!cached) {
      throw new AppError('OTP topilmadi. Qaytadan so\'rang', 400);
    }

    if (Date.now() > cached.expiresAt) {
      otpCache.delete(phone);
      throw new AppError('OTP muddati tugagan. Qaytadan so\'rang', 400);
    }

    if (cached.code !== code) {
      throw new AppError('OTP noto\'g\'ri', 400);
    }

    // Muvaffaqiyatli — cache'dan o'chirish
    otpCache.delete(phone);

    return { verified: true };
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  static async sendOrderStatus(tenantId: string, phone: string, orderNumber: string, status: string) {
    const statusLabels: Record<string, string> = {
      NEW: 'qabul qilindi',
      CONFIRMED: 'tasdiqlandi',
      PREPARING: 'tayyorlanmoqda',
      READY: 'tayyor',
      DELIVERING: 'yetkazilmoqda',
      COMPLETED: 'bajarildi',
      CANCELLED: 'bekor qilindi',
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
    const message = `Hurmatli ${reservationData.customerName}, ${reservationData.date} kuni soat ${reservationData.time} da ${reservationData.guestCount} kishilik broningiz bor.${reservationData.confirmationCode ? ` Kod: ${reservationData.confirmationCode}` : ''} Oshxona POS`;

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
      BRONZE: 'Bronza',
      SILVER: 'Kumush',
      GOLD: 'Oltin',
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
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.SmsLogWhereInput = { tenantId };

    if (options.type) where.type = options.type;
    if (options.phone) where.phone = { contains: options.phone };

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
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

    const totalMessages = totalCost._count.id;
    const deliveredCount = deliveryStats.find((s) => s.status === 'DELIVERED')?._count.id || 0;
    const deliveryRate = totalMessages > 0 ? parseFloat(((deliveredCount / totalMessages) * 100).toFixed(2)) : 0;

    return {
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
      totalMessages,
      totalCost: totalCost._sum.cost || 0,
      deliveryRate,
      byStatus: deliveryStats.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }

  // ==========================================
  // INTERNAL: SMS SENDING VIA ESKIZ
  // ==========================================

  static async _sendSms(phone: string, message: string, type: SmsType, tenantId: string) {
    // Log yaratish
    const smsLog = await prisma.smsLog.create({
      data: {
        phone,
        message,
        type,
        status: 'PENDING',
        tenantId,
      },
    });

    try {
      // Tokenni olish yoki yangilash
      const token = await this._getEskizToken();

      // SMS yuborish
      const response = await fetch(`${ESKIZ_API}/message/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile_phone: phone.replace('+', ''),
          message,
          from: '4546',
        }),
      });

      const result = await response.json() as { id?: string; status?: string };

      if (response.ok) {
        await prisma.smsLog.update({
          where: { id: smsLog.id },
          data: {
            status: 'SENT',
            externalId: result.id ? String(result.id) : null,
            sentAt: new Date(),
            cost: 50, // Eskiz narxi taxminan
          },
        });

        return { success: true, smsLogId: smsLog.id };
      } else {
        await prisma.smsLog.update({
          where: { id: smsLog.id },
          data: { status: 'FAILED' },
        });

        console.error('Eskiz SMS xatolik:', result);
        return { success: false, smsLogId: smsLog.id, error: result };
      }
    } catch (error) {
      await prisma.smsLog.update({
        where: { id: smsLog.id },
        data: { status: 'FAILED' },
      });

      console.error('SMS yuborish xatolik:', error);
      return { success: false, smsLogId: smsLog.id, error: String(error) };
    }
  }

  private static async _getEskizToken(): Promise<string> {
    // Token hali amal qilayotgan bo'lsa qaytarish
    if (this.eskizToken && Date.now() < this.eskizTokenExpiresAt) {
      return this.eskizToken;
    }

    const email = process.env.ESKIZ_EMAIL || '';
    const password = process.env.ESKIZ_PASSWORD || '';

    const response = await fetch(`${ESKIZ_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json() as { data?: { token?: string } };

    if (!response.ok || !result.data?.token) {
      throw new AppError('Eskiz autentifikatsiya xatoligi', 500);
    }

    this.eskizToken = result.data.token;
    // Token 30 kunlik, lekin xavfsizlik uchun 29 kun belgilaymiz
    this.eskizTokenExpiresAt = Date.now() + 29 * 24 * 60 * 60 * 1000;

    return this.eskizToken;
  }
}
