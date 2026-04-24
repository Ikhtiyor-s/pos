import cron from 'node-cron';
import { prisma } from '@oshxona/database';
import { TelegramBotService } from './telegram-bot.service.js';

// ==========================================
// TELEGRAM BOT CRON JOBS
// ==========================================

// Har kuni soat 23:00 da smena hisobotini barcha tenantlarga yuborish
function startShiftReportCron() {
  cron.schedule('0 23 * * *', async () => {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const t of tenants) {
        try {
          await TelegramBotService.sendShiftReport(t.id);
        } catch (e) {
          console.error(`[TGCron] Shift report failed for tenant ${t.id}:`, e);
        }
      }

      console.log(`[TGCron] Shift reports sent to ${tenants.length} tenants`);
    } catch (e) {
      console.error('[TGCron] Shift report cron error:', e);
    }
  });
  console.log('[TGCron] Shift report cron started (daily 23:00)');
}

export function startTelegramCrons() {
  startShiftReportCron();
}
