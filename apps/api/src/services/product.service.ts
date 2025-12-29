import { prisma, Prisma } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator.js';

export class ProductService {
  static async getAll(options?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { nameRu: { contains: options.search, mode: 'insensitive' } },
        { nameEn: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        modifiers: true,
        ingredients: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Mahsulot topilmadi', 404);
    }

    return product;
  }

  static async create(data: CreateProductInput) {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError('Kategoriya topilmadi', 404);
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        description: data.description,
        price: data.price,
        costPrice: data.costPrice,
        categoryId: data.categoryId,
        cookingTime: data.cookingTime,
        calories: data.calories,
        isActive: data.isActive,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return product;
  }

  static async update(id: string, data: UpdateProductInput) {
    await this.getById(id);

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError('Kategoriya topilmadi', 404);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return product;
  }

  static async delete(id: string) {
    await this.getById(id);

    await prisma.product.delete({
      where: { id },
    });
  }

  static async updateImage(id: string, imagePath: string) {
    await this.getById(id);

    const product = await prisma.product.update({
      where: { id },
      data: { image: imagePath },
    });

    return product;
  }
}
