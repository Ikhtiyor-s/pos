import { prisma } from '@oshxona/database';
import { Prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';
import type {
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseStatusInput,
  RecordIncomeInput,
  OpenCashRegisterInput,
  CloseCashRegisterInput,
  UpdateCashRegisterTotalsInput,
} from './finance.validator.js';

export class FinanceService {
  // ==========================================
  // EXPENSE CATEGORIES
  // ==========================================

  static async createExpenseCategory(
    data: CreateExpenseCategoryInput & { tenantId: string }
  ) {
    return prisma.expenseCategory.create({
      data: {
        name: data.name,
        nameRu: data.nameRu,
        nameEn: data.nameEn,
        icon: data.icon,
        color: data.color,
        tenantId: data.tenantId,
      },
    });
  }

  static async getExpenseCategories(tenantId: string) {
    return prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  static async updateExpenseCategory(
    id: string,
    data: UpdateExpenseCategoryInput,
    tenantId: string
  ) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new AppError('Xarajat kategoriyasi topilmadi', 404);
    }

    return prisma.expenseCategory.update({
      where: { id },
      data,
    });
  }

  static async deleteExpenseCategory(id: string, tenantId: string) {
    const category = await prisma.expenseCategory.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new AppError('Xarajat kategoriyasi topilmadi', 404);
    }

    // Soft delete — isActive = false
    return prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  static async createExpense(
    data: CreateExpenseInput & { userId: string; tenantId: string }
  ) {
    // Verify category belongs to tenant
    const category = await prisma.expenseCategory.findFirst({
      where: { id: data.categoryId, tenantId: data.tenantId, isActive: true },
    });

    if (!category) {
      throw new AppError('Xarajat kategoriyasi topilmadi', 404);
    }

    return prisma.expense.create({
      data: {
        title: data.title,
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId,
        receiptUrl: data.receiptUrl,
        userId: data.userId,
        tenantId: data.tenantId,
      },
      include: {
        category: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async getExpenses(
    tenantId: string,
    options: {
      status?: string;
      categoryId?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      limit: number;
    }
  ) {
    const { page, limit, status, categoryId, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = { tenantId };

    if (status) where.status = status as any;
    if (categoryId) where.categoryId = categoryId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total, page, limit };
  }

  static async getExpenseById(id: string, tenantId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!expense) {
      throw new AppError('Xarajat topilmadi', 404);
    }

    return expense;
  }

  static async updateExpenseStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'PAID',
    tenantId: string
  ) {
    const expense = await prisma.expense.findFirst({
      where: { id, tenantId },
    });

    if (!expense) {
      throw new AppError('Xarajat topilmadi', 404);
    }

    const updateData: Prisma.ExpenseUpdateInput = { status };
    if (status === 'PAID') {
      updateData.paidAt = new Date();
    }

    return prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async getExpenseSummary(
    tenantId: string,
    dateFrom: string,
    dateTo: string
  ) {
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      include: {
        category: {
          select: { id: true, name: true, nameRu: true, nameEn: true, icon: true, color: true },
        },
      },
    });

    // Group by category
    const categoryMap = new Map<
      string,
      { category: any; total: number; count: number }
    >();

    for (const expense of expenses) {
      const catId = expense.categoryId;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category: expense.category,
          total: 0,
          count: 0,
        });
      }
      const entry = categoryMap.get(catId)!;
      entry.total += Number(expense.amount);
      entry.count += 1;
    }

    const byCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total
    );

    const grandTotal = byCategory.reduce((sum, item) => sum + item.total, 0);

    return {
      grandTotal,
      totalCount: expenses.length,
      byCategory,
      dateFrom,
      dateTo,
    };
  }

  // ==========================================
  // INCOMES
  // ==========================================

  static async recordIncome(data: RecordIncomeInput & { tenantId: string }) {
    return prisma.income.create({
      data: {
        source: data.source,
        amount: data.amount,
        orderId: data.orderId,
        notes: data.notes,
        tenantId: data.tenantId,
      },
    });
  }

  static async getIncomes(
    tenantId: string,
    options: {
      source?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      limit: number;
    }
  ) {
    const { page, limit, source, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.IncomeWhereInput = { tenantId };

    if (source) where.source = source as any;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.income.count({ where }),
    ]);

    return { incomes, total, page, limit };
  }

  // ==========================================
  // CASH REGISTER
  // ==========================================

  static async openCashRegister(data: {
    userId: string;
    openingCash: number;
    tenantId: string;
  }) {
    // Check if user already has an open register
    const existingOpen = await prisma.cashRegister.findFirst({
      where: {
        userId: data.userId,
        tenantId: data.tenantId,
        closedAt: null,
      },
    });

    if (existingOpen) {
      throw new AppError('Sizda allaqachon ochiq kassa mavjud', 400);
    }

    return prisma.cashRegister.create({
      data: {
        userId: data.userId,
        openingCash: data.openingCash,
        tenantId: data.tenantId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async closeCashRegister(
    id: string,
    closingCash: number,
    tenantId: string,
    notes?: string
  ) {
    const register = await prisma.cashRegister.findFirst({
      where: { id, tenantId, closedAt: null },
    });

    if (!register) {
      throw new AppError('Ochiq kassa topilmadi', 404);
    }

    // Calculate expected cash: opening + totalCash - totalRefunds
    const expectedCash =
      Number(register.openingCash) +
      Number(register.totalCash) -
      Number(register.totalRefunds);
    const difference = closingCash - expectedCash;

    return prisma.cashRegister.update({
      where: { id },
      data: {
        closingCash,
        closedAt: new Date(),
        difference,
        notes,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  static async getActiveCashRegister(userId: string, tenantId: string) {
    const register = await prisma.cashRegister.findFirst({
      where: {
        userId,
        tenantId,
        closedAt: null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return register;
  }

  static async updateCashRegisterTotals(
    id: string,
    data: UpdateCashRegisterTotalsInput
  ) {
    return prisma.cashRegister.update({
      where: { id },
      data: {
        ...(data.totalCash !== undefined && { totalCash: data.totalCash }),
        ...(data.totalCard !== undefined && { totalCard: data.totalCard }),
        ...(data.totalOnline !== undefined && { totalOnline: data.totalOnline }),
        ...(data.totalOrders !== undefined && { totalOrders: data.totalOrders }),
        ...(data.totalRefunds !== undefined && { totalRefunds: data.totalRefunds }),
      },
    });
  }

  static async getCashRegisterHistory(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const { page, limit, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.CashRegisterWhereInput = { tenantId };

    if (dateFrom || dateTo) {
      where.openedAt = {};
      if (dateFrom) where.openedAt.gte = new Date(dateFrom);
      if (dateTo) where.openedAt.lte = new Date(dateTo);
    }

    const [registers, total] = await Promise.all([
      prisma.cashRegister.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cashRegister.count({ where }),
    ]);

    return { registers, total, page, limit };
  }

  // ==========================================
  // FINANCIAL REPORTS
  // ==========================================

  static async generateDailyReport(tenantId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.generateReport(tenantId, 'DAILY', dayStart, dayEnd);
  }

  static async generateWeeklyReport(tenantId: string, weekStart: string) {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return this.generateReport(tenantId, 'WEEKLY', start, end);
  }

  static async generateMonthlyReport(
    tenantId: string,
    year: number,
    month: number
  ) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    return this.generateReport(tenantId, 'MONTHLY', start, end);
  }

  private static async generateReport(
    tenantId: string,
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    periodStart: Date,
    periodEnd: Date
  ) {
    // Get revenue from completed orders
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        total: true,
      },
    });

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );
    const orderCount = orders.length;
    const averageCheck = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { amount: true },
    });

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );
    const totalProfit = totalRevenue - totalExpenses;

    // Upsert report
    const report = await prisma.financialReport.upsert({
      where: {
        tenantId_period_periodStart: {
          tenantId,
          period,
          periodStart,
        },
      },
      update: {
        periodEnd,
        totalRevenue,
        totalExpenses,
        totalProfit,
        orderCount,
        averageCheck,
        data: {
          generatedAt: new Date().toISOString(),
          revenueBreakdown: { orders: totalRevenue },
          expenseCount: expenses.length,
        },
      },
      create: {
        tenantId,
        period,
        periodStart,
        periodEnd,
        totalRevenue,
        totalExpenses,
        totalProfit,
        orderCount,
        averageCheck,
        data: {
          generatedAt: new Date().toISOString(),
          revenueBreakdown: { orders: totalRevenue },
          expenseCount: expenses.length,
        },
      },
    });

    return report;
  }

  static async getFinancialReports(
    tenantId: string,
    options: {
      period?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      limit: number;
    }
  ) {
    const { page, limit, period, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialReportWhereInput = { tenantId };

    if (period) where.period = period as any;

    if (dateFrom || dateTo) {
      where.periodStart = {};
      if (dateFrom) where.periodStart.gte = new Date(dateFrom);
      if (dateTo) where.periodStart.lte = new Date(dateTo);
    }

    const [reports, total] = await Promise.all([
      prisma.financialReport.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financialReport.count({ where }),
    ]);

    return { reports, total, page, limit };
  }

  static async getProfitLoss(
    tenantId: string,
    dateFrom: string,
    dateTo: string
  ) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);

    // Revenue from completed orders
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      select: { total: true },
    });

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );

    // Incomes (non-order sources)
    const incomes = await prisma.income.findMany({
      where: {
        tenantId,
        source: { not: 'ORDER' },
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, source: true },
    });

    const otherIncome = incomes.reduce(
      (sum, i) => sum + Number(i.amount),
      0
    );

    // Expenses (approved/paid)
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        createdAt: { gte: start, lte: end },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    // Expense breakdown by category
    const expenseByCategory = new Map<
      string,
      { categoryId: string; categoryName: string; total: number }
    >();

    for (const expense of expenses) {
      const catId = expense.categoryId;
      if (!expenseByCategory.has(catId)) {
        expenseByCategory.set(catId, {
          categoryId: catId,
          categoryName: expense.category.name,
          total: 0,
        });
      }
      expenseByCategory.get(catId)!.total += Number(expense.amount);
    }

    const grossRevenue = totalRevenue + otherIncome;
    const netProfit = grossRevenue - totalExpenses;

    return {
      dateFrom,
      dateTo,
      revenue: {
        orderRevenue: totalRevenue,
        otherIncome,
        grossRevenue,
      },
      expenses: {
        totalExpenses,
        byCategory: Array.from(expenseByCategory.values()),
      },
      netProfit,
      orderCount: orders.length,
    };
  }
}
