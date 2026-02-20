import api from './api';

export interface BusinessSettings {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxRate: number;
  currency: string;
  logo?: string;
}

export const settingsService = {
  get: async (): Promise<BusinessSettings> => {
    const { data: response } = await api.get('/settings');
    return response.data;
  },
};
