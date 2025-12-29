import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string({ required_error: 'Mahsulot nomi kiritilishi shart' }).min(2),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  price: z.number({ required_error: 'Narx kiritilishi shart' }).positive('Narx musbat bo\'lishi kerak'),
  costPrice: z.number().positive().optional(),
  categoryId: z.string({ required_error: 'Kategoriya tanlanishi shart' }).uuid(),
  cookingTime: z.number().int().positive().optional(),
  calories: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

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
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
