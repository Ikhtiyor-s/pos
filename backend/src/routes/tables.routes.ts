import { Router } from 'express';
import { TableController } from '../controllers/table.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Public route for QR code scanning
router.get('/qr/:qrCode', TableController.getByQRCode);

// Protected routes
router.get('/', authenticate, TableController.getAll);
router.get('/:id', authenticate, TableController.getById);
router.get('/:id/qr', authenticate, TableController.getQRCode);

router.post(
  '/',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  TableController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  TableController.update
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  TableController.updateStatus
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  TableController.delete
);

export default router;
