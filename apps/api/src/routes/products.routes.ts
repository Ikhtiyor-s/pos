import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ProductController } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/products');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari (jpeg, jpg, png, webp) qabul qilinadi'));
    }
  },
});

// Public routes (for menu)
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);

// Protected routes
router.post(
  '/',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  ProductController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  ProductController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  ProductController.delete
);

router.post(
  '/:id/image',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  upload.single('image'),
  ProductController.uploadImage
);

export default router;
