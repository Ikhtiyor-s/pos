import api from './api';

export interface Category {
  id: string;
  name: string;
  nameRu?: string;
  slug: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  nameRu?: string;
  price: number;
  costPrice?: number;
  categoryId: string;
  cookingTime?: number;
  image?: string;
  barcode?: string;
  isActive: boolean;
}

export const productService = {
  getAll: async (params?: { categoryId?: string; search?: string }): Promise<Product[]> => {
    const { data: response } = await api.get('/products', { params: { ...params, limit: 200 } });
    return response.data?.data || response.data || [];
  },

  getById: async (id: string): Promise<Product> => {
    const { data: response } = await api.get(`/products/${id}`);
    return response.data;
  },

  getByBarcode: async (barcode: string): Promise<Product> => {
    const { data: response } = await api.get(`/products/barcode/${barcode}`);
    return response.data;
  },
};

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const { data: response } = await api.get('/categories');
    return response.data || [];
  },
};
