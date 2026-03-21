import { Request, Response } from 'express';
import { PrinterService } from './printer.service.js';

export class PrinterController {

  // GET /printer/status — XPrinter server holati
  static async getStatus(req: Request, res: Response) {
    try {
      const status = await PrinterService.getStatus();
      res.json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /printer/list — printerlar ro'yxati
  static async listPrinters(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const result = await PrinterService.listPrinters(tenantId);
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /printer/test/:printerId — test chop
  static async testPrint(req: Request, res: Response) {
    try {
      const result = await PrinterService.testPrint(parseInt(req.params.printerId));
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /printer/print/kitchen/:orderId — oshxona chipta
  static async printKitchenTicket(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const result = await PrinterService.printKitchenTicket(req.params.orderId, tenantId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /printer/print/receipt/:orderId — mijoz cheki
  static async printReceipt(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const result = await PrinterService.printReceipt(req.params.orderId, tenantId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /printer/print/daily-report?date=YYYY-MM-DD — kunlik hisobot
  static async printDailyReport(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const date = req.query.date as string || undefined;
      const result = await PrinterService.printDailyReport(tenantId, date);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /printer/jobs — chop etish tarixi
  static async getJobHistory(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID topilmadi' });

      const result = await PrinterService.getJobHistory(tenantId, {
        status: req.query.status as string,
        order_id: req.query.order_id as string,
      });
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /printer/jobs/:jobId/retry — qayta chop etish
  static async retryJob(req: Request, res: Response) {
    try {
      const result = await PrinterService.retryJob(parseInt(req.params.jobId));
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
