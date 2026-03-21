import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { AnalyticsController } from './analytics.controller.js';
import kitchenRoutes from './kitchen/kitchen-analytics.routes.js';
import advancedDashboardRoutes from './advanced-dashboard/dashboard.routes.js';
import { OrderSourceAnalyticsController } from './order-source-analytics.controller.js';

const router = Router();

// Sub-module routes
router.use('/kitchen', kitchenRoutes);
router.use('/advanced', advancedDashboardRoutes);

// ==========================================
// ORDER SOURCE ANALYTICS
// ==========================================

router.get('/sources/dashboard', authenticate, OrderSourceAnalyticsController.getDashboard);
router.get('/sources/stats', authenticate, authorize('SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'), OrderSourceAnalyticsController.getStats);
router.get('/sources/trends', authenticate, authorize('SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'), OrderSourceAnalyticsController.getTrends);
router.get('/sources/comparison', authenticate, authorize('SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'), OrderSourceAnalyticsController.getComparison);
router.get('/sources/hourly', authenticate, authorize('SUPER_ADMIN', 'MANAGER'), OrderSourceAnalyticsController.getHourly);

// ==========================================
// DASHBOARD
// ==========================================

router.get(
  '/dashboard',
  authenticate,
  AnalyticsController.getDashboardAnalytics
);

// ==========================================
// SNAPSHOTS
// ==========================================

router.get(
  '/snapshots',
  authenticate,
  authorize('MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'),
  AnalyticsController.getSnapshots
);

router.post(
  '/snapshots/generate',
  authenticate,
  AnalyticsController.createDailySnapshot
);

// ==========================================
// FORECASTS
// ==========================================

router.get(
  '/forecasts',
  authenticate,
  AnalyticsController.getForecasts
);

router.post(
  '/forecasts/demand',
  authenticate,
  AnalyticsController.generateDemandForecast
);

router.post(
  '/forecasts/revenue',
  authenticate,
  AnalyticsController.generateRevenueForecast
);

router.post(
  '/forecasts/inventory',
  authenticate,
  AnalyticsController.generateInventoryForecast
);

router.get(
  '/forecasts/accuracy',
  authenticate,
  AnalyticsController.evaluateForecasts
);

// ==========================================
// ANOMALIES
// ==========================================

router.get(
  '/anomalies',
  authenticate,
  AnalyticsController.getAnomalies
);

router.post(
  '/anomalies/detect',
  authenticate,
  AnalyticsController.detectAnomalies
);

// ==========================================
// RECOMMENDATIONS
// ==========================================

router.get(
  '/recommendations/menu',
  authenticate,
  AnalyticsController.getMenuRecommendations
);

router.get(
  '/recommendations/inventory',
  authenticate,
  AnalyticsController.getInventoryRecommendations
);

router.get(
  '/recommendations/pricing',
  authenticate,
  AnalyticsController.getPricingRecommendations
);

export default router;
