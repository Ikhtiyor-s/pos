import { prisma, Prisma } from '@oshxona/database';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator.js';

export class ProductService {
  static async getAll(tenantId: string, options?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { tenantId };

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

  static async getById(tenantId: string, id: string) {
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

    if (!product || product.tenantId !== tenantId) {
      throw new AppError('Mahsulot topilmadi', 404);
    }

    return product;
  }

  static async create(tenantId: string, data: CreateProductInput) {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category || category.tenantId !== tenantId) {
      throw new AppError('Kategoriya topilmadi', 404);
    }

    // Auto-generate barcode
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const barcode = `PROD-${randomHex}-${Date.now()}`;

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
        barcode,
        tenantId,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return product;
  }

  static async update(tenantId: string, id: string, data: UpdateProductInput) {
    await this.getById(tenantId, id);

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category || category.tenantId !== tenantId) {
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

  static async delete(tenantId: string, id: string) {
    await this.getById(tenantId, id);

    await prisma.product.delete({
      where: { id },
    });
  }

  static async updateImage(tenantId: string, id: string, imagePath: string) {
    await this.getById(tenantId, id);

    const product = await prisma.product.update({
      where: { id },
      data: { image: imagePath },
    });

    return product;
  }

  static async getByBarcode(tenantId: string, barcode: string) {
    const product = await prisma.product.findFirst({
      where: { barcode, tenantId },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: true,
        modifiers: true,
      },
    });

    if (!product) {
      throw new AppError('Mahsulot topilmadi', 404);
    }

    return product;
  }

  static async generateQRCode(tenantId: string, id: string) {
    const product = await this.getById(tenantId, id);

    if (!product.barcode) {
      throw new AppError('Mahsulotda barcode mavjud emas', 400);
    }

    const qrCodeDataUrl = await QRCode.toDataURL(product.barcode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return {
      product,
      qrCode: qrCodeDataUrl,
      barcode: product.barcode,
    };
  }

  static async generateBarcodeForExisting(tenantId: string, id: string) {
    const product = await this.getById(tenantId, id);

    if (product.barcode) {
      return product;
    }

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const barcode = `PROD-${randomHex}-${Date.now()}`;

    const updated = await prisma.product.update({
      where: { id },
      data: { barcode },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return updated;
  }
}
