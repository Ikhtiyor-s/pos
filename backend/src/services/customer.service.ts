import { prisma } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';

export class CustomerService {
  static async getAll(tenantId: string, params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (params?.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  static async getById(tenantId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { orders: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
        },
      },
    });

    if (!customer) {
      throw new AppError('Mijoz topilmadi', 404);
    }

    return customer;
  }

  static async create(tenantId: string, data: { phone: string; firstName?: string; lastName?: string; email?: string; notes?: string }) {
    const existing = await prisma.customer.findFirst({
      where: { phone: data.phone, tenantId },
    });

    if (existing) {
      throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 400);
    }

    return prisma.customer.create({
      data: {
        ...data,
        tenantId,
      },
      include: {
        _count: { select: { orders: true } },
      },
    });
  }

  static async update(tenantId: string, id: string, data: Record<string, any>) {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new AppError('Mijoz topilmadi', 404);
    }

    return prisma.customer.update({
      where: { id },
      data,
      include: {
        _count: { select: { orders: true } },
      },
    });
  }

  static async delete(tenantId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new AppError('Mijoz topilmadi', 404);
    }

    await prisma.customer.delete({ where: { id } });
  }
}
