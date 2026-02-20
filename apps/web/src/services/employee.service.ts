import api from '@/lib/api';

export interface EmployeeApi {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  role: string;
  avatar?: string;
  pinCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const employeeApiService = {
  async getAll(params?: { search?: string; role?: string }): Promise<EmployeeApi[]> {
    const response = await api.get('/users', { params });
    return response.data.data || [];
  },

  async create(data: { email: string; phone?: string; firstName: string; lastName?: string; role: string; password: string }): Promise<EmployeeApi> {
    const response = await api.post('/users', data);
    return response.data.data;
  },

  async update(id: string, data: Record<string, any>): Promise<EmployeeApi> {
    const response = await api.put(`/users/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async toggleActive(id: string): Promise<EmployeeApi> {
    const response = await api.patch(`/users/${id}/toggle`);
    return response.data.data;
  },

  async setPin(userId: string, pinCode: string): Promise<void> {
    await api.put(`/auth/users/${userId}/pin`, { pinCode });
  },

  async removePin(userId: string): Promise<void> {
    await api.delete(`/auth/users/${userId}/pin`);
  },
};
