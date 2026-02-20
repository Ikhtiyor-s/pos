import api from './api';

export interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  category: 'marketplace' | 'payment' | 'notification' | 'delivery' | 'crm';
  icon: string;
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
}

export interface IntegrationLog {
  id: string;
  event: string;
  payload: any;
  response: any;
  success: boolean;
  direction: string;
  error?: string;
  createdAt: string;
}

export const integrationService = {
  // Barcha integratsiyalar
  getAll: async (): Promise<IntegrationStatus[]> => {
    const { data: response } = await api.get('/integrations');
    return response.data;
  },

  // Bitta integratsiya
  getById: async (id: string): Promise<IntegrationStatus> => {
    const { data: response } = await api.get(`/integrations/${id}`);
    return response.data;
  },

  // Konfiguratsiya yangilash
  updateConfig: async (id: string, config: Record<string, any>): Promise<IntegrationStatus> => {
    const { data: response } = await api.put(`/integrations/${id}/config`, config);
    return response.data;
  },

  // Yoqish/o'chirish
  toggle: async (id: string, enabled: boolean): Promise<IntegrationStatus> => {
    const { data: response } = await api.post(`/integrations/${id}/toggle`, { enabled });
    return response.data;
  },

  // Ulanish testi
  test: async (id: string): Promise<IntegrationTestResult> => {
    const { data: response } = await api.post(`/integrations/${id}/test`);
    return response.data;
  },

  // Loglar
  getLogs: async (id: string, page = 1, limit = 20): Promise<{ data: IntegrationLog[]; total: number }> => {
    const { data: response } = await api.get(`/integrations/${id}/logs`, { params: { page, limit } });
    return { data: response.data, total: response.total || 0 };
  },
};
