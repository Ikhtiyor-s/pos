import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { CategoryController } from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/categories');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi'));
    }
  },
});

// Public routes
router.get('/', CategoryController.getAll);
router.get('/slug/:slug', CategoryController.getBySlug);
router.get('/:id', CategoryController.getById);

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
