import { Router } from 'express';
import { Role } from '@oshxona/database';
import { authenticate, authorize } from '../middleware/auth.js';
import { MarkirovkaController } from '../controllers/markirovka.controller.js';

const router = Router();

// Barcha markirovka route'lari autentifikatsiya talab qiladi
router.use(authenticate);

// ==========================================
// 8 TA ASOSIY ENDPOINT (vazifa bo'yicha)
// ==========================================

// POST /api/markirovka/verify/:code
// Kodni davlat serverida tekshirish — markCode URL parametrdan keladi
router.post(
  '/verify/:code',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE, Role.CASHIER),
  MarkirovkaController.verify,
);

// POST /api/markirovka/receive
// Bitta markirovka mahsulotini qabul qilish
router.post(
  '/receive',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  MarkirovkaController.receive,
);

// POST /api/markirovka/batch-receive
// Ko'p markirovka mahsulotlarini bir vaqtda qabul qilish (maks 100 ta)
router.post(
  '/batch-receive',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE),
  MarkirovkaController.batchReceive,
);

// POST /api/markirovka/sell
// Sotilganligini davlat serveriga xabar qilish
router.post(
  '/sell',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  MarkirovkaController.sell,
);

// GET /api/markirovka/check/:code
// Sotishdan oldin tez tekshirish — kassir skaneri uchun
router.get(
  '/check/:code',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER),
  MarkirovkaController.checkBeforeSell,
);

// GET /api/markirovka/expired
// Muddati o'tgan mahsulotlar ro'yxati (DB auto-yangilanadi)
router.get(
  '/expired',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE, Role.ACCOUNTANT),
  MarkirovkaController.getExpired,
);

// GET /api/markirovka/report/daily?date=YYYY-MM-DD
// Kunlik hisobot: qabul/tekshiruv/sotuv/xato soni + top GTINlar
router.get(
  '/report/daily',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  MarkirovkaController.getDailyReport,
);

// GET /api/markirovka/trace/:serial
// Serial raqam yoki markCode bo'yicha to'liq tarix
router.get(
  '/trace/:serial',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE, Role.ACCOUNTANT),
  MarkirovkaController.traceBySerial,
);

// ==========================================
// QO'SHIMCHA ENDPOINTLAR (ro'yxat, filter, boshqaruv)
// ==========================================

// GET /api/markirovka/stats
router.get(
  '/stats',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  MarkirovkaController.getStats,
);

// GET /api/markirovka/logs?action=SELL&status=FAILED&page=1
router.get(
  '/logs',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  MarkirovkaController.getLogs,
);

// GET /api/markirovka/batches?productId=...
router.get(
  '/batches',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE, Role.ACCOUNTANT),
  MarkirovkaController.getBatches,
);

// GET /api/markirovka/products?status=IN_STOCK&search=...
router.get(
  '/products',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE, Role.CASHIER, Role.ACCOUNTANT),
  MarkirovkaController.getProducts,
);

// GET /api/markirovka/products/:markCode
router.get(
  '/products/:markCode',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.WAREHOUSE, Role.CASHIER, Role.ACCOUNTANT),
  MarkirovkaController.getProductByMarkCode,
);

// POST /api/markirovka/queue/process
router.post(
  '/queue/process',
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  MarkirovkaController.processQueue,
);

export default router;
