import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);

// Dashboard quick stats (barcha rol)
router.get('/dashboard', ReportsController.dashboard);

// JSON data (eksportsiz, chart uchun)
router.get('/data/:reportType', ReportsController.getData);

// Hisobot yaratish va to'g'ridan-to'g'ri yuklab olish
// GET /reports/sales?type=daily&from=&to=&format=excel
// GET /reports/financial?from=&to=&format=pdf
// GET /reports/products?from=&to=&format=csv
// GET /reports/staff?from=&to=&format=excel
// GET /reports/warehouse?format=excel
// GET /reports/tax?from=&to=&format=excel
router.get(
  '/:reportType',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  ReportsController.generate,
);

// Saqlangan hisobotlar ro'yxati
router.get(
  '/export/history',
  ReportsController.history,
);

// Saqlangan hisobotni qayta yuklab olish
router.get(
  '/export/:reportId/download',
  ReportsController.download,
);

// Hisobotni o'chirish
router.delete(
  '/export/:reportId',
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  ReportsController.remove,
);

export default router;
