import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';
import { WebhookProviderController } from './webhook-provider.controller.js';

const router = Router();

// ==========================================
// INCOMING — autentifikatsiya kerak emas (tashqi servislar)
// POST /api/webhook-providers/incoming/:providerName/:tenantSlug
// ==========================================
router.post('/incoming/:providerName/:tenantSlug', WebhookProviderController.receive);

// ==========================================
// META — ro'yxatdan o'tgan foydalanuvchilar uchun
// ==========================================
router.get('/available', authenticate, WebhookProviderController.getAvailableProviders);
router.get('/config/:providerName', authenticate, WebhookProviderController.getDefaultConfig);

// ==========================================
// CRUD — faqat MANAGER va SUPER_ADMIN
// ==========================================
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

router.get('/', WebhookProviderController.list);
router.post('/', WebhookProviderController.create);
router.get('/:id', WebhookProviderController.getById);
router.put('/:id', WebhookProviderController.update);
router.delete('/:id', WebhookProviderController.remove);

// Retry queue
router.get('/:id/queue', WebhookProviderController.getQueue);

// Test
router.post('/:id/test', WebhookProviderController.test);

export default router;
