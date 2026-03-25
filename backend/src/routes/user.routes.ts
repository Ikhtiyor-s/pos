import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);

router.get('/', authorize(Role.SUPER_ADMIN, Role.MANAGER), UserController.getAll);
router.get('/:id', authorize(Role.SUPER_ADMIN, Role.MANAGER), UserController.getById);
router.post('/', authorize(Role.SUPER_ADMIN, Role.MANAGER), UserController.create);
router.put('/:id', authorize(Role.SUPER_ADMIN, Role.MANAGER), UserController.update);
router.patch('/:id/toggle', authorize(Role.SUPER_ADMIN, Role.MANAGER), UserController.toggleActive);
router.delete('/:id', authorize(Role.SUPER_ADMIN, Role.MANAGER), UserController.delete);

export default router;
