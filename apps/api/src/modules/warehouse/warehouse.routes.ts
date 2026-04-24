import { Router } from 'express';
import { WarehouseController } from './warehouse.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';
import forecastRoutes from './inventory-forecast/forecast.routes.js';

const router = Router();

router.use('/forecast', forecastRoutes);

router.use(authenticate);
router.use(authorize(Role.WAREHOUSE, Role.MANAGER, Role.SUPER_ADMIN));

// ==========================================
// SUPPLIERS (Yetkazib beruvchilar)
// ==========================================

router.get('/suppliers',     WarehouseController.getSuppliers);
router.get('/suppliers/:id', WarehouseController.getSupplierById);
router.post('/suppliers',    WarehouseController.createSupplier);
router.put('/suppliers/:id', WarehouseController.updateSupplier);
router.delete('/suppliers/:id', authorize(Role.MANAGER, Role.SUPER_ADMIN), WarehouseController.deleteSupplier);

// ==========================================
// PURCHASE ORDERS (Xarid buyurtmalari)
// ==========================================

router.get('/purchase-orders',              WarehouseController.getPurchaseOrders);
router.get('/purchase-orders/:id',          WarehouseController.getPurchaseOrderById);
router.post('/purchase-orders',             WarehouseController.createPurchaseOrder);
router.patch('/purchase-orders/:id/status', WarehouseController.updatePurchaseOrderStatus);
router.post('/purchase-orders/:id/receive', WarehouseController.receivePurchaseOrder);

// ==========================================
// STOCK ALERTS
// ==========================================

router.get('/stock-alerts',          WarehouseController.getStockAlerts);
router.post('/stock-alerts/check',   WarehouseController.checkStockAlerts);
router.patch('/stock-alerts/:id/resolve', WarehouseController.resolveStockAlert);

// ==========================================
// WASTE LOGS (Isrof jurnali)
// ==========================================

router.get('/waste-logs',    WarehouseController.getWasteLogs);
router.post('/waste-logs',   WarehouseController.createWasteLog);
router.get('/waste-report',  WarehouseController.getWasteReport);

// ==========================================
// HISOBOTLAR
// ==========================================

router.get('/reports/monthly-turnover', WarehouseController.getMonthlyTurnover);

export default router;
