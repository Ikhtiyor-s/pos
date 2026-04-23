import api from './api';

export interface NonborStatus {
  enabled: boolean;
  sellerId: number | null;
  businessName: string | null;
  businessAddress?: string;
  businessPhone?: string;
  businessLogo?: string;
  nonborOrderStats?: Record<string, number>;
}

export interface NonborConnectResponse {
  enabled: boolean;
  sellerId: number;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessLogo?: string;
}

export interface NonborBusiness {
  id: number;
  title: string;
  address: string;
  phone_number?: string;
  logo?: string;
}

export interface NonborMonitoringStats {
  enabled: boolean;
  sellerId: number | null;
  businessName: string | null;
  isPolling: boolean;
  pollingIntervalSec: number;
  webhookActive: boolean;
  webhookLastAt: string | null;
  webhookSilent: boolean;
  lastSyncAt: string | null;
  lastBatchSyncAt: string | null;
  successCount: number;
  failureCount: number;
  retryQueueSize: number;
  activeTenants: number;
  nonborOrdersToday: number;
  totalNonborOrders: number;
}

export const nonborService = {
  getStatus: async (): Promise<NonborStatus> => {
    const { data: response } = await api.get('/nonbor/status');
    return response.data;
  },

  connect: async (sellerId: number): Promise<NonborConnectResponse> => {
    const { data: response } = await api.post('/nonbor/connect', { sellerId });
    return response.data;
  },

  disconnect: async (): Promise<void> => {
    await api.post('/nonbor/disconnect');
  },

  sync: async (): Promise<{ synced: boolean; nonborOrdersToday: number }> => {
    const { data: response } = await api.post('/nonbor/sync');
    return response.data;
  },

  getBusinesses: async (): Promise<NonborBusiness[]> => {
    const { data: response } = await api.get('/nonbor/businesses');
    return response.data;
  },

  getMonitoring: async (): Promise<NonborMonitoringStats> => {
    const { data: response } = await api.get('/nonbor/monitoring');
    return response.data;
  },

  batchSyncProducts: async (): Promise<{ updated: number; skipped: number; errors: number }> => {
    const { data: response } = await api.post('/nonbor/batch-sync-products');
    return response.data;
  },
};
