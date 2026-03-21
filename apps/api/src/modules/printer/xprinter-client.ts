// ==========================================
// XPRINTER HTTP CLIENT
// XPrinter Django serveri bilan aloqa qiluvchi HTTP adapter
// XPrinter loyihasini qayta yozmasdan, uning API sidan foydalanamiz
// ==========================================

export interface XPrinterConfig {
  baseUrl: string;  // XPrinter Django server URL (default: http://localhost:8000)
  apiPrefix: string; // API prefix (default: /api/v2)
  timeout: number;
}

export interface XPrinterResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface XPrinter {
  id: number;
  business_id: number;
  name: string;
  connection_type: 'network' | 'usb' | 'cloud' | 'wifi';
  ip_address?: string;
  port: number;
  usb_path?: string;
  printer_model: string;
  paper_width: 58 | 80;
  is_active: boolean;
  auto_print: boolean;
  is_admin: boolean;
}

export interface XPrintJob {
  id: number;
  business_id: number;
  printer: number;
  order_id: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  content_text: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface PrintOrderPayload {
  order_id: string;
  order_number: string;
  business_name: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  delivery_method?: string;
  payment_method?: string;
  order_type?: string;
  comment?: string;
  items: Array<{
    id: number | string;
    name: string;
    quantity: number;
    price: number;
    total_price: number;
    modifiers?: Array<{ name: string; quantity: number; price: number }>;
    comment?: string;
  }>;
  business_id: number;
}

export interface PrintResult {
  success: boolean;
  printed: boolean;
  jobs_count: number;
  completed: number;
  failed: number;
  message: string;
}

export class XPrinterClient {
  private config: XPrinterConfig;

  constructor(config?: Partial<XPrinterConfig>) {
    this.config = {
      baseUrl: process.env.XPRINTER_URL || 'http://localhost:8000',
      apiPrefix: process.env.XPRINTER_API_PREFIX || '/api/v2',
      timeout: parseInt(process.env.XPRINTER_TIMEOUT || '10000'),
      ...config,
    };
  }

  private get url(): string {
    return `${this.config.baseUrl}${this.config.apiPrefix}`;
  }

  // ==========================================
  // HTTP helpers
  // ==========================================

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    params?: Record<string, string>,
  ): Promise<XPrinterResponse<T>> {
    try {
      const url = new URL(`${this.url}${path}`);
      if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url.toString(), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json() as Record<string, any>;

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return { success: true, data: data as T, ...(data as Record<string, any>) };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'XPrinter server javob bermayapti (timeout)' };
      }
      return { success: false, error: `XPrinter ulanish xatosi: ${error.message}` };
    }
  }

  // ==========================================
  // PRINTER MANAGEMENT
  // ==========================================

  async listPrinters(businessId: number): Promise<XPrinterResponse<XPrinter[]>> {
    return this.request('GET', '/printer/list/', undefined, { business_id: String(businessId) });
  }

  async createPrinter(data: Partial<XPrinter>): Promise<XPrinterResponse<XPrinter>> {
    return this.request('POST', '/printer/create/', data);
  }

  async updatePrinter(id: number, data: Partial<XPrinter>): Promise<XPrinterResponse<XPrinter>> {
    return this.request('PUT', `/printer/${id}/update/`, data);
  }

  async deletePrinter(id: number): Promise<XPrinterResponse> {
    return this.request('DELETE', `/printer/${id}/delete/`);
  }

  async testPrint(id: number): Promise<XPrinterResponse> {
    return this.request('POST', `/printer/${id}/test-print/`);
  }

  // ==========================================
  // PRINT JOBS
  // ==========================================

  async printOrder(orderId: string, payload: PrintOrderPayload): Promise<XPrinterResponse<PrintResult>> {
    return this.request('POST', `/print-job/print-order/${orderId}/`, payload);
  }

  async sendWebhook(data: PrintOrderPayload): Promise<XPrinterResponse<PrintResult>> {
    return this.request('POST', '/print-job/webhook/', data);
  }

  async listJobs(businessId: number, filters?: {
    status?: string;
    printer_id?: number;
    order_id?: string;
  }): Promise<XPrinterResponse<XPrintJob[]>> {
    const params: Record<string, string> = { business_id: String(businessId) };
    if (filters?.status) params.status = filters.status;
    if (filters?.printer_id) params.printer_id = String(filters.printer_id);
    if (filters?.order_id) params.order_id = filters.order_id;
    return this.request('GET', '/print-job/list/', undefined, params);
  }

  async retryJob(jobId: number): Promise<XPrinterResponse> {
    return this.request('POST', `/print-job/${jobId}/retry/`);
  }

  // ==========================================
  // CATEGORY/PRODUCT MAPPING
  // ==========================================

  async assignCategory(printerId: number, categoryId: number, businessId: number): Promise<XPrinterResponse> {
    return this.request('POST', '/printer-category/assign/', {
      printer: printerId,
      category_id: categoryId,
      business_id: businessId,
    });
  }

  async listCategoryMappings(businessId: number): Promise<XPrinterResponse> {
    return this.request('GET', '/printer-category/list/', undefined, { business_id: String(businessId) });
  }

  // ==========================================
  // RECEIPT TEMPLATES
  // ==========================================

  async getReceiptTemplate(businessId: number): Promise<XPrinterResponse> {
    return this.request('GET', `/receipt-template/${businessId}/detail/`);
  }

  async saveReceiptTemplate(data: any): Promise<XPrinterResponse> {
    return this.request('POST', '/receipt-template/save/', data);
  }

  // ==========================================
  // HEALTH CHECK
  // ==========================================

  async healthCheck(): Promise<{ online: boolean; url: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.config.baseUrl}/api/v2/printer/list/?business_id=0`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return { online: response.ok || response.status === 400, url: this.config.baseUrl };
    } catch (error: any) {
      return { online: false, url: this.config.baseUrl, error: error.message };
    }
  }
}

export const xprinterClient = new XPrinterClient();
