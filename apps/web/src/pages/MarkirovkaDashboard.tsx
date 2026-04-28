// Markirovka Admin Dashboard — O'zbekiston majburiy raqamli markirovka tizimi
// apps/web/src/pages/MarkirovkaDashboard.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  PackageCheck, ShoppingBag, AlertTriangle, TrendingUp,
  Search, Download, FileText, FileSpreadsheet,
  Loader2, RefreshCw, ChevronRight, ScanLine,
  Clock, Hash, ShieldCheck, ShieldX,
  QrCode, BarChart2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

// ==========================================
// TIPLAR
// ==========================================

interface StatsData {
  byStatus: Partial<Record<string, number>>;
  offlineQueueLen: number;
  recentLogs: Array<{ markCode: string; action: string; status: string; createdAt: string }>;
}

interface DailyReport {
  date:      string;
  received:  number;
  verified:  number;
  sold:      number;
  failed:    number;
  queued:    number;
  byStatus:  Partial<Record<string, number>>;
  topGtins:  Array<{ gtin: string; count: number }>;
}

interface MarkirovkaProduct {
  id:           string;
  markCode:     string;
  gtin:         string;
  serialNumber: string;
  batchNumber:  string | null;
  expiryDate:   string | null;
  status:       string;
  soldAt:       string | null;
  importedAt:   string | null;
  verifiedAt:   string | null;
  createdAt:    string;
  product?: { id: string; name: string; sku: string | null };
}

interface TraceResult {
  product: MarkirovkaProduct | null;
  logs:    Array<{ action: string; status: string; createdAt: string; request: unknown; response: unknown }>;
  timeline: Array<{ action: string; status: string; at: string }>;
}

interface PaginatedResponse<T> {
  success: boolean;
  data:    T[];
  meta:    { page: number; limit: number; total: number; totalPages: number };
}

interface ApiResponse<T> { success: boolean; data: T; }

interface ChartPoint { date: string; label: string; qabul: number; sotilgan: number; xato: number }

// ==========================================
// YORDAMCHI
// ==========================================

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n);

function fmtDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}
function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
function shortCode(code: string, n = 10): string {
  return code.length <= n + 8 ? code : `${code.slice(0, n)}…${code.slice(-6)}`;
}
function daysFromNow(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

// ==========================================
// EKSPORT FUNKSIYALARI
// ==========================================

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportSoldCsv(products: MarkirovkaProduct[], date: string) {
  const BOM  = '﻿';
  const head = ['"#"', '"Markirovka kodi"', '"GTIN"', '"Status"', '"Sotilgan vaqt"', '"Partiya"'].join(',');
  const rows = products.map((p, i) =>
    [`"${i+1}"`, `"${p.markCode}"`, `"${p.gtin}"`, `"${p.status}"`,
     `"${p.soldAt ? fmtDate(p.soldAt) + ' ' + fmtTime(p.soldAt) : '—'}"`,
     `"${p.batchNumber ?? '—'}"`].join(','),
  );
  downloadFile(BOM + [head, ...rows].join('\r\n'),
    `markirovka-sotuv-${date}.csv`, 'text/csv;charset=utf-8;');
}

function exportTaxXml(products: MarkirovkaProduct[], sellerTin: string, date: string) {
  const esc = (v: string) => v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const items = products.map(p => `
    <Item>
      <MarkCode>${esc(p.markCode)}</MarkCode>
      <Gtin>${esc(p.gtin)}</Gtin>
      <SoldAt>${p.soldAt ?? ''}</SoldAt>
      <BatchNumber>${esc(p.batchNumber ?? '')}</BatchNumber>
    </Item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TaxAuditReport>
  <Header>
    <Date>${esc(date)}</Date>
    <SellerTin>${esc(sellerTin)}</SellerTin>
    <TotalItems>${products.length}</TotalItems>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </Header>
  <Items>${items}
  </Items>
</TaxAuditReport>`.trim();
  downloadFile(xml, `markirovka-soliq-${date}.xml`, 'application/xml;charset=utf-8;');
}

function exportExpiredCsv(products: MarkirovkaProduct[]) {
  const BOM  = '﻿';
  const head = ['"#"','"Markirovka kodi"','"GTIN"','"Partiya"','"Muddati"','"Holat"'].join(',');
  const rows = products.map((p, i) =>
    [`"${i+1}"`,`"${p.markCode}"`,`"${p.gtin}"`,
     `"${p.batchNumber ?? '—'}"`,`"${fmtDate(p.expiryDate)}"`,`"${p.status}"`].join(','),
  );
  downloadFile(BOM + [head, ...rows].join('\r\n'),
    `muddati-otgan-${new Date().toISOString().slice(0,10)}.csv`,
    'text/csv;charset=utf-8;');
}

// ==========================================
// KICHIK KOMPONENTLAR
// ==========================================

type StatColor = 'emerald' | 'blue' | 'amber' | 'orange';

function StatCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label:   string;
  value:   string | number;
  sub?:    string;
  icon:    React.ElementType;
  color:   StatColor;
  loading: boolean;
}) {
  const colorMap: Record<StatColor, { bg: string; icon: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50',  icon: 'text-emerald-600 bg-emerald-100', border: 'border-emerald-100' },
    blue:    { bg: 'bg-blue-50',     icon: 'text-blue-600    bg-blue-100',    border: 'border-blue-100'    },
    amber:   { bg: 'bg-amber-50',    icon: 'text-amber-600   bg-amber-100',   border: 'border-amber-100'   },
    orange:  { bg: 'bg-orange-50',   icon: 'text-orange-600  bg-orange-100',  border: 'border-orange-100'  },
  };
  const c = colorMap[color];
  return (
    <div className={cn('rounded-xl border p-5 shadow-sm', c.bg, c.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          {loading
            ? <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
            : <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(Number(value))}</p>}
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', c.icon)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, action, children, loading = false }: {
  title:    string;
  icon:     React.ElementType;
  action?:  React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <Loader2 size={22} className="animate-spin text-orange-400" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    IN_STOCK:      { label: 'Zaxirada',       cls: 'bg-emerald-100 text-emerald-700' },
    SOLD:          { label: 'Sotilgan',        cls: 'bg-blue-100    text-blue-700'    },
    EXPIRED:       { label: 'Muddati o\'tgan', cls: 'bg-red-100     text-red-700'     },
    RESERVED:      { label: 'Band',            cls: 'bg-amber-100   text-amber-700'   },
    IMPORTED:      { label: 'Import',          cls: 'bg-violet-100  text-violet-700'  },
    MANUFACTURED:  { label: 'Ishlab chiqarildi',cls:'bg-gray-100    text-gray-700'    },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', s.cls)}>
      {s.label}
    </span>
  );
}

// ==========================================
// ASOSIY KOMPONENT
// ==========================================

export function MarkirovkaDashboard() {
  // ── Holat ──────────────────────────────────────────
  const [stats,       setStats]       = useState<StatsData | null>(null);
  const [chartData,   setChartData]   = useState<ChartPoint[]>([]);
  const [received,    setReceived]    = useState<MarkirovkaProduct[]>([]);
  const [sold,        setSold]        = useState<MarkirovkaProduct[]>([]);
  const [expired,     setExpired]     = useState<MarkirovkaProduct[]>([]);
  const [topGtins,    setTopGtins]    = useState<Array<{ gtin: string; count: number }>>([]);
  const [searchRes,   setSearchRes]   = useState<MarkirovkaProduct[] | TraceResult | null>(null);
  const [traceMode,   setTraceMode]   = useState(false);

  const [loading,     setLoading]     = useState(true);
  const [searchLoad,  setSearchLoad]  = useState(false);
  const [chartDays,   setChartDays]   = useState<7 | 14 | 30>(14);

  const [searchSerial, setSearchSerial] = useState('');
  const [searchBatch,  setSearchBatch]  = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');

  const abortRef = useRef<AbortController | null>(null);

  // ── Ma'lumot yuklash ───────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recvRes, soldRes, expiredRes] = await Promise.allSettled([
        api.get<ApiResponse<StatsData>>('/markirovka/stats'),
        api.get<PaginatedResponse<MarkirovkaProduct>>('/markirovka/products', {
          params: { status: 'IN_STOCK', limit: 10, page: 1 },
        }),
        api.get<PaginatedResponse<MarkirovkaProduct>>('/markirovka/products', {
          params: { status: 'SOLD', limit: 10, page: 1 },
        }),
        api.get<ApiResponse<MarkirovkaProduct[]>>('/markirovka/expired'),
      ]);

      if (statsRes.status === 'fulfilled')   setStats(statsRes.value.data.data);
      if (recvRes.status === 'fulfilled')    setReceived(recvRes.value.data.data);
      if (soldRes.status === 'fulfilled')    setSold(soldRes.value.data.data);
      if (expiredRes.status === 'fulfilled') setExpired(expiredRes.value.data.data);
    } catch { /* xatolar allSettled tomonidan boshqariladi */ }
    finally  { setLoading(false); }
  }, []);

  const fetchChart = useCallback(async (days: number) => {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]!);
    }

    const results = await Promise.allSettled(
      dates.map(date => api.get<ApiResponse<DailyReport>>(`/markirovka/report/daily`, { params: { date } })),
    );

    const points: ChartPoint[] = dates.map((date, i) => {
      const r = results[i];
      if (r?.status === 'fulfilled') {
        const d = r.value.data.data;
        return { date, label: new Date(date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
          qabul: d.received, sotilgan: d.sold, xato: d.failed };
      }
      return { date, label: new Date(date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
        qabul: 0, sotilgan: 0, xato: 0 };
    });

    setChartData(points);

    // Top GTINlar — barcha kunlar yig'indisi
    const gtinMap = new Map<string, number>();
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.data.data.topGtins.forEach(({ gtin, count }) => {
          gtinMap.set(gtin, (gtinMap.get(gtin) ?? 0) + count);
        });
      }
    });
    setTopGtins([...gtinMap.entries()]
      .sort(([,a],[,b]) => b - a)
      .slice(0, 8)
      .map(([gtin, count]) => ({ gtin, count })));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchChart(chartDays); }, [fetchChart, chartDays]);

  // ── Qidiruv ───────────────────────────────────────

  const handleSearch = async () => {
    if (!searchSerial.trim() && !searchBatch.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSearchLoad(true);
    setSearchRes(null);
    setTraceMode(false);

    try {
      if (searchSerial.trim()) {
        // Trace endpoint — serial yoki markCode bo'yicha
        const { data } = await api.get<ApiResponse<TraceResult>>(
          `/markirovka/trace/${encodeURIComponent(searchSerial.trim())}`,
          { signal: abortRef.current.signal },
        );
        setSearchRes(data.data);
        setTraceMode(true);
      } else {
        const params: Record<string, unknown> = { limit: 20, page: 1 };
        if (searchBatch.trim()) params.batchNumber = searchBatch.trim();
        if (dateFrom)           params.startDate   = dateFrom;
        if (dateTo)             params.endDate     = dateTo;

        const { data } = await api.get<PaginatedResponse<MarkirovkaProduct>>(
          '/markirovka/products', { params, signal: abortRef.current.signal },
        );
        setSearchRes(data.data);
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        setSearchRes([]);
      }
    } finally {
      setSearchLoad(false);
    }
  };

  const clearSearch = () => {
    setSearchSerial(''); setSearchBatch(''); setDateFrom(''); setDateTo('');
    setSearchRes(null); setTraceMode(false);
  };

  // ── Eksport ───────────────────────────────────────

  const handleDailyExport = async () => {
    const today = new Date().toISOString().split('T')[0]!;
    try {
      const { data } = await api.get<PaginatedResponse<MarkirovkaProduct>>(
        '/markirovka/products', { params: { status: 'SOLD', limit: 500, page: 1 } },
      );
      exportSoldCsv(data.data, today);
    } catch { alert('Eksport xatosi'); }
  };

  const handleTaxExport = async () => {
    const today = new Date().toISOString().split('T')[0]!;
    try {
      const { data } = await api.get<PaginatedResponse<MarkirovkaProduct>>(
        '/markirovka/products', { params: { status: 'SOLD', limit: 500, page: 1 } },
      );
      const tin = import.meta.env.VITE_MARKIROVKA_SELLER_TIN ?? '';
      exportTaxXml(data.data, tin, today);
    } catch { alert('Eksport xatosi'); }
  };

  // ── Statistika hisoblash ──────────────────────────

  const todayReceived = stats?.byStatus?.['IN_STOCK'] ?? 0;
  const todaySold     = stats?.byStatus?.['SOLD']     ?? 0;
  const expiredCount  = stats?.byStatus?.['EXPIRED']  ?? 0;
  const monthlySold   = chartData.reduce((s, d) => s + d.sotilgan, 0);

  // ── RENDER ────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <QrCode size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Markirovka Dashboard</h1>
            <p className="text-xs text-gray-400">O'zbekiston majburiy raqamli markirovka tizimi</p>
          </div>
        </div>
        <button
          onClick={() => { fetchAll(); fetchChart(chartDays); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yangilash
        </button>
      </div>

      {/* ── STATISTIKA KARTOCHKALAR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Bugun qabul qilingan"  value={todayReceived} icon={PackageCheck} color="emerald" loading={loading} sub="Zaxiradagi kodlar" />
        <StatCard label="Bugun sotilgan"         value={todaySold}     icon={ShoppingBag}  color="blue"    loading={loading} sub="Tasdiqlangan sotuvlar" />
        <StatCard label="Muddati o'tgan"         value={expiredCount}  icon={AlertTriangle} color="amber"  loading={loading} sub="Yo'qotilishi kerak" />
        <StatCard label={`Sotilgan (${chartDays} kun)`} value={monthlySold} icon={TrendingUp} color="orange" loading={loading} sub="Jami sotuv" />
      </div>

      {/* ── GRAFIKLAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Kunlik qabul / sotish grafigi */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-800">Kunlik qabul / sotuv</h3>
            </div>
            <div className="flex gap-1">
              {([7, 14, 30] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    chartDays === d ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-100',
                  )}
                >
                  {d}k
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={2}>
                <defs>
                  <linearGradient id="gQabul"    x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="gSotilgan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="gXato"     x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  interval={chartDays === 30 ? 4 : chartDays === 14 ? 1 : 0}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={v => v > 999 ? `${(v/1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(v: number, name: string) => [fmt(v), name]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="qabul"    name="Qabul"    fill="url(#gQabul)"    radius={[3,3,0,0]} maxBarSize={22} />
                <Bar dataKey="sotilgan" name="Sotilgan" fill="url(#gSotilgan)" radius={[3,3,0,0]} maxBarSize={22} />
                <Bar dataKey="xato"     name="Xato"     fill="url(#gXato)"     radius={[3,3,0,0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              {loading ? <Loader2 size={22} className="animate-spin text-orange-400" /> : 'Ma\'lumot yo\'q'}
            </div>
          )}
        </div>

        {/* Eng ko'p sotilgan GTINlar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">Top GTINlar ({chartDays} kun)</h3>
          </div>

          {topGtins.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topGtins} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" axisLine={false} tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={v => fmt(v)} />
                <YAxis type="category" dataKey="gtin" axisLine={false} tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={v => v.length > 10 ? v.slice(-10) : v}
                  width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(v: number) => [fmt(v), 'Sotilgan']}
                />
                <Bar dataKey="count" radius={[0,3,3,0]}>
                  {topGtins.map((_, i) => (
                    <Cell key={i} fill={['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#06b6d4','#f59e0b','#84cc16'][i % 8]!} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              {loading ? <Loader2 size={22} className="animate-spin text-orange-400" /> : 'Ma\'lumot yo\'q'}
            </div>
          )}
        </div>
      </div>

      {/* ── QIDIRUV ── */}
      <SectionCard title="Qidiruv" icon={Search}>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Serial / markCode */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Serial raqam / Kod</label>
              <div className="relative">
                <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchSerial}
                  onChange={e => setSearchSerial(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Serial yoki markCode..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Partiya raqami</label>
              <input type="text" value={searchBatch}
                onChange={e => setSearchBatch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="BATCH-2024-001..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
            </div>

            {/* Sana dan */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sana (dan)</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
            </div>

            {/* Sana gacha */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sana (gacha)</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSearch} disabled={searchLoad || (!searchSerial.trim() && !searchBatch.trim())}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              {searchLoad ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Qidirish
            </button>
            {searchRes !== null && (
              <button onClick={clearSearch}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X size={14} /> Tozalash
              </button>
            )}
          </div>

          {/* Natija */}
          {searchRes !== null && !searchLoad && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {traceMode && searchRes !== null && !Array.isArray(searchRes) ? (
                // ── TRACE natijasi ──
                <div className="p-4 space-y-4">
                  {(searchRes as TraceResult).product ? (
                    <>
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                          <ScanLine size={18} className="text-orange-600" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 flex-1 text-sm">
                          {[
                            ['Holat',      <StatusBadge key="s" status={(searchRes as TraceResult).product!.status} />],
                            ['GTIN',       (searchRes as TraceResult).product!.gtin],
                            ['Serial',     (searchRes as TraceResult).product!.serialNumber],
                            ['Partiya',    (searchRes as TraceResult).product!.batchNumber ?? '—'],
                            ['Muddati',    fmtDate((searchRes as TraceResult).product!.expiryDate)],
                            ['Qabul vaqti', fmtDate((searchRes as TraceResult).product!.importedAt)],
                          ].map(([lbl, val]) => (
                            <div key={String(lbl)}>
                              <span className="text-xs text-gray-400 block">{lbl}</span>
                              <span className="font-medium text-gray-800">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Tarix</p>
                        <div className="relative pl-5 space-y-3">
                          <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                          {(searchRes as TraceResult).timeline.map((t, i) => (
                            <div key={i} className="flex items-start gap-3 relative">
                              <div className={cn(
                                'absolute -left-3.5 w-3 h-3 rounded-full border-2 border-white shrink-0',
                                t.status === 'SUCCESS' ? 'bg-emerald-400' :
                                t.status === 'FAILED'  ? 'bg-red-400' : 'bg-gray-300',
                              )} />
                              <div className="flex-1 flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium text-gray-700">{t.action}</span>
                                  <span className={cn('ml-2 text-xs font-medium',
                                    t.status === 'SUCCESS' ? 'text-emerald-600' :
                                    t.status === 'FAILED'  ? 'text-red-500' : 'text-gray-400',
                                  )}>
                                    {t.status}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {fmtDate(t.at)} {fmtTime(t.at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-sm text-gray-400 py-6">Mahsulot topilmadi</p>
                  )}
                </div>
              ) : (
                // ── PRODUCTS ro'yxati ──
                <div>
                  {(searchRes as MarkirovkaProduct[]).length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">Natija topilmadi</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {['Markirovka kodi', 'GTIN', 'Partiya', 'Holat', 'Sana'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(searchRes as MarkirovkaProduct[]).map(p => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{shortCode(p.markCode)}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.gtin}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{p.batchNumber ?? '—'}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">
                              {fmtDate(p.soldAt ?? p.importedAt ?? p.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── HISOBOTLAR ── */}
      <SectionCard title="Hisobotlar va eksport" icon={FileText}>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Kunlik hisobot */}
            <button onClick={handleDailyExport}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 group transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                <FileSpreadsheet size={18} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Kunlik hisobot</p>
                <p className="text-xs text-gray-400 mt-0.5">Bugungi sotuvlar (CSV)</p>
              </div>
              <Download size={14} className="text-gray-400 ml-auto shrink-0" />
            </button>

            {/* Soliq tekshiruvi */}
            <button onClick={handleTaxExport}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 group transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                <ShieldCheck size={18} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Soliq tekshiruvi</p>
                <p className="text-xs text-gray-400 mt-0.5">Markirovka hisoboti (XML)</p>
              </div>
              <Download size={14} className="text-gray-400 ml-auto shrink-0" />
            </button>

            {/* Muddati o'tganlar */}
            <button onClick={() => exportExpiredCsv(expired)} disabled={expired.length === 0}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50 group disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Muddati o'tganlar</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {expired.length > 0 ? `${expired.length} ta kod (CSV)` : 'Yo\'q'}
                </p>
              </div>
              <Download size={14} className="text-gray-400 ml-auto shrink-0" />
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── JADVALLAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* So'nggi qabul qilinganlar */}
        <SectionCard title="So'nggi qabul qilinganlar" icon={PackageCheck} loading={loading}
          action={
            <span className="text-xs text-gray-400">{received.length} ta</span>
          }
        >
          {received.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Ma'lumot yo'q</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {received.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <PackageCheck size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-700 truncate">{shortCode(p.markCode, 12)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.batchNumber && <span className="mr-1.5">#{p.batchNumber}</span>}
                      {fmtDate(p.importedAt ?? p.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Muddati o'tayotganlar (7 kun) */}
        <SectionCard title="Muddati o'tayotganlar" icon={Clock} loading={loading}
          action={
            expired.length > 0
              ? <span className="text-xs text-red-500 font-medium">{expired.length} ta</span>
              : undefined
          }
        >
          {(() => {
            const soon = [...received, ...expired].filter(p => {
              const days = daysFromNow(p.expiryDate);
              return days !== null && days <= 7;
            }).sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));

            if (soon.length === 0) return (
              <p className="text-sm text-gray-400 text-center py-10">7 kun ichida muddati o'tayotgan yo'q</p>
            );

            return (
              <div className="divide-y divide-gray-50">
                {soon.slice(0, 8).map(p => {
                  const days = daysFromNow(p.expiryDate);
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        days !== null && days <= 0 ? 'bg-red-100'   :
                        days !== null && days <= 3 ? 'bg-amber-100' : 'bg-yellow-100',
                      )}>
                        <Clock size={14} className={cn(
                          days !== null && days <= 0 ? 'text-red-600'   :
                          days !== null && days <= 3 ? 'text-amber-600' : 'text-yellow-600',
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-700 truncate">{shortCode(p.markCode, 12)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Muddati: {fmtDate(p.expiryDate)}
                        </p>
                      </div>
                      <span className={cn(
                        'text-xs font-semibold whitespace-nowrap',
                        days !== null && days <= 0 ? 'text-red-600'   :
                        days !== null && days <= 3 ? 'text-amber-600' : 'text-yellow-600',
                      )}>
                        {days !== null && days <= 0 ? 'O\'tgan' : `${days} kun`}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </SectionCard>

        {/* So'nggi sotilganlar */}
        <SectionCard title="So'nggi sotilganlar" icon={ShoppingBag} loading={loading}
          action={
            <span className="text-xs text-gray-400">{sold.length} ta</span>
          }
        >
          {sold.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Ma'lumot yo'q</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {sold.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <ShoppingBag size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-gray-700 truncate">{shortCode(p.markCode, 12)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.soldAt ? `${fmtDate(p.soldAt)} ${fmtTime(p.soldAt)}` : fmtDate(p.createdAt)}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── AUDIT LOG ── */}
      {stats?.recentLogs && stats.recentLogs.length > 0 && (
        <SectionCard title="So'nggi amallar (audit)" icon={ScanLine}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Markirovka kodi', 'Amal', 'Holat', 'Vaqt'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-600">{shortCode(log.markCode, 12)}</td>
                    <td className="px-5 py-2.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                        log.action === 'SELL'    ? 'bg-blue-100    text-blue-700'    :
                        log.action === 'RECEIVE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'VERIFY'  ? 'bg-violet-100  text-violet-700'  :
                        log.action === 'REPORT'  ? 'bg-orange-100  text-orange-700'  :
                        'bg-gray-100 text-gray-700',
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <ShieldCheck size={12} /> OK
                        </span>
                      ) : log.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <ShieldX size={12} /> Xato
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500">{log.status}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                      {fmtDate(log.createdAt)} {fmtTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── QUEUE HOLATI ── */}
      {stats && stats.offlineQueueLen > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Offline queue: {stats.offlineQueueLen} ta amal</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Internet qayta tiklanganda yoki "Queue ishlatish" bosilganda yuboriladi
            </p>
          </div>
          <button
            onClick={() => api.post('/markirovka/queue/process').then(() => fetchAll())}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors shrink-0"
          >
            Ishlatish
          </button>
        </div>
      )}
    </div>
  );
}
