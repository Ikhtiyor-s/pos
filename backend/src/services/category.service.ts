import { prisma } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import { CreateCategoryInput, UpdateCategoryInput } from '../validators/product.validator.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export class CategoryService {
  static async getAll(tenantId: string, includeProducts = false) {
    const categories = await prisma.category.findMany({
      where: { tenantId, isActive: true },
      include: includeProducts
        ? {
            products: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          }
        : undefined,
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }

  static async getById(tenantId: string, id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category || category.tenantId !== tenantId) {
      throw new AppError('Kategoriya topilmadi', 404);
    }

    return category;
  }

  static async getBySlug(tenantId: string, slug: string) {
    const category = await prisma.category.findFirst({
      where: { slug, tenantId },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError('Kategoriya topilmadi', 404);
    }

    return category;
  }

  static async create(tenantId: string, data: CreateCategoryInput) {
    const slug = data.slug || slugify(data.name);

    const existingCategory = await prisma.category.findFirst({
      where: { slug, tenantId },
    });

    if (existingCategory) {
      throw new AppError('Bu slug allaqachon mavjud', 400);
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        slug,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        tenantId,
      },
    });

    return category;
  }

  static async update(tenantId: string, id: string, data: UpdateCategoryInput) {
    await this.getById(tenantId, id);

    if (data.slug) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          slug: data.slug,
          tenantId,
          NOT: { id },
        },
      });

      if (existingCategory) {
        throw new AppError('Bu slug allaqachon mavjud', 400);
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return category;
  }

  static async delete(tenantId: string, id: string) {
    const category = await this.getById(tenantId, id);

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id, tenantId },
    });

    if (productsCount > 0) {
      throw new AppError(
        `Bu kategoriyada ${productsCount} ta mahsulot bor. Avval ularni o'chiring`,
        400
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return category;
  }

  static async updateImage(tenantId: string, id: string, imagePath: string) {
    await this.getById(tenantId, id);

    const category = await prisma.category.update({
      where: { id },
      data: { image: imagePath },
    });

    return category;
  }
}
