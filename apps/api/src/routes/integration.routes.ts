import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha endpointlar faqat admin uchun
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.MANAGER));

// Barcha integratsiyalar
router.get('/', IntegrationController.getAll);

// Bitta integratsiya
router.get('/:id', IntegrationController.getById);

// Konfiguratsiya yangilash
router.put('/:id/config', IntegrationController.updateConfig);

// Yoqish/o'chirish
router.post('/:id/toggle', IntegrationController.toggle);

// Ulanish testi
router.post('/:id/test', IntegrationController.test);

// Loglar
router.get('/:id/logs', IntegrationController.getLogs);

export default router;
