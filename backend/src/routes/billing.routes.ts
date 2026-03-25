import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha billing routelar himoyalangan
router.use(authenticate);

// ============ PLAN ============

// Ro'yxat (barcha autentifikatsiya qilingan foydalanuvchilar ko'ra oladi)
router.get('/plans', BillingController.getPlans);
router.get('/plans/:id', BillingController.getPlan);

// CRUD (faqat SUPER_ADMIN)
router.post(
  '/plans',
  authorize(Role.SUPER_ADMIN),
  BillingController.createPlan
);

router.put(
  '/plans/:id',
  authorize(Role.SUPER_ADMIN),
  BillingController.updatePlan
);

router.delete(
  '/plans/:id',
  authorize(Role.SUPER_ADMIN),
  BillingController.deletePlan
);

// ============ SUBSCRIPTION ============

router.get(
  '/subscription',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  BillingController.getSubscription
);

router.post(
  '/subscription',
  authorize(Role.SUPER_ADMIN),
  BillingController.createSubscription
);

router.put(
  '/subscription/resources',
  authorize(Role.SUPER_ADMIN),
  BillingController.updateResources
);

router.put(
  '/subscription/override',
  authorize(Role.SUPER_ADMIN),
  BillingController.overridePrice
);

// ============ USAGE ============

router.get(
  '/usage',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  BillingController.getUsage
);

// ============ INVOICE (OYLIK TO'LOV) ============

// Hisob-faktura yaratish
router.post(
  '/invoices',
  authorize(Role.SUPER_ADMIN),
  BillingController.generateInvoice
);

// Hisob-fakturalar ro'yxati
router.get(
  '/invoices',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  BillingController.getInvoices
);

// Hisob-faktura umumiy statistikasi
router.get(
  '/invoices/summary',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  BillingController.getInvoiceSummary
);

// Muddati o'tganlarni tekshirish
router.post(
  '/invoices/check-overdue',
  authorize(Role.SUPER_ADMIN),
  BillingController.checkOverdue
);

// Bitta hisob-faktura (tafsilot bilan)
router.get(
  '/invoices/:id',
  authorize(Role.SUPER_ADMIN, Role.MANAGER, Role.ACCOUNTANT),
  BillingController.getInvoiceById
);

// To'lov qilish
router.post(
  '/invoices/:id/pay',
  authorize(Role.SUPER_ADMIN),
  BillingController.payInvoice
);

// Bekor qilish
router.post(
  '/invoices/:id/cancel',
  authorize(Role.SUPER_ADMIN),
  BillingController.cancelInvoice
);

export default router;
