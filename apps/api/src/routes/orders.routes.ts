import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Get all orders (admin, manager, cashier)
router.get(
  '/',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.ACCOUNTANT),
  OrderController.getAll
);

// Get kitchen orders (for chefs)
router.get(
  '/kitchen',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CHEF),
  OrderController.getKitchenOrders
);

// Get single order
router.get(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.CHEF),
  OrderController.getById
);

// Create order (cashier, manager, admin)
router.post(
  '/',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  OrderController.create
);

// Update order status
router.patch(
  '/:id/status',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.CHEF),
  OrderController.updateStatus
);

// Update order item status (for kitchen)
router.patch(
  '/:orderId/items/:itemId/status',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CHEF),
  OrderController.updateItemStatus
);

// Add items to existing order
router.post(
  '/:id/items',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  OrderController.addItems
);

export default router;
