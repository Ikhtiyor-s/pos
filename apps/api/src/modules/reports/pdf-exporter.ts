import PDFDocumentCtor from 'pdfkit';
// PDFKit exports the constructor as default; use InstanceType for parameter types
type PDFDocument = InstanceType<typeof PDFDocumentCtor>;
import type {
  SalesReportData,
  FinancialReportData,
  ProductRatingData,
  StaffReportData,
  WarehouseReportData,
  TaxReportData,
} from './report-data.service.js';

// ==========================================
// PDF EXPORTER
// PDFKit-based report generation
// ==========================================

const BLUE = '#1E40AF';
const GRAY = '#6B7280';
const LIGHT = '#EFF6FF';
const BLACK = '#111827';

function num(v: number) { return v.toLocaleString('uz-UZ', { maximumFractionDigits: 0 }); }

async function buildBuffer(callback: (doc: PDFDocument) => void): Promise<Buffer> {
  const doc = new PDFDocumentCtor({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<void>(resolve => doc.on('end', resolve));
  callback(doc);
  doc.end();
  await done;
  return Buffer.concat(chunks);
}

function header(doc: PDFDocument, title: string, subtitle: string) {
  doc.rect(0, 0, doc.page.width, 70).fill(BLUE);
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
    .text('Oshxona POS', 40, 18);
  doc.fontSize(11).font('Helvetica').text(title, 40, 40);
  doc.fillColor(GRAY).fontSize(9).text(subtitle, 40, 56);
  doc.fillColor(BLACK);
  doc.moveDown(2);
}

function sectionTitle(doc: PDFDocument, text: string) {
  doc.moveDown(0.5);
  doc.rect(40, doc.y, doc.page.width - 80, 20).fill(LIGHT);
  doc.fillColor(BLUE).fontSize(11).font('Helvetica-Bold')
    .text(text, 46, doc.y - 17);
  doc.fillColor(BLACK).moveDown(0.4);
}

function twoCol(doc: PDFDocument, label: string, value: string) {
  const y = doc.y;
  doc.fontSize(10).font('Helvetica').fillColor(GRAY).text(label, 46, y, { width: 220 });
  doc.font('Helvetica-Bold').fillColor(BLACK).text(value, 280, y, { width: 240, align: 'right' });
  doc.moveDown(0.35);
}

type TableRow = (string | number)[];

function table(doc: PDFDocument, headers: string[], rows: TableRow[], colWidths: number[]) {
  const startX = 40;
  const rowH = 18;
  let y = doc.y + 4;

  // Header
  doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill(BLUE);
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
      .text(h, x + 4, y + 5, { width: colWidths[i] - 8, align: i > 0 ? 'right' : 'left' });
    x += colWidths[i];
  });
  y += rowH;

  rows.forEach((row, ri) => {
    if (y + rowH > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    if (ri % 2 === 0) {
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill(LIGHT);
    }
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(BLACK).fontSize(9).font('Helvetica')
        .text(String(cell), x + 4, y + 5, { width: colWidths[i] - 8, align: i > 0 ? 'right' : 'left' });
      x += colWidths[i];
    });
    y += rowH;
  });
  doc.y = y + 8;
}

// ==========================================
// SALES PDF
// ==========================================

export async function exportSalesPdf(data: SalesReportData): Promise<Buffer> {
  return buildBuffer(doc => {
    header(doc,
      'Sotuv hisoboti',
      `Davr: ${data.period.from} — ${data.period.to}  |  Yaratildi: ${new Date().toLocaleDateString('uz-UZ')}`,
    );

    sectionTitle(doc, 'Umumiy ko\'rsatkichlar');
    twoCol(doc, 'Jami buyurtmalar', String(data.summary.totalOrders));
    twoCol(doc, 'Bajarilgan', String(data.summary.completedOrders));
    twoCol(doc, 'Bekor qilingan', String(data.summary.cancelledOrders));
    twoCol(doc, "Jami daromad", `${num(data.summary.totalRevenue)} so'm`);
    twoCol(doc, "O'rtacha chek", `${num(data.summary.avgCheck)} so'm`);
    twoCol(doc, "Chegirma", `${num(data.summary.totalDiscount)} so'm`);

    sectionTitle(doc, 'Kunlik sotuv');
    table(doc,
      ['Sana', 'Buyurtmalar', "Daromad (so'm)"],
      data.byDay.map(d => [d.date, d.count, num(d.revenue)]),
      [180, 120, 215],
    );

    sectionTitle(doc, 'Top 10 mahsulot');
    table(doc,
      ['Mahsulot', 'Miqdor', "Daromad (so'm)"],
      data.topProducts.slice(0, 10).map(p => [p.name, p.quantity, num(p.revenue)]),
      [260, 80, 175],
    );

    sectionTitle(doc, 'Manbalar bo\'yicha');
    table(doc,
      ['Manba', 'Buyurtmalar', "Daromad (so'm)"],
      data.bySource.map(s => [s.source, s.count, num(s.revenue)]),
      [200, 100, 215],
    );
  });
}

// ==========================================
// FINANCIAL PDF
// ==========================================

export async function exportFinancialPdf(data: FinancialReportData): Promise<Buffer> {
  return buildBuffer(doc => {
    header(doc,
      'Moliyaviy hisobot',
      `Davr: ${data.period.from} — ${data.period.to}`,
    );

    sectionTitle(doc, 'Daromad');
    twoCol(doc, "Buyurtmalardan", `${num(data.revenue.fromOrders)} so'm`);
    twoCol(doc, "Boshqa daromadlar", `${num(data.revenue.otherIncome)} so'm`);
    twoCol(doc, "JAMI DAROMAD", `${num(data.revenue.total)} so'm`);

    sectionTitle(doc, 'Xarajatlar');
    data.expenses.byCategory.forEach(c =>
      twoCol(doc, c.name, `${num(c.amount)} so'm`),
    );
    twoCol(doc, "JAMI XARAJAT", `${num(data.expenses.total)} so'm`);

    sectionTitle(doc, 'Foyda');
    twoCol(doc, "Yalpi foyda", `${num(data.profit.gross)} so'm`);
    twoCol(doc, "Sof foyda", `${num(data.profit.net)} so'm`);
    twoCol(doc, "Foyda marjasi", `${data.profit.margin.toFixed(1)}%`);

    sectionTitle(doc, "To'lov turlari");
    twoCol(doc, "Naqd", `${num(data.cashFlow.cash)} so'm`);
    twoCol(doc, "Karta", `${num(data.cashFlow.card)} so'm`);
    twoCol(doc, "Online", `${num(data.cashFlow.online)} so'm`);
  });
}

// ==========================================
// PRODUCT RATING PDF
// ==========================================

export async function exportProductRatingPdf(data: ProductRatingData): Promise<Buffer> {
  return buildBuffer(doc => {
    header(doc, 'Mahsulot reytingi', `Davr: ${data.period.from} — ${data.period.to}`);

    sectionTitle(doc, 'Top 20 eng ko\'p sotilgan');
    table(doc,
      ['#', 'Mahsulot', 'Kategoriya', 'Miqdor', "Daromad (so'm)"],
      data.topProducts.slice(0, 20).map(p => [p.rank, p.name, p.category, p.quantity, num(p.revenue)]),
      [30, 170, 110, 60, 145],
    );

    sectionTitle(doc, 'Eng kam sotilgan');
    table(doc,
      ['#', 'Mahsulot', 'Miqdor', "Daromad (so'm)"],
      data.leastSold.map(p => [p.rank, p.name, p.quantity, num(p.revenue)]),
      [30, 230, 80, 175],
    );
  });
}

// ==========================================
// STAFF PDF
// ==========================================

export async function exportStaffPdf(data: StaffReportData): Promise<Buffer> {
  return buildBuffer(doc => {
    header(doc, 'Xodimlar samaradorligi', `Davr: ${data.period.from} — ${data.period.to}`);
    sectionTitle(doc, 'Xodimlar ko\'rsatkichlari');
    table(doc,
      ['Xodim', 'Rol', 'Buyurtma', 'Bajarilgan', "Daromad (so'm)"],
      data.staff.map(s => [s.name, s.role, s.ordersCount, s.completedOrders, num(s.revenue)]),
      [150, 80, 65, 75, 145],
    );
  });
}

// ==========================================
// WAREHOUSE PDF
// ==========================================

export async function exportWarehousePdf(data: WarehouseReportData): Promise<Buffer> {
  return buildBuffer(doc => {
    header(doc, 'Ombor hisoboti', `Sana: ${data.generatedAt.slice(0, 10)}`);

    sectionTitle(doc, 'Umumiy holat');
    twoCol(doc, 'Jami mahsulotlar', String(data.summary.totalItems));
    twoCol(doc, 'Yetarli', String(data.summary.okItems));
    twoCol(doc, 'Kam', String(data.summary.lowItems));
    twoCol(doc, 'Kritik', String(data.summary.criticalItems));
    twoCol(doc, 'Tugagan', String(data.summary.outItems));
    twoCol(doc, "Ombor qiymati", `${num(data.summary.totalValue)} so'm`);

    sectionTitle(doc, "Muammoli mahsulotlar (kam/tugagan)");
    const problem = data.items.filter(i => i.status !== 'OK');
    table(doc,
      ['Mahsulot', "O'lchov", 'Miqdor', 'Minimum', 'Holat'],
      problem.slice(0, 30).map(i => [
        i.name, i.unit, i.quantity.toFixed(2), i.minQuantity.toFixed(2), i.status,
      ]),
      [175, 55, 65, 65, 155],
    );
  });
}

// ==========================================
// TAX PDF
// ==========================================

export async function exportTaxPdf(data: TaxReportData): Promise<Buffer> {
  return buildBuffer(doc => {
    header(doc, 'Soliq hisoboti (QQS)', `Davr: ${data.period.from} — ${data.period.to}`);

    sectionTitle(doc, 'Umumiy ko\'rsatkichlar');
    twoCol(doc, "Soliq solinadigan daromad", `${num(data.totals.taxableRevenue)} so'm`);
    twoCol(doc, "Jami QQS", `${num(data.totals.totalVat)} so'm`);
    twoCol(doc, "QQS bo'lgan buyurtmalar", String(data.totals.vatOrders));

    sectionTitle(doc, 'QQS stavkasi bo\'yicha');
    table(doc,
      ['Stavka', 'Buyurtmalar', "Solinadigan (so'm)", "QQS (so'm)"],
      data.byVatRate.map(v => [`${v.rate}%`, v.orderCount, num(v.taxableAmount), num(v.vatAmount)]),
      [70, 80, 180, 185],
    );

    if (data.byMxikCode.length > 0) {
      sectionTitle(doc, 'MXIK kodi bo\'yicha (Top 20)');
      table(doc,
        ['MXIK kodi', 'Mahsulot', 'Miqdor', "QQS stavkasi", "QQS (so'm)"],
        data.byMxikCode.slice(0, 20).map(m => [
          m.mxikCode, m.mxikName.slice(0, 20), m.quantity, `${m.vatRate}%`, num(m.vatAmount),
        ]),
        [80, 145, 50, 75, 165],
      );
    }
  });
}
