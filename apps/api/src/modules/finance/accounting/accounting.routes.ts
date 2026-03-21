import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.js';
import { AccountingController } from './accounting.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'));

// To'liq moliyaviy dashboard
router.get('/dashboard', AccountingController.getDashboard);

// Sotuv — source bo'yicha (POS vs Nonbor vs boshqa)
router.get('/sales-by-source', AccountingController.getSalesBySource);

// Qaytarishlar
router.get('/refunds', AccountingController.getRefunds);

// Ingredient xarajatlari
router.get('/ingredient-cost', AccountingController.getIngredientCost);

// Source-separated P&L hisobot
router.get('/pnl', AccountingController.getProfitAndLoss);

export default router;
