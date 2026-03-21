import { Router } from 'express';
import { WarehouseController } from './warehouse.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';
import forecastRoutes from './inventory-forecast/forecast.routes.js';

const router = Router();

// AI Inventory Forecast sub-routes (o'z authi bor)
router.use('/forecast', forecastRoutes);

// Barcha routelar himoyalangan
router.use(authenticate);
router.use(authorize(Role.WAREHOUSE, Role.MANAGER, Role.SUPER_ADMIN));

// ==========================================
// PURCHASE ORDERS (Xarid buyurtmalari)
// ==========================================

router.get('/purchase-orders', WarehouseController.getPurchaseOrders);
router.get('/purchase-orders/:id', WarehouseController.getPurchaseOrderById);
router.post('/purchase-orders', WarehouseController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', WarehouseController.updatePurchaseOrderStatus);
router.post('/purchase-orders/:id/receive', WarehouseController.receivePurchaseOrder);

// ==========================================
// STOCK ALERTS (Kam qolgan mahsulot ogohlantirishlari)
// ==========================================

router.get('/stock-alerts', WarehouseController.getStockAlerts);
router.post('/stock-alerts/check', WarehouseController.checkStockAlerts);
router.patch('/stock-alerts/:id/resolve', WarehouseController.resolveStockAlert);

// ==========================================
// WASTE LOGS (Yo'qotishlar)
// ==========================================

router.get('/waste-logs', WarehouseController.getWasteLogs);
router.post('/waste-logs', WarehouseController.createWasteLog);
router.get('/waste-report', WarehouseController.getWasteReport);

export default router;
