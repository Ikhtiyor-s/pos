import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  isActive: boolean;
  activeOrders?: { id: string }[];
}

interface TablesResponse {
  data: Table[];
}

interface TableResponse {
  data: Table;
}

export const tableService = {
  getAll: async (): Promise<TablesResponse> => {
    const { data } = await api.get('/tables');
    return data;
  },

  getById: async (id: string): Promise<TableResponse> => {
    const { data } = await api.get(`/tables/${id}`);
    return data;
  },

  updateStatus: async (id: string, status: Table['status']): Promise<void> => {
    await api.patch(`/tables/${id}/status`, { status });
  },
};
