import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER), CustomerController.getAll);
router.get('/:id', authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER), CustomerController.getById);
router.post('/', authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER), CustomerController.create);
router.put('/:id', authorize(Role.SUPER_ADMIN, Role.MANAGER), CustomerController.update);
router.delete('/:id', authorize(Role.SUPER_ADMIN, Role.MANAGER), CustomerController.delete);

export default router;
