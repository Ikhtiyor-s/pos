import { Router } from 'express';
import { authenticate, authorize } from '../../../middleware/auth.js';
import { inventoryForecastController } from './forecast.controller.js';

const router = Router();

router.use(authenticate);

// Dashboard — to'liq bashorat paneli
router.get('/dashboard', inventoryForecastController.getDashboard);

// Ingredient sarfini tahlil qilish
router.get('/consumption',
  authorize('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE', 'ACCOUNTANT'),
  inventoryForecastController.getConsumption
);

// Qachon tugashini bashorat qilish
router.get('/stockouts',
  authorize('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'),
  inventoryForecastController.getStockoutPredictions
);

// Xarid tavsiyalari
router.get('/purchase-recommendations',
  authorize('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'),
  inventoryForecastController.getPurchaseRecommendations
);

// Eng ko'p sarflanadigan ingredientlar
router.get('/top-ingredients',
  authorize('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE', 'CHEF'),
  inventoryForecastController.getTopIngredients
);

// Alertlar
router.post('/alerts/check',
  authorize('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'),
  inventoryForecastController.checkAlerts
);

router.get('/alerts',
  inventoryForecastController.getActiveAlerts
);

router.patch('/alerts/:id/resolve',
  authorize('SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'),
  inventoryForecastController.resolveAlert
);

router.get('/alerts/stats',
  inventoryForecastController.getAlertStats
);

export default router;
