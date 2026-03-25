import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';
import { OnlineOrderController } from './online-order.controller.js';

const router = Router();

// Barcha route'lar autentifikatsiya talab qiladi
router.use(authenticate);

// GET / — Online buyurtmalar ro'yxati
router.get(
  '/',
  authorize(Role.MANAGER, Role.CASHIER, Role.SUPER_ADMIN),
  OnlineOrderController.getAll
);

// GET /stats — Statistika
router.get(
  '/stats',
  authorize(Role.MANAGER, Role.CASHIER, Role.SUPER_ADMIN),
  OnlineOrderController.getStats
);

// GET /:id — Bitta online buyurtma
router.get(
  '/:id',
  authorize(Role.MANAGER, Role.CASHIER, Role.SUPER_ADMIN),
  OnlineOrderController.getById
);

// POST / — Webhook/tashqi API orqali yangi buyurtma qabul qilish
router.post(
  '/',
  authorize(Role.MANAGER, Role.CASHIER, Role.SUPER_ADMIN),
  OnlineOrderController.receive
);

// POST /:id/accept — Buyurtmani qabul qilish
router.post(
  '/:id/accept',
  authorize(Role.MANAGER, Role.CASHIER, Role.SUPER_ADMIN),
  OnlineOrderController.accept
);

// POST /:id/reject — Buyurtmani rad etish
router.post(
  '/:id/reject',
  authorize(Role.MANAGER, Role.CASHIER, Role.SUPER_ADMIN),
  OnlineOrderController.reject
);

// POST /:id/map — Mahalliy buyurtmaga bog'lash
router.post(
  '/:id/map',
  authorize(Role.MANAGER, Role.SUPER_ADMIN),
  OnlineOrderController.mapToLocal
);

// POST /sync/nonbor — Nonbor buyurtmalarni sinxronlashtirish
router.post(
  '/sync/nonbor',
  authorize(Role.MANAGER, Role.SUPER_ADMIN),
  OnlineOrderController.syncNonbor
);

export default router;
