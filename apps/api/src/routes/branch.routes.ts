import { Router } from 'express';
import { BranchController } from '../controllers/branch.controller.js';
import { authenticate, authorize, requireTenant } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha fillial routelar: autentifikatsiya + tenant + MANAGER role
router.use(authenticate);
router.use(requireTenant);
router.use(authorize(Role.MANAGER));

router.get('/', BranchController.getAll);
router.post('/', BranchController.create);
router.get('/:id', BranchController.getById);
router.put('/:id', BranchController.update);
router.patch('/:id/toggle', BranchController.toggle);

export default router;
