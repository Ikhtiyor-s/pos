import cron from 'node-cron';
import { cleanupExpiredReports } from './reports.service.js';
import { prisma } from '@oshxona/database';
import { ReportDataService } from './report-data.service.js';
import { generateReport } from './reports.service.js';

// ==========================================
// REPORT CRON JOBS
// ==========================================

// Kunlik tozalash — har kuni soat 03:00 da
function startCleanupCron() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const deleted = await cleanupExpiredReports();
      console.log(`[ReportCron] Cleanup: ${deleted} expired reports removed`);
    } catch (e) {
      console.error('[ReportCron] Cleanup error:', e);
    }
  });
  console.log('[ReportCron] Cleanup cron started (daily 03:00)');
}

// Kunlik avtomatik hisobot — har kuni soat 23:55 da
// Har bir tenant uchun kunlik sotuv hisobotini Excel formatida saqlaydi
function startDailyReportCron() {
  cron.schedule('55 23 * * *', async () => {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      const today = new Date().toISOString().slice(0, 10);
      console.log(`[ReportCron] Generating daily reports for ${tenants.length} tenants...`);

      for (const tenant of tenants) {
        try {
          await generateReport(tenant.id, 'system', 'sales', 'excel', {
            type: 'daily', from: today, to: today,
          });
        } catch (e) {
          console.error(`[ReportCron] Daily report failed for tenant ${tenant.id}:`, e);
        }
      }
    } catch (e) {
      console.error('[ReportCron] Daily report cron error:', e);
    }
  });
  console.log('[ReportCron] Daily report cron started (23:55)');
}

// Oylik avtomatik hisobot — har oy 1-sanasi soat 00:10 da
function startMonthlyReportCron() {
  cron.schedule('10 0 1 * *', async () => {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      // O'tgan oy
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      console.log(`[ReportCron] Generating monthly reports (${year}-${prevMonth}) for ${tenants.length} tenants...`);

      for (const tenant of tenants) {
        try {
          await Promise.all([
            generateReport(tenant.id, 'system', 'sales', 'excel', {
              type: 'monthly', year, month: prevMonth,
            }),
            generateReport(tenant.id, 'system', 'financial', 'excel', {
              type: 'monthly', year, month: prevMonth,
            }),
            generateReport(tenant.id, 'system', 'products', 'excel', {
              type: 'monthly', year, month: prevMonth,
            }),
          ]);
        } catch (e) {
          console.error(`[ReportCron] Monthly report failed for tenant ${tenant.id}:`, e);
        }
      }
    } catch (e) {
      console.error('[ReportCron] Monthly report cron error:', e);
    }
  });
  console.log('[ReportCron] Monthly report cron started (1st of month 00:10)');
}

export function startReportCrons() {
  startCleanupCron();
  startDailyReportCron();
  startMonthlyReportCron();
}
