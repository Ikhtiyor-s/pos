import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.js';
import { kitchenAnalyticsController } from './kitchen-analytics.controller.js';

const router = Router();

// Barcha route lar authenticate talab qiladi
router.use(authenticate);

// Dashboard — barcha rollar ko'ra oladi
router.get('/dashboard', kitchenAnalyticsController.getDashboard);

// Cooking times — admin, manager, chef
router.get('/cooking-times',
  authorize('SUPER_ADMIN', 'MANAGER', 'CHEF'),
  kitchenAnalyticsController.getCookingTimes
);

// Hourly load — admin, manager
router.get('/hourly-load',
  authorize('SUPER_ADMIN', 'MANAGER', 'CHEF'),
  kitchenAnalyticsController.getHourlyLoad
);

// Queue delays — admin, manager
router.get('/queue-delays',
  authorize('SUPER_ADMIN', 'MANAGER', 'CHEF'),
  kitchenAnalyticsController.getQueueDelays
);

// Performance score — admin, manager
router.get('/performance',
  authorize('SUPER_ADMIN', 'MANAGER', 'CHEF'),
  kitchenAnalyticsController.getPerformanceScore
);

// AI Insights — admin, manager, chef
router.get('/insights',
  authorize('SUPER_ADMIN', 'MANAGER', 'CHEF'),
  kitchenAnalyticsController.getInsights
);

export default router;
