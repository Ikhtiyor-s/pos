import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { MxikController } from '../modules/mxik/mxik.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { productUpload as upload } from '../middleware/upload.js';
import { Role } from '@oshxona/database';

const router = Router();

// ==========================================
// ASOSIY CRUD
// ==========================================

router.get('/', authenticate, ProductController.getAll);
router.get('/barcode/:barcode', authenticate, ProductController.getByBarcode);

// Bulk — /:id dan oldin bo'lishi kerak (route conflict oldini olish)
router.post('/bulk/toggle', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.bulkToggle);
router.post('/bulk/price-update', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.bulkPriceUpdate);
router.get('/qr-menu/list', authenticate, ProductController.getQRMenuProducts);
router.get('/featured/list', authenticate, ProductController.getFeatured);
router.get('/tag/:tag', authenticate, ProductController.searchByTag);
router.get('/low-stock/list', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE), ProductController.getLowStock);

router.get('/:id', authenticate, ProductController.getById);
router.get('/:id/qr', authenticate, ProductController.getQRCode);

router.post('/', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.create);
router.put('/:id', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.update);
router.delete('/:id', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.delete);

router.post('/:id/image', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), upload.single('image'), ProductController.uploadImage);
router.post('/:id/generate-barcode', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.generateBarcode);

router.patch('/:id/price', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.updatePrice);
router.patch('/:id/toggle', authenticate, authorize(Role.SUPER_ADMIN, Role.MANAGER), ProductController.toggleActive);

// ==========================================
// MXIK — O'zbekiston Mahsulot Identifikatsiya Kodi
// GET  /api/products/:id/mxik  — MXIK ma'lumotlarini olish
// POST /api/products/:id/mxik  — MXIK kod qo'shish / yangilash
// DELETE /api/products/:id/mxik — MXIK kodni o'chirish
// ==========================================

router.get(
  '/:id/mxik',
  authenticate,
  MxikController.getProductMxik,
);

router.post(
  '/:id/mxik',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  MxikController.saveProductMxik,
);

router.delete(
  '/:id/mxik',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  MxikController.clearProductMxik,
);

export default router;
