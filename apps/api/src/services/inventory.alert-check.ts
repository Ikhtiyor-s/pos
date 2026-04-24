import { Server } from 'socket.io';
import { WarehouseService } from '../modules/warehouse/warehouse.service.js';

export async function triggerAlertCheck(tenantId: string, io?: Server) {
  await WarehouseService.checkAndNotifyAlerts(tenantId, io);
}
