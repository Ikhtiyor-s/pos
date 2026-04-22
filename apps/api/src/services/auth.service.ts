import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { prisma, Role } from '@oshxona/database';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { LoginInput, RegisterInput, PinLoginInput } from '../validators/auth.validator.js';
import { logger } from '../utils/logger.js';

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET va JWT_REFRESH_SECRET environment variable lar majburiy');
}

const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_TOKEN_DAYS = 7;

interface TokenPayload {
  userId: string;
  role: Role;
  tenantId: string | null;
}

// PIN quick-lookup hash — scrypt o'rniga deterministik SHA-256 ishlatiladi
// Maqsad: O(1) DB lookup (bcrypt loop bilan o'rniga)
// Xavfsizlik: pinCode kolumnida bcrypt saqlanadi (verification uchun)
function pinQuickHash(pin: string, tenantId: string): string {
  return createHash('sha256').update(`${tenantId}:${pin}`).digest('hex');
}

function refreshTokenExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_DAYS);
  return d;
}

export class AuthService {
  static generateTokens(userId: string, role: Role, tenantId: string | null) {
    const payload: TokenPayload = { userId, role, tenantId };
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    return { accessToken, refreshToken };
  }

  static async login(data: LoginInput) {
    const users = await prisma.user.findMany({
      where: data.email ? { email: data.email } : { phone: data.phone },
    });

    const user = users[0] ?? null;

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw new AppError("Login yoki parol noto'g'ri", 401, ErrorCode.UNAUTHORIZED);
    }

    if (!user.isActive) throw new AppError('Hisobingiz bloklangan', 403, ErrorCode.FORBIDDEN);

    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isActive: true },
      });
      if (!tenant?.isActive) throw new AppError('Tashkilotingiz bloklangan', 403, ErrorCode.FORBIDDEN);
    }

    const tokens = this.generateTokens(user.id, user.role, user.tenantId);
    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    logger.info('User logged in', { userId: user.id, role: user.role, tenantId: user.tenantId });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  static async register(data: RegisterInput & { tenantId?: string }) {
    const whereConditions: any[] = data.tenantId
      ? [{ email: data.email, tenantId: data.tenantId }, ...(data.phone ? [{ phone: data.phone, tenantId: data.tenantId }] : [])]
      : [{ email: data.email, tenantId: null }, ...(data.phone ? [{ phone: data.phone, tenantId: null }] : [])];

    const existingUser = await prisma.user.findFirst({ where: { OR: whereConditions } });

    if (existingUser) {
      const field = existingUser.email === data.email ? 'Email' : 'Telefon';
      throw new AppError(`Bu ${field} allaqachon ro'yxatdan o'tgan`, 400, ErrorCode.CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || Role.CASHIER,
        tenantId: data.tenantId || null,
      },
    });

    const tokens = this.generateTokens(user.id, user.role, user.tenantId);
    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    logger.info('User registered', { userId: user.id, role: user.role, tenantId: user.tenantId });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, ...tokens };
  }

  static async refreshToken(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) throw new AppError('Yaroqsiz token', 401, ErrorCode.TOKEN_INVALID);

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Token muddati tugagan', 401, ErrorCode.TOKEN_EXPIRED);
    }

    try {
      jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Yaroqsiz token', 401, ErrorCode.TOKEN_INVALID);
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const tokens = this.generateTokens(
      storedToken.user.id,
      storedToken.user.role,
      storedToken.user.tenantId,
    );

    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: storedToken.user.id, expiresAt: refreshTokenExpiry() },
    });

    return tokens;
  }

  static async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  static async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  // ============ PIN LOGIN — O(1) lookup ============
  // Tenant ichidagi foydalanuvchi PIN bilan login qiladi.
  // pinQuickLookup kolumnida SHA-256(tenantId:pin) saqlanadi — O(1) DB lookup.
  // pinCode kolumnida bcrypt hash — verification uchun.
  // Agar pinQuickLookup kolumni schema'da yo'q bo'lsa, fallback: bcrypt loop (eskirgan yondashuv).
  static async loginWithPin(data: PinLoginInput) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { isActive: true },
    });

    if (!tenant?.isActive) {
      throw new AppError('Tashkilot topilmadi yoki bloklangan', 404, ErrorCode.NOT_FOUND);
    }

    // Quick lookup hash bilan O(1) qidirish
    const quickHash = pinQuickHash(data.pin, data.tenantId);

    let user = await prisma.user.findFirst({
      where: {
        tenantId: data.tenantId,
        isActive: true,
        pinQuickLookup: quickHash,
      } as any,
    }).catch(() => null); // pinQuickLookup kolumni yo'q bo'lsa null

    // Fallback: schema'da pinQuickLookup yo'q bo'lsa — bcrypt loop (deprecated)
    if (user === null) {
      const users = await prisma.user.findMany({
        where: { tenantId: data.tenantId, pinCode: { not: null }, isActive: true },
      });

      for (const u of users) {
        if (await bcrypt.compare(data.pin, u.pinCode!)) {
          user = u;
          break;
        }
      }
    }

    if (!user) throw new AppError("PIN kod noto'g'ri", 401, ErrorCode.UNAUTHORIZED);

    const tokens = this.generateTokens(user.id, user.role, user.tenantId);
    await prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt: refreshTokenExpiry() },
    });

    logger.info('PIN login', { userId: user.id, tenantId: data.tenantId });

    const { password: _, pinCode: __, ...userWithoutSecrets } = user as any;
    return { user: userWithoutSecrets, ...tokens };
  }

  static async setUserPin(userId: string, pin: string, adminTenantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404, ErrorCode.NOT_FOUND);
    if (user.tenantId !== adminTenantId) {
      throw new AppError("Bu foydalanuvchi sizning tashkilotingizga tegishli emas", 403, ErrorCode.FORBIDDEN);
    }

    const [hashedPin, quickHash] = await Promise.all([
      bcrypt.hash(pin, 12),
      Promise.resolve(pinQuickHash(pin, adminTenantId)),
    ]);

    await prisma.user.update({
      where: { id: userId },
      data: { pinCode: hashedPin, ...(({ pinQuickLookup: quickHash }) as any) },
    });
  }

  static async removeUserPin(userId: string, adminTenantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404, ErrorCode.NOT_FOUND);
    if (user.tenantId !== adminTenantId) {
      throw new AppError("Bu foydalanuvchi sizning tashkilotingizga tegishli emas", 403, ErrorCode.FORBIDDEN);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pinCode: null, ...(({ pinQuickLookup: null }) as any) },
    });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) throw new AppError('Foydalanuvchi topilmadi', 404, ErrorCode.NOT_FOUND);

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new AppError("Joriy parol noto'g'ri", 401, ErrorCode.UNAUTHORIZED);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(newPassword, 12) },
    });
  }

  static async forgotPassword(email?: string, phone?: string) {
    if (!email && !phone) {
      throw new AppError('Email yoki telefon raqam kiritilishi shart', 400, ErrorCode.VALIDATION_ERROR);
    }

    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
      select: { id: true, email: true, phone: true },
    });

    // Xavfsizlik: foydalanuvchi mavjudligini oshkor qilmaymiz
    if (!user) return { message: "Agar hisob mavjud bo'lsa, tiklash havolasi yuborildi" };

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const { randomBytes } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    logger.info('Password reset requested', { userId: user.id });

    return {
      message: "Agar hisob mavjud bo'lsa, tiklash havolasi yuborildi",
      ...(process.env.NODE_ENV !== 'production' ? { token } : {}),
    };
  }

  static async resetPassword(token: string, newPassword: string) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!resetToken) throw new AppError("Yaroqsiz yoki muddati o'tgan token", 400, ErrorCode.TOKEN_INVALID);
    if (resetToken.usedAt) throw new AppError('Bu token allaqachon ishlatilgan', 400, ErrorCode.TOKEN_INVALID);
    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      throw new AppError("Token muddati tugagan. Qaytadan so'rang.", 400, ErrorCode.TOKEN_EXPIRED);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: await bcrypt.hash(newPassword, 12) },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    logger.info('Password reset completed', { userId: resetToken.userId });
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }
}
