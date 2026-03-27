import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { categoryUpload as upload } from '../middleware/upload.js';
import { Role } from '@oshxona/database';

const router = Router();

// Protected routes (tenant required)
router.get('/', authenticate, CategoryController.getAll);
router.get('/slug/:slug', authenticate, CategoryController.getBySlug);
router.get('/:id', authenticate, CategoryController.getById);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  CategoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  CategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  CategoryController.delete
);

router.post(
  '/:id/image',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  upload.single('image'),
  CategoryController.uploadImage
);

export default router;
