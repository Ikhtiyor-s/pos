import api from './api';

export interface Table {
  id: string;
  number: number;
  name?: string;
  capacity: number;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  isActive: boolean;
  activeOrders?: { id: string }[];
  orders?: { id: string; status: string }[];
}

interface TablesResponse {
  data: Table[];
}

interface TableResponse {
  data: Table;
}

export const tableService = {
  getAll: async (): Promise<TablesResponse> => {
    const { data: response } = await api.get('/tables');
    // API returns { success, data: [...tables] }
    const tables: Table[] = (response.data || []).map((t: Table & { orders?: { id: string; status: string }[] }) => ({
      ...t,
      activeOrders: t.orders?.filter((o) =>
        ['NEW', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
      ) || [],
    }));
    return { data: tables };
  },

  getById: async (id: string): Promise<TableResponse> => {
    const { data: response } = await api.get(`/tables/${id}`);
    return { data: response.data };
  },

  updateStatus: async (id: string, status: Table['status']): Promise<void> => {
    await api.patch(`/tables/${id}/status`, { status });
  },
};
