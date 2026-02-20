import bcrypt from 'bcrypt';
import { prisma, Role } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateTenantInput, UpdateTenantInput, TenantQueryInput } from '../validators/tenant.validator.js';

export class TenantService {
  // Barcha tenantlar ro'yxati
  static async getAll(query: TenantQueryInput) {
    const { search, isActive, page, limit } = query;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              orders: true,
              products: true,
              tables: true,
            },
          },
          subscription: {
            include: { plan: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    return { tenants, total, page, limit };
  }

  // Bitta tenant tafsiloti
  static async getById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
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
        subscription: {
          include: { plan: true },
        },
        settings: true,
      },
    });

    if (!tenant) {
      throw new AppError('Tenant topilmadi', 404);
    }

    return tenant;
  }

  // Yangi tenant yaratish (+ admin user + default settings)
  static async create(data: CreateTenantInput) {
    // Slug unikal tekshirish
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new AppError('Bu slug allaqachon mavjud', 400);
    }

    // Transaction ichida hammasini yaratish
    const result = await prisma.$transaction(async (tx) => {
      // 1. Tenant yaratish
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          domain: data.domain,
          logo: data.logo,
          phone: data.phone,
          email: data.email,
          address: data.address,
        },
      });

      // 2. Default settings yaratish
      await tx.settings.create({
        data: {
          tenantId: tenant.id,
          name: data.name,
        },
      });

      // 3. Admin user yaratish (MANAGER role)
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      const adminUser = await tx.user.create({
        data: {
          email: data.adminEmail,
          phone: data.adminPhone,
          password: hashedPassword,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          role: Role.MANAGER,
          tenantId: tenant.id,
        },
      });

      return {
        tenant,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role,
        },
      };
    });

    return result;
  }

  // Tenant yangilash
  static async update(id: string, data: UpdateTenantInput) {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Tenant topilmadi', 404);
    }

    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.tenant.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        throw new AppError('Bu slug allaqachon mavjud', 400);
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data,
    });

    return tenant;
  }

  // Tenant yoqish/o'chirish
  static async toggle(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new AppError('Tenant topilmadi', 404);
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });

    return updated;
  }

  // Tenant statistikasi
  static async getStats(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new AppError('Tenant topilmadi', 404);
    }

    const [
      usersCount,
      ordersCount,
      productsCount,
      categoriesCount,
      tablesCount,
      customersCount,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId: id } }),
      prisma.order.count({ where: { tenantId: id } }),
      prisma.product.count({ where: { tenantId: id } }),
      prisma.category.count({ where: { tenantId: id } }),
      prisma.table.count({ where: { tenantId: id } }),
      prisma.customer.count({ where: { tenantId: id } }),
    ]);

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: id },
      include: { plan: true },
    });

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      counts: {
        users: usersCount,
        orders: ordersCount,
        products: productsCount,
        categories: categoriesCount,
        tables: tablesCount,
        customers: customersCount,
      },
      subscription,
    };
  }
}
