import type {
  SalesReportData,
  FinancialReportData,
  ProductRatingData,
  StaffReportData,
  WarehouseReportData,
  TaxReportData,
} from './report-data.service.js';

// ==========================================
// CSV EXPORTER
// Simple UTF-8 BOM CSV for Excel compatibility
// ==========================================

function cell(v: unknown): string {
  const s = String(v ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function csv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): Buffer {
  const lines = [
    headers.map(cell).join(','),
    ...rows.map(r => r.map(cell).join(',')),
  ];
  // UTF-8 BOM for correct display in Excel
  return Buffer.concat([Buffer.from('﻿', 'utf8'), Buffer.from(lines.join('\r\n'), 'utf8')]);
}

export function exportSalesCsv(data: SalesReportData): Buffer {
  return csv(
    ['Sana', 'Buyurtmalar', "Daromad (so'm)"],
    data.byDay.map(d => [d.date, d.count, d.revenue.toFixed(0)]),
  );
}

export function exportFinancialCsv(data: FinancialReportData): Buffer {
  const rows: (string | number)[][] = [
    ["Davr", `${data.period.from} — ${data.period.to}`],
    [],
    ["DAROMAD"],
    ["Buyurtmalardan", data.revenue.fromOrders.toFixed(0)],
    ["Boshqa daromadlar", data.revenue.otherIncome.toFixed(0)],
    ["Jami daromad", data.revenue.total.toFixed(0)],
    [],
    ["XARAJATLAR"],
    ...data.expenses.byCategory.map(c => [c.name, c.amount.toFixed(0)]),
    ["Jami xarajat", data.expenses.total.toFixed(0)],
    [],
    ["FOYDA"],
    ["Sof foyda", data.profit.net.toFixed(0)],
    ["Foyda marjasi (%)", data.profit.margin.toFixed(2)],
    [],
    ["NAQD OQIM"],
    ["Naqd", data.cashFlow.cash.toFixed(0)],
    ["Karta", data.cashFlow.card.toFixed(0)],
    ["Online", data.cashFlow.online.toFixed(0)],
  ];
  return csv(["Ko'rsatkich", "Qiymat (so'm)"], rows);
}

export function exportProductRatingCsv(data: ProductRatingData): Buffer {
  return csv(
    ['#', 'Mahsulot', 'Kategoriya', 'Miqdor', "Daromad (so'm)", "O'rtacha narx"],
    data.topProducts.map(p => [p.rank, p.name, p.category, p.quantity, p.revenue.toFixed(0), p.avgPrice.toFixed(0)]),
  );
}

export function exportStaffCsv(data: StaffReportData): Buffer {
  return csv(
    ['Xodim', 'Rol', 'Jami buyurtma', 'Bajarilgan', 'Bekor', "Daromad (so'm)", "O'rtacha chek"],
    data.staff.map(s => [
      s.name, s.role, s.ordersCount, s.completedOrders, s.cancelledOrders,
      s.revenue.toFixed(0), s.avgCheck.toFixed(0),
    ]),
  );
}

export function exportWarehouseCsv(data: WarehouseReportData): Buffer {
  return csv(
    ['Mahsulot', 'SKU', "O'lchov", 'Miqdor', 'Minimum', "Narx (so'm)", "Qiymat (so'm)", 'Holat', 'Yetkazib beruvchi'],
    data.items.map(i => [
      i.name, i.sku, i.unit, i.quantity.toFixed(3), i.minQuantity.toFixed(3),
      i.costPrice.toFixed(0), i.totalValue.toFixed(0), i.status, i.supplier,
    ]),
  );
}

export function exportTaxCsv(data: TaxReportData): Buffer {
  return csv(
    ['MXIK kodi', 'Mahsulot nomi', 'Miqdor', "Daromad (so'm)", 'QQS stavkasi (%)', "QQS (so'm)"],
    data.byMxikCode.map(m => [
      m.mxikCode, m.mxikName, m.quantity, m.revenue.toFixed(0), m.vatRate, m.vatAmount.toFixed(0),
    ]),
  );
}
