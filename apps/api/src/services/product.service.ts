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

    // Auto-generate barcode if not provided
    const barcode = data.barcode || (() => {
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      return `PROD-${randomHex}-${Date.now()}`;
    })();

    // Extract relations
    const { ingredients, variants, modifiers, ...productData } = data;

    const product = await prisma.product.create({
      data: {
        name: productData.name,
        nameRu: productData.nameRu,
        nameEn: productData.nameEn,
        description: productData.description,
        descriptionRu: productData.descriptionRu,
        descriptionEn: productData.descriptionEn,
        sku: productData.sku,
        price: productData.price,
        costPrice: productData.costPrice,
        image: productData.image,
        images: productData.images || [],
        categoryId: productData.categoryId,
        weight: productData.weight,
        weightUnit: productData.weightUnit,
        cookingTime: productData.cookingTime,
        preparationTime: productData.preparationTime,
        calories: productData.calories,
        stockQuantity: productData.stockQuantity,
        lowStockAlert: productData.lowStockAlert,
        trackStock: productData.trackStock,
        tags: productData.tags || [],
        isActive: productData.isActive,
        isFeatured: productData.isFeatured,
        isAvailableOnline: productData.isAvailableOnline,
        sortOrder: productData.sortOrder,
        barcode,
        tenantId,
        // Inline relations
        ...(ingredients && ingredients.length > 0 ? {
          ingredients: {
            create: ingredients.map(ing => ({
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
            })),
          },
        } : {}),
        ...(variants && variants.length > 0 ? {
          variants: { create: variants },
        } : {}),
        ...(modifiers && modifiers.length > 0 ? {
          modifiers: { create: modifiers },
        } : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: true,
        modifiers: true,
        ingredients: {
          include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
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

    // Extract relations
    const { ingredients, variants, modifiers, ...productData } = data;

    // Update ingredients if provided
    if (ingredients) {
      await prisma.productIngredient.deleteMany({ where: { productId: id } });
      if (ingredients.length > 0) {
        await prisma.productIngredient.createMany({
          data: ingredients.map(ing => ({
            productId: id,
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
          })),
        });
      }
    }

    // Update variants if provided
    if (variants) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length > 0) {
        await prisma.productVariant.createMany({
          data: variants.map(v => ({ productId: id, ...v })),
        });
      }
    }

    // Update modifiers if provided
    if (modifiers) {
      await prisma.productModifier.deleteMany({ where: { productId: id } });
      if (modifiers.length > 0) {
        await prisma.productModifier.createMany({
          data: modifiers.map(m => ({ productId: id, ...m })),
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: productData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: true,
        modifiers: true,
        ingredients: {
          include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
        },
      },
    });

    return product;
  }

  // ==========================================
  // ADMIN: NARX YANGILASH (istalgan vaqtda)
  // ==========================================

  static async updatePrice(tenantId: string, id: string, price: number, costPrice?: number) {
    await this.getById(tenantId, id);

    return prisma.product.update({
      where: { id },
      data: {
        price,
        ...(costPrice !== undefined ? { costPrice } : {}),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  // ==========================================
  // ADMIN: MAHSULOTNI YOQISH/O'CHIRISH
  // ==========================================

  static async toggleActive(tenantId: string, id: string) {
    const product = await this.getById(tenantId, id);

    return prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  // ==========================================
  // BULK TOGGLE (ko'plab mahsulotni yoqish/o'chirish)
  // ==========================================

  static async bulkToggle(tenantId: string, productIds: string[], isActive: boolean) {
    const result = await prisma.product.updateMany({
      where: { id: { in: productIds }, tenantId },
      data: { isActive },
    });
    return { updated: result.count };
  }

  // ==========================================
  // BULK PRICE UPDATE
  // ==========================================

  static async bulkPriceUpdate(tenantId: string, updates: Array<{ productId: string; price: number; costPrice?: number }>) {
    const results: Array<{ id: string; name: string; price: number }> = [];
    for (const update of updates) {
      const product = await prisma.product.update({
        where: { id: update.productId, tenantId },
        data: {
          price: update.price,
          ...(update.costPrice !== undefined ? { costPrice: update.costPrice } : {}),
        },
      });
      results.push({ id: product.id, name: product.name, price: Number(product.price) });
    }
    return results;
  }

  // ==========================================
  // QR MENYU UCHUN — faqat online available mahsulotlar
  // ==========================================

  static async getQRMenuProducts(tenantId: string) {
    return prisma.product.findMany({
      where: { tenantId, isActive: true, isAvailableOnline: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { where: { isActive: true } },
        modifiers: { where: { isActive: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ==========================================
  // FEATURED PRODUCTS — tanlangan mahsulotlar
  // ==========================================

  static async getFeaturedProducts(tenantId: string) {
    return prisma.product.findMany({
      where: { tenantId, isActive: true, isFeatured: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ==========================================
  // SEARCH BY TAGS
  // ==========================================

  static async searchByTag(tenantId: string, tag: string) {
    return prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        tags: { has: tag },
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  // ==========================================
  // LOW STOCK PRODUCTS
  // ==========================================

  static async getLowStockProducts(tenantId: string) {
    // stockQuantity bor va lowStockAlert dan past bo'lgan mahsulotlar
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        trackStock: true,
        stockQuantity: { not: null },
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return products.filter(p =>
      p.stockQuantity !== null &&
      p.lowStockAlert !== null &&
      p.stockQuantity <= p.lowStockAlert
    );
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
