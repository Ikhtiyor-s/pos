// Mahsulot turi
export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: Category;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: 'dona' | 'kg' | 'litr' | 'porsiya';
  image?: string;
  status: 'active' | 'inactive';
  barcode?: string;
  sku: string;
  cookingTime?: number; // minutlarda
  calories?: number;
  createdAt: string;
  updatedAt: string;
}

// Kategoriya turi
export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount?: number;
}

// Filtrlash parametrlari
export interface ProductFilters {
  search: string;
  categoryId: string;
  status: 'all' | 'active' | 'inactive';
  stockStatus: 'all' | 'inStock' | 'lowStock' | 'outOfStock';
  priceRange: {
    min: number;
    max: number;
  };
  sortBy: 'name' | 'price' | 'stock' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API javob turi
export interface ProductsResponse {
  products: Product[];
  pagination: Pagination;
}

// Mahsulot yaratish/yangilash uchun DTO
export interface CreateProductDto {
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: Product['unit'];
  image?: string;
  status?: Product['status'];
  barcode?: string;
  sku?: string;
  cookingTime?: number;
  calories?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  id: string;
}
