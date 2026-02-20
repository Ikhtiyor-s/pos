import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Protected - get settings (tenant required)
router.get('/', authenticate, SettingsController.get);

// Protected - update settings (faqat admin)
router.put(
  '/',
  authenticate,
  authorize(Role.SUPER_ADMIN, Role.MANAGER),
  SettingsController.update
);

export default router;
