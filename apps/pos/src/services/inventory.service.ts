import api from './api';

export interface LowStockItem {
  id: string;
  name: string;
  nameRu?: string;
  sku: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  isActive: boolean;
  supplierName?: string;
}

export const inventoryService = {
  getLowStock: async (): Promise<LowStockItem[]> => {
    const { data: response } = await api.get('/inventory/low-stock');
    return response.data || [];
  },
};
