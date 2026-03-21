import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.js';
import { AdvancedDashboardController } from './dashboard.controller.js';

const router = Router();

router.use(authenticate);

// To'liq dashboard (barcha ma'lumotlar)
router.get('/', AdvancedDashboardController.getFullDashboard);

// Revenue metrics
router.get('/revenue', AdvancedDashboardController.getRevenue);

// Eng foydali taomlar
router.get('/profitable-dishes',
  authorize('SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'),
  AdvancedDashboardController.getProfitableDishes
);

// Stol aylanishi
router.get('/table-turnover',
  authorize('SUPER_ADMIN', 'MANAGER'),
  AdvancedDashboardController.getTableTurnover
);

// Xodim samaradorligi
router.get('/staff-productivity',
  authorize('SUPER_ADMIN', 'MANAGER'),
  AdvancedDashboardController.getStaffProductivity
);

// Charts
router.get('/charts/daily-sales', AdvancedDashboardController.getDailySalesChart);
router.get('/charts/weekly-sales', AdvancedDashboardController.getWeeklySalesChart);
router.get('/charts/monthly-sales', AdvancedDashboardController.getMonthlySalesChart);
router.get('/charts/category-sales', AdvancedDashboardController.getCategorySales);
router.get('/charts/peak-hours', AdvancedDashboardController.getPeakHours);

export default router;
