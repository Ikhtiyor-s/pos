import { z } from 'zod';

// ==========================================
// MXIK (Milliy Xalqaro Identifikatsion Kod) validatsiya
// 9 ta raqam (xizmatlar) yoki 14 ta raqam (tovarlar)
// QQS stavkasi: 0%, 12%, 20%
// ==========================================

const MXIK_REGEX  = /^\d{9}$|^\d{14}$/;
const VAT_RATES   = [0, 12, 20] as const;

const _baseProductSchema = z.object({
  // Majburiy fieldlar
  name: z.string({ required_error: 'Mahsulot nomi kiritilishi shart' })
    .min(2, "Nom kamida 2 ta belgidan iborat bo'lishi kerak"),
  price: z.number({ required_error: 'Narx kiritilishi shart' })
    .positive("Narx musbat bo'lishi kerak"),
  categoryId: z.string({ required_error: 'Kategoriya tanlanishi shart' }).uuid(),

  // Tillar
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionEn: z.string().optional(),

  // Narx
  costPrice: z.number().positive().optional(),

  // Rasmlar
  image: z.string().optional(),
  images: z.array(z.string()).optional(),

  // Xususiyatlar
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['g', 'kg', 'ml', 'l', 'dona']).optional(),
  cookingTime: z.number().int().positive().optional(),
  preparationTime: z.number().int().positive().optional(),
  calories: z.number().int().positive().optional(),

  // Zaxira
  stockQuantity: z.number().int().min(0).optional(),
  lowStockAlert: z.number().int().min(0).optional(),
  trackStock: z.boolean().optional(),

  // Holat
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().optional(),
  isAvailableOnline: z.boolean().default(true),

  // Teglar va barcode
  tags: z.array(z.string()).optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  sortOrder: z.number().int().optional(),

  // ── MXIK (O'zbekiston soliq tizimi) ──────────────────────────────────────
  // 9 raqam  — xizmatlar uchun (MXIK xizmat kodi)
  // 14 raqam — tovarlar uchun (IKPU — milliy tovar kodi)
  mxikCode: z
    .string()
    .regex(MXIK_REGEX, "MXIK kodi 9 yoki 14 ta raqamdan iborat bo'lishi kerak")
    .optional(),

  // QQS stavkasi: 0%, 12%, 20%
  mxikVatRate: z
    .number()
    .refine(
      (v): v is (typeof VAT_RATES)[number] => (VAT_RATES as readonly number[]).includes(v),
      { message: "QQS stavkasi 0%, 12% yoki 20% bo'lishi kerak" },
    )
    .optional(),
  // ─────────────────────────────────────────────────────────────────────────

  // Ingredientlar (inline yaratish)
  ingredients: z.array(z.object({
    inventoryItemId: z.string().uuid(),
    quantity: z.number().positive(),
  })).optional(),

  // Variantlar (inline yaratish)
  variants: z.array(z.object({
    name: z.string().min(1),
    nameRu: z.string().optional(),
    nameEn: z.string().optional(),
    price: z.number().positive(),
    isActive: z.boolean().default(true),
  })).optional(),

  // Modifierlar (inline yaratish)
  modifiers: z.array(z.object({
    name: z.string().min(1),
    nameRu: z.string().optional(),
    nameEn: z.string().optional(),
    price: z.number().min(0),
    isActive: z.boolean().default(true),
  })).optional(),
});

export const createProductSchema = _baseProductSchema.refine(
  data => {
    // mxikVatRate faqat mxikCode bilan birgalikda kiritilishi mumkin
    if (!data.mxikCode && data.mxikVatRate !== undefined) return false;
    return true;
  },
  {
    message: 'mxikVatRate faqat mxikCode bilan birgalikda kiritilishi mumkin',
    path: ['mxikVatRate'],
  },
);

export const updateProductSchema = _baseProductSchema.partial();

// Narx yangilash uchun alohida schema
export const updatePriceSchema = z.object({
  price: z.number().positive("Narx musbat bo'lishi kerak"),
  costPrice: z.number().positive().optional(),
});

// MXIK yangilash uchun alohida schema
export const updateMxikSchema = z.object({
  mxikCode: z
    .string()
    .regex(MXIK_REGEX, "MXIK kodi 9 yoki 14 ta raqamdan iborat bo'lishi kerak")
    .nullable(),
  mxikVatRate: z
    .number()
    .refine(
      (v): v is (typeof VAT_RATES)[number] => (VAT_RATES as readonly number[]).includes(v),
      { message: "QQS stavkasi 0%, 12% yoki 20% bo'lishi kerak" },
    )
    .nullable(),
});

// Bulk operatsiyalar
export const bulkToggleSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  isActive: z.boolean(),
});

export const bulkPriceUpdateSchema = z.object({
  updates: z.array(z.object({
    productId: z.string().uuid(),
    price: z.number().positive(),
    costPrice: z.number().positive().optional(),
  })).min(1),
});

export const createCategorySchema = z.object({
  name: z.string({ required_error: 'Kategoriya nomi kiritilishi shart' }).min(2),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  slug: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateMxikInput    = z.infer<typeof updateMxikSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
