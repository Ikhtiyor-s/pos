import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Barcha tenant routelar SUPER_ADMIN uchun
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

router.get('/', TenantController.getAll);
router.get('/:id', TenantController.getById);
router.post('/', TenantController.create);
router.put('/:id', TenantController.update);
router.patch('/:id/toggle', TenantController.toggle);
router.get('/:id/stats', TenantController.getStats);

export default router;
