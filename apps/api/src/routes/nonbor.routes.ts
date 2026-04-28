import { Router } from 'express';
import { NonborController } from '../controllers/nonbor.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

// Email + parol bilan Nonborga kirish → token olish + mahsulot import (ASOSIY)
router.post('/login-connect', NonborController.loginConnect);

// Token bilan ulash (API key mavjud bo'lsa)
router.post('/connect', NonborController.connect);

router.get('/status',                NonborController.status);
router.post('/disconnect',           NonborController.disconnect);
router.post('/sync',                 NonborController.sync);
router.post('/pull-products',        NonborController.pullProducts);
router.post('/refresh-products',     NonborController.refreshProducts);
router.get('/businesses',            NonborController.listBusinesses);
router.get('/monitoring',            NonborController.monitoring);
router.post('/batch-sync-products',  NonborController.batchSyncProducts);

export default router;
