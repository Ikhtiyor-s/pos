import { Router } from 'express';
import { NonborController } from '../controllers/nonbor.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha endpointlar faqat SUPER_ADMIN va MANAGER uchun
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

// Nonbor bilan ulash
router.post('/connect', NonborController.connect);

// Ulanish holati
router.get('/status', NonborController.status);

// Nonbordan uzish
router.post('/disconnect', NonborController.disconnect);

// Manual sync
router.post('/sync', NonborController.sync);

// Nonbor bizneslar ro'yxati
router.get('/businesses', NonborController.listBusinesses);

export default router;
