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

export const nonborService = {
  // Ulanish holati
  getStatus: async (): Promise<NonborStatus> => {
    const { data: response } = await api.get('/nonbor/status');
    return response.data;
  },

  // Nonbor bilan ulash
  connect: async (sellerId: number): Promise<NonborConnectResponse> => {
    const { data: response } = await api.post('/nonbor/connect', { sellerId });
    return response.data;
  },

  // Nonbordan uzish
  disconnect: async (): Promise<void> => {
    await api.post('/nonbor/disconnect');
  },

  // Manual sync
  sync: async (): Promise<{ synced: boolean; nonborOrdersToday: number }> => {
    const { data: response } = await api.post('/nonbor/sync');
    return response.data;
  },

  // Bizneslar ro'yxati
  getBusinesses: async (): Promise<NonborBusiness[]> => {
    const { data: response } = await api.get('/nonbor/businesses');
    return response.data;
  },
};
