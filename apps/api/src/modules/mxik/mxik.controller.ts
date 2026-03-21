import { Request, Response } from 'express';
import { MxikService } from './mxik.service.js';

export class MxikController {

  // ==========================================
  // BARCODE SKANERLASH → MAHSULOT MA'LUMOTLARI
  // Admin mahsulot qo'shish formasi uchun
  // ==========================================

  static async scanBarcode(req: Request, res: Response) {
    try {
      const { barcode } = req.params;
      const tenantId = req.user!.tenantId!;

      const result = await MxikService.scanAndPrepareProduct(tenantId, barcode);

      if (result.existingProduct) {
        return res.json({
          success: true,
          message: 'Bu barcode allaqachon bazada mavjud',
          data: {
            exists: true,
            product: result.existingProduct,
            barcodeInfo: result.barcodeInfo,
          },
        });
      }

      res.json({
        success: true,
        message: result.barcodeInfo.found
          ? 'Mahsulot ma\'lumotlari topildi — forma avtomatik to\'ldirildi'
          : 'Barcode bazada topilmadi — qo\'lda to\'ldiring',
        data: {
          exists: false,
          barcode,
          barcodeInfo: result.barcodeInfo,
          suggestedData: result.suggestedData,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Xatolik' });
    }
  }

  // ==========================================
  // MXIK KOD TEKSHIRISH (Soliq bazasi)
  // ==========================================

  static async lookupMxik(req: Request, res: Response) {
    try {
      const { code } = req.params;

      const result = await MxikService.lookupMxikCode(code);

      if (!result.found) {
        return res.json({
          success: true,
          message: 'MXIK kod Soliq bazasida topilmadi. Tasnif.soliq.uz dan to\'g\'ri kodni toping.',
          data: {
            found: false,
            code,
            warning: 'Bu MXIK kod tasnif soliq bazasida mavjud emas. To\'g\'ri MXIK kodni kiriting.',
          },
        });
      }

      res.json({
        success: true,
        message: 'MXIK kod topildi',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Xatolik' });
    }
  }

  // ==========================================
  // MXIK QIDIRISH (nomi bo'yicha)
  // ==========================================

  static async searchMxik(req: Request, res: Response) {
    try {
      const { q, limit } = req.query;

      if (!q || String(q).length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Kamida 2 ta belgi kiriting',
        });
      }

      const result = await MxikService.searchMxik(
        String(q),
        Math.min(Number(limit) || 20, 50),
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Xatolik' });
    }
  }

  // ==========================================
  // NONBOR ORQALI MXIK TEKSHIRISH
  // ==========================================

  static async checkMxikNonbor(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const tenantId = req.user!.tenantId!;

      const result = await MxikService.checkMxikViaNonbor(tenantId, code);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Xatolik' });
    }
  }

  // ==========================================
  // MAHSULOTGA MXIK KOD BIRIKTIRISH
  // ==========================================

  static async assignMxik(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { mxikCode } = req.body;
      const tenantId = req.user!.tenantId!;

      if (!mxikCode) {
        return res.status(400).json({
          success: false,
          message: 'MXIK kodni kiriting',
        });
      }

      const result = await MxikService.assignMxikToProduct(tenantId, productId, mxikCode);

      res.json({
        success: true,
        message: result.verified
          ? 'MXIK kod muvaffaqiyatli biriktirildi'
          : 'MXIK kod biriktirildi, lekin Soliq bazasida tasdiqlanmadi',
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Xatolik' });
    }
  }
}
