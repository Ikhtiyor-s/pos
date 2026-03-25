import { Router } from 'express';
import { TelegramBotController } from './telegram-bot.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// ==========================================
// PUBLIC — Telegram webhook (auth yo'q)
// ==========================================

router.post('/webhook/:tenantId', TelegramBotController.webhook);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.post('/setup-webhook', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), TelegramBotController.setupWebhook);
router.post('/broadcast', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), TelegramBotController.broadcast);
router.get('/users', authenticate, TelegramBotController.getUsers);

export default router;
