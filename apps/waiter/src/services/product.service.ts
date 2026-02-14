import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface Product {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  isActive: boolean;
  cookingTime?: number;
}

export interface Category {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  slug: string;
  image?: string;
  isActive: boolean;
}

interface ProductsResponse {
  data: Product[];
}

interface CategoriesResponse {
  data: Category[];
}

export const productService = {
  getAll: async (categoryId?: string): Promise<ProductsResponse> => {
    const params = categoryId ? { categoryId } : {};
    const { data } = await api.get('/products', { params });
    return data;
  },

  getById: async (id: string): Promise<{ data: Product }> => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },
};

export const categoryService = {
  getAll: async (): Promise<CategoriesResponse> => {
    const { data } = await api.get('/categories');
    return data;
  },
};
