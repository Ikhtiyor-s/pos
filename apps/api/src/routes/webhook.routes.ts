import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// ============ INCOMING WEBHOOK (auth siz — tashqi servislar uchun) ============
router.post('/receive/:service', WebhookController.receive);

// ============ CRUD ENDPOINTLAR (faqat admin) ============
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

// Mavjud eventlar ro'yxati
router.get('/events', WebhookController.getAvailableEvents);

// CRUD
router.get('/', WebhookController.list);
router.post('/', WebhookController.create);
router.get('/:id', WebhookController.getById);
router.put('/:id', WebhookController.update);
router.delete('/:id', WebhookController.remove);

// Loglar va test
router.get('/:id/logs', WebhookController.getLogs);
router.post('/:id/test', WebhookController.test);

export default router;
