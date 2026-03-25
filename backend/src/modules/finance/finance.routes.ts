import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';
import accountingRoutes from './accounting/accounting.routes.js';

const router = Router();

// Financial Accounting sub-routes (o'z authi bor)
router.use('/accounting', accountingRoutes);

// All finance routes require authentication
router.use(authenticate);

// ==========================================
// EXPENSE CATEGORIES
// ==========================================

router.get(
  '/expense-categories',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.getExpenseCategories
);

router.post(
  '/expense-categories',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.createExpenseCategory
);

router.put(
  '/expense-categories/:id',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.updateExpenseCategory
);

router.delete(
  '/expense-categories/:id',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.deleteExpenseCategory
);

// ==========================================
// EXPENSES
// ==========================================

// NOTE: /expenses/summary must come before /expenses/:id to avoid route conflict
router.get(
  '/expenses/summary',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.WAREHOUSE, Role.SUPER_ADMIN),
  FinanceController.getExpenseSummary
);

router.get(
  '/expenses',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.WAREHOUSE, Role.SUPER_ADMIN),
  FinanceController.getExpenses
);

router.get(
  '/expenses/:id',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.WAREHOUSE, Role.SUPER_ADMIN),
  FinanceController.getExpenseById
);

router.post(
  '/expenses',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.WAREHOUSE, Role.SUPER_ADMIN),
  FinanceController.createExpense
);

router.patch(
  '/expenses/:id/status',
  authorize(Role.MANAGER, Role.SUPER_ADMIN),
  FinanceController.updateExpenseStatus
);

// ==========================================
// INCOMES
// ==========================================

router.get(
  '/incomes',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.getIncomes
);

router.post(
  '/incomes',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.recordIncome
);

// ==========================================
// CASH REGISTER
// ==========================================

router.get(
  '/cash-register/active',
  FinanceController.getActiveCashRegister
);

router.post(
  '/cash-register/open',
  authorize(Role.CASHIER, Role.MANAGER, Role.SUPER_ADMIN),
  FinanceController.openCashRegister
);

router.post(
  '/cash-register/:id/close',
  authorize(Role.CASHIER, Role.MANAGER, Role.SUPER_ADMIN),
  FinanceController.closeCashRegister
);

router.patch(
  '/cash-register/:id/totals',
  authorize(Role.CASHIER, Role.MANAGER, Role.SUPER_ADMIN),
  FinanceController.updateCashRegisterTotals
);

router.get(
  '/cash-register/history',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.getCashRegisterHistory
);

// ==========================================
// FINANCIAL REPORTS
// ==========================================

router.get(
  '/reports',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.getFinancialReports
);

router.post(
  '/reports/generate',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.generateReport
);

router.get(
  '/reports/profit-loss',
  authorize(Role.MANAGER, Role.ACCOUNTANT, Role.SUPER_ADMIN),
  FinanceController.getProfitLoss
);

export default router;
