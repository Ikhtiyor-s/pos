import { useState, useEffect, useCallback } from 'react';
import {
  Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  Package, Zap, ZapOff, BarChart3, Loader2, ShoppingBag, ArrowDownToLine,
  Activity,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { nonborService, type NonborMonitoringStats } from '../../services/nonbor.service';

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'hozirgina';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} soat oldin` : `${Math.floor(h / 24)} kun oldin`;
}

function StatCard({
  label, value, sub, icon: Icon, accent = 'blue',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
      <div className={cn('rounded-xl p-2.5 border', colors[accent])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function WebhookStatusBadge({ stats }: { stats: NonborMonitoringStats }) {
  if (!stats.webhookActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        <ZapOff className="w-3 h-3" /> Webhook yo'q
      </span>
    );
  }
  if (stats.webhookSilent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        <AlertTriangle className="w-3 h-3" /> Webhook jimlik (5+ daqiqa)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <Zap className="w-3 h-3" /> Webhook faol
    </span>
  );
}

function PollingBadge({ intervalSec }: { intervalSec: number }) {
  const color =
    intervalSec <= 3  ? 'bg-red-100 text-red-700' :
    intervalSec <= 10 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600';
  const label =
    intervalSec <= 3  ? `Tezkor rejim (${intervalSec}s)` :
    intervalSec <= 10 ? `Tez (${intervalSec}s)` :
                        `Sekin (${intervalSec}s)`;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', color)}>
      <Activity className="w-3 h-3" /> {label}
    </span>
  );
}

function SuccessRate({ success, failure }: { success: number; failure: number }) {
  const total = success + failure;
  const rate = total === 0 ? 100 : Math.round((success / total) * 100);
  const color = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600';
  const barColor = rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500">Muvaffaqiyat darajasi</span>
        <span className={cn('text-sm font-bold', color)}>{rate}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${rate}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-gray-400">
        <span>{success} muvaffaqiyatli</span>
        <span>{failure} xato</span>
      </div>
    </div>
  );
}

export default function NonborMonitor() {
  const [stats, setStats] = useState<NonborMonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<{ updated: number; skipped: number; errors: number } | null>(null);

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await nonborService.getMonitoring();
      setStats(data);
      setLastRefresh(new Date());
    } catch {
      setError('Monitoring ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await nonborService.sync();
      await fetchStats(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleBatchSync = async () => {
    if (batchSyncing) return;
    setBatchSyncing(true);
    setBatchResult(null);
    try {
      const result = await nonborService.batchSyncProducts();
      setBatchResult(result);
      await fetchStats(true);
    } finally {
      setBatchSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-gray-500">{error || 'Ma\'lumot yuklanmadi'}</p>
        <button
          onClick={() => fetchStats()}
          className="text-xs bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  if (!stats.enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700">Nonbor ulanmagan</p>
        <p className="text-xs text-gray-400">Sozlamalar → Integratsiyalar bo'limidan ulang</p>
      </div>
    );
  }

  const totalRequests = stats.successCount + stats.failureCount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Nonbor Monitoring</h3>
          {stats.businessName && (
            <p className="text-xs text-gray-400 mt-0.5">{stats.businessName} · ID {stats.sellerId}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              {relativeTime(lastRefresh.toISOString())} yangilandi
            </span>
          )}
          <button
            onClick={() => fetchStats()}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <WebhookStatusBadge stats={stats} />
        <PollingBadge intervalSec={stats.pollingIntervalSec} />
        {stats.isPolling ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Wifi className="w-3 h-3" /> Polling faol
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <WifiOff className="w-3 h-3" /> Polling to'xtatilgan
          </span>
        )}
        {stats.retryQueueSize > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <Clock className="w-3 h-3" /> {stats.retryQueueSize} ta retry kutmoqda
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Bugungi buyurtmalar"
          value={stats.nonborOrdersToday}
          sub="Nonbor orqali"
          icon={ShoppingBag}
          accent="blue"
        />
        <StatCard
          label="Jami buyurtmalar"
          value={stats.totalNonborOrders}
          sub="Barcha vaqt"
          icon={BarChart3}
          accent="purple"
        />
        <StatCard
          label="So'nggi sync"
          value={relativeTime(stats.lastSyncAt)}
          icon={Clock}
          accent="green"
        />
        <StatCard
          label="Mahsulot batch sync"
          value={relativeTime(stats.lastBatchSyncAt)}
          icon={Package}
          accent="orange"
        />
      </div>

      {/* Success rate */}
      {totalRequests > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <SuccessRate success={stats.successCount} failure={stats.failureCount} />
        </div>
      )}

      {/* Webhook info */}
      {stats.webhookActive && (
        <div className={cn(
          'rounded-2xl border p-4',
          stats.webhookSilent ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100',
        )}>
          <div className="flex items-start gap-3">
            {stats.webhookSilent
              ? <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              : <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            }
            <div>
              <p className={cn('text-xs font-semibold', stats.webhookSilent ? 'text-orange-700' : 'text-green-700')}>
                {stats.webhookSilent ? 'Webhook jimlik rejimi' : 'Webhook muvaffaqiyatli ishlayapti'}
              </p>
              <p className={cn('text-xs mt-0.5', stats.webhookSilent ? 'text-orange-600' : 'text-green-600')}>
                {stats.webhookSilent
                  ? `Tezkor rejimga o'tildi (${stats.pollingIntervalSec}s polling). So'nggi webhook: ${relativeTime(stats.webhookLastAt)}`
                  : `So'nggi webhook: ${relativeTime(stats.webhookLastAt)}`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Batch sync result */}
      {batchResult && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-1">Batch sync natijasi</p>
          <div className="flex gap-4 text-xs text-blue-600">
            <span><span className="font-bold">{batchResult.updated}</span> yangilandi</span>
            <span><span className="font-bold">{batchResult.skipped}</span> o'tkazib yuborildi</span>
            {batchResult.errors > 0 && (
              <span className="text-red-600"><span className="font-bold">{batchResult.errors}</span> xato</span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 disabled:opacity-60 transition-colors text-sm font-medium"
        >
          {syncing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sync...</>
            : <><RefreshCw className="w-4 h-4" /> Manual sync</>
          }
        </button>
        <button
          onClick={handleBatchSync}
          disabled={batchSyncing}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium"
        >
          {batchSyncing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda...</>
            : <><ArrowDownToLine className="w-4 h-4" /> Narxlarni yangilash</>
          }
        </button>
      </div>
    </div>
  );
}
