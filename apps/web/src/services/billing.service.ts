import api from '@/lib/api';
import type {
  Plan,
  CreatePlanDto,
  Subscription,
  CreateSubscriptionDto,
  UpdateResourcesDto,
  OverridePriceDto,
  BillingInvoice,
  GenerateInvoiceDto,
  PayInvoiceDto,
  InvoiceBreakdown,
  UsageData,
  InvoiceSummary,
  Integration,
  InvoiceStatus,
} from '@/types/billing';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    invoices: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ============ PLANS ============

export const billingService = {
  // Tarif rejalar
  async getPlans(isActive?: boolean): Promise<Plan[]> {
    const params = isActive !== undefined ? { isActive: String(isActive) } : {};
    const res = await api.get<ApiResponse<Plan[]>>('/billing/plans', { params });
    return res.data.data;
  },

  async getPlan(id: string): Promise<Plan> {
    const res = await api.get<ApiResponse<Plan>>(`/billing/plans/${id}`);
    return res.data.data;
  },

  async createPlan(data: CreatePlanDto): Promise<Plan> {
    const res = await api.post<ApiResponse<Plan>>('/billing/plans', data);
    return res.data.data;
  },

  async updatePlan(id: string, data: Partial<CreatePlanDto>): Promise<Plan> {
    const res = await api.put<ApiResponse<Plan>>(`/billing/plans/${id}`, data);
    return res.data.data;
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/billing/plans/${id}`);
  },

  // Obuna
  async getSubscription(): Promise<Subscription | null> {
    const res = await api.get<ApiResponse<Subscription | null>>('/billing/subscription');
    return res.data.data;
  },

  async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
    const res = await api.post<ApiResponse<Subscription>>('/billing/subscription', data);
    return res.data.data;
  },

  async updateResources(data: UpdateResourcesDto): Promise<Subscription> {
    const res = await api.put<ApiResponse<Subscription>>('/billing/subscription/resources', data);
    return res.data.data;
  },

  async overridePrice(data: OverridePriceDto): Promise<Subscription> {
    const res = await api.put<ApiResponse<Subscription>>('/billing/subscription/override', data);
    return res.data.data;
  },

  // Hisob-fakturalar
  async getInvoices(params?: {
    status?: InvoiceStatus;
    year?: number;
    month?: number;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: BillingInvoice[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const res = await api.get<PaginatedResponse<BillingInvoice>>('/billing/invoices', { params });
    return res.data.data;
  },

  async getInvoice(id: string): Promise<{ invoice: BillingInvoice; breakdown: InvoiceBreakdown }> {
    const res = await api.get<ApiResponse<{ invoice: BillingInvoice; breakdown: InvoiceBreakdown }>>(`/billing/invoices/${id}`);
    return res.data.data;
  },

  async generateInvoice(data: GenerateInvoiceDto): Promise<BillingInvoice> {
    const res = await api.post<ApiResponse<BillingInvoice>>('/billing/invoices', data);
    return res.data.data;
  },

  async payInvoice(id: string, data: PayInvoiceDto): Promise<BillingInvoice> {
    const res = await api.post<ApiResponse<BillingInvoice>>(`/billing/invoices/${id}/pay`, data);
    return res.data.data;
  },

  async cancelInvoice(id: string): Promise<BillingInvoice> {
    const res = await api.post<ApiResponse<BillingInvoice>>(`/billing/invoices/${id}/cancel`);
    return res.data.data;
  },

  async getInvoiceSummary(): Promise<InvoiceSummary> {
    const res = await api.get<ApiResponse<InvoiceSummary>>('/billing/invoices/summary');
    return res.data.data;
  },

  async checkOverdue(): Promise<{ updated: number }> {
    const res = await api.post<ApiResponse<{ updated: number }>>('/billing/invoices/check-overdue');
    return res.data.data;
  },

  // Foydalanish
  async getUsage(): Promise<UsageData> {
    const res = await api.get<ApiResponse<UsageData>>('/billing/usage');
    return res.data.data;
  },

  // Integratsiyalar
  async getIntegrations(): Promise<Integration[]> {
    const res = await api.get<ApiResponse<Integration[]>>('/integrations');
    return res.data.data;
  },

  async toggleIntegration(id: string): Promise<Integration> {
    const res = await api.post<ApiResponse<Integration>>(`/integrations/${id}/toggle`);
    return res.data.data;
  },

  async updateIntegrationConfig(id: string, config: Record<string, string>): Promise<Integration> {
    const res = await api.put<ApiResponse<Integration>>(`/integrations/${id}/config`, config);
    return res.data.data;
  },

  async testIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<ApiResponse<{ success: boolean; message: string }>>(`/integrations/${id}/test`);
    return res.data.data;
  },
};
