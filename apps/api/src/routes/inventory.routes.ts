import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha routelar himoyalangan
router.use(authenticate);

// CRUD
router.get('/low-stock', InventoryController.getLowStock);
router.get('/', InventoryController.getAll);
router.get('/:id', InventoryController.getById);

router.post(
  '/',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.create
);

router.put(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.update
);

router.delete(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  InventoryController.delete
);

// Tranzaksiyalar
router.get('/:id/transactions', InventoryController.getTransactions);

router.post(
  '/:id/transaction',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.addTransaction
);

export default router;
