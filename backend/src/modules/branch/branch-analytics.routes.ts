import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { BranchAnalyticsController } from './branch-analytics.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SUPER_ADMIN', 'MANAGER'));

// To'liq filliallar dashboard
router.get('/dashboard', BranchAnalyticsController.getDashboard);

// Barcha filliallar statistikasi
router.get('/stats', BranchAnalyticsController.getAllStats);

// Filliallarni taqqoslash
router.get('/compare', BranchAnalyticsController.compare);

// Bitta fillial tafsiloti
router.get('/:branchId', BranchAnalyticsController.getBranchDetail);

export default router;
