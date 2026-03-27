import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';
import { checkPlanLimit } from '../middleware/planLimit.js';
import { OrderLifecycleService } from '../modules/order-lifecycle/order-lifecycle.service.js';
import { OrderLifecycleEngine, ORDER_STATUS_PIPELINE, STATUS_LABELS } from '../modules/order-lifecycle/lifecycle-engine.js';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Get all orders (admin, manager, cashier, waiter)
router.get(
  '/',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.ACCOUNTANT, Role.WAITER),
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

// Create order (cashier, manager, admin, waiter)
router.post(
  '/',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER),
  checkPlanLimit('orders'),
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

// Add items to existing order (waiter can also add)
router.post(
  '/:id/items',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER),
  OrderController.addItems
);

// Update item quantity (waiter can change qty)
router.patch(
  '/:id/items/:itemId',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER),
  OrderController.updateItemQuantity
);

// To'lov qabul qilish (kassir)
router.post(
  '/:id/payment',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  OrderController.addPayment
);

// ==========================================
// LIFECYCLE ENDPOINTS
// ==========================================

// Enriched order (barcha metadata bilan)
router.get(
  '/:id/enriched',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.CHEF, Role.WAITER),
  async (req, res, next) => {
    try {
      const tenantId = req.user!.tenantId!;
      const order = await OrderLifecycleService.getEnrichedOrder(tenantId, req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
);

// Status pipeline info
router.get(
  '/lifecycle/pipeline',
  async (_req, res) => {
    res.json({
      success: true,
      data: {
        pipeline: ORDER_STATUS_PIPELINE,
        labels: STATUS_LABELS,
      },
    });
  }
);

export default router;
