import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, BarChart3, Calculator, Printer, Loader2, Download, History, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice, getStatusColor, getStatusLabel } from '../../lib/helpers';
import type { DashboardData, RecentOrder, TopProduct } from '../../types';
import { ReportsService, type ReportTypeKey, type FormatKey, type ReportHistoryItem } from '../../services/reports.service';

interface ReportsTabProps {
  dashboardData: DashboardData | null;
  allOrders: RecentOrder[];
  dashboardPeriod: 'today' | 'week' | 'month' | 'year';
  dashboardLoading: boolean;
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year') => void;
}

const PERIODS = [
  { key: 'today' as const, label: 'Bugun' },
  { key: 'week' as const, label: 'Hafta' },
  { key: 'month' as const, label: 'Oy' },
  { key: 'year' as const, label: 'Yil' },
];

// ==========================================
// Export Panel
// ==========================================

const REPORT_TYPES: { key: ReportTypeKey; label: string; icon: string }[] = [
  { key: 'sales',     label: 'Sotuv',       icon: '📊' },
  { key: 'financial', label: 'Moliyaviy',   icon: '💰' },
  { key: 'products',  label: 'Mahsulotlar', icon: '🏆' },
  { key: 'staff',     label: 'Xodimlar',    icon: '👥' },
  { key: 'warehouse', label: 'Ombor',       icon: '📦' },
  { key: 'tax',       label: 'Soliq/QQS',   icon: '🧾' },
];
const FORMAT_OPTS: { key: FormatKey; label: string }[] = [
  { key: 'excel', label: '📗 Excel' },
  { key: 'pdf',   label: '📄 PDF' },
  { key: 'csv',   label: '📋 CSV' },
];
const PERIOD_OPTS = [
  { key: 'monthly', label: 'Oylik' },
  { key: 'weekly',  label: 'Haftalik' },
  { key: 'daily',   label: 'Kunlik' },
  { key: 'custom',  label: 'Maxsus' },
];

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function ExportPanel() {
  const [repType, setRepType] = useState<ReportTypeKey>('sales');
  const [format, setFormat] = useState<FormatKey>('excel');
  const [period, setPeriod] = useState('monthly');
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | string | null>(null);

  async function handleDownload() {
    setLoading(true); setResult(null);
    try {
      const params: any = { type: period };
      if (period === 'custom') { params.from = fromDate; params.to = toDate; }
      await ReportsService.downloadReport(repType, format, params);
      setResult('success');
    } catch (e: any) {
      setResult(e?.response?.data?.message || e?.message || 'Xatolik');
    } finally { setLoading(false); }
  }

  return (
    <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6 space-y-5">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Download size={20} /> Hisobot eksport qilish
      </h3>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Hisobot turi</p>
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map(t => (
            <button key={t.key} onClick={() => setRepType(t.key)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                repType === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {repType !== 'warehouse' && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Davr</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {PERIOD_OPTS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                  period === p.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300')}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex gap-3 mt-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm"/>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm"/>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Format</p>
        <div className="flex gap-2">
          {FORMAT_OPTS.map(f => (
            <button key={f.key} onClick={() => setFormat(f.key)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                format === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleDownload} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-md transition-all">
        {loading ? <><Loader2 size={16} className="animate-spin"/><span>Tayyorlanmoqda...</span></> : <><Download size={16}/><span>Yuklab olish</span></>}
      </button>

      {result && (
        <div className={cn('text-sm p-3 rounded-xl', result === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {result === 'success' ? '✅ Muvaffaqiyatli yuklab olindi' : `❌ ${result}`}
        </div>
      )}
    </div>
  );
}

// ==========================================
// History Panel
// ==========================================

const TYPE_LABELS: Record<string, string> = {
  SALES_DAILY: 'Kunlik sotuv', SALES_WEEKLY: 'Haftalik', SALES_MONTHLY: 'Oylik sotuv',
  FINANCIAL: 'Moliyaviy', PRODUCT_RATING: 'Mahsulot reytingi',
  STAFF: 'Xodimlar', WAREHOUSE: 'Ombor', TAX: 'Soliq',
};

function HistoryPanel() {
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    ReportsService.getHistory({ page, limit: 8 })
      .then(r => { setItems(r.data || []); setTotal(r.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    setDeleting(id);
    try { await ReportsService.deleteReport(id); load(); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
    finally { setDeleting(null); }
  }

  async function handleReDownload(item: ReportHistoryItem) {
    if (!item.fileName) return;
    try { await ReportsService.reDownload(item.id, item.fileName); }
    catch (e: any) { alert(e?.response?.data?.message || e?.message); }
  }

  const totalPages = Math.ceil(total / 8);

  return (
    <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
        <History size={20}/> Saqlangan hisobotlar
        <span className="text-sm font-normal text-gray-400 ml-auto">{total} ta</span>
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={24}/></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Hali hisobotlar yo'q</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <span className="text-lg">{item.format === 'EXCEL' ? '📗' : item.format === 'PDF' ? '📄' : '📋'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{TYPE_LABELS[item.type] || item.type}</div>
                <div className="text-xs text-gray-400 truncate">
                  {item.fileName || '—'} · {new Date(item.createdAt).toLocaleDateString('uz-UZ')}
                </div>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                item.status === 'DONE' ? 'bg-green-100 text-green-700' :
                item.status === 'ERROR' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>
                {item.status}
              </span>
              <div className="flex gap-1">
                {item.status === 'DONE' && (
                  <button onClick={() => handleReDownload(item)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Yuklab olish">
                    <Download size={14}/>
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40" title="O'chirish">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100 mt-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
            className="px-3 py-1 rounded text-xs border border-gray-300 disabled:opacity-40">←</button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
            className="px-3 py-1 rounded text-xs border border-gray-300 disabled:opacity-40">→</button>
        </div>
      )}
    </div>
  );
}

type InnerTab = 'stats' | 'export' | 'history';

export default function ReportsTab({ dashboardData, allOrders, dashboardPeriod, dashboardLoading, onPeriodChange }: ReportsTabProps) {
  const [innerTab, setInnerTab] = useState<InnerTab>('stats');
  const totalRevenue = dashboardData?.totalRevenue ?? dashboardData?.totalSales ?? 0;
  const totalExpenses = dashboardData?.totalExpenses ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const avgCheck = dashboardData?.averageCheck ?? 0;

  const revenueSources = [
    { label: "POS (To'g'ridan-to'g'ri)", value: (dashboardData as Record<string, number> | null)?.posSales || (dashboardData as Record<string, number> | null)?.cashSales || 0, color: 'bg-blue-500' },
    { label: 'Nonbor', value: (dashboardData as Record<string, number> | null)?.nonborSales || 0, color: 'bg-green-500' },
    { label: 'QR buyurtma', value: (dashboardData as Record<string, number> | null)?.qrSales || 0, color: 'bg-purple-500' },
    { label: 'Ofitsiant', value: (dashboardData as Record<string, number> | null)?.waiterSales || 0, color: 'bg-amber-500' },
  ];
  const maxSourceVal = Math.max(...revenueSources.map((s) => s.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Hisobotlar</h2>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
          <Printer size={16} /> Chop etish
        </button>
      </div>

      {/* Inner tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
        {([['stats','📈 Statistika'],['export','📥 Eksport'],['history','🗂 Tarix']] as [InnerTab,string][]).map(([k,l]) => (
          <button key={k} onClick={() => setInnerTab(k)}
            className={cn('flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
              innerTab === k ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {innerTab === 'export' && <ExportPanel />}
      {innerTab === 'history' && <HistoryPanel />}
      {innerTab === 'stats' && <>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => onPeriodChange(p.key)}
            className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-all',
              dashboardPeriod === p.key ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' : 'glass-strong border border-white/60 text-gray-700 hover:bg-white/50'
            )}>
            {p.label}
          </button>
        ))}
      </div>

      {dashboardLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Jami daromad', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'bg-green-500/10', iconColor: 'text-green-600' },
              { label: 'Jami xarajat', value: formatPrice(totalExpenses), icon: DollarSign, color: 'bg-red-500/10', iconColor: 'text-red-600' },
              { label: 'Sof foyda', value: formatPrice(netProfit), icon: BarChart3, color: 'bg-blue-500/10', iconColor: 'text-blue-600' },
              { label: "O'rtacha chek", value: formatPrice(avgCheck), icon: Calculator, color: 'bg-purple-500/10', iconColor: 'text-purple-600' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl border border-white/60 shadow-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', stat.color)}>
                    <stat.icon size={20} className={stat.iconColor} />
                  </div>
                  <span className="text-sm text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Revenue sources */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Daromad manbalari</h3>
            <div className="space-y-3">
              {revenueSources.map((source, idx) => {
                const pct = maxSourceVal > 0 ? (source.value / maxSourceVal) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-40 flex-shrink-0">{source.label}</span>
                    <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', source.color)} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-32 text-right">{formatPrice(source.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top products */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 mahsulotlar</h3>
            {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Mahsulot</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Sotilgan</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Daromad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topProducts.slice(0, 5).map((p: TopProduct, idx: number) => (
                      <tr key={idx} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{p.quantity || p.count || 0} ta</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">{formatPrice(p.revenue || p.total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Ma'lumot mavjud emas</p>
            )}
          </div>

          {/* Recent orders */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">So'nggi buyurtmalar</h3>
            {allOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Stol</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Holat</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Summa</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Vaqt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="border-b border-white/30 hover:bg-white/30 transition-colors">
                        <td className="px-4 py-2.5 text-sm font-mono text-gray-500">{(order.orderNumber || order.id || '').toString().slice(-6)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-900">{order.table?.number ? `Stol ${order.table.number}` : 'Olib ketish'}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white', getStatusColor(order.status))}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 text-right">{formatPrice(order.total || 0)}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-500 text-right">
                          {new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Buyurtmalar topilmadi</p>
            )}
          </div>
        </>
      )}
      </>}
    </div>
  );
}
