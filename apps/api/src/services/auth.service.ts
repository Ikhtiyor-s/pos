import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma, Role } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import { LoginInput, RegisterInput, PinLoginInput } from '../validators/auth.validator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

interface TokenPayload {
  userId: string;
  role: Role;
  tenantId: string | null;
}

export class AuthService {
  static generateTokens(userId: string, role: Role, tenantId: string | null) {
    const accessToken = jwt.sign({ userId, role, tenantId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign({ userId, role, tenantId }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return { accessToken, refreshToken };
  }

  static async login(data: LoginInput) {
    // Email yoki phone orqali qidirish
    let user;

    if (data.email) {
      // Email + tenantId yoki global (SUPER_ADMIN) search
      const users = await prisma.user.findMany({
        where: { email: data.email },
      });
      // Birinchi topilgan userni olish (tenantId bo'lishi yoki bo'lmasligi mumkin)
      user = users[0] || null;
    } else if (data.phone) {
      const users = await prisma.user.findMany({
        where: { phone: data.phone },
      });
      user = users[0] || null;
    }

    if (!user) {
      throw new AppError('Login yoki parol noto\'g\'ri', 401);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Email yoki parol noto\'g\'ri', 401);
    }

    if (!user.isActive) {
      throw new AppError('Hisobingiz bloklangan', 403);
    }

    // Tenant aktiv ekanligini tekshirish
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isActive: true },
      });

      if (!tenant || !tenant.isActive) {
        throw new AppError('Tashkilotingiz bloklangan', 403);
      }
    }

    const tokens = this.generateTokens(user.id, user.role, user.tenantId);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  static async register(data: RegisterInput & { tenantId?: string }) {
    // Tenant ichida duplicate tekshirish
    const whereConditions = [];

    if (data.tenantId) {
      whereConditions.push({ email: data.email, tenantId: data.tenantId });
      if (data.phone) {
        whereConditions.push({ phone: data.phone, tenantId: data.tenantId });
      }
    } else {
      whereConditions.push({ email: data.email, tenantId: null });
      if (data.phone) {
        whereConditions.push({ phone: data.phone, tenantId: null });
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: whereConditions },
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new AppError('Bu email allaqachon ro\'yxatdan o\'tgan', 400);
      }
      throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  static async refreshToken(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AppError('Yaroqsiz token', 401);
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Token muddati tugagan', 401);
    }

    try {
      jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Yaroqsiz token', 401);
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    const tokens = this.generateTokens(
      storedToken.user.id,
      storedToken.user.role,
      storedToken.user.tenantId
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.user.id,
        expiresAt,
      },
    });

    return tokens;
  }

  static async logout(token: string) {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
  }

  static async logoutAll(userId: string) {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // ============ PIN LOGIN ============

  static async loginWithPin(data: PinLoginInput) {
    // Tenant aktiv ekanligini tekshirish
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new AppError('Tashkilot topilmadi yoki bloklangan', 404);
    }

    // Shu tenant ichidagi PIN bor aktiv userlarni olish
    const users = await prisma.user.findMany({
      where: {
        tenantId: data.tenantId,
        pinCode: { not: null },
        isActive: true,
      },
    });

    // Har bir user PIN ni bcrypt.compare bilan tekshirish
    for (const user of users) {
      const isMatch = await bcrypt.compare(data.pin, user.pinCode!);
      if (isMatch) {
        const tokens = this.generateTokens(user.id, user.role, user.tenantId);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: user.id,
            expiresAt,
          },
        });

        const { password: _, pinCode: __, ...userWithoutSecrets } = user;

        return {
          user: userWithoutSecrets,
          ...tokens,
        };
      }
    }

    throw new AppError('PIN kod noto\'g\'ri', 401);
  }

  static async setUserPin(userId: string, pin: string, adminTenantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    if (user.tenantId !== adminTenantId) {
      throw new AppError('Bu foydalanuvchi sizning tashkilotingizga tegishli emas', 403);
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { pinCode: hashedPin },
    });
  }

  static async removeUserPin(userId: string, adminTenantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    if (user.tenantId !== adminTenantId) {
      throw new AppError('Bu foydalanuvchi sizning tashkilotingizga tegishli emas', 403);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pinCode: null },
    });
  }
}
