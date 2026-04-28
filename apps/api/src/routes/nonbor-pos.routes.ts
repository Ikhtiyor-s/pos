import { Router } from 'express';
import { NonborPosController } from '../controllers/nonbor-pos.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

router.post('/connect',    NonborPosController.connect);
router.post('/disconnect', NonborPosController.disconnect);
router.get('/status',      NonborPosController.status);
router.post('/sync',       NonborPosController.sync);
router.get('/dashboard',   NonborPosController.dashboard);

export default router;
