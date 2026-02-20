import api from '@/lib/api';

export interface CustomerApi {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  birthDate?: string;
  bonusPoints: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number };
}

export const customerApiService = {
  async getAll(params?: { search?: string; page?: number; limit?: number }): Promise<{ customers: CustomerApi[]; total: number }> {
    const response = await api.get('/customers', { params });
    return {
      customers: response.data.data || [],
      total: response.data.meta?.total || 0,
    };
  },

  async getById(id: string): Promise<CustomerApi> {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  async create(data: { phone: string; firstName?: string; lastName?: string; email?: string }): Promise<CustomerApi> {
    const response = await api.post('/customers', data);
    return response.data.data;
  },

  async update(id: string, data: Record<string, any>): Promise<CustomerApi> {
    const response = await api.put(`/customers/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },
};
