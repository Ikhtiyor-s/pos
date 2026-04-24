import cron from 'node-cron';
import { LoyaltyService } from './loyalty.service.js';
import { logger } from '../../utils/logger.js';

function startLoyaltyExpiryCron() {
  // Har kuni soat 02:00 da eskirgan ballarni o'chirish
  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await LoyaltyService.expireAllTenants();
      logger.info('[LoyaltyCron] Expiry complete', result);
    } catch (e) {
      logger.error('[LoyaltyCron] Expiry error', { error: (e as Error).message });
    }
  });
  logger.info('[LoyaltyCron] Loyalty expiry cron started (daily 02:00)');
}

export function startLoyaltyCrons() {
  startLoyaltyExpiryCron();
}
