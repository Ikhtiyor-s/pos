import api from './api';

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

// Prisma returns Decimal fields as strings — convert to number
const normalizeProduct = (p: Product): Product => ({
  ...p,
  price: Number(p.price) || 0,
});

export const productService = {
  getAll: async (categoryId?: string): Promise<ProductsResponse> => {
    const params = categoryId ? { categoryId } : {};
    const { data: response } = await api.get('/products', { params });
    // API returns { success, data: [...products] } with price as string (Decimal)
    return { data: (response.data || []).map(normalizeProduct) };
  },

  getById: async (id: string): Promise<{ data: Product }> => {
    const { data: response } = await api.get(`/products/${id}`);
    return { data: normalizeProduct(response.data) };
  },
};

export const categoryService = {
  getAll: async (): Promise<CategoriesResponse> => {
    const { data: response } = await api.get('/categories');
    // API returns { success, data: [...categories] }
    return { data: response.data || [] };
  },
};
