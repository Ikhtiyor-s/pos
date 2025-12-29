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
  static async getAll(includeProducts = false) {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
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

  static async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
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

  static async getBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
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

  static async create(data: CreateCategoryInput) {
    const slug = data.slug || slugify(data.name);

    const existingCategory = await prisma.category.findUnique({
      where: { slug },
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
      },
    });

    return category;
  }

  static async update(id: string, data: UpdateCategoryInput) {
    await this.getById(id);

    if (data.slug) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          slug: data.slug,
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

  static async delete(id: string) {
    const category = await this.getById(id);

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: id },
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

  static async updateImage(id: string, imagePath: string) {
    await this.getById(id);

    const category = await prisma.category.update({
      where: { id },
      data: { image: imagePath },
    });

    return category;
  }
}
