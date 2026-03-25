import { Router } from 'express';
import { DeliveryController } from './delivery.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Barcha routelar himoyalangan
router.use(authenticate);

// ==========================================
// DRIVERS (Haydovchilar)
// ==========================================

router.post('/drivers', DeliveryController.createDriver);
router.get('/drivers', DeliveryController.getDrivers);
router.patch('/drivers/:id/status', DeliveryController.updateDriverStatus);

// ==========================================
// DELIVERIES (Yetkazib berishlar)
// ==========================================

router.post('/', DeliveryController.createDelivery);
router.get('/', DeliveryController.getDeliveries);
router.get('/active', DeliveryController.getActiveDeliveries);
router.get('/stats', DeliveryController.getStats);
router.get('/:id', DeliveryController.getDeliveryById);

// ==========================================
// STATUS TRANSITIONS
// ==========================================

router.patch('/:id/assign', DeliveryController.assignDriver);
router.patch('/:id/pickup', DeliveryController.pickUp);
router.patch('/:id/transit', DeliveryController.inTransit);
router.patch('/:id/delivered', DeliveryController.delivered);
router.patch('/:id/failed', DeliveryController.failed);

export default router;
