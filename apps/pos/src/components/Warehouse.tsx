import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, RefreshCw, Search, AlertTriangle, Trash2, Edit3, Save, X,
  Loader2, History, Bell, Tag, MapPin, Calendar, ArrowUp, ArrowDown,
  Camera, Package,
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WarehouseItem {
  id: string;
  name: string;
  image?: string;
  sku?: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice?: number;
  supplier?: string;
  description?: string;
  location?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseTransaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  balanceAfter?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',       label: 'Hammasi',         emoji: '📦' },
  { id: 'sabzavot',  label: 'Sabzavotlar',      emoji: '🥬' },
  { id: 'don',       label: 'Don / Unlar',      emoji: '🌾' },
  { id: 'suyuqlik',  label: 'Suyuqliklar',      emoji: '🫗' },
  { id: 'gosht',     label: "Go'sht",           emoji: '🥩' },
  { id: 'sut',       label: 'Sut mahsulotlari', emoji: '🥛' },
  { id: 'ziravorlar',label: 'Ziravorlar',       emoji: '🧂' },
  { id: 'boshqa',    label: 'Boshqa',           emoji: '📋' },
];

const UNITS = [
  { value: 'kg',    label: 'Kilogramm (kg)' },
  { value: 'g',     label: 'Gramm (g)' },
  { value: 'litr',  label: 'Litr (L)' },
  { value: 'ml',    label: 'Millilitr (ml)' },
  { value: 'dona',  label: 'Dona' },
  { value: 'pachka',label: 'Pachka' },
  { value: 'quti',  label: 'Quti' },
  { value: 'xalta', label: 'Xalta' },
];


function defaultMin(unit: string): string {
  if (['litr', 'ml'].includes(unit)) return '10';
  if (['kg', 'g'].includes(unit)) return '10';
  return '5';
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('uz-UZ', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const EMPTY_FORM = {
  name: '', sku: '', category: 'boshqa',
  unit: 'kg', quantity: '', minQuantity: '10',
  costPrice: '', supplier: '', description: '', location: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function Warehouse() {
  const [items, setItems]         = useState<WarehouseItem[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('all');

  // Add / Edit modal
  const [showForm, setShowForm]     = useState(false);
  const [editItem, setEditItem]     = useState<WarehouseItem | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  // Image upload
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Stock in/out modal
  const [showStock, setShowStock]         = useState(false);
  const [stockItem, setStockItem]         = useState<WarehouseItem | null>(null);
  const [stockAction, setStockAction]     = useState<'in' | 'out'>('in');
  const [stockAmount, setStockAmount]     = useState('');
  const [stockNote, setStockNote]         = useState('');
  const [stockSaving, setStockSaving]     = useState(false);

  // History modal
  const [showHistory, setShowHistory]       = useState(false);
  const [historyItem, setHistoryItem]       = useState<WarehouseItem | null>(null);
  const [historyData, setHistoryData]       = useState<WarehouseTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/inventory');
      const raw = res.data?.data || res.data || [];
      setItems(
        (Array.isArray(raw) ? raw : []).map((it: any) => ({
          ...it,
          category: it.category || 'boshqa',
        }))
      );
    } catch (e) {
      console.error('Inventory yuklashda xatolik:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    resetImageState();
    setShowForm(true);
  };

  const openEdit = (item: WarehouseItem) => {
    setEditItem(item);
    setForm({
      name:        item.name,
      sku:         item.sku         || '',
      category:    item.category    || 'boshqa',
      unit:        item.unit,
      quantity:    String(item.quantity),
      minQuantity: String(item.minQuantity),
      costPrice:   String(item.costPrice || ''),
      supplier:    item.supplier    || '',
      description: item.description || '',
      location:    item.location    || '',
    });
    resetImageState();
    // Show existing image as preview
    if (item.image) {
      const url = item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`;
      setImagePreview(url);
    }
    setShowForm(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const saveItem = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        sku:         form.sku       || undefined,
        category:    form.category,
        unit:        form.unit,
        quantity:    parseFloat(form.quantity)    || 0,
        minQuantity: parseFloat(form.minQuantity) || parseFloat(defaultMin(form.unit)),
        costPrice:   parseFloat(form.costPrice)   || 0,
        supplier:    form.supplier    || undefined,
        description: form.description || undefined,
        location:    form.location    || undefined,
      };

      let savedId: string;
      if (editItem) {
        const { data: res } = await api.put(`/inventory/${editItem.id}`, payload);
        savedId = res.data?.id || editItem.id;
      } else {
        const { data: res } = await api.post('/inventory', payload);
        savedId = res.data?.id;
      }

      // Upload image if selected
      if (imageFile && savedId) {
        setImageUploading(true);
        try {
          const fd = new FormData();
          fd.append('image', imageFile);
          await api.post(`/inventory/${savedId}/upload-image`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // image upload xatolik bo'lsa ham asosiy ma'lumot saqlangan
        } finally {
          setImageUploading(false);
        }
      }

      setShowForm(false);
      await fetchItems();
    } catch {
      alert('Saqlashda xatolik yuz berdi!');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Bu mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.delete(`/inventory/${id}`);
      fetchItems();
    } catch {
      alert("O'chirishda xatolik!");
    }
  };

  // ─── Stock ─────────────────────────────────────────────────────────────────

  const openStock = (item: WarehouseItem, action: 'in' | 'out') => {
    setStockItem(item);
    setStockAction(action);
    setStockAmount('');
    setStockNote('');
    setShowStock(true);
  };

  const saveStock = async () => {
    if (!stockItem || !stockAmount || parseFloat(stockAmount) <= 0) return;
    setStockSaving(true);
    try {
      await api.post(`/inventory/${stockItem.id}/transaction`, {
        type:     stockAction === 'in' ? 'IN' : 'OUT',
        quantity: parseFloat(stockAmount),
        notes:    stockNote || (stockAction === 'in' ? 'Kirim' : 'Chiqim'),
      });
      setShowStock(false);
      await fetchItems();
    } catch {
      alert('Xatolik yuz berdi!');
    } finally {
      setStockSaving(false);
    }
  };

  // ─── History ───────────────────────────────────────────────────────────────

  const openHistory = async (item: WarehouseItem) => {
    setHistoryItem(item);
    setHistoryData([]);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const { data: res } = await api.get(`/inventory/${item.id}/transactions`);
      const txs = res.data?.data || res.data || [];
      setHistoryData(Array.isArray(txs) ? txs : []);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────────

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const matchSearch = !q || it.name.toLowerCase().includes(q) || (it.sku || '').toLowerCase().includes(q);
    const matchCat    = category === 'all' || it.category === category;
    return matchSearch && matchCat;
  });

  const alertItems     = items.filter(it => it.quantity <= it.minQuantity && it.isActive !== false);
  const outOfStock     = items.filter(it => it.quantity <= 0).length;
  const totalValue     = items.reduce((s, it) => s + it.quantity * (it.costPrice || 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Omborxona</h2>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} ta mahsulot</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchItems}
            className="flex items-center gap-2 rounded-xl glass-strong border border-white/60 px-3 py-2 text-sm text-gray-600 hover:bg-white/50 transition-all"
          >
            <RefreshCw size={14} /> Yangilash
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={16} /> Yangi mahsulot
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Jami mahsulot',  value: items.length,              color: 'text-gray-900',  border: 'border-white/60' },
          { label: 'Kam qolgan',     value: alertItems.length,         color: alertItems.length > 0 ? 'text-orange-600' : 'text-gray-900', border: alertItems.length > 0 ? 'border-orange-200' : 'border-white/60' },
          { label: 'Tugagan',        value: outOfStock,                color: outOfStock > 0 ? 'text-red-600' : 'text-gray-900', border: outOfStock > 0 ? 'border-red-200' : 'border-white/60' },
          { label: 'Ombor qiymati',  value: `${(totalValue / 1_000_000).toFixed(1)}M`, color: 'text-gray-900', border: 'border-white/60' },
        ].map(s => (
          <div key={s.label} className={cn('glass-card rounded-xl border p-4', s.border)}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Alert banner ── */}
      {alertItems.length > 0 && (
        <div className="glass-card rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-orange-500" />
            <h3 className="text-sm font-semibold text-orange-700">
              Ogohlantirish: {alertItems.length} ta mahsulot chegaradan tushdi
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertItems.map(it => (
              <div key={it.id} className="flex items-center gap-1.5 rounded-lg bg-white/80 border border-orange-200 px-2.5 py-1.5">
                {it.image
                  ? <img src={it.image.startsWith('http') ? it.image : `${API_BASE}${it.image}`} alt="" className="h-5 w-5 rounded object-cover" />
                  : <Package size={14} className="text-orange-400" />}
                <span className="text-xs font-semibold text-orange-700">{it.name}</span>
                <span className="text-xs font-bold text-red-500">
                  {it.quantity <= 0 ? 'Tugagan!' : `${it.quantity} ${it.unit} qoldi`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search + Category filter ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mahsulot qidirish..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all',
                category === cat.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'glass-strong border border-white/60 text-gray-600 hover:bg-white/60'
              )}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Items grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-10 text-center">
          <span className="text-5xl mb-4 block">📦</span>
          <p className="text-gray-500 font-medium">{search ? 'Topilmadi' : "Ombor bo'sh"}</p>
          <button onClick={openAdd} className="mt-3 text-orange-500 text-sm font-medium hover:underline">
            + Mahsulot qo'shish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const qty    = item.quantity    ?? 0;
            const minQty = item.minQuantity ?? 0;
            const isOut  = qty <= 0;
            const isLow  = !isOut && qty <= minQty;
            const isWarn = !isLow && !isOut && qty <= minQty * 1.6;

            const border   = isOut ? 'border-red-300'    : isLow ? 'border-orange-300' : isWarn ? 'border-yellow-200' : 'border-green-200';
            const bg       = isOut ? 'bg-red-50/30'      : isLow ? 'bg-orange-50/30'   : isWarn ? 'bg-yellow-50/30'  : 'bg-green-50/20';
            const badge    = isOut ? { t: 'Tugagan!', c: 'bg-red-500 text-white' }
                           : isLow ? { t: 'Tanqis!',  c: 'bg-orange-500 text-white' }
                           : isWarn ? { t: 'Kam',     c: 'bg-yellow-500 text-white' }
                           :          { t: 'Normal',  c: 'bg-green-500/20 text-green-700' };
            const barColor = isOut ? 'bg-red-500' : isLow ? 'bg-orange-500' : isWarn ? 'bg-yellow-500' : 'bg-green-500';
            const qtyColor = isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900';
            const pct      = minQty > 0 ? Math.min((qty / (minQty * 2.5)) * 100, 100) : 100;


            return (
              <div key={item.id} className={cn('glass-card rounded-2xl border shadow-lg p-4 flex flex-col hover:shadow-xl transition-all', border, bg)}>

                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 border border-white/60 shadow-sm flex-shrink-0 overflow-hidden">
                      {item.image
                        ? <img src={item.image.startsWith('http') ? item.image : `${API_BASE}${item.image}`} alt={item.name} className="h-full w-full object-cover" />
                        : <Package size={24} className="text-gray-300" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">{item.name}</h4>
                      <span className="text-xs text-gray-400">
                        {CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                      </span>
                      {item.sku && <p className="text-xs font-mono text-gray-300">#{item.sku}</p>}
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold flex-shrink-0', badge.c)}>
                    {(isLow || isOut) && <Bell size={10} className="mr-1" />}
                    {badge.t}
                  </span>
                </div>

                {/* Quantity panel */}
                <div className="rounded-xl bg-white/60 border border-white/60 p-3 mb-3">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500">Hozirgi miqdor</p>
                      <p className={cn('text-2xl font-bold', qtyColor)}>
                        {qty} <span className="text-base font-medium text-gray-500">{item.unit}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Ogohlantirish</p>
                      <p className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                        <Bell size={11} className="text-orange-400" />
                        {minQty} {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Meta */}
                <div className="space-y-1 mb-3">
                  {item.supplier && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="text-gray-300">👤</span> {item.supplier}
                    </p>
                  )}
                  {item.location && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin size={11} className="text-gray-300" /> {item.location}
                    </p>
                  )}
                  {(item.costPrice ?? 0) > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Tag size={11} className="text-gray-300" />
                      Tan narxi: {(item.costPrice! * qty).toLocaleString('uz-UZ')} so'm
                    </p>
                  )}
                  {item.description && (
                    <p className="text-xs text-gray-400 italic truncate">{item.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-auto flex items-center gap-1.5">
                  <button
                    onClick={() => openStock(item, 'in')}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-500/15 text-green-700 py-2 text-xs font-semibold hover:bg-green-500/25 transition-colors"
                  >
                    <ArrowUp size={13} /> Kirim
                  </button>
                  <button
                    onClick={() => openStock(item, 'out')}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-500/15 text-red-700 py-2 text-xs font-semibold hover:bg-red-500/25 transition-colors"
                  >
                    <ArrowDown size={13} /> Chiqim
                  </button>
                  <button
                    onClick={() => openHistory(item)}
                    className="flex items-center justify-center rounded-lg bg-blue-500/15 text-blue-700 p-2 hover:bg-blue-500/25 transition-colors"
                    title="Tarix"
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="flex items-center justify-center rounded-lg bg-gray-500/10 text-gray-600 p-2 hover:bg-gray-500/20 transition-colors"
                    title="Tahrirlash"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 p-2 hover:bg-red-500/20 transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════ ADD / EDIT MODAL ═══════════════ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h3 className="text-lg font-bold">
                {editItem ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Image + Name */}
              <div className="flex items-start gap-3">
                {/* Image upload */}
                <div className="flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700 mb-1">Rasm</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-orange-400 transition-colors overflow-hidden group"
                  >
                    {imagePreview
                      ? <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                      : <Camera size={24} className="text-gray-400 group-hover:text-orange-400 transition-colors" />}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => resetImageState()}
                      className="mt-1 w-full text-xs text-red-400 hover:text-red-600"
                    >
                      O'chirish
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomi *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Masalan: Kartoshka"
                  />
                </div>
              </div>

              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">O'lchov birligi *</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value, minQuantity: defaultMin(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                  >
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Quantity + Alert threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Boshlang'ich miqdor ({form.unit})
                  </label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Bell size={12} className="text-orange-400" />
                    Ogohlantirish chegarasi ({form.unit})
                  </label>
                  <input
                    type="number"
                    value={form.minQuantity}
                    onChange={e => setForm({ ...form, minQuantity: e.target.value })}
                    className="w-full rounded-xl border border-orange-200 bg-orange-50/40 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder={defaultMin(form.unit)}
                  />
                  <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} /> Shu miqdorga yetganda admin ogohlantiriladi
                  </p>
                </div>
              </div>

              {/* Cost price + SKU */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tan narxi (so'm / {form.unit})</label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={e => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU / Kod</label>
                  <input
                    value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="INV-001"
                  />
                </div>
              </div>

              {/* Supplier + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yetkazib beruvchi</label>
                  <input
                    value={form.supplier}
                    onChange={e => setForm({ ...form, supplier: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Masalan: Bozordan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Joylashuv (omborda)</label>
                  <input
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Masalan: A rafa"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none resize-none"
                  placeholder="Qo'shimcha ma'lumot..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Bekor qilish
              </button>
              <button
                onClick={saveItem}
                disabled={saving || imageUploading || !form.name.trim()}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {(saving || imageUploading) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {imageUploading ? 'Rasm yuklanmoqda...' : editItem ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ STOCK IN / OUT MODAL ═══════════════ */}
      {showStock && stockItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowStock(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className={cn(
              'flex items-center gap-3 px-6 py-4 rounded-t-2xl',
              stockAction === 'in' ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'
            )}>
              {stockItem.image
                ? <img src={stockItem.image.startsWith('http') ? stockItem.image : `${API_BASE}${stockItem.image}`} alt="" className="h-10 w-10 rounded-xl object-cover" />
                : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><Package size={20} className="text-gray-400" /></div>}
              <div>
                <div className="flex items-center gap-2">
                  {stockAction === 'in'
                    ? <ArrowUp size={16} className="text-green-600" />
                    : <ArrowDown size={16} className="text-red-600" />}
                  <h3 className="font-bold text-gray-900">{stockAction === 'in' ? 'Kirim' : 'Chiqim'}</h3>
                </div>
                <p className="text-sm text-gray-500">
                  {stockItem.name} — hozir:{' '}
                  <span className="font-semibold">{stockItem.quantity} {stockItem.unit}</span>
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Miqdor ({stockItem.unit}) *
                </label>
                <input
                  type="number"
                  value={stockAmount}
                  onChange={e => setStockAmount(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-2xl font-bold text-center focus:border-orange-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
                <input
                  value={stockNote}
                  onChange={e => setStockNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
                  placeholder={stockAction === 'in' ? 'Bozordan, yetkazib beruvchidan...' : 'Oshxonaga, chiqim sababi...'}
                />
              </div>
              {stockAmount && parseFloat(stockAmount) > 0 && (
                <div className={cn(
                  'rounded-xl p-3 text-sm font-medium',
                  stockAction === 'in' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {stockAction === 'in' ? 'Yangi miqdor:' : 'Qoladi:'}{' '}
                  <span className="font-bold">
                    {Math.max(0, stockItem.quantity + (stockAction === 'in'
                      ? parseFloat(stockAmount)
                      : -parseFloat(stockAmount)
                    )).toFixed(2)} {stockItem.unit}
                  </span>
                  {stockAction === 'out' && parseFloat(stockAmount) > stockItem.quantity && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Miqdor ombordagidan ko'p!</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowStock(false)} className="px-4 py-2 text-sm text-gray-600">
                Bekor
              </button>
              <button
                onClick={saveStock}
                disabled={stockSaving || !stockAmount || parseFloat(stockAmount) <= 0}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                  stockAction === 'in' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                )}
              >
                {stockSaving
                  ? <Loader2 size={16} className="animate-spin" />
                  : stockAction === 'in' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {stockAction === 'in' ? 'Kirim qilish' : 'Chiqim qilish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ HISTORY MODAL ═══════════════ */}
      {showHistory && historyItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                {historyItem.image
                  ? <img src={historyItem.image.startsWith('http') ? historyItem.image : `${API_BASE}${historyItem.image}`} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100"><Package size={20} className="text-gray-400" /></div>}
                <div>
                  <h3 className="font-bold text-gray-900">{historyItem.name}</h3>
                  <p className="text-sm text-gray-500">Harakatlar tarixi</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Stats row */}
            {!historyLoading && historyData.length > 0 && (() => {
              const totalIn  = historyData.filter(t => t.type === 'IN').reduce((s, t) => s + t.quantity, 0);
              const totalOut = historyData.filter(t => t.type === 'OUT').reduce((s, t) => s + t.quantity, 0);
              return (
                <div className="grid grid-cols-3 gap-0 border-b flex-shrink-0">
                  <div className="text-center py-3 px-2">
                    <p className="text-xs text-gray-500 mb-0.5">Jami kirim</p>
                    <p className="font-bold text-green-600">+{totalIn} {historyItem.unit}</p>
                  </div>
                  <div className="text-center py-3 px-2 border-x border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">Jami chiqim</p>
                    <p className="font-bold text-red-600">-{totalOut} {historyItem.unit}</p>
                  </div>
                  <div className="text-center py-3 px-2">
                    <p className="text-xs text-gray-500 mb-0.5">Hozirgi</p>
                    <p className="font-bold text-gray-900">{historyItem.quantity} {historyItem.unit}</p>
                  </div>
                </div>
              );
            })()}

            {/* Transactions */}
            <div className="overflow-y-auto flex-1 p-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <History size={40} className="mx-auto mb-2 opacity-40" />
                  <p>Hech qanday harakat yoq</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyData.map((tx, i) => (
                    <div
                      key={tx.id || i}
                      className={cn(
                        'flex items-center gap-3 rounded-xl p-3 border',
                        tx.type === 'IN'
                          ? 'bg-green-50/80 border-green-100'
                          : 'bg-red-50/80 border-red-100'
                      )}
                    >
                      <div className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl',
                        tx.type === 'IN' ? 'bg-green-500' : 'bg-red-500'
                      )}>
                        {tx.type === 'IN'
                          ? <ArrowUp size={16} className="text-white" />
                          : <ArrowDown size={16} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={cn('text-sm font-bold', tx.type === 'IN' ? 'text-green-700' : 'text-red-700')}>
                            {tx.type === 'IN' ? '+' : '-'}{tx.quantity} {historyItem.unit}
                          </span>
                          {tx.balanceAfter !== undefined && (
                            <span className="text-xs text-gray-400">
                              qoldi: {tx.balanceAfter} {historyItem.unit}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {tx.notes || (tx.type === 'IN' ? 'Kirim' : 'Chiqim')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar size={10} className="text-gray-300" />
                          <span className="text-xs text-gray-400">{formatDate(tx.createdAt)}</span>
                          {tx.createdBy && (
                            <span className="text-xs text-gray-400">• {tx.createdBy}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
