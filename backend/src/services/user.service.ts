import bcrypt from 'bcrypt';
import { prisma, Role } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';

export class UserService {
  static async getAll(tenantId: string, params?: { search?: string; role?: string }) {
    const where: any = { tenantId };

    if (params?.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
      ];
    }

    if (params?.role && params.role !== 'ALL') {
      where.role = params.role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
    });

    return users;
  }

  static async getById(tenantId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    return user;
  }

  static async create(tenantId: string, data: {
    email: string;
    phone?: string;
    firstName: string;
    lastName?: string;
    role: string;
    password: string;
  }) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, tenantId },
    });

    if (existing) {
      throw new AppError('Bu email allaqachon ro\'yxatdan o\'tgan', 400);
    }

    if (data.phone) {
      const phoneExists = await prisma.user.findFirst({
        where: { phone: data.phone, tenantId },
      });
      if (phoneExists) {
        throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 400);
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName || '',
        role: data.role as Role,
        password: hashedPassword,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  static async update(tenantId: string, id: string, data: Record<string, any>) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    // Parol yangilansa hash qilish
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async delete(tenantId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    // O'zini o'chirish mumkin emas
    if (user.role === 'SUPER_ADMIN' || user.role === 'MANAGER') {
      const managersCount = await prisma.user.count({
        where: { tenantId, role: user.role, isActive: true },
      });
      if (managersCount <= 1) {
        throw new AppError('Oxirgi menejer/adminni o\'chirib bo\'lmaydi', 400);
      }
    }

    // Refresh tokenlarini o'chirish
    await prisma.refreshToken.deleteMany({ where: { userId: id } });

    await prisma.user.delete({ where: { id } });
  }

  static async toggleActive(tenantId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new AppError('Foydalanuvchi topilmadi', 404);
    }

    return prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
