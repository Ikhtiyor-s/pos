import { z } from 'zod';

// ==========================================
// EXPENSE CATEGORIES
// ==========================================

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Nomi majburiy'),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const updateExpenseCategorySchema = z.object({
  name: z.string().min(1).optional(),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// EXPENSES
// ==========================================

export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Sarlavha majburiy'),
  description: z.string().optional(),
  amount: z.number().positive('Summa musbat bo\'lishi kerak'),
  categoryId: z.string().uuid('Kategoriya ID noto\'g\'ri'),
  receiptUrl: z.string().url().optional(),
});

export const getExpensesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PAID']),
});

export const getExpenseSummaryQuerySchema = z.object({
  dateFrom: z.string().min(1, 'Boshlanish sanasi majburiy'),
  dateTo: z.string().min(1, 'Tugash sanasi majburiy'),
});

// ==========================================
// INCOMES
// ==========================================

export const recordIncomeSchema = z.object({
  source: z.enum(['ORDER', 'REFUND', 'BONUS', 'OTHER']).default('OTHER'),
  amount: z.number().positive('Summa musbat bo\'lishi kerak'),
  orderId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const getIncomesQuerySchema = z.object({
  source: z.enum(['ORDER', 'REFUND', 'BONUS', 'OTHER']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ==========================================
// CASH REGISTER
// ==========================================

export const openCashRegisterSchema = z.object({
  openingCash: z.number().min(0, 'Boshlang\'ich kassa summasi 0 dan kam bo\'lmasligi kerak'),
});

export const closeCashRegisterSchema = z.object({
  closingCash: z.number().min(0, 'Yopish summasi 0 dan kam bo\'lmasligi kerak'),
  notes: z.string().optional(),
});

export const updateCashRegisterTotalsSchema = z.object({
  totalCash: z.number().min(0).optional(),
  totalCard: z.number().min(0).optional(),
  totalOnline: z.number().min(0).optional(),
  totalOrders: z.number().int().min(0).optional(),
  totalRefunds: z.number().min(0).optional(),
});

export const getCashRegisterHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// ==========================================
// REPORTS
// ==========================================

export const generateReportSchema = z.object({
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  date: z.string().optional(),
  weekStart: z.string().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const getReportsQuerySchema = z.object({
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const getProfitLossQuerySchema = z.object({
  dateFrom: z.string().min(1, 'Boshlanish sanasi majburiy'),
  dateTo: z.string().min(1, 'Tugash sanasi majburiy'),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseStatusInput = z.infer<typeof updateExpenseStatusSchema>;
export type RecordIncomeInput = z.infer<typeof recordIncomeSchema>;
export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
export type UpdateCashRegisterTotalsInput = z.infer<typeof updateCashRegisterTotalsSchema>;
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
