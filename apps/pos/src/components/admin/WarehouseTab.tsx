import { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle, ShoppingCart, Trash2, Plus, RefreshCw,
  ChevronDown, ChevronUp, Search, X, Check, Loader2, TrendingDown,
  Users, BarChart3, ArrowDownToLine, ArrowUpFromLine, Edit3,
  ChevronRight, AlertCircle, BookOpen,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';

// ==========================================
// TYPES
// ==========================================

interface InventoryItem {
  id: string; name: string; sku: string; unit: string;
  quantity: number; minQuantity: number; costPrice: number;
  isActive: boolean; supplier?: { id: string; name: string };
}

interface StockAlert {
  id: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentQty: number; minQty: number; isResolved: boolean; createdAt: string;
  inventoryItem: { id: string; name: string; sku: string; unit: string };
}

interface Supplier {
  id: string; name: string; phone?: string; email?: string; address?: string; isActive: boolean;
}

interface PurchaseOrder {
  id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string;
  supplier: { id: string; name: string };
  _count?: { items: number };
}

interface WasteLog {
  id: string; quantity: number; reason: string; costAmount: number; createdAt: string;
  inventoryItem: { id: string; name: string; unit: string };
}

interface MonthlyTurnover {
  period: { year: number; month: number };
  summary: {
    totalTransactions: number; totalInCost: number; totalOutCost: number;
    totalWasteCost: number; netCost: number; currentStockValue: number; lowStockCount: number;
  };
  byItem: Array<{
    itemId: string; name: string; sku: string; unit: string;
    totalIn: number; totalOut: number; totalWaste: number; inCost: number; outCost: number;
  }>;
}

type Tab = 'inventory' | 'alerts' | 'suppliers' | 'purchase-orders' | 'waste' | 'reports';

// ==========================================
// HELPERS
// ==========================================

const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Kritik',    color: 'text-red-700 bg-red-100 border-red-200'    },
  HIGH:     { label: 'Yuqori',    color: 'text-orange-700 bg-orange-100 border-orange-200' },
  MEDIUM:   { label: "O'rta",     color: 'text-yellow-700 bg-yellow-100 border-yellow-200' },
  LOW:      { label: 'Past',      color: 'text-blue-700 bg-blue-100 border-blue-200'  },
};

const PO_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',   color: 'text-gray-600 bg-gray-100'   },
  SENT:      { label: 'Yuborilgan', color: 'text-blue-600 bg-blue-100'   },
  PARTIAL:   { label: 'Qisman',     color: 'text-yellow-700 bg-yellow-100' },
  RECEIVED:  { label: 'Qabul',      color: 'text-green-700 bg-green-100' },
  CANCELLED: { label: 'Bekor',      color: 'text-red-600 bg-red-100'     },
};

function fmt(n: number) {
  return n.toLocaleString('uz-UZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtCost(n: number) {
  return n.toLocaleString('uz-UZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' so\'m';
}

// ==========================================
// MODAL
// ==========================================

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, error }: {
  label: string; children: React.ReactNode; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

// ==========================================
// INVENTORY TAB
// ==========================================

function InventoryTab() {
  const [items, setItems]       = useState<InventoryItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTx, setShowTx]     = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/inventory', { params: { page, search, limit: 30 } });
      setItems(r.data || []);
      setTotal(r.meta?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    await api.delete(`/inventory/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nom yoki SKU bo'yicha qidirish..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <button
          onClick={() => { setSelected(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" /> Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const low = item.minQuantity > 0 && item.quantity <= item.minQuantity;
            return (
              <div key={item.id} className={cn('bg-white border rounded-2xl p-4', low ? 'border-orange-200' : 'border-gray-100')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      {low && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Kam qoldi</span>}
                      {!item.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Nofaol</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku} · {item.supplier?.name || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-base font-bold', low ? 'text-orange-600' : 'text-gray-900')}>
                      {fmt(item.quantity)} {item.unit}
                    </p>
                    <p className="text-xs text-gray-400">Min: {fmt(item.minQuantity)} {item.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => { setSelected(item); setShowTx(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" /> Kirim/Chiqim
                  </button>
                  <button
                    onClick={() => { setSelected(item); setShowRecipe(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Retseptlar
                  </button>
                  <button
                    onClick={() => { setSelected(item); setShowForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 ml-auto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400">
                    <Trash2 className="w-3.5 h-3.5 hover:text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Mahsulot topilmadi</div>
          )}
        </div>
      )}

      {total > 30 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">
            ← Oldingi
          </button>
          <span className="text-xs text-gray-500">{page} / {Math.ceil(total / 30)}</span>
          <button disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">
            Keyingi →
          </button>
        </div>
      )}

      {showForm   && <InventoryForm item={selected} onClose={() => setShowForm(false)}   onSaved={load} />}
      {showTx     && selected && <TransactionForm item={selected} onClose={() => setShowTx(false)} onSaved={load} />}
      {showRecipe && selected && <RecipeView itemId={selected.id} itemName={selected.name} onClose={() => setShowRecipe(false)} />}
    </div>
  );
}

// ==========================================
// INVENTORY FORM MODAL
// ==========================================

function InventoryForm({ item, onClose, onSaved }: {
  item: InventoryItem | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name || '', sku: item?.sku || '', unit: item?.unit || 'kg',
    quantity: item?.quantity || 0, minQuantity: item?.minQuantity || 0,
    costPrice: item?.costPrice || 0,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (item) {
        await api.put(`/inventory/${item.id}`, form);
      } else {
        await api.post('/inventory', form);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? 'Tahrirlash' : 'Yangi mahsulot'} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nom *">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="SKU *">
            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className={inputCls} />
          </FormField>
          <FormField label="Birlik">
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputCls}>
              {['kg', 'g', 'l', 'ml', 'dona', 'pachka', 'qop', 'litr'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>
        </div>
        {!item && (
          <FormField label="Boshlang'ich miqdor">
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} className={inputCls} />
          </FormField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min. miqdor">
            <input type="number" value={form.minQuantity} onChange={e => setForm(f => ({ ...f, minQuantity: +e.target.value }))} className={inputCls} />
          </FormField>
          <FormField label="Narxi (so'm)">
            <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: +e.target.value }))} className={inputCls} />
          </FormField>
        </div>
        <button onClick={save} disabled={saving || !form.name || !form.sku}
          className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : item ? 'Saqlash' : 'Yaratish'}
        </button>
      </div>
    </Modal>
  );
}

// ==========================================
// TRANSACTION FORM
// ==========================================

function TransactionForm({ item, onClose, onSaved }: {
  item: InventoryItem; onClose: () => void; onSaved: () => void;
}) {
  const [type, setType]       = useState<'IN' | 'OUT' | 'WASTE' | 'ADJUST'>('IN');
  const [quantity, setQty]    = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const save = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { setError("Miqdor musbat bo'lishi kerak"); return; }
    setSaving(true);
    setError('');
    try {
      await api.post(`/inventory/${item.id}/transaction`, { type, quantity: qty, notes });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`${item.name} — Tranzaksiya`} onClose={onClose}>
      <div className="space-y-4">
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">Joriy zaxira</p>
          <p className="text-xl font-bold text-gray-900">{fmt(item.quantity)} {item.unit}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['IN', 'OUT', 'WASTE', 'ADJUST'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={cn('py-2 rounded-xl text-xs font-medium border transition-colors', type === t
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
              {t === 'IN' ? 'Kirim' : t === 'OUT' ? 'Chiqim' : t === 'WASTE' ? 'Isrof' : "To'g'irlash"}
            </button>
          ))}
        </div>
        <FormField label={`Miqdor (${item.unit})`} error={error}>
          <input type="number" value={quantity} onChange={e => setQty(e.target.value)} className={inputCls} placeholder="0" />
        </FormField>
        <FormField label="Izoh">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={cn(inputCls, 'resize-none')} />
        </FormField>
        <button onClick={save} disabled={saving || !quantity}
          className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Saqlash'}
        </button>
      </div>
    </Modal>
  );
}

// ==========================================
// RECIPE VIEW
// ==========================================

function RecipeView({ itemId, itemName, onClose }: {
  itemId: string; itemName: string; onClose: () => void;
}) {
  const [products, setProducts]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.get('/products', { params: { limit: 200 } })
      .then(r => setProducts(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal title={`"${itemName}" — Retseptlar`} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">Bu ingredientni ishlatadigan mahsulotlar:</p>
          {products.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Hali mahsulot yo'q</p>}
          {products.slice(0, 20).map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
              <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.price?.toLocaleString()} so'm</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ==========================================
// ALERTS TAB
// ==========================================

function AlertsTab() {
  const [alerts, setAlerts]   = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setCheck]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/warehouse/stock-alerts', { params: { isResolved: false, limit: 50 } });
      setAlerts(r.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const checkAlerts = async () => {
    setCheck(true);
    try {
      await api.post('/warehouse/stock-alerts/check');
      load();
    } finally {
      setCheck(false);
    }
  };

  const resolve = async (id: string) => {
    await api.patch(`/warehouse/stock-alerts/${id}/resolve`);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{alerts.length} ta faol ogohlantirish</p>
          <p className="text-xs text-gray-400">Hal qilinmagan stock alertlar</p>
        </div>
        <button onClick={checkAlerts} disabled={checking}
          className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-medium">
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Tekshirish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-sm text-gray-500">Barcha stock me'yorda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const pct = alert.minQty > 0 ? Math.min(100, (alert.currentQty / alert.minQty) * 100) : 0;
            return (
              <div key={alert.id} className={cn('border rounded-2xl p-4', cfg.color.split(' ').filter(c => c.startsWith('border')).join(' ') || 'border-gray-100')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{alert.inventoryItem.name}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">SKU: {alert.inventoryItem.sku}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', pct === 0 ? 'bg-red-500' : pct < 30 ? 'bg-orange-500' : 'bg-yellow-500')}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {fmt(alert.currentQty)}/{fmt(alert.minQty)} {alert.inventoryItem.unit}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => resolve(alert.id)}
                    className="p-2 rounded-xl hover:bg-white/60 text-gray-400 hover:text-green-600 flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUPPLIERS TAB
// ==========================================

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selected, setSelected]   = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/warehouse/suppliers', { params: { limit: 100 } });
      setSuppliers(r.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return;
    try {
      await api.delete(`/warehouse/suppliers/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xatolik');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">{suppliers.length} ta yetkazib beruvchi</p>
        <button onClick={() => { setSelected(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Qo'shish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-2">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.phone || s.email || '—'}</p>
              </div>
              {!s.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Nofaol</span>}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setSelected(s); setShowForm(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {suppliers.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Yetkazib beruvchi topilmadi</div>
          )}
        </div>
      )}

      {showForm && <SupplierForm supplier={selected} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }: {
  supplier: Supplier | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: supplier?.name || '', phone: supplier?.phone || '',
    email: supplier?.email || '', address: supplier?.address || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (supplier) {
        await api.put(`/warehouse/suppliers/${supplier.id}`, form);
      } else {
        await api.post('/warehouse/suppliers', form);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={supplier ? 'Tahrirlash' : 'Yangi yetkazib beruvchi'} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Nom *">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        </FormField>
        <FormField label="Telefon">
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
        </FormField>
        <FormField label="Email">
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
        </FormField>
        <FormField label="Manzil">
          <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className={cn(inputCls, 'resize-none')} />
        </FormField>
        <button onClick={save} disabled={saving || !form.name}
          className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : supplier ? 'Saqlash' : 'Yaratish'}
        </button>
      </div>
    </Modal>
  );
}

// ==========================================
// WASTE TAB
// ==========================================

function WasteTab() {
  const [logs, setLogs]       = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/warehouse/waste-logs', { params: { page, limit: 20 } });
      setLogs(r.data || []);
      setTotal(r.meta?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalCost = logs.reduce((s, l) => s + Number(l.costAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Isrof jurnali</p>
          {logs.length > 0 && <p className="text-xs text-gray-400">Sahifadagi jami: {fmtCost(totalCost)}</p>}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Qayd etish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{log.inventoryItem.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{log.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.createdAt).toLocaleDateString('uz-UZ')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-600">−{fmt(log.quantity)} {log.inventoryItem.unit}</p>
                  <p className="text-xs text-gray-400">{fmtCost(Number(log.costAmount))}</p>
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Hali isrof qayd etilmagan</div>
          )}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">← Oldingi</button>
          <span className="text-xs text-gray-500">{page} / {Math.ceil(total / 20)}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40">Keyingi →</button>
        </div>
      )}

      {showForm && <WasteForm onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function WasteForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [form, setForm]       = useState({ inventoryItemId: '', quantity: '', reason: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/inventory', { params: { limit: 200, isActive: true } })
      .then(r => setItems(r.data.data || []));
  }, []);

  const save = async () => {
    if (!form.inventoryItemId || !form.quantity || !form.reason) {
      setError('Barcha maydonlar to\'ldirilishi shart'); return;
    }
    setSaving(true); setError('');
    try {
      await api.post('/warehouse/waste-logs', {
        inventoryItemId: form.inventoryItemId,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
      });
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Isrofni qayd etish" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Mahsulot *">
          <select value={form.inventoryItemId} onChange={e => setForm(f => ({ ...f, inventoryItemId: e.target.value }))} className={inputCls}>
            <option value="">Tanlang...</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>{i.name} ({fmt(i.quantity)} {i.unit})</option>
            ))}
          </select>
        </FormField>
        <FormField label="Miqdor" error={error}>
          <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputCls} placeholder="0" />
        </FormField>
        <FormField label="Sabab *">
          <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
            placeholder="Isrof sababi..." className={cn(inputCls, 'resize-none')} />
        </FormField>
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Qayd etish'}
        </button>
      </div>
    </Modal>
  );
}

// ==========================================
// REPORTS TAB
// ==========================================

function ReportsTab() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [data, setData]       = useState<MonthlyTurnover | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/warehouse/reports/monthly-turnover', { params: { year, month } });
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year, month]);

  const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-3">
        <select value={year} onChange={e => setYear(+e.target.value)} className={cn(inputCls, 'w-28')}>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(+e.target.value)} className={cn(inputCls, 'flex-1')}>
          {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200">
          <RefreshCw className={cn('w-4 h-4 text-gray-600', loading && 'animate-spin')} />
        </button>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Kirim summasi',    value: fmtCost(data.summary.totalInCost),    icon: ArrowDownToLine, color: 'green' },
              { label: 'Chiqim summasi',   value: fmtCost(data.summary.totalOutCost),   icon: ArrowUpFromLine, color: 'blue'  },
              { label: 'Isrof summasi',    value: fmtCost(data.summary.totalWasteCost), icon: TrendingDown,    color: 'red'   },
              { label: 'Joriy zaxira',     value: fmtCost(data.summary.currentStockValue), icon: Package,     color: 'purple'},
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-2',
                  color === 'green' ? 'bg-green-50 text-green-600' :
                  color === 'blue'  ? 'bg-blue-50 text-blue-600' :
                  color === 'red'   ? 'bg-red-50 text-red-600' :
                                      'bg-purple-50 text-purple-600')}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Low stock warning */}
          {data.summary.lowStockCount > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                <span className="font-semibold">{data.summary.lowStockCount} ta mahsulot</span> minimum darajadan past
              </p>
            </div>
          )}

          {/* Top items by turnover */}
          <div className="bg-white border border-gray-100 rounded-2xl">
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Eng ko'p aylanma</p>
                <p className="text-xs text-gray-400 mt-0.5">{data.byItem.length} ta mahsulot</p>
              </div>
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {expanded && (
              <div className="border-t border-gray-50 divide-y divide-gray-50">
                {data.byItem.slice(0, 15).map(item => (
                  <div key={item.itemId} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                        <span className="text-green-600">↑ {fmt(item.totalIn)} {item.unit}</span>
                        <span className="text-blue-600">↓ {fmt(item.totalOut)} {item.unit}</span>
                        {item.totalWaste > 0 && <span className="text-red-500">✗ {fmt(item.totalWaste)} {item.unit}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-600">{fmtCost(item.outCost)}</p>
                      <p className="text-xs text-gray-400">chiqim</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// PURCHASE ORDERS TAB
// ==========================================

function PurchaseOrdersTab() {
  const [orders, setOrders]   = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/warehouse/purchase-orders', { params: { limit: 30 } });
      setOrders(r.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">{orders.length} ta xarid buyurtmasi</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Yangi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const cfg = PO_STATUS_CONFIG[order.status] || { label: order.status, color: 'text-gray-600 bg-gray-100' };
            return (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.color)}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{order.supplier.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('uz-UZ')} · {order._count?.items || 0} ta mahsulot
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmtCost(Number(order.totalAmount))}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Xarid buyurtmasi yo'q</div>
          )}
        </div>
      )}

      {showForm && <PurchaseOrderForm onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

function PurchaseOrderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines]         = useState([{ inventoryItemId: '', quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/warehouse/suppliers', { params: { limit: 100, isActive: true } }),
      api.get('/inventory', { params: { limit: 200, isActive: true } }),
    ]).then(([s, i]) => {
      setSuppliers(s.data.data || []);
      setItems(i.data.data || []);
    });
  }, []);

  const addLine   = () => setLines(l => [...l, { inventoryItemId: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) =>
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const save = async () => {
    if (!supplierId) { setError('Yetkazib beruvchi tanlanishi shart'); return; }
    if (lines.some(l => !l.inventoryItemId)) { setError('Barcha mahsulotlar tanlanishi shart'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/warehouse/purchase-orders', { supplierId, items: lines });
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Yangi xarid buyurtmasi" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Yetkazib beruvchi *">
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputCls}>
            <option value="">Tanlang...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Mahsulotlar</label>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                <select value={line.inventoryItemId}
                  onChange={e => {
                    updateLine(i, 'inventoryItemId', e.target.value);
                    const item = items.find(it => it.id === e.target.value);
                    if (item) updateLine(i, 'unitPrice', item.costPrice);
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400">
                  <option value="">Mahsulot...</option>
                  {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                </select>
                <input type="number" value={line.quantity} min={1}
                  onChange={e => updateLine(i, 'quantity', +e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" placeholder="Miqdor" />
                <input type="number" value={line.unitPrice} min={0}
                  onChange={e => updateLine(i, 'unitPrice', +e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" placeholder="Narx" />
                <button onClick={() => removeLine(i)} disabled={lines.length === 1}
                  className="p-1 rounded hover:bg-red-50 text-gray-400 disabled:opacity-30">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addLine} className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
            <Plus className="w-3.5 h-3.5" /> Qo'shish
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 flex justify-between">
          <span className="text-sm text-gray-600">Jami:</span>
          <span className="text-sm font-bold text-gray-900">{fmtCost(total)}</span>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={save} disabled={saving}
          className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Yaratish'}
        </button>
      </div>
    </Modal>
  );
}

// ==========================================
// MAIN WAREHOUSE TAB
// ==========================================

const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: () => Promise<number> }[] = [
  { id: 'inventory',       label: 'Inventar',   icon: Package    },
  { id: 'alerts',          label: 'Alertlar',   icon: AlertTriangle },
  { id: 'suppliers',       label: 'Yetkazuvchilar', icon: Users  },
  { id: 'purchase-orders', label: 'Xarid',      icon: ShoppingCart  },
  { id: 'waste',           label: 'Isrof',      icon: Trash2    },
  { id: 'reports',         label: 'Hisobot',    icon: BarChart3 },
];

export default function WarehouseTab() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    api.get('/warehouse/stock-alerts', { params: { isResolved: false, limit: 1 } })
      .then(r => setAlertCount(r.data.meta?.total || 0))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Tab navigation */}
      <div className="flex overflow-x-auto border-b border-gray-100 bg-white sticky top-0 z-10 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0',
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'alerts' && alertCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'inventory'       && <InventoryTab />}
        {activeTab === 'alerts'          && <AlertsTab />}
        {activeTab === 'suppliers'       && <SuppliersTab />}
        {activeTab === 'purchase-orders' && <PurchaseOrdersTab />}
        {activeTab === 'waste'           && <WasteTab />}
        {activeTab === 'reports'         && <ReportsTab />}
      </div>
    </div>
  );
}
