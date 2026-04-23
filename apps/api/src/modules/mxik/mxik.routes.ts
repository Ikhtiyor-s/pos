import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { MxikController } from './mxik.controller.js';

const router = Router();

// ==========================================
// SOLIQ BAZASI QIDIRUV — autentifikatsiya kerak
// ==========================================

// GET /api/mxik/search?q=osh&limit=10     — nom bo'yicha katalog qidirish
// GET /api/mxik/search?code=17230000      — MXIK kodni tekshirish
router.get('/search', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.searchMxik);

// GET /api/mxik/lookup/:code — Soliq bazasida to'g'ridan tekshirish
router.get('/lookup/:code', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.lookupMxik);

// GET /api/mxik/scan/:barcode — barcode → mahsulot ma'lumotlari (Open Food Facts)
router.get('/scan/:barcode', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.scanBarcode);

// GET /api/mxik/barcode-mxik/:barcode — barcode → MXIK kodni topish (Soliq GTIN bazasi)
router.get('/barcode-mxik/:barcode', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.findMxikByBarcode);

// GET /api/mxik/nonbor/:code — Nonbor orqali MXIK tekshirish
router.get('/nonbor/:code', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.checkMxikNonbor);

// ==========================================
// TENANT MAHSULOTLARI BO'YICHA
// ==========================================

// GET /api/mxik/product-search?code=172... — tenant mahsulotlarida MXIK bo'yicha qidirish
router.get('/product-search', authenticate, MxikController.findProductsByCode);

// GET /api/mxik/stats — tenant MXIK qamrov statistikasi
router.get('/stats', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.getMxikStats);

// ==========================================
// DEPRECATED — products.routes.ts dagi endpointlar ishlatilsin
// ==========================================

/** @deprecated POST /api/products/:id/mxik ishlatilsin */
router.post('/assign/:productId', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), MxikController.assignMxik);

export default router;
