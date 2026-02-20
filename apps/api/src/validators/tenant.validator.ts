import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string({ required_error: 'Restoran nomi kiritilishi shart' }).min(2),
  slug: z.string({ required_error: 'Slug kiritilishi shart' })
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug faqat kichik harflar, raqamlar va tire bo\'lishi mumkin'),
  domain: z.string().optional(),
  logo: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  // Admin user ma'lumotlari
  adminEmail: z.string({ required_error: 'Admin email kiritilishi shart' }).email(),
  adminPassword: z.string({ required_error: 'Admin parol kiritilishi shart' }).min(6),
  adminFirstName: z.string({ required_error: 'Admin ismi kiritilishi shart' }).min(1),
  adminLastName: z.string({ required_error: 'Admin familiyasi kiritilishi shart' }).min(1),
  adminPhone: z.string().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const tenantQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type TenantQueryInput = z.infer<typeof tenantQuerySchema>;
