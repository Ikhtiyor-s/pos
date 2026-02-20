import bcrypt from 'bcrypt';
import { prisma, Prisma, Role } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateBranchInput, UpdateBranchInput, BranchQueryInput } from '../validators/branch.validator.js';

export class BranchService {
  // Filliallar ro'yxati (parentTenant ning child larini qaytaradi)
  static async getAll(parentTenantId: string, query: BranchQueryInput) {
    const { search, isActive, page, limit } = query;

    const where: Prisma.TenantWhereInput = { parentId: parentTenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [branches, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              orders: true,
              products: true,
              tables: true,
              categories: true,
              customers: true,
            },
          },
          users: {
            where: { role: Role.MANAGER },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    return { branches, total, page, limit };
  }

  // Yangi fillial yaratish
  static async create(parentTenantId: string, data: CreateBranchInput) {
    // Parent tenant mavjudligini tekshirish
    const parentTenant = await prisma.tenant.findUnique({
      where: { id: parentTenantId },
    });
    if (!parentTenant) {
      throw new AppError('Asosiy restoran topilmadi', 404);
    }

    // Fillialda fillial yaratish mumkin emas (faqat 1 daraja)
    if (parentTenant.parentId) {
      throw new AppError('Fillialda fillial yaratish mumkin emas', 400);
    }

    // Slug unikal tekshirish
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new AppError('Bu slug allaqachon mavjud', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Child tenant yaratish
      const branch = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          phone: data.phone,
          address: data.address,
          parentId: parentTenantId,
        },
      });

      // 2. Default settings yaratish
      await tx.settings.create({
        data: {
          tenantId: branch.id,
          name: data.name,
        },
      });

      // 3. Fillial manager yaratish
      const hashedPassword = await bcrypt.hash(data.managerPassword, 10);
      const managerUser = await tx.user.create({
        data: {
          email: data.managerEmail,
          phone: data.managerPhone,
          password: hashedPassword,
          firstName: data.managerFirstName,
          lastName: data.managerLastName,
          role: Role.MANAGER,
          tenantId: branch.id,
        },
      });

      return {
        branch,
        manager: {
          id: managerUser.id,
          email: managerUser.email,
          firstName: managerUser.firstName,
          lastName: managerUser.lastName,
        },
      };
    });

    return result;
  }

  // Fillial tafsiloti
  static async getById(parentTenantId: string, branchId: string) {
    const branch = await prisma.tenant.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: {
            users: true,
            orders: true,
            products: true,
            tables: true,
            categories: true,
            customers: true,
          },
        },
        users: {
          where: { role: Role.MANAGER },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          take: 1,
        },
        settings: true,
      },
    });

    if (!branch || branch.parentId !== parentTenantId) {
      throw new AppError('Fillial topilmadi', 404);
    }

    return branch;
  }

  // Fillial yangilash
  static async update(parentTenantId: string, branchId: string, data: UpdateBranchInput) {
    const branch = await prisma.tenant.findUnique({ where: { id: branchId } });
    if (!branch || branch.parentId !== parentTenantId) {
      throw new AppError('Fillial topilmadi', 404);
    }

    if (data.slug && data.slug !== branch.slug) {
      const slugExists = await prisma.tenant.findUnique({ where: { slug: data.slug } });
      if (slugExists) {
        throw new AppError('Bu slug allaqachon mavjud', 400);
      }
    }

    return prisma.tenant.update({
      where: { id: branchId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
      },
    });
  }

  // Fillial yoqish/o'chirish
  static async toggle(parentTenantId: string, branchId: string) {
    const branch = await prisma.tenant.findUnique({ where: { id: branchId } });
    if (!branch || branch.parentId !== parentTenantId) {
      throw new AppError('Fillial topilmadi', 404);
    }

    return prisma.tenant.update({
      where: { id: branchId },
      data: { isActive: !branch.isActive },
    });
  }

  // Parent tenant ning o'zi + barcha children ID larini qaytarish (dashboard uchun)
  static async getAllTenantIds(tenantId: string): Promise<string[]> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { children: { select: { id: true }, where: { isActive: true } } },
    });
    if (!tenant) return [tenantId];

    const ids = [tenantId];
    for (const child of tenant.children) {
      ids.push(child.id);
    }
    return ids;
  }
}
