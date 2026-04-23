import { Request, Response } from 'express';
import { MxikService } from './mxik.service.js';
import { logger } from '../../utils/logger.js';

export class MxikController {

  // ==========================================
  // GET /api/products/:id/mxik
  // ==========================================

  static async getProductMxik(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = await MxikService.getProductMxik(tenantId, req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // POST /api/products/:id/mxik
  // ==========================================

  static async saveProductMxik(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const { id } = req.params;
      const { mxikCode, mxikName, mxikVatRate, mxikExcise, verifiedByAdmin } = req.body;

      if (!mxikCode || typeof mxikCode !== 'string') {
        return res.status(400).json({ success: false, message: 'mxikCode maydoni kerak' });
      }

      if (mxikVatRate !== undefined && ![0, 12, 20].includes(Number(mxikVatRate))) {
        return res.status(400).json({
          success: false,
          message: "QQS stavkasi faqat 0, 12 yoki 20 bo'lishi mumkin",
        });
      }

      const result = await MxikService.saveProductMxik(tenantId, id, {
        mxikCode,
        mxikName: mxikName || undefined,
        mxikVatRate: mxikVatRate !== undefined ? Number(mxikVatRate) : undefined,
        mxikExcise: mxikExcise !== undefined ? Number(mxikExcise) : undefined,
        verifiedByAdmin: verifiedByAdmin === true,
      });

      logger.info('[MXIK] Biriktirildi', { tenantId, productId: id, mxikCode, verified: result.verified });

      res.json({
        success: true,
        message: result.verified
          ? 'MXIK kod saqlandi va Soliq bazasida tasdiqlandi'
          : 'MXIK kod saqlandi (Soliq bazasida tasdiqlanmadi)',
        data: result.product,
        warning: result.warning,
      });
    } catch (err: any) {
      const status = err.message?.includes("noto'g'ri format") ? 400 : 500;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // DELETE /api/products/:id/mxik
  // ==========================================

  static async clearProductMxik(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      await MxikService.clearProductMxik(tenantId, req.params.id);
      logger.info('[MXIK] O\'chirildi', { tenantId, productId: req.params.id });
      res.json({ success: true, message: "MXIK kod o'chirildi" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/product-search?code=...
  // MXIK kodi bo'yicha tenant ichida mahsulot qidirish
  // ==========================================

  static async findProductsByCode(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const { code } = req.query;

      if (!code || String(code).length < 3) {
        return res.status(400).json({ success: false, message: 'Kamida 3 ta raqam kiriting' });
      }

      const products = await MxikService.findProductsByMxikCode(tenantId, String(code));
      res.json({ success: true, data: products, total: products.length });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/stats — MXIK qamrov statistikasi
  // ==========================================

  static async getMxikStats(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const stats = await MxikService.getMxikStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/scan/:barcode
  // ==========================================

  static async scanBarcode(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await MxikService.scanAndPrepareProduct(tenantId, req.params.barcode);

      if (result.existingProduct) {
        return res.json({
          success: true,
          message: 'Bu barcode allaqachon bazada mavjud',
          data: { exists: true, product: result.existingProduct, barcodeInfo: result.barcodeInfo },
        });
      }

      res.json({
        success: true,
        message: result.barcodeInfo.found
          ? "Mahsulot ma'lumotlari topildi"
          : "Barcode bazada topilmadi — qo'lda to'ldiring",
        data: { exists: false, barcode: req.params.barcode, barcodeInfo: result.barcodeInfo, suggestedData: result.suggestedData },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/barcode-mxik/:barcode
  // ==========================================

  static async findMxikByBarcode(req: Request, res: Response) {
    try {
      const result = await MxikService.findMxikByBarcode(req.params.barcode);
      res.json({
        success: true,
        message: result.found ? `MXIK topildi: ${result.code}` : 'Topilmadi',
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/lookup/:code — Soliq bazasida tekshirish
  // ==========================================

  static async lookupMxik(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const validation = MxikService.validateMxikCode(code);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
      const result = await MxikService.lookupMxikCode(code);
      res.json({
        success: true,
        message: result.found ? 'MXIK kod topildi' : 'Soliq bazasida topilmadi',
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/search?q=...  yoki  ?code=...
  // ==========================================

  static async searchMxik(req: Request, res: Response) {
    try {
      const { q, code, limit } = req.query;
      const maxLimit = Math.min(Number(limit) || 20, 50);

      // code — MXIK kodini bevosita qidirish
      if (code) {
        const validation = MxikService.validateMxikCode(String(code));
        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.message });
        }
        const result = await MxikService.lookupMxikCode(String(code));
        return res.json({
          success: true,
          data: { total: result.found ? 1 : 0, items: result.found ? [result] : [] },
        });
      }

      // q — nom bo'yicha qidirish
      if (!q || String(q).length < 2) {
        return res.status(400).json({
          success: false,
          message: 'q (nom bo\'yicha) yoki code (kod bo\'yicha) parametri kerak',
        });
      }

      const result = await MxikService.searchMxik(String(q), maxLimit);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==========================================
  // GET /api/mxik/nonbor/:code
  // ==========================================

  static async checkMxikNonbor(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await MxikService.checkMxikViaNonbor(tenantId, req.params.code);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /** @deprecated POST /api/products/:id/mxik ishlatilsin */
  static async assignMxik(req: Request, res: Response) {
    req.params.id = req.params.productId;
    return MxikController.saveProductMxik(req, res);
  }
}
