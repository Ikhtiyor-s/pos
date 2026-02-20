export interface Branch {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  parentId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    orders: number;
    products: number;
    tables: number;
    categories: number;
    customers: number;
  };
  users?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  }>;
}

export interface CreateBranchDto {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
  managerEmail: string;
  managerPassword: string;
  managerFirstName: string;
  managerLastName: string;
  managerPhone?: string;
}

export interface UpdateBranchDto {
  name?: string;
  slug?: string;
  phone?: string | null;
  address?: string | null;
}

export interface BranchQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
