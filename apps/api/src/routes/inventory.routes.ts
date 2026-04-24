import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, 'uploads/inventory'); },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Faqat rasm fayllari qabul qilinadi'));
  },
});

const router = Router();

// Barcha routelar himoyalangan
router.use(authenticate);

// CRUD
router.get('/low-stock', InventoryController.getLowStock);
router.get('/', InventoryController.getAll);
router.get('/:id', InventoryController.getById);

router.post(
  '/',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.create
);

router.put(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.update
);

router.delete(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  InventoryController.delete
);

// Rasm yuklash
router.post(
  '/:id/upload-image',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  upload.single('image'),
  InventoryController.uploadImage
);

// Tranzaksiyalar
router.get('/:id/transactions', InventoryController.getTransactions);

router.post(
  '/:id/transaction',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.addTransaction
);

// Recipe (ProductIngredient) — mahsulot bo'yicha
// GET  /inventory/products/:productId/ingredients
// PUT  /inventory/products/:productId/ingredients     (to'liq almashtirish)
// POST /inventory/products/:productId/ingredients     (bitta qo'shish/yangilash)
// DELETE /inventory/products/:productId/ingredients/:invItemId

router.get(
  '/products/:productId/ingredients',
  InventoryController.getProductIngredients
);

router.put(
  '/products/:productId/ingredients',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.setProductIngredients
);

router.post(
  '/products/:productId/ingredients',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.upsertProductIngredient
);

router.delete(
  '/products/:productId/ingredients/:inventoryItemId',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  InventoryController.removeProductIngredient
);

export default router;
