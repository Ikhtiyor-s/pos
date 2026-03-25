import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';

const router = Router();

// ============ TO'LOV CALLBACK ENDPOINTLAR (auth siz — tashqi servislar chaqiradi) ============

// Payme JSON-RPC callback
router.post('/payme/callback', PaymentController.paymeCallback);

// Click ikki bosqichli callback
router.post('/click/prepare', PaymentController.clickPrepare);
router.post('/click/complete', PaymentController.clickComplete);

// Uzum Bank callback
router.post('/uzum/callback', PaymentController.uzumCallback);

export default router;
