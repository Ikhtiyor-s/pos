import { z } from 'zod';

// ============ PLAN SCHEMALAR ============

export const createPlanSchema = z.object({
  name: z.string({ required_error: 'Tarif nomi kiritilishi shart' }).min(2, 'Nom kamida 2 ta belgidan iborat bo\'lishi kerak'),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number({ required_error: 'Asosiy narx kiritilishi shart' }).min(0, 'Narx manfiy bo\'lishi mumkin emas'),
  pricePerWarehouse: z.number().min(0).default(0),
  pricePerKitchen: z.number().min(0).default(0),
  pricePerWaiter: z.number().min(0).default(0),
  maxUsers: z.number().int().min(1).default(5),
  maxOrders: z.number().int().min(0).default(0),
  maxWarehouses: z.number().int().min(0).default(1),
  maxKitchens: z.number().int().min(0).default(1),
  maxWaiters: z.number().int().min(0).default(2),
  hasIntegrations: z.boolean().default(false),
  hasReports: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updatePlanSchema = createPlanSchema.partial();

// ============ SUBSCRIPTION SCHEMALAR ============

export const createSubscriptionSchema = z.object({
  planId: z.string({ required_error: 'Tarif rejasi tanlanishi shart' }).uuid(),
  warehouses: z.number().int().min(0).optional(),
  kitchens: z.number().int().min(0).optional(),
  waiters: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  overridePrice: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateResourcesSchema = z.object({
  warehouses: z.number().int().min(0).optional(),
  kitchens: z.number().int().min(0).optional(),
  waiters: z.number().int().min(0).optional(),
});

export const overridePriceSchema = z.object({
  overridePrice: z.number().min(0).nullable(),
  notes: z.string().optional(),
});

// ============ INVOICE SCHEMALAR ============

export const generateInvoiceSchema = z.object({
  year: z.number().int().min(2024).max(2100),
  month: z.number().int().min(1).max(12),
  overrideAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const payInvoiceSchema = z.object({
  paidAmount: z.number({ required_error: 'To\'lov summasi kiritilishi shart' }).min(0),
  paymentMethod: z.string({ required_error: 'To\'lov usuli kiritilishi shart' }).min(1),
  notes: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============ TYPE EXPORTS ============

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateResourcesInput = z.infer<typeof updateResourcesSchema>;
export type OverridePriceInput = z.infer<typeof overridePriceSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
