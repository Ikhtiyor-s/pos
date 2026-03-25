import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha routelar himoyalangan
router.use(authenticate);

// Bildirishnomalar ro'yxati
router.get('/', NotificationController.list);

// O'qilmagan bildirishnomalar soni
router.get('/unread-count', NotificationController.getUnreadCount);

// Bildirishnomani o'qilgan deb belgilash
router.patch('/:id/read', NotificationController.markAsRead);

// Barcha bildirishnomalarni o'qilgan deb belgilash
router.patch('/read-all', NotificationController.markAllAsRead);

// Bildirishnoma sozlamalari (faqat MANAGER va SUPER_ADMIN)
router.get(
  '/settings',
  authorize(Role.MANAGER, Role.SUPER_ADMIN),
  NotificationController.getSettings
);

router.put(
  '/settings',
  authorize(Role.MANAGER, Role.SUPER_ADMIN),
  NotificationController.updateSettings
);

// Eski bildirishnomalarni o'chirish (faqat MANAGER va SUPER_ADMIN)
router.delete(
  '/old',
  authorize(Role.MANAGER, Role.SUPER_ADMIN),
  NotificationController.deleteOld
);

export default router;
