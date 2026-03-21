import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { MxikController } from './mxik.controller.js';

const router = Router();

// ==========================================
// MXIK & BARCODE ROUTES
// Admin mahsulot qo'shish uchun
// ==========================================

// Barcode skanerlash → mahsulot ma'lumotlari (forma uchun)
// Admin skanerlaganda: barcode → Open Food Facts → suggestedData
router.get(
  '/scan/:barcode',
  authenticate,
  authorize('MANAGER', 'SUPER_ADMIN'),
  MxikController.scanBarcode,
);

// MXIK kod tekshirish (Soliq bazasi)
// Admin MXIK kodni kiritganda avtomatik tekshiriladi
router.get(
  '/lookup/:code',
  authenticate,
  authorize('MANAGER', 'SUPER_ADMIN'),
  MxikController.lookupMxik,
);

// MXIK qidirish (nomi bo'yicha)
// Admin mahsulot nomini yozganda MXIK tavsiyalar chiqadi
router.get(
  '/search',
  authenticate,
  authorize('MANAGER', 'SUPER_ADMIN'),
  MxikController.searchMxik,
);

// Nonbor orqali MXIK tekshirish
router.get(
  '/nonbor/:code',
  authenticate,
  authorize('MANAGER', 'SUPER_ADMIN'),
  MxikController.checkMxikNonbor,
);

// Mahsulotga MXIK kod biriktirish
router.post(
  '/assign/:productId',
  authenticate,
  authorize('MANAGER', 'SUPER_ADMIN'),
  MxikController.assignMxik,
);

export default router;
