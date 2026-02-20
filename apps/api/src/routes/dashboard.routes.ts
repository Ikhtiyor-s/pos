import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, requireTenant } from '../middleware/auth.js';

const router = Router();

// Dashboard barcha autentifikatsiya qilingan userlar uchun
router.use(authenticate);
router.use(requireTenant);

router.get('/', DashboardController.getDashboard);
router.get('/daily-sales', DashboardController.getDailySales);

export default router;
