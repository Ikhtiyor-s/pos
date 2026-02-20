// Tenant tiplar

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    orders: number;
    products: number;
    tables: number;
    categories?: number;
    customers?: number;
  };
  subscription?: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      slug: string;
    };
    currentPeriodEnd: string;
  } | null;
  settings?: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

export interface TenantStats {
  tenant: { id: string; name: string; slug: string };
  counts: {
    users: number;
    orders: number;
    products: number;
    categories: number;
    tables: number;
    customers: number;
  };
  subscription: {
    id: string;
    status: string;
    plan: { name: string; slug: string };
  } | null;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone?: string;
}

export interface UpdateTenantDto {
  name?: string;
  slug?: string;
  domain?: string | null;
  logo?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface TenantQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
