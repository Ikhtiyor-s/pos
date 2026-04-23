import { useState, useEffect, useCallback } from 'react';
import {
  Webhook, Plus, Trash2, RefreshCw, Check, X, ChevronDown, ChevronUp,
  Eye, EyeOff, AlertCircle, CheckCircle2, Clock, Loader2, Zap, Info,
  Copy, ExternalLink, Activity,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';

// ==========================================
// TYPES
// ==========================================

interface WebhookProvider {
  id: string;
  providerName: string;
  isActive: boolean;
  secret: string | null;
  fieldMapping: any;
  statusMapping: any;
  notes: string | null;
  createdAt: string;
  _count?: { retryQueue: number };
}

interface RetryQueueItem {
  id: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: string;
  resolved: boolean;
  createdAt: string;
}

interface AvailableProvider {
  name: string;
  label: string;
  country: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  YANDEX_EATS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DELIVERY_CLUB: 'bg-purple-100 text-purple-800 border-purple-200',
  EXPRESS24: 'bg-blue-100 text-blue-800 border-blue-200',
  OLX_FOOD: 'bg-green-100 text-green-800 border-green-200',
  CUSTOM: 'bg-gray-100 text-gray-800 border-gray-200',
};

const PROVIDER_FLAGS: Record<string, string> = {
  YANDEX_EATS: '🇷🇺',
  DELIVERY_CLUB: '🇷🇺',
  EXPRESS24: '🇺🇿',
  OLX_FOOD: '🇺🇿',
  CUSTOM: '🌐',
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function WebhookProvidersTab() {
  const [providers, setProviders] = useState<WebhookProvider[]>([]);
  const [available, setAvailable] = useState<AvailableProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [queueMap, setQueueMap] = useState<Record<string, RetryQueueItem[]>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [providersRes, availableRes] = await Promise.all([
        api.get('/webhook-providers'),
        api.get('/webhook-providers/available'),
      ]);
      setProviders(providersRes.data?.data || []);
      setAvailable(availableRes.data?.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (provider: WebhookProvider) => {
    try {
      await api.put(`/webhook-providers/${provider.id}`, { isActive: !provider.isActive });
      setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, isActive: !p.isActive } : p));
    } catch {
      // ignore
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Provider va uning barcha retry queue yozuvlarini o\'chirishni tasdiqlang')) return;
    try {
      await api.delete(`/webhook-providers/${id}`);
      setProviders(prev => prev.filter(p => p.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {
      // ignore
    }
  };

  const loadQueue = async (providerId: string) => {
    try {
      const res = await api.get(`/webhook-providers/${providerId}/queue`);
      setQueueMap(prev => ({ ...prev, [providerId]: res.data?.data || [] }));
    } catch {
      // ignore
    }
  };

  const runTest = async (provider: WebhookProvider) => {
    setTesting(provider.id);
    setTestResults(prev => ({ ...prev, [provider.id]: { success: false, message: 'Sinayapman...' } }));
    try {
      const res = await api.post(`/webhook-providers/${provider.id}/test`);
      const data = res.data?.data;
      setTestResults(prev => ({
        ...prev,
        [provider.id]: {
          success: data?.success ?? false,
          message: data?.success
            ? `Buyurtma yaratildi: #${data.orderId}`
            : `Xato: ${data?.error || 'Noma\'lum xato'}`,
        },
      }));
    } catch (e: any) {
      setTestResults(prev => ({
        ...prev,
        [provider.id]: { success: false, message: `Xato: ${e.response?.data?.message || e.message}` },
      }));
    } finally {
      setTesting(null);
    }
  };

  const getWebhookUrl = (providerName: string, tenantSlug: string) => {
    const base = (import.meta as any).env?.VITE_API_URL || window.location.origin + '/api';
    return `${base}/webhook-providers/incoming/${providerName}/${tenantSlug}`;
  };

  const usedNames = providers.map(p => p.providerName);
  const addableProviders = available.filter(a => !usedNames.includes(a.name));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Webhook className="w-6 h-6 text-blue-600" />
            Online Buyurtma Provayderlar
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tashqi yetkazib berish xizmatlaridan avtomatik buyurtma qabul qilish
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          disabled={addableProviders.length === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            addableProviders.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <Plus className="w-4 h-4" />
          Provayderlar qo'shish
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && addableProviders.length > 0 && (
        <AddProviderForm
          available={addableProviders}
          onAdded={() => { setShowAddForm(false); load(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Info Banner */}
      {providers.length === 0 && !showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Webhook className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="font-semibold text-blue-900 mb-1">Hech qanday provayderlar yo'q</h3>
          <p className="text-sm text-blue-600">
            Yandex Eats, Express24 yoki boshqa xizmatlardan buyurtma qabul qilish uchun provayderlar qo'shing
          </p>
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-3">
        {providers.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            expanded={expandedId === provider.id}
            queue={queueMap[provider.id]}
            testResult={testResults[provider.id]}
            testing={testing === provider.id}
            onToggle={() => {
              setExpandedId(expandedId === provider.id ? null : provider.id);
              if (expandedId !== provider.id) loadQueue(provider.id);
            }}
            onToggleActive={() => toggleActive(provider)}
            onRemove={() => remove(provider.id)}
            onTest={() => runTest(provider)}
            onReloadQueue={() => loadQueue(provider.id)}
            getWebhookUrl={getWebhookUrl}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// PROVIDER CARD
// ==========================================

interface ProviderCardProps {
  provider: WebhookProvider;
  expanded: boolean;
  queue?: RetryQueueItem[];
  testResult?: { success: boolean; message: string };
  testing: boolean;
  onToggle: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
  onTest: () => void;
  onReloadQueue: () => void;
  getWebhookUrl: (name: string, slug: string) => string;
}

function ProviderCard({
  provider, expanded, queue, testResult, testing,
  onToggle, onToggleActive, onRemove, onTest, onReloadQueue, getWebhookUrl,
}: ProviderCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const pendingCount = queue?.filter(q => !q.resolved).length ?? (provider._count?.retryQueue || 0);
  const colorClass = PROVIDER_COLORS[provider.providerName] || PROVIDER_COLORS.CUSTOM;
  const flag = PROVIDER_FLAGS[provider.providerName] || '🌐';

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const webhookUrl = getWebhookUrl(provider.providerName, 'your-tenant-slug');

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-shadow',
      provider.isActive ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60',
    )}>
      {/* Card Header */}
      <div className="bg-white p-4">
        <div className="flex items-center gap-3">
          {/* Provider Badge */}
          <div className={cn('px-3 py-1 rounded-full text-xs font-bold border', colorClass)}>
            {flag} {provider.providerName.replace('_', ' ')}
          </div>

          {/* Status */}
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            provider.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          )}>
            {provider.isActive ? 'Faol' : 'To\'xtatilgan'}
          </span>

          {/* Pending queue */}
          {pendingCount > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pendingCount} kutmoqda
            </span>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={onTest}
            disabled={testing}
            title="Test buyurtma yuborish"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleActive}
            title={provider.isActive ? 'To\'xtatish' : 'Yoqish'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              provider.isActive
                ? 'text-green-600 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            )}
          >
            {provider.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>

          <button
            onClick={onRemove}
            title="O'chirish"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={cn(
            'mt-3 flex items-start gap-2 text-sm px-3 py-2 rounded-lg',
            testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          )}>
            {testResult.success
              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            }
            {testResult.message}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Webhook URL
            </label>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <code className="text-xs text-gray-700 flex-1 truncate font-mono">{webhookUrl}</code>
              <button
                onClick={() => copyUrl(webhookUrl)}
                className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                title="Nusxa olish"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Bu URLni yetkazib berish platformasiga webhook manzil sifatida kiriting
            </p>
          </div>

          {/* Secret */}
          {provider.secret && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Webhook Secret
              </label>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <code className="text-xs text-gray-700 flex-1 font-mono">
                  {showSecret ? provider.secret : '••••••••••••••••'}
                </code>
                <button
                  onClick={() => setShowSecret(v => !v)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {provider.notes && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Izoh
              </label>
              <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
                {provider.notes}
              </p>
            </div>
          )}

          {/* Retry Queue */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Retry Queue {queue && `(${queue.length})`}
              </label>
              <button
                onClick={onReloadQueue}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Yangilash
              </button>
            </div>
            {queue && queue.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {queue.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'text-xs rounded-lg px-3 py-2 flex items-start gap-2',
                      item.resolved ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                    )}
                  >
                    {item.resolved
                      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      : <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.resolved ? 'Muvaffaqiyatli' : `Urinish ${item.attempts}/${item.maxAttempts}`}
                        </span>
                        <span className="text-gray-400">
                          {new Date(item.createdAt).toLocaleTimeString('uz-UZ')}
                        </span>
                      </div>
                      {item.lastError && (
                        <div className="truncate text-red-600 mt-0.5">{item.lastError}</div>
                      )}
                      {!item.resolved && (
                        <div className="text-gray-500 mt-0.5">
                          Keyingi urinish: {new Date(item.nextRetryAt).toLocaleTimeString('uz-UZ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 bg-white border border-gray-100 rounded-lg px-3 py-3 text-center">
                <Activity className="w-4 h-4 mx-auto mb-1 text-gray-300" />
                Hech qanday qayta urinish yo'q
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ADD PROVIDER FORM
// ==========================================

interface AddProviderFormProps {
  available: AvailableProvider[];
  onAdded: () => void;
  onCancel: () => void;
}

function AddProviderForm({ available, onAdded, onCancel }: AddProviderFormProps) {
  const [selected, setSelected] = useState(available[0]?.name || '');
  const [secret, setSecret] = useState('');
  const [notes, setNotes] = useState('');
  const [useCustomMapping, setUseCustomMapping] = useState(false);
  const [defaultConfig, setDefaultConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selected) {
      api.get(`/webhook-providers/config/${selected}`).then(res => {
        setDefaultConfig(res.data?.data);
      }).catch(() => setDefaultConfig(null));
    }
  }, [selected]);

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/webhook-providers', {
        providerName: selected,
        secret: secret || undefined,
        notes: notes || undefined,
        fieldMapping: useCustomMapping ? defaultConfig?.fieldMapping : undefined,
        statusMapping: useCustomMapping ? defaultConfig?.statusMapping : undefined,
      });
      onAdded();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Plus className="w-4 h-4 text-blue-600" />
        Yangi provayderlar qo'shish
      </h3>

      {/* Platform selection */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {available.map(a => (
          <button
            key={a.name}
            onClick={() => setSelected(a.name)}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all',
              selected === a.name
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            <span className="text-xl">{PROVIDER_FLAGS[a.name] || '🌐'}</span>
            <span className="text-center leading-tight">{a.label}</span>
            <span className="text-gray-400">{a.country}</span>
          </button>
        ))}
      </div>

      {/* Default mapping info */}
      {defaultConfig && !useCustomMapping && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600">
            <span className="font-medium">{selected}</span> uchun tayyor field mapping ishlatiladi.
            {' '}
            <button
              onClick={() => setUseCustomMapping(true)}
              className="text-blue-600 hover:underline"
            >
              Maxsus sozlash
            </button>
          </div>
        </div>
      )}

      {/* Secret */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Webhook Secret <span className="text-gray-400 font-normal">(ixtiyoriy)</span>
        </label>
        <input
          type="text"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Platform bergan maxfiy kalit..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <p className="text-xs text-gray-400 mt-1">
          Webhook imzo tekshirish uchun. Ko'p platformalarda ixtiyoriy.
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Izoh <span className="text-gray-400 font-normal">(ixtiyoriy)</span>
        </label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Bu integratsiya haqida..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Bekor qilish
        </button>
        <button
          onClick={submit}
          disabled={!selected || saving}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
            (!selected || saving)
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Qo'shish
        </button>
      </div>
    </div>
  );
}
