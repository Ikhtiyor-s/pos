import api from '@/lib/api';

export interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  category: 'marketplace' | 'payment' | 'notification' | 'delivery' | 'crm';
  icon: string;
}

export interface IntegrationLog {
  id: string;
  event: string;
  status: string;
  error: string | null;
  duration: number | null;
  attempt: number;
  createdAt: string;
  payload: any;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Har bir integratsiya uchun konfiguratsiya fieldlari
export const INTEGRATION_CONFIG_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'password' | 'boolean' | 'events'; placeholder?: string }[]> = {
  nonbor: [
    { key: 'nonborSellerId', label: 'Seller ID', type: 'text', placeholder: 'Nonbor seller ID' },
    { key: 'nonborApiUrl', label: 'API URL', type: 'text', placeholder: 'https://nonbor.uz/api/v2' },
    { key: 'nonborApiSecret', label: 'API Secret', type: 'password', placeholder: 'API kalit' },
  ],
  payme: [
    { key: 'paymeMerchantId', label: 'Merchant ID', type: 'text', placeholder: 'Payme merchant ID' },
    { key: 'paymeSecretKey', label: 'Secret Key', type: 'password', placeholder: 'Secret kalit' },
    { key: 'paymeTestMode', label: 'Test rejim', type: 'boolean' },
  ],
  click: [
    { key: 'clickMerchantId', label: 'Merchant ID', type: 'text', placeholder: 'Click merchant ID' },
    { key: 'clickServiceId', label: 'Service ID', type: 'text', placeholder: 'Click service ID' },
    { key: 'clickSecretKey', label: 'Secret Key', type: 'password', placeholder: 'Secret kalit' },
    { key: 'clickTestMode', label: 'Test rejim', type: 'boolean' },
  ],
  uzum: [
    { key: 'uzumMerchantId', label: 'Merchant ID', type: 'text', placeholder: 'Uzum merchant ID' },
    { key: 'uzumSecretKey', label: 'Secret Key', type: 'password', placeholder: 'Secret kalit' },
    { key: 'uzumTestMode', label: 'Test rejim', type: 'boolean' },
  ],
  telegram: [
    { key: 'telegramBotToken', label: 'Bot Token', type: 'password', placeholder: 'Bot token' },
    { key: 'telegramChatId', label: 'Chat ID', type: 'text', placeholder: 'Guruh chat ID' },
    { key: 'telegramEvents', label: 'Hodisalar', type: 'events' },
  ],
  delivery: [
    { key: 'deliveryApiUrl', label: 'API URL', type: 'text', placeholder: 'https://delivery.example.com/api' },
    { key: 'deliveryApiKey', label: 'API Key', type: 'password', placeholder: 'API kalit' },
  ],
  crm: [
    { key: 'crmApiUrl', label: 'API URL', type: 'text', placeholder: 'https://crm.example.com/api' },
    { key: 'crmApiKey', label: 'API Key', type: 'password', placeholder: 'API kalit' },
    { key: 'crmEvents', label: 'Hodisalar', type: 'events' },
  ],
};

export const EVENT_OPTIONS = [
  { value: 'order:new', label: 'Yangi buyurtma' },
  { value: 'order:status', label: 'Buyurtma holati' },
  { value: 'order:cancelled', label: 'Buyurtma bekor' },
  { value: 'order:completed', label: 'Buyurtma yakunlandi' },
  { value: 'product:created', label: 'Yangi mahsulot' },
  { value: 'product:updated', label: 'Mahsulot yangilandi' },
  { value: 'product:deleted', label: 'Mahsulot o\'chirildi' },
];

export const integrationService = {
  async getAll(): Promise<IntegrationStatus[]> {
    const res = await api.get<ApiResponse<IntegrationStatus[]>>('/integrations');
    return res.data.data;
  },

  async getById(id: string): Promise<IntegrationStatus> {
    const res = await api.get<ApiResponse<IntegrationStatus>>(`/integrations/${id}`);
    return res.data.data;
  },

  async updateConfig(id: string, config: Record<string, any>): Promise<IntegrationStatus> {
    const res = await api.put<ApiResponse<IntegrationStatus>>(`/integrations/${id}/config`, config);
    return res.data.data;
  },

  async toggle(id: string, enabled: boolean): Promise<IntegrationStatus> {
    const res = await api.post<ApiResponse<IntegrationStatus>>(`/integrations/${id}/toggle`, { enabled });
    return res.data.data;
  },

  async test(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<ApiResponse<{ success: boolean; message: string }>>(`/integrations/${id}/test`);
    return res.data.data;
  },

  async getLogs(id: string, page = 1, limit = 20): Promise<{ logs: IntegrationLog[]; total: number }> {
    const res = await api.get(`/integrations/${id}/logs`, { params: { page, limit } });
    return { logs: res.data.data, total: res.data.meta?.total || 0 };
  },

  // Settings dan konfiguratsiya qiymatlarini olish
  async getConfig(id: string): Promise<Record<string, any>> {
    const res = await api.get<ApiResponse<any>>('/settings');
    const settings = res.data.data;
    if (!settings) return {};

    const fields = INTEGRATION_CONFIG_FIELDS[id];
    if (!fields) return {};

    const config: Record<string, any> = {};
    for (const field of fields) {
      config[field.key] = settings[field.key] ?? (field.type === 'boolean' ? false : field.type === 'events' ? [] : '');
    }
    return config;
  },
};
