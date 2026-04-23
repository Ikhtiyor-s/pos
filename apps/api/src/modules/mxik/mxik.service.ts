import { prisma } from '@oshxona/database';

// ==========================================
// MXIK (Mahsulot va Xizmatlar Identifikatsiya Kodi)
// Soliq.uz bazasidan MXIK kodni tekshirish
//
// API: https://tasnif.soliq.uz/api/cls-api/
// Nonbor API orqali ham tekshirish
// ==========================================

interface MxikResult {
  code: string;
  name: string;
  nameRu?: string;
  groupName?: string;
  groupCode?: string;
  className?: string;
  classCode?: string;
  positionName?: string;
  subPositionName?: string;
  brandName?: string;
  attributeName?: string;
  unitCode?: string;
  unitName?: string;
  packageCode?: string;
  packageName?: string;
  found: boolean;
}

interface MxikSearchResult {
  total: number;
  items: MxikResult[];
}

interface BarcodeProductInfo {
  barcode: string;
  found: boolean;
  name?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  weight?: string;
  country?: string;
  mxikCode?: string;
  imageUrl?: string;
  description?: string;
}

export class MxikService {

  // ==========================================
  // MXIK KODNI SOLIQ BAZASIDAN TEKSHIRISH
  // https://tasnif.soliq.uz/api/cls-api/
  // ==========================================

  static async lookupMxikCode(code: string): Promise<MxikResult> {
    try {
      // Tasnif Soliq API — to'g'ri endpoint (flutter_billing_app dan olingan)
      const response = await fetch(
        `https://tasnif.soliq.uz/api/cls-api/integration-mxik/get/history/${encodeURIComponent(code)}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'OshxonaPOS/3.0',
          },
        }
      );

      if (!response.ok) {
        return { code, name: '', found: false };
      }

      const json = await response.json() as any;
      const data = json.data || json;

      if (data && typeof data === 'object' && (data.mxikCode || data.name)) {
        return {
          code: data.mxikCode || code,
          name: data.name || data.groupName || '',
          nameRu: data.nameRu || '',
          groupName: data.groupName || '',
          groupCode: data.groupCode || '',
          className: data.className || '',
          classCode: data.classCode || '',
          positionName: data.positionName || '',
          subPositionName: data.subPositionName || '',
          brandName: data.brandName || '',
          attributeName: data.attributeName || '',
          unitCode: data.unitCode || '',
          unitName: data.unitName || '',
          packageCode: data.packageCode || '',
          packageName: data.packageName || '',
          found: true,
        };
      }

      return { code, name: '', found: false };
    } catch (error) {
      console.error('[MXIK] Soliq API xatolik:', error);
      return { code, name: '', found: false };
    }
  }

  // ==========================================
  // MXIK KODNI QIDIRISH (nomi bo'yicha)
  // ==========================================

  static async searchMxik(query: string, limit: number = 20): Promise<MxikSearchResult> {
    try {
      // Tasnif Soliq API — elasticsearch endpoint (flutter_billing_app dan olingan)
      const response = await fetch(
        `https://tasnif.soliq.uz/api/cls-api/elasticsearch/search?search=${encodeURIComponent(query)}&size=${limit}&page=0&lang=uz`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'OshxonaPOS/3.0',
          },
        }
      );

      if (!response.ok) {
        return { total: 0, items: [] };
      }

      const json = await response.json() as any;
      const items = Array.isArray(json.data) ? json.data : (json.data?.content || json.content || []);

      return {
        total: items.length,
        items: items.map((item: any) => ({
          code: item.mxikCode || item.code || '',
          name: item.groupName || item.name || '',
          nameRu: item.groupNameRu || item.nameRu || '',
          groupName: item.groupName || '',
          groupCode: item.groupCode || '',
          className: item.className || '',
          classCode: item.classCode || '',
          positionName: item.positionName || '',
          subPositionName: item.subPositionName || '',
          brandName: item.brandName || '',
          attributeName: item.attributeName || '',
          unitCode: item.unitCode || '',
          unitName: item.unitName || '',
          found: true,
        })),
      };
    } catch (error) {
      console.error('[MXIK] Search xatolik:', error);
      return { total: 0, items: [] };
    }
  }

  // ==========================================
  // BARCODE (GTIN) ORQALI MXIK KODNI TOPISH
  // flutter_billing_app dagi searchByBarcode dan olingan
  // ==========================================

  static async findMxikByBarcode(barcode: string): Promise<MxikResult> {
    try {
      const response = await fetch(
        `https://tasnif.soliq.uz/api/cls-api/mxik/search/by-params?gtin=${encodeURIComponent(barcode)}&size=1&page=0&lang=uz`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'OshxonaPOS/3.0',
          },
        }
      );

      if (!response.ok) {
        return { code: '', name: '', found: false };
      }

      const json = await response.json() as any;
      const content = json.data?.content;

      if (Array.isArray(content) && content.length > 0) {
        const item = content[0];
        return {
          code: item.mxikCode || '',
          name: item.mxikName || item.name || '',
          groupName: item.groupName || '',
          groupCode: item.groupCode || '',
          className: item.className || '',
          classCode: item.classCode || '',
          brandName: item.brandName || '',
          unitName: item.unitName || item.unitsName || '',
          found: true,
        };
      }

      return { code: '', name: '', found: false };
    } catch (error) {
      console.error('[MXIK] Barcode→MXIK xatolik:', error);
      return { code: '', name: '', found: false };
    }
  }

  // ==========================================
  // NONBOR API ORQALI MXIK TEKSHIRISH
  // ==========================================

  static async checkMxikViaNonbor(tenantId: string, mxikCode: string): Promise<{
    exists: boolean;
    nonborProduct?: any;
    message: string;
  }> {
    try {
      // Nonbor API dan tenant settings olish
      const settings = await prisma.settings.findUnique({
        where: { tenantId },
      });

      const nonborApiKey = settings?.nonborApiSecret;
      if (!nonborApiKey || !settings?.nonborEnabled) {
        return { exists: false, message: 'Nonbor API kaliti sozlanmagan' };
      }

      const response = await fetch(
        `https://api.nonbor.uz/api/v1/products/mxik/${encodeURIComponent(mxikCode)}`,
        {
          headers: {
            'Authorization': `Bearer ${nonborApiKey}`,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json() as any;
        return {
          exists: true,
          nonborProduct: data.data || data,
          message: 'MXIK kod Nonbor da mavjud',
        };
      }

      return { exists: false, message: 'MXIK kod Nonbor da topilmadi' };
    } catch {
      return { exists: false, message: 'Nonbor API ga ulanib bo\'lmadi' };
    }
  }

  // ==========================================
  // BARCODE ORQALI MAHSULOT MA'LUMOTLARINI OLISH
  // Open Food Facts + UPC Database
  // ==========================================

  static async lookupBarcode(barcode: string): Promise<BarcodeProductInfo> {
    try {
      // 1. Open Food Facts API (bepul, global)
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
        { headers: { 'User-Agent': 'OshxonaPOS/3.0' } }
      );

      if (offResponse.ok) {
        const data = await offResponse.json() as any;
        if (data.status === 1 && data.product) {
          const p = data.product;
          return {
            barcode,
            found: true,
            name: p.product_name || p.product_name_uz || p.product_name_ru || p.product_name_en || '',
            brand: p.brands || '',
            manufacturer: p.manufacturing_places || '',
            category: p.categories || '',
            weight: p.quantity || p.net_weight || '',
            country: p.countries || p.origins || '',
            imageUrl: p.image_url || p.image_front_url || '',
            description: p.generic_name || '',
          };
        }
      }

      // 2. Agar Open Food Facts da topilmasa
      return {
        barcode,
        found: false,
      };
    } catch (error) {
      console.error('[Barcode] Lookup xatolik:', error);
      return { barcode, found: false };
    }
  }

  // ==========================================
  // BARCODE SCAN → PRODUCT FORM AUTO-FILL
  // Admin mahsulot qo'shishda barcode skanerlanganda
  // ==========================================

  static async scanAndPrepareProduct(tenantId: string, barcode: string): Promise<{
    barcode: string;
    existingProduct: any | null;
    barcodeInfo: BarcodeProductInfo;
    mxikResult: MxikResult | null;
    suggestedData: {
      name: string;
      brand: string;
      weight: string;
      category: string;
      image: string;
      description: string;
      country: string;
      mxikCode: string;
      mxikName: string;
    };
  }> {
    // 1. Avval bizning bazada bor-yo'qligini tekshirish
    const existingProduct = await prisma.product.findFirst({
      where: { barcode, tenantId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    // 2. Tashqi bazadan ma'lumot olish (Open Food Facts + Open Beauty Facts)
    const barcodeInfo = await this.lookupBarcode(barcode);

    // 3. Barcode orqali MXIK kodni avtomatik topish (Soliq bazasi)
    const mxikResult = await this.findMxikByBarcode(barcode);

    return {
      barcode,
      existingProduct,
      barcodeInfo,
      mxikResult: mxikResult.found ? mxikResult : null,
      suggestedData: {
        name: barcodeInfo.name || '',
        brand: barcodeInfo.brand || '',
        weight: barcodeInfo.weight || '',
        category: barcodeInfo.category || '',
        image: barcodeInfo.imageUrl || '',
        description: barcodeInfo.description || '',
        country: barcodeInfo.country || '',
        mxikCode: mxikResult.found ? mxikResult.code : '',
        mxikName: mxikResult.found ? mxikResult.name : '',
      },
    };
  }

  // ==========================================
  // MAHSULOTGA MXIK KOD BIRIKTIRISH
  // ==========================================

  // ==========================================
  // VALIDATSIYA: O'zbekiston MXIK standart
  // 10–14 ta raqam
  // ==========================================

  static validateMxikCode(code: string): { valid: boolean; message?: string } {
    const clean = code.trim().replace(/\s/g, '');
    if (!/^\d{10,14}$/.test(clean)) {
      return {
        valid: false,
        message: `MXIK kod 10–14 ta raqamdan iborat bo'lishi kerak. "${code}" noto'g'ri format.`,
      };
    }
    return { valid: true };
  }

  // ==========================================
  // MAHSULOT MXIK MA'LUMOTLARINI OLISH
  // ==========================================

  static async getProductMxik(tenantId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId, tenantId },
      select: {
        id: true,
        name: true,
        mxikCode: true,
        mxikName: true,
        mxikVatRate: true,
        mxikExcise: true,
        mxikVerified: true,
      },
    });

    if (!product) return null;
    return {
      productId: product.id,
      productName: product.name,
      mxikCode: product.mxikCode,
      mxikName: product.mxikName,
      mxikVatRate: product.mxikVatRate,
      mxikExcise: product.mxikExcise ? Number(product.mxikExcise) : null,
      mxikVerified: product.mxikVerified,
    };
  }

  // ==========================================
  // MAHSULOT MXIK MA'LUMOTLARINI SAQLASH
  // ==========================================

  static async saveProductMxik(
    tenantId: string,
    productId: string,
    data: {
      mxikCode: string;
      mxikName?: string;
      mxikVatRate?: number;
      mxikExcise?: number;
      verifiedByAdmin?: boolean;
    },
  ) {
    // 1. Validatsiya
    const validation = this.validateMxikCode(data.mxikCode);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // 2. Soliq bazasida tekshirish (natijaga qarab mxikVerified o'rnatiladi)
    const lookup = await this.lookupMxikCode(data.mxikCode);

    const mxikName = data.mxikName || (lookup.found ? lookup.name : undefined);
    const isVerified = lookup.found || (data.verifiedByAdmin === true);

    // 3. Mahsulotni yangilash
    const product = await prisma.product.update({
      where: { id: productId, tenantId },
      data: {
        mxikCode: data.mxikCode.trim(),
        mxikName: mxikName || undefined,
        mxikVatRate: data.mxikVatRate ?? (lookup.found ? 12 : undefined),
        mxikExcise: data.mxikExcise ?? undefined,
        mxikVerified: isVerified,
      },
      select: {
        id: true,
        name: true,
        mxikCode: true,
        mxikName: true,
        mxikVatRate: true,
        mxikExcise: true,
        mxikVerified: true,
      },
    });

    return {
      product,
      lookedUp: lookup,
      verified: isVerified,
      warning: !lookup.found && !data.verifiedByAdmin
        ? "MXIK kod Soliq bazasida topilmadi. Tasnif.soliq.uz dan tekshiring."
        : null,
    };
  }

  // ==========================================
  // MAHSULOT MXIK KODINI O'CHIRISH
  // ==========================================

  static async clearProductMxik(tenantId: string, productId: string) {
    return prisma.product.update({
      where: { id: productId, tenantId },
      data: {
        mxikCode: null,
        mxikName: null,
        mxikVatRate: null,
        mxikExcise: null,
        mxikVerified: false,
      },
    });
  }

  // ==========================================
  // MXIK KODI BO'YICHA MAHSULOT QIDIRISH
  // GET /api/mxik/search?code=...
  // ==========================================

  static async findProductsByMxikCode(tenantId: string, mxikCode: string) {
    return prisma.product.findMany({
      where: { mxikCode: { contains: mxikCode }, tenantId },
      select: {
        id: true,
        name: true,
        price: true,
        mxikCode: true,
        mxikName: true,
        mxikVatRate: true,
        mxikVerified: true,
        category: { select: { id: true, name: true } },
      },
    });
  }

  // ==========================================
  // TENANT MXIK STATISTIKASI
  // ==========================================

  static async getMxikStats(tenantId: string) {
    const [total, withMxik, verified] = await Promise.all([
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.product.count({ where: { tenantId, mxikCode: { not: null } } }),
      prisma.product.count({ where: { tenantId, mxikVerified: true } }),
    ]);

    return {
      totalProducts: total,
      withMxikCode: withMxik,
      verifiedMxik: verified,
      withoutMxik: total - withMxik,
      coveragePercent: total > 0 ? Math.round((withMxik / total) * 100) : 0,
    };
  }

  // ==========================================
  // ESKI: assignMxikToProduct (deprecated, saveProductMxik ishlatilsin)
  // ==========================================

  /** @deprecated saveProductMxik() ishlatilsin */
  static async assignMxikToProduct(
    tenantId: string,
    productId: string,
    mxikCode: string,
  ) {
    return this.saveProductMxik(tenantId, productId, { mxikCode });
  }
}
