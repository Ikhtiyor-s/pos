import ExcelJS from 'exceljs';
import type {
  SalesReportData,
  FinancialReportData,
  ProductRatingData,
  StaffReportData,
  WarehouseReportData,
  TaxReportData,
} from './report-data.service.js';

// ==========================================
// EXCEL EXPORTER
// Styled .xlsx reports using ExcelJS
// ==========================================

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const ACCENT_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' },
};
const BORDER: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD1D5DB' } };
const BORDERS: Partial<ExcelJS.Borders> = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDERS;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  row.height = 22;
}

function styleDataRow(row: ExcelJS.Row, index: number) {
  row.eachCell(cell => {
    cell.border = BORDERS;
    if (index % 2 === 0) cell.fill = ACCENT_FILL;
  });
}

function addTitle(ws: ExcelJS.Worksheet, title: string, cols: number) {
  const row = ws.addRow([title]);
  ws.mergeCells(1, 1, 1, cols);
  row.getCell(1).font = { bold: true, size: 14 };
  row.getCell(1).alignment = { horizontal: 'center' };
  row.height = 28;
  ws.addRow([]);
}

function num(v: number) { return Math.round(v * 100) / 100; }

// ==========================================
// SALES EXCEL
// ==========================================

export async function exportSalesExcel(data: SalesReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oshxona POS';

  // — Summary sheet —
  const summary = wb.addWorksheet('Xulosa');
  addTitle(summary, `Sotuv hisoboti: ${data.period.from} — ${data.period.to}`, 2);
  const sHeaders = summary.addRow(['Ko\'rsatkich', 'Qiymat']);
  styleHeaderRow(sHeaders);
  const sRows = [
    ['Jami buyurtmalar', data.summary.totalOrders],
    ['Bajarilgan', data.summary.completedOrders],
    ['Bekor qilingan', data.summary.cancelledOrders],
    ["Jami daromad (so'm)", num(data.summary.totalRevenue)],
    ["O'rtacha chek (so'm)", num(data.summary.avgCheck)],
    ["Chegirma (so'm)", num(data.summary.totalDiscount)],
    ["Soliq (so'm)", num(data.summary.totalTax)],
  ];
  sRows.forEach((r, i) => styleDataRow(summary.addRow(r), i));
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 20;

  // — By day sheet —
  const byDay = wb.addWorksheet('Kunlik');
  addTitle(byDay, 'Kunlik sotuv', 3);
  styleHeaderRow(byDay.addRow(['Sana', 'Buyurtmalar', "Daromad (so'm)"]));
  data.byDay.forEach((d, i) =>
    styleDataRow(byDay.addRow([d.date, d.count, num(d.revenue)]), i),
  );
  byDay.columns = [{ width: 15 }, { width: 14 }, { width: 18 }];

  // — By hour sheet —
  const byHour = wb.addWorksheet('Soatlar');
  addTitle(byHour, 'Soatlik yuklama', 3);
  styleHeaderRow(byHour.addRow(['Soat', 'Buyurtmalar', "Daromad (so'm)"]));
  data.byHour.forEach((h, i) =>
    styleDataRow(byHour.addRow([`${h.hour}:00`, h.count, num(h.revenue)]), i),
  );
  byHour.columns = [{ width: 10 }, { width: 14 }, { width: 18 }];

  // — By source sheet —
  const bySource = wb.addWorksheet('Manbalar');
  addTitle(bySource, 'Manbalar bo\'yicha', 3);
  styleHeaderRow(bySource.addRow(['Manba', 'Buyurtmalar', "Daromad (so'm)"]));
  data.bySource.forEach((s, i) =>
    styleDataRow(bySource.addRow([s.source, s.count, num(s.revenue)]), i),
  );
  bySource.columns = [{ width: 20 }, { width: 14 }, { width: 18 }];

  // — Top products —
  const prods = wb.addWorksheet('Top mahsulotlar');
  addTitle(prods, 'Top mahsulotlar', 4);
  styleHeaderRow(prods.addRow(['Mahsulot', 'Miqdor', "Daromad (so'm)", 'Kategoriya']));
  data.topProducts.forEach((p, i) =>
    styleDataRow(prods.addRow([p.name, p.quantity, num(p.revenue), p.category]), i),
  );
  prods.columns = [{ width: 30 }, { width: 10 }, { width: 18 }, { width: 20 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ==========================================
// FINANCIAL EXCEL
// ==========================================

export async function exportFinancialExcel(data: FinancialReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oshxona POS';

  const ws = wb.addWorksheet('Moliyaviy hisobot');
  addTitle(ws, `Moliyaviy hisobot: ${data.period.from} — ${data.period.to}`, 2);

  // Revenue
  ws.addRow(['DAROMAD', '']).font = { bold: true, size: 12 };
  styleHeaderRow(ws.addRow(['Ko\'rsatkich', "Summa (so'm)"]));
  [
    ["Buyurtmalardan daromad", num(data.revenue.fromOrders)],
    ["Boshqa daromadlar", num(data.revenue.otherIncome)],
    ["JAMI DAROMAD", num(data.revenue.total)],
  ].forEach((r, i) => styleDataRow(ws.addRow(r), i));

  ws.addRow([]);
  ws.addRow(['XARAJATLAR', '']).font = { bold: true, size: 12 };
  styleHeaderRow(ws.addRow(['Kategoriya', "Summa (so'm)"]));
  data.expenses.byCategory.forEach((c, i) =>
    styleDataRow(ws.addRow([c.name, num(c.amount)]), i),
  );
  styleDataRow(ws.addRow(['JAMI XARAJAT', num(data.expenses.total)]), 99);

  ws.addRow([]);
  ws.addRow(['FOYDA', '']).font = { bold: true, size: 12 };
  styleHeaderRow(ws.addRow(['Ko\'rsatkich', "Summa (so'm)"]));
  [
    ['Yalpi foyda', num(data.profit.gross)],
    ['Sof foyda', num(data.profit.net)],
    ["Foyda marjasi (%)", num(data.profit.margin)],
  ].forEach((r, i) => styleDataRow(ws.addRow(r), i));

  ws.addRow([]);
  ws.addRow(['NAQD OQIM', '']).font = { bold: true, size: 12 };
  styleHeaderRow(ws.addRow(["To'lov turi", "Summa (so'm)"]));
  [
    ['Naqd', num(data.cashFlow.cash)],
    ['Karta', num(data.cashFlow.card)],
    ['Online', num(data.cashFlow.online)],
    ['Boshqa', num(data.cashFlow.other)],
  ].forEach((r, i) => styleDataRow(ws.addRow(r), i));

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 20;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ==========================================
// PRODUCT RATING EXCEL
// ==========================================

export async function exportProductRatingExcel(data: ProductRatingData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oshxona POS';

  const top = wb.addWorksheet('Top mahsulotlar');
  addTitle(top, `Mahsulot reytingi: ${data.period.from} — ${data.period.to}`, 6);
  styleHeaderRow(top.addRow(['#', 'Mahsulot', 'Kategoriya', "Miqdor (dona)", "Daromad (so'm)", "O'rtacha narx"]));
  data.topProducts.forEach((p, i) =>
    styleDataRow(top.addRow([p.rank, p.name, p.category, p.quantity, num(p.revenue), num(p.avgPrice)]), i),
  );
  top.columns = [{ width: 5 }, { width: 30 }, { width: 20 }, { width: 14 }, { width: 18 }, { width: 16 }];

  const least = wb.addWorksheet('Kam sotilgan');
  addTitle(least, 'Kam sotilgan mahsulotlar', 5);
  styleHeaderRow(least.addRow(['#', 'Mahsulot', 'Kategoriya', 'Miqdor', "Daromad (so'm)"]));
  data.leastSold.forEach((p, i) =>
    styleDataRow(least.addRow([p.rank, p.name, p.category, p.quantity, num(p.revenue)]), i),
  );
  least.columns = [{ width: 5 }, { width: 30 }, { width: 20 }, { width: 10 }, { width: 18 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ==========================================
// STAFF EXCEL
// ==========================================

export async function exportStaffExcel(data: StaffReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oshxona POS';

  const ws = wb.addWorksheet('Xodimlar');
  addTitle(ws, `Xodimlar samaradorligi: ${data.period.from} — ${data.period.to}`, 7);
  styleHeaderRow(ws.addRow([
    'Xodim', 'Rol', 'Jami buyurtma', 'Bajarilgan', 'Bekor',
    "Daromad (so'm)", "O'rtacha chek",
  ]));
  data.staff.forEach((s, i) =>
    styleDataRow(ws.addRow([
      s.name, s.role, s.ordersCount, s.completedOrders, s.cancelledOrders,
      num(s.revenue), num(s.avgCheck),
    ]), i),
  );
  ws.columns = [
    { width: 22 }, { width: 14 }, { width: 14 }, { width: 12 },
    { width: 10 }, { width: 18 }, { width: 16 },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ==========================================
// WAREHOUSE EXCEL
// ==========================================

export async function exportWarehouseExcel(data: WarehouseReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oshxona POS';

  // Summary
  const sumWs = wb.addWorksheet('Xulosa');
  addTitle(sumWs, `Ombor hisoboti: ${data.generatedAt.slice(0, 10)}`, 2);
  styleHeaderRow(sumWs.addRow(['Ko\'rsatkich', 'Qiymat']));
  [
    ["Jami mahsulotlar", data.summary.totalItems],
    ["Yetarli", data.summary.okItems],
    ["Kam", data.summary.lowItems],
    ["Kritik", data.summary.criticalItems],
    ["Tugagan", data.summary.outItems],
    ["Ombor qiymati (so'm)", num(data.summary.totalValue)],
  ].forEach((r, i) => styleDataRow(sumWs.addRow(r), i));
  sumWs.columns = [{ width: 24 }, { width: 18 }];

  // Inventory list
  const invWs = wb.addWorksheet('Mahsulotlar');
  addTitle(invWs, 'Ombor inventarizatsiyasi', 8);
  styleHeaderRow(invWs.addRow([
    'Mahsulot', 'SKU', "O'lchov", 'Miqdor', 'Minimum',
    "Narx (so'm)", "Qiymat (so'm)", 'Holat',
  ]));
  data.items.forEach((item, i) => {
    const row = invWs.addRow([
      item.name, item.sku, item.unit, num(item.quantity), num(item.minQuantity),
      num(item.costPrice), num(item.totalValue), item.status,
    ]);
    styleDataRow(row, i);
    const statusColors: Record<string, string> = {
      OK: 'FF86EFAC', LOW: 'FFFDE68A', CRITICAL: 'FFFCA5A5', OUT: 'FFEF4444',
    };
    row.getCell(8).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: statusColors[item.status] || 'FFFFFFFF' },
    };
  });
  invWs.columns = [
    { width: 28 }, { width: 14 }, { width: 10 }, { width: 10 },
    { width: 10 }, { width: 14 }, { width: 16 }, { width: 10 },
  ];

  // Movements
  const movWs = wb.addWorksheet('Harakatlar');
  addTitle(movWs, 'So\'nggi harakatlar (7 kun)', 5);
  styleHeaderRow(movWs.addRow(['Mahsulot', 'Tur', 'Miqdor', 'Sana', 'Izoh']));
  data.recentMovements.forEach((m, i) =>
    styleDataRow(movWs.addRow([m.itemName, m.type, num(m.quantity), m.date, m.notes]), i),
  );
  movWs.columns = [{ width: 28 }, { width: 12 }, { width: 10 }, { width: 18 }, { width: 30 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ==========================================
// TAX EXCEL
// ==========================================

export async function exportTaxExcel(data: TaxReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Oshxona POS';

  // Totals
  const totWs = wb.addWorksheet('Xulosa');
  addTitle(totWs, `Soliq hisoboti: ${data.period.from} — ${data.period.to}`, 2);
  styleHeaderRow(totWs.addRow(['Ko\'rsatkich', "Summa (so'm)"]));
  [
    ["Soliq solinadigan daromad", num(data.totals.taxableRevenue)],
    ["Jami QQS", num(data.totals.totalVat)],
    ["QQS bo'lgan buyurtmalar", data.totals.vatOrders],
  ].forEach((r, i) => styleDataRow(totWs.addRow(r), i));
  totWs.columns = [{ width: 30 }, { width: 22 }];

  // By VAT rate
  const rateWs = wb.addWorksheet('QQS stavkasi bo\'yicha');
  addTitle(rateWs, 'QQS stavkasi bo\'yicha', 4);
  styleHeaderRow(rateWs.addRow(['Stavka (%)', 'Buyurtmalar', "Solinadigan miqdor (so'm)", "QQS (so'm)"]));
  data.byVatRate.forEach((v, i) =>
    styleDataRow(rateWs.addRow([`${v.rate}%`, v.orderCount, num(v.taxableAmount), num(v.vatAmount)]), i),
  );
  rateWs.columns = [{ width: 12 }, { width: 14 }, { width: 26 }, { width: 18 }];

  // By MXIK
  if (data.byMxikCode.length > 0) {
    const mxikWs = wb.addWorksheet('MXIK bo\'yicha');
    addTitle(mxikWs, 'MXIK kodi bo\'yicha', 6);
    styleHeaderRow(mxikWs.addRow([
      'MXIK kodi', 'Mahsulot nomi', 'Miqdor',
      "Daromad (so'm)", 'QQS stavkasi (%)', "QQS (so'm)",
    ]));
    data.byMxikCode.forEach((m, i) =>
      styleDataRow(mxikWs.addRow([
        m.mxikCode, m.mxikName, m.quantity,
        num(m.revenue), `${m.vatRate}%`, num(m.vatAmount),
      ]), i),
    );
    mxikWs.columns = [
      { width: 16 }, { width: 30 }, { width: 10 },
      { width: 18 }, { width: 16 }, { width: 16 },
    ];
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
