// Kategoriya interfeysi
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  image?: string;
  parentId?: string;
  parent?: Category;
  subcategories?: Category[];
  displayOrder: number;
  productCount: number;
  subcategoryCount: number;
  status: 'active' | 'inactive';
  showOnReceipt: boolean;
  showAsSection: boolean;
  shortName?: string;
  keywords?: string[];
  createdAt: string;
  updatedAt: string;
}

// Kategoriya yaratish/yangilash uchun DTO
export interface CreateCategoryDto {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  image?: string;
  parentId?: string;
  status?: 'active' | 'inactive';
  displayOrder?: number;
  showOnReceipt?: boolean;
  showAsSection?: boolean;
  shortName?: string;
  keywords?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  id: string;
}

// Filtrlash parametrlari
export interface CategoryFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  parentId: string;
  sortBy: 'name' | 'productCount' | 'createdAt' | 'displayOrder';
  sortOrder: 'asc' | 'desc';
}

// Ko'rinish turlari
export type CategoryViewMode = 'grid' | 'list' | 'tree';
