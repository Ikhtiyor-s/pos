import { Request, Response, NextFunction } from 'express';
import { FinanceService } from './finance.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseStatusSchema,
  getExpensesQuerySchema,
  getExpenseSummaryQuerySchema,
  recordIncomeSchema,
  getIncomesQuerySchema,
  openCashRegisterSchema,
  closeCashRegisterSchema,
  updateCashRegisterTotalsSchema,
  getCashRegisterHistoryQuerySchema,
  generateReportSchema,
  getReportsQuerySchema,
  getProfitLossQuerySchema,
} from './finance.validator.js';

export class FinanceController {
  // ==========================================
  // EXPENSE CATEGORIES
  // ==========================================

  static async createExpenseCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createExpenseCategorySchema.parse(req.body);

      const category = await FinanceService.createExpenseCategory({
        ...data,
        tenantId,
      });

      return successResponse(res, category, 'Kategoriya yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getExpenseCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const categories = await FinanceService.getExpenseCategories(tenantId);
      return successResponse(res, categories);
    } catch (error) {
      next(error);
    }
  }

  static async updateExpenseCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateExpenseCategorySchema.parse(req.body);

      const category = await FinanceService.updateExpenseCategory(
        req.params.id,
        data,
        tenantId
      );

      return successResponse(res, category, 'Kategoriya yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpenseCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;

      await FinanceService.deleteExpenseCategory(req.params.id, tenantId);

      return successResponse(res, null, 'Kategoriya o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // EXPENSES
  // ==========================================

  static async createExpense(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const data = createExpenseSchema.parse(req.body);

      const expense = await FinanceService.createExpense({
        ...data,
        userId,
        tenantId,
      });

      return successResponse(res, expense, 'Xarajat yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getExpenses(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getExpensesQuerySchema.parse(req.query);

      const result = await FinanceService.getExpenses(tenantId, query);

      return paginatedResponse(
        res,
        result.expenses,
        result.page,
        result.limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  static async getExpenseById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const expense = await FinanceService.getExpenseById(
        req.params.id,
        tenantId
      );
      return successResponse(res, expense);
    } catch (error) {
      next(error);
    }
  }

  static async updateExpenseStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updateExpenseStatusSchema.parse(req.body);

      const expense = await FinanceService.updateExpenseStatus(
        req.params.id,
        status,
        tenantId
      );

      return successResponse(res, expense, 'Xarajat holati yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async getExpenseSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const { dateFrom, dateTo } = getExpenseSummaryQuerySchema.parse(
        req.query
      );

      const summary = await FinanceService.getExpenseSummary(
        tenantId,
        dateFrom,
        dateTo
      );

      return successResponse(res, summary);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // INCOMES
  // ==========================================

  static async recordIncome(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = recordIncomeSchema.parse(req.body);

      const income = await FinanceService.recordIncome({
        ...data,
        tenantId,
      });

      return successResponse(res, income, 'Daromad qayd etildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getIncomes(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getIncomesQuerySchema.parse(req.query);

      const result = await FinanceService.getIncomes(tenantId, query);

      return paginatedResponse(
        res,
        result.incomes,
        result.page,
        result.limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CASH REGISTER
  // ==========================================

  static async openCashRegister(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const { openingCash } = openCashRegisterSchema.parse(req.body);

      const register = await FinanceService.openCashRegister({
        userId,
        openingCash,
        tenantId,
      });

      return successResponse(res, register, 'Kassa ochildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async closeCashRegister(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const { closingCash, notes } = closeCashRegisterSchema.parse(req.body);

      const register = await FinanceService.closeCashRegister(
        req.params.id,
        closingCash,
        tenantId,
        notes
      );

      return successResponse(res, register, 'Kassa yopildi');
    } catch (error) {
      next(error);
    }
  }

  static async getActiveCashRegister(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;

      const register = await FinanceService.getActiveCashRegister(
        userId,
        tenantId
      );

      return successResponse(res, register);
    } catch (error) {
      next(error);
    }
  }

  static async updateCashRegisterTotals(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = updateCashRegisterTotalsSchema.parse(req.body);

      const register = await FinanceService.updateCashRegisterTotals(
        req.params.id,
        data
      );

      return successResponse(res, register, 'Kassa ma\'lumotlari yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async getCashRegisterHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getCashRegisterHistoryQuerySchema.parse(req.query);

      const result = await FinanceService.getCashRegisterHistory(
        tenantId,
        query
      );

      return paginatedResponse(
        res,
        result.registers,
        result.page,
        result.limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FINANCIAL REPORTS
  // ==========================================

  static async generateReport(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = generateReportSchema.parse(req.body);

      let report;

      switch (data.period) {
        case 'DAILY':
          if (!data.date) {
            return res.status(400).json({
              success: false,
              message: 'Kunlik hisobot uchun sana (date) majburiy',
            });
          }
          report = await FinanceService.generateDailyReport(
            tenantId,
            data.date
          );
          break;

        case 'WEEKLY':
          if (!data.weekStart) {
            return res.status(400).json({
              success: false,
              message: 'Haftalik hisobot uchun hafta boshi (weekStart) majburiy',
            });
          }
          report = await FinanceService.generateWeeklyReport(
            tenantId,
            data.weekStart
          );
          break;

        case 'MONTHLY':
          if (!data.year || !data.month) {
            return res.status(400).json({
              success: false,
              message: 'Oylik hisobot uchun yil (year) va oy (month) majburiy',
            });
          }
          report = await FinanceService.generateMonthlyReport(
            tenantId,
            data.year,
            data.month
          );
          break;
      }

      return successResponse(res, report, 'Hisobot yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getFinancialReports(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getReportsQuerySchema.parse(req.query);

      const result = await FinanceService.getFinancialReports(
        tenantId,
        query
      );

      return paginatedResponse(
        res,
        result.reports,
        result.page,
        result.limit,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  static async getProfitLoss(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user!.tenantId!;
      const { dateFrom, dateTo } = getProfitLossQuerySchema.parse(req.query);

      const result = await FinanceService.getProfitLoss(
        tenantId,
        dateFrom,
        dateTo
      );

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
