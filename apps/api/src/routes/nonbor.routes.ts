import { Router } from 'express';
import { NonborController } from '../controllers/nonbor.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

router.post('/connect', NonborController.connect);
router.get('/status', NonborController.status);
router.post('/disconnect', NonborController.disconnect);
router.post('/sync', NonborController.sync);
router.post('/pull-products', NonborController.pullProducts);
router.get('/businesses', NonborController.listBusinesses);

export default router;
