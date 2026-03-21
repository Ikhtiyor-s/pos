import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { PrinterController } from './printer.controller.js';

const router = Router();

router.use(authenticate);

// ==========================================
// PRINTER STATUS & MANAGEMENT
// ==========================================

// XPrinter server holati
router.get('/status', PrinterController.getStatus);

// Printerlar ro'yxati
router.get('/list', PrinterController.listPrinters);

// Test chop
router.post('/test/:printerId',
  authorize('SUPER_ADMIN', 'MANAGER'),
  PrinterController.testPrint
);

// ==========================================
// MANUAL PRINT
// ==========================================

// Oshxona chiptasi — kassir, manager, admin
router.post('/print/kitchen/:orderId',
  authorize('SUPER_ADMIN', 'MANAGER', 'CASHIER'),
  PrinterController.printKitchenTicket
);

// Mijoz cheki — kassir, manager, admin
router.post('/print/receipt/:orderId',
  authorize('SUPER_ADMIN', 'MANAGER', 'CASHIER'),
  PrinterController.printReceipt
);

// Kunlik hisobot — manager, admin, accountant
router.post('/print/daily-report',
  authorize('SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'),
  PrinterController.printDailyReport
);

// ==========================================
// PRINT JOB HISTORY
// ==========================================

// Chop etish tarixi
router.get('/jobs', PrinterController.getJobHistory);

// Qayta chop etish
router.post('/jobs/:jobId/retry',
  authorize('SUPER_ADMIN', 'MANAGER', 'CASHIER'),
  PrinterController.retryJob
);

export default router;
