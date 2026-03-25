import { z } from 'zod';

// ============ BRANCH (FILLIAL) SCHEMALAR ============

export const createBranchSchema = z.object({
  name: z.string({ required_error: 'Fillial nomi kiritilishi shart' }).min(2, 'Nom kamida 2 ta belgidan iborat bo\'lishi kerak'),
  slug: z.string({ required_error: 'Slug kiritilishi shart' })
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug faqat kichik harflar, raqamlar va tire bo\'lishi mumkin'),
  phone: z.string().optional(),
  address: z.string().optional(),
  managerEmail: z.string({ required_error: 'Menejer emaili kiritilishi shart' }).email('Yaroqli email kiriting'),
  managerPassword: z.string({ required_error: 'Menejer paroli kiritilishi shart' }).min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
  managerFirstName: z.string({ required_error: 'Menejer ismi kiritilishi shart' }).min(1),
  managerLastName: z.string({ required_error: 'Menejer familiyasi kiritilishi shart' }).min(1),
  managerPhone: z.string().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export const branchQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============ DASHBOARD SCHEMALAR ============

export const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year']).default('today'),
  branchId: z.string().uuid().optional(),
});

// ============ TYPE EXPORTS ============

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type BranchQueryInput = z.infer<typeof branchQuerySchema>;
export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;
