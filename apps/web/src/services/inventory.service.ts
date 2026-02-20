import api from '@/lib/api';

export interface InventoryItemApi {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  supplierId?: string;
  supplier?: { id: string; name: string };
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransactionApi {
  id: string;
  itemId: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'WASTE';
  quantity: number;
  notes?: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string };
  createdAt: string;
  item?: InventoryItemApi;
}

export const inventoryApiService = {
  async getAll(params?: { search?: string; page?: number; limit?: number }) {
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  async getById(id: string): Promise<InventoryItemApi> {
    const response = await api.get(`/inventory/${id}`);
    return response.data.data;
  },

  async create(data: {
    name: string;
    sku: string;
    unit: string;
    quantity?: number;
    minQuantity?: number;
    costPrice?: number;
  }): Promise<InventoryItemApi> {
    const response = await api.post('/inventory', data);
    return response.data.data;
  },

  async addTransaction(itemId: string, data: {
    type: 'IN' | 'OUT' | 'ADJUST' | 'WASTE';
    quantity: number;
    notes?: string;
  }): Promise<InventoryTransactionApi> {
    const response = await api.post(`/inventory/${itemId}/transaction`, data);
    return response.data.data;
  },
};
