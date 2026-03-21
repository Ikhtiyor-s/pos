import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { SyncController } from './sync.controller.js';

const router = Router();

// Health check — auth talab qilinmaydi (qurilma discovery uchun)
router.get('/health', SyncController.healthCheck);

// Qolgan barcha route lar auth talab qiladi
router.use(authenticate);

// Buyurtmalarni sync qilish (offline → server)
router.post('/orders', SyncController.syncOrders);

// Status o'zgarishlarni sync qilish
router.post('/order-status', SyncController.syncOrderStatus);
router.post('/item-status', SyncController.syncItemStatus);
router.post('/table-status', SyncController.syncTableStatus);

// Serverdan ma'lumot olish (server → offline cache)
router.get('/pull', SyncController.pullData);

export default router;
