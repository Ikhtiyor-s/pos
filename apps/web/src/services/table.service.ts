import api from '@/lib/api';

export interface TableApi {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: string;
  qrCode?: string;
  positionX?: number;
  positionY?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const tableApiService = {
  async getAll(): Promise<TableApi[]> {
    const response = await api.get('/tables');
    return response.data.data || [];
  },

  async getById(id: string): Promise<TableApi> {
    const response = await api.get(`/tables/${id}`);
    return response.data.data;
  },

  async create(data: { number: number; name?: string; capacity: number }): Promise<TableApi> {
    const response = await api.post('/tables', data);
    return response.data.data;
  },

  async update(id: string, data: Record<string, any>): Promise<TableApi> {
    const response = await api.put(`/tables/${id}`, data);
    return response.data.data;
  },

  async updateStatus(id: string, status: string): Promise<TableApi> {
    const response = await api.patch(`/tables/${id}/status`, { status });
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tables/${id}`);
  },
};
