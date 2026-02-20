import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Store,
  CreditCard,
  Smartphone,
  Wallet,
  MessageSquare,
  Truck,
  Users,
  Settings,
  ArrowLeft,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Activity,
  Power,
} from 'lucide-react';
import { integrationService, type IntegrationStatus, type IntegrationLog } from '../services/integration.service';
import { settingsService } from '../services/settings.service';
import { cn } from '../lib/utils';

interface IntegrationHubProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

type Category = 'all' | 'marketplace' | 'payment' | 'notification' | 'delivery' | 'crm';

// Icon mapping
const ICON_MAP: Record<string, any> = {
  Store, CreditCard, Smartphone, Wallet, MessageSquare, Truck, Users,
};

// Category labels
const CATEGORY_LABELS: Record<Category, string> = {
  all: 'Hammasi',
  marketplace: 'Marketplace',
  payment: "To'lov",
  notification: 'Bildirishnoma',
  delivery: 'Yetkazish',
  crm: 'CRM',
};

// Integratsiya konfiguratsiya fieldlari
const CONFIG_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'password' | 'boolean' | 'events'; placeholder?: string }[]> = {
  nonbor: [
    { key: 'nonborSellerId', label: 'Seller ID', type: 'text', placeholder: 'Masalan: 42' },
    { key: 'nonborApiUrl', label: 'API URL', type: 'text', placeholder: 'https://nonbor.uz/api/v2' },
    { key: 'nonborApiSecret', label: 'API Secret', type: 'password', placeholder: 'Secret kalit' },
  ],
  payme: [
    { key: 'paymeMerchantId', label: 'Merchant ID', type: 'text', placeholder: 'Payme merchant ID' },
    { key: 'paymeSecretKey', label: 'Secret Key', type: 'password', placeholder: 'Payme secret key' },
    { key: 'paymeTestMode', label: 'Test rejim', type: 'boolean' },
  ],
  click: [
    { key: 'clickMerchantId', label: 'Merchant ID', type: 'text', placeholder: 'Click merchant ID' },
    { key: 'clickServiceId', label: 'Service ID', type: 'text', placeholder: 'Click service ID' },
    { key: 'clickSecretKey', label: 'Secret Key', type: 'password', placeholder: 'Click secret key' },
    { key: 'clickTestMode', label: 'Test rejim', type: 'boolean' },
  ],
  uzum: [
    { key: 'uzumMerchantId', label: 'Merchant ID', type: 'text', placeholder: 'Uzum merchant ID' },
    { key: 'uzumSecretKey', label: 'Secret Key', type: 'password', placeholder: 'Uzum secret key' },
    { key: 'uzumTestMode', label: 'Test rejim', type: 'boolean' },
  ],
  telegram: [
    { key: 'telegramBotToken', label: 'Bot Token', type: 'password', placeholder: '1234567:ABC-DEF...' },
    { key: 'telegramChatId', label: 'Chat ID', type: 'text', placeholder: '-100123456789' },
    { key: 'telegramEvents', label: 'Eventlar', type: 'events' },
  ],
  delivery: [
    { key: 'deliveryApiUrl', label: 'API URL', type: 'text', placeholder: 'https://delivery.example.com/api' },
    { key: 'deliveryApiKey', label: 'API Key', type: 'password', placeholder: 'API kalit' },
  ],
  crm: [
    { key: 'crmApiUrl', label: 'API URL', type: 'text', placeholder: 'https://crm.example.com/api' },
    { key: 'crmApiKey', label: 'API Key', type: 'password', placeholder: 'API kalit' },
    { key: 'crmEvents', label: 'Eventlar', type: 'events' },
  ],
};

const AVAILABLE_EVENTS = [
  'order:new', 'order:status', 'order:cancelled', 'order:completed',
  'product:created', 'product:updated', 'product:deleted',
];

export function IntegrationHub({ isOpen, onClose, onStatusChange }: IntegrationHubProps) {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
    }
  }, [isOpen]);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const data = await integrationService.getAll();
      setIntegrations(data);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setTestResult(null);
    setShowLogs(false);
    setConfigValues({});

    // Settings dan hozirgi qiymatlarni olish
    try {
      const settings = await settingsService.get() as any;
      const fields = CONFIG_FIELDS[id] || [];
      const values: Record<string, any> = {};
      for (const field of fields) {
        values[field.key] = settings[field.key] ?? (field.type === 'boolean' ? false : field.type === 'events' ? [] : '');
      }
      setConfigValues(values);
    } catch {
      // ignore - empty form
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await integrationService.updateConfig(selectedId, configValues);
      await fetchIntegrations();
      onStatusChange();
      setTestResult({ success: true, message: 'Saqlandi!' });
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.message || 'Xatolik' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setToggling(true);
    try {
      await integrationService.toggle(id, !currentEnabled);
      await fetchIntegrations();
      onStatusChange();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  const handleTest = async () => {
    if (!selectedId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await integrationService.test(selectedId);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.message || 'Test xatolik' });
    } finally {
      setTesting(false);
    }
  };

  const handleLoadLogs = async () => {
    if (!selectedId) return;
    setShowLogs(true);
    try {
      const result = await integrationService.getLogs(selectedId, 1, 10);
      setLogs(result.data);
    } catch {
      setLogs([]);
    }
  };

  const filteredIntegrations = activeCategory === 'all'
    ? integrations
    : integrations.filter((i) => i.category === activeCategory);

  const selectedIntegration = integrations.find((i) => i.id === selectedId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            {selectedId ? (
              <button
                onClick={() => { setSelectedId(null); setTestResult(null); setShowLogs(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">
                {selectedId ? selectedIntegration?.name : 'Integratsiya markazi'}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedId ? selectedIntegration?.description : 'Barcha integratsiyalarni boshqarish'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : selectedId && selectedIntegration ? (
            /* ======= DETAIL VIEW ======= */
            <div className="space-y-5">
              {/* Status + Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  {selectedIntegration.enabled ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle size={20} className="text-green-400" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                      <XCircle size={20} className="text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">
                      {selectedIntegration.enabled ? 'Yoqilgan' : "O'chirilgan"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selectedIntegration.configured ? 'Sozlangan' : 'Sozlanmagan'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(selectedId, selectedIntegration.enabled)}
                  disabled={toggling}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    selectedIntegration.enabled
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                  )}
                >
                  <Power size={16} />
                  {toggling ? '...' : selectedIntegration.enabled ? "O'chirish" : 'Yoqish'}
                </button>
              </div>

              {/* Config form */}
              {CONFIG_FIELDS[selectedId] && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Settings size={14} />
                    Konfiguratsiya
                  </h3>
                  {CONFIG_FIELDS[selectedId].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">
                        {field.label}
                      </label>
                      {field.type === 'boolean' ? (
                        <button
                          onClick={() => setConfigValues((v) => ({ ...v, [field.key]: !v[field.key] }))}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                            configValues[field.key]
                              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          )}
                        >
                          {configValues[field.key] ? <CheckCircle size={14} /> : <XCircle size={14} />}
                          {configValues[field.key] ? 'Yoqilgan' : "O'chirilgan"}
                        </button>
                      ) : field.type === 'events' ? (
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_EVENTS.map((event) => {
                            const isSelected = (configValues[field.key] || []).includes(event);
                            return (
                              <button
                                key={event}
                                onClick={() => {
                                  const current = configValues[field.key] || [];
                                  const updated = isSelected
                                    ? current.filter((e: string) => e !== event)
                                    : [...current, event];
                                  setConfigValues((v) => ({ ...v, [field.key]: updated }));
                                }}
                                className={cn(
                                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                                  isSelected
                                    ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                                    : 'bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300'
                                )}
                              >
                                {event}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                            value={configValues[field.key] || ''}
                            onChange={(e) => setConfigValues((v) => ({ ...v, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none pr-10"
                          />
                          {field.type === 'password' && (
                            <button
                              onClick={() => setShowPasswords((p) => ({ ...p, [field.key]: !p[field.key] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                              {showPasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Test
                </button>
                <button
                  onClick={handleLoadLogs}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Activity size={16} />
                  Loglar
                </button>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={cn(
                  'rounded-lg border p-3 text-sm',
                  testResult.success
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                )}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {testResult.message}
                  </div>
                </div>
              )}

              {/* Logs */}
              {showLogs && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-300">So'nggi loglar</h3>
                  {logs.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Loglar yo'q</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'h-2 w-2 rounded-full',
                              log.success ? 'bg-green-500' : 'bg-red-500'
                            )} />
                            <span className="text-slate-300 font-mono">{log.event}</span>
                            <span className="text-slate-600">{log.direction}</span>
                          </div>
                          <span className="text-slate-500">
                            {new Date(log.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ======= LIST VIEW ======= */
            <div className="space-y-5">
              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      activeCategory === cat
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Integrations Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredIntegrations.map((integration) => {
                  const IconComp = ICON_MAP[integration.icon] || Store;
                  return (
                    <button
                      key={integration.id}
                      onClick={() => handleSelect(integration.id)}
                      className={cn(
                        'group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                        integration.enabled
                          ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50 hover:bg-green-500/10'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                      )}
                    >
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
                        integration.enabled ? 'bg-green-500/20' : 'bg-slate-700/50'
                      )}>
                        <IconComp size={24} className={integration.enabled ? 'text-green-400' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{integration.name}</p>
                          {integration.enabled && (
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{integration.description}</p>
                        {integration.configured && !integration.enabled && (
                          <p className="text-xs text-yellow-500 mt-0.5">Sozlangan, lekin o'chirilgan</p>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>

              {/* Active count */}
              <div className="text-center text-sm text-slate-500">
                {integrations.filter((i) => i.enabled).length} / {integrations.length} integratsiya faol
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
