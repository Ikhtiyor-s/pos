import { Router } from 'express';
import { TelegramBotController } from './telegram-bot.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// ==========================================
// PUBLIC — Telegram webhook (auth yo'q)
// POST /api/telegram/webhook/:botToken — asosiy
// POST /api/telegram/webhook/tenant/:tenantId — legacy
// ==========================================

router.post('/webhook/tenant/:tenantId', TelegramBotController.webhookByTenant);
router.post('/webhook/:botToken', TelegramBotController.webhookByToken);

// ==========================================
// AUTHENTICATED
// ==========================================

router.use(authenticate);

router.post('/setup-webhook', authorize(Role.SUPER_ADMIN, Role.MANAGER), TelegramBotController.setupWebhook);
router.post('/broadcast', authorize(Role.SUPER_ADMIN, Role.MANAGER), TelegramBotController.broadcast);
router.get('/users', TelegramBotController.getUsers);

// Staff chats
router.get('/chats', TelegramBotController.getChats);
router.post('/chats', authorize(Role.SUPER_ADMIN, Role.MANAGER), TelegramBotController.addChat);
router.delete('/chats/:chatId', authorize(Role.SUPER_ADMIN, Role.MANAGER), TelegramBotController.removeChat);

// Manual shift report
router.post('/shift-report', authorize(Role.SUPER_ADMIN, Role.MANAGER), TelegramBotController.sendShiftReport);

export default router;
