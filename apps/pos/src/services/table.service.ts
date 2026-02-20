import api from './api';

export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  isActive: boolean;
  orders?: { id: string; status: string; total: number; createdAt: string }[];
}

export const tableService = {
  getAll: async (): Promise<Table[]> => {
    const { data: response } = await api.get('/tables');
    return response.data || [];
  },

  getById: async (id: string): Promise<Table> => {
    const { data: response } = await api.get(`/tables/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: Table['status']): Promise<void> => {
    await api.patch(`/tables/${id}/status`, { status });
  },
};
