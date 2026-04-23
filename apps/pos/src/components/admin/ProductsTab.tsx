import { useState } from 'react';
import { Search, Plus, Package, Grid3X3, UtensilsCrossed, Eye, EyeOff, Edit3, Trash2, X, ScanLine, Camera, Keyboard, Loader2, Info, AlertTriangle, Tag, CheckCircle, Save, FileCode } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatPrice } from '../../lib/helpers';
import api from '../../services/api';
import type { AdminProduct, ProductFormData, BarcodeResult, CategoryItem } from '../../types';
import MxikTab from './MxikTab';
import { useAuthStore } from '../../store/auth';

const INITIAL_FORM: ProductFormData = {
  name: '', price: '', costPrice: '', categoryId: '', description: '',
  barcode: '', mxikCode: '', stockQuantity: '', weight: '',
};

interface MxikResult {
  code?: string;
  mxikCode?: string;
  name?: string;
  groupName?: string;
  error?: boolean;
  message?: string;
  items?: { code: string; name: string }[];
}

interface ProductsTabProps {
  adminProducts: AdminProduct[];
  categories: CategoryItem[];
  onRefreshProducts: () => void;
  onRefreshData: () => void;
}

export default function ProductsTab({ adminProducts, categories, onRefreshProducts, onRefreshData }: ProductsTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeResult | null>(null);
  const [mxikLoading, setMxikLoading] = useState(false);
  const [mxikResult, setMxikResult] = useState<MxikResult | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'mxik'>('main');
  const userRole = useAuthStore((s) => s.user?.role);

  const filtered = adminProducts.filter((p) => {
    const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    return matchCat && matchSearch;
  });

  const openNew = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setBarcodeResult(null);
    setMxikResult(null);
    setActiveTab('main');
    setShowModal(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setActiveTab('main');
    setForm({
      name: p.name, price: String(p.price), costPrice: String(p.costPrice || ''),
      categoryId: p.categoryId || '', description: p.description || '',
      barcode: p.barcode || '', mxikCode: p.sku || '', stockQuantity: String(p.stockQuantity || ''),
      weight: String(p.weight || ''),
    });
    setBarcodeResult(null);
    setMxikResult(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name, price: parseFloat(form.price),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        categoryId: form.categoryId || undefined, description: form.description || undefined,
        barcode: form.barcode || undefined, stockQuantity: form.stockQuantity ? parseInt(form.stockQuantity) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      setEditing(null);
      setForm(INITIAL_FORM);
      onRefreshProducts();
      onRefreshData();
    } catch {
      alert('Mahsulot saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Mahsulotni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`/products/${id}`);
      onRefreshProducts();
    } catch { alert('Xatolik!'); }
  };

  const handleBarcodeScan = async () => {
    if (!form.barcode) return;
    setBarcodeLoading(true);
    setBarcodeResult(null);
    try {
      const { data } = await api.get('/mxik/scan/' + form.barcode);
      const result = data.data || data;
      setBarcodeResult(result);
      const suggested = result.suggestedData || result;
      setForm((prev) => ({
        ...prev,
        name: prev.name || suggested.name || '',
        mxikCode: prev.mxikCode || suggested.mxikCode || '',
        weight: prev.weight || suggested.weight || '',
      }));
    } catch {
      setBarcodeResult({ error: true, message: 'Mahsulot topilmadi' });
    } finally {
      setBarcodeLoading(false);
    }
  };

  const scanMode = form._scanMode || 'usb';

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Mahsulot qidirish..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-white/80 border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 focus:outline-none" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-600">
            <Package size={13} /> {filtered.length} ta
          </span>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all">
          <Plus size={16} /> Yangi mahsulot
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setCategoryFilter('all')}
          className={cn('flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium border-2 whitespace-nowrap shrink-0',
            categoryFilter === 'all' ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300'
          )}>
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', categoryFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500')}>
            <Grid3X3 size={15} />
          </div>
          <div className="text-left"><div className="font-semibold text-xs">Barchasi</div><div className="text-[10px] opacity-70">{adminProducts.length} ta</div></div>
        </button>
        {categories.map((cat) => {
          const count = adminProducts.filter((p) => p.categoryId === cat.id).length;
          return (
            <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
              className={cn('flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium border-2 whitespace-nowrap shrink-0',
                categoryFilter === cat.id ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300'
              )}>
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                categoryFilter === cat.id ? 'bg-orange-500 text-white' : 'bg-gradient-to-br from-blue-400 to-purple-500 text-white'
              )}>{cat.icon || cat.name.charAt(0).toUpperCase()}</div>
              <div className="text-left"><div className="font-semibold text-xs">{cat.name}</div><div className="text-[10px] opacity-70">{count} ta</div></div>
            </button>
          );
        })}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Package size={48} className="mb-3 opacity-40" />
          <p className="text-lg font-medium">Mahsulot topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const cat = categories.find((c) => c.id === product.categoryId);
            return (
              <div key={product.id} className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                <div className="relative h-36 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 flex items-center justify-center overflow-hidden">
                  {product.image ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" /> : <UtensilsCrossed size={36} className="text-orange-300" />}
                  <div className="absolute top-2 right-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm', product.isActive ? 'bg-green-500' : 'bg-gray-400')}>
                      {product.isActive ? <><Eye size={10} /> Faol</> : <><EyeOff size={10} /> Nofaol</>}
                    </span>
                  </div>
                </div>
                <div className="p-3.5">
                  <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{product.name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{cat?.name || 'Kategoriyasiz'}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-orange-500 font-bold text-sm">{formatPrice(product.price)}</span>
                    {product.costPrice && <span className="text-gray-400 text-[11px] line-through">{formatPrice(product.costPrice)}</span>}
                  </div>
                  {product.barcode && <p className="text-[10px] text-gray-400 mt-1.5 font-mono bg-gray-50 rounded px-1.5 py-0.5 inline-block">{product.barcode}</p>}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => openEdit(product)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-blue-600 py-1.5 text-xs font-medium hover:bg-blue-100 transition-colors">
                      <Edit3 size={13} /> Tahrirlash
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); setEditing(null); }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 rounded-t-2xl">
              <div className="flex items-center justify-between px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900">{editing ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</h3>
                <button onClick={() => { setShowModal(false); setEditing(null); }} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X size={20} /></button>
              </div>
              {/* Tab switcher — faqat tahrirlashda (yangi mahsulotda MXIK uchun ID kerak) */}
              {editing && (
                <div className="flex px-6 pb-0 gap-1">
                  {([
                    { id: 'main', label: 'Asosiy', icon: Package },
                    { id: 'mxik', label: 'MXIK', icon: FileCode },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                        activeTab === tab.id
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700',
                      )}
                    >
                      <tab.icon size={14} /> {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              {/* MXIK tab kontenti */}
              {activeTab === 'mxik' && editing && (
                <MxikTab
                  productId={editing.id}
                  productName={editing.name}
                  userRole={userRole || ''}
                />
              )}
              {/* Asosiy tab — faqat activeTab === 'main' yoki yangi mahsulotda */}
              {(activeTab === 'main' || !editing) && (<>
              {/* Barcode */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"><ScanLine size={16} className="text-orange-500" /> Shtrix kod (Barcode)</label>
                <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg">
                  {([{ id: 'usb', icon: ScanLine, label: 'USB Skaner' }, { id: 'camera', icon: Camera, label: 'Kamera' }, { id: 'manual', icon: Keyboard, label: "Qo'lda" }] as const).map((m) => (
                    <button key={m.id} onClick={() => setForm((prev) => ({ ...prev, _scanMode: m.id }))}
                      className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all', scanMode === m.id ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                      <m.icon size={13} /> {m.label}
                    </button>
                  ))}
                </div>

                {scanMode === 'usb' && (
                  <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-6 text-center">
                    <ScanLine size={32} className="mx-auto text-orange-400 mb-2 animate-pulse" />
                    <p className="text-sm font-medium text-orange-700">USB Skaner tayyor</p>
                    <input type="text" autoFocus value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && form.barcode) { e.preventDefault(); handleBarcodeScan(); } }}
                      placeholder="Skaner kodi shu yerga tushadi..." className="mt-3 w-full rounded-lg border border-orange-200 bg-white px-4 py-2.5 text-center text-sm font-mono focus:border-orange-500 focus:outline-none" />
                    {barcodeLoading && <Loader2 size={18} className="mx-auto mt-2 animate-spin text-orange-500" />}
                  </div>
                )}

                {scanMode === 'manual' && (
                  <div className="flex gap-2">
                    <input type="text" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter' && form.barcode) { e.preventDefault(); handleBarcodeScan(); } }}
                      placeholder="Shtrix kodni kiriting..." className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
                    <button onClick={handleBarcodeScan} disabled={!form.barcode || barcodeLoading}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 shrink-0">
                      {barcodeLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Qidirish
                    </button>
                  </div>
                )}

                {barcodeResult && !barcodeResult.error && (
                  <div className="mt-3 flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                    {barcodeResult.image && <img src={barcodeResult.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-blue-800">{barcodeResult.name || barcodeResult.product_name || 'Nomi topildi'}</p>
                      {barcodeResult.brand && <p className="text-xs text-blue-600 mt-0.5">Brend: {barcodeResult.brand}</p>}
                    </div>
                    <Info size={16} className="text-blue-400 shrink-0" />
                  </div>
                )}
                {barcodeResult?.error && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-600">
                    <AlertTriangle size={14} /> {barcodeResult.message || 'Mahsulot topilmadi'}
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Mahsulot nomi *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mahsulot nomini kiriting"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Narxi (so'm) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tannarxi (so'm)</label>
                  <input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Kategoriya</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                  <option value="">Kategoriyani tanlang...</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tavsif</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Qisqacha tavsif..." rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none" />
              </div>

              {/* MXIK */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"><Tag size={16} className="text-blue-500" /> MXIK kodi (Soliq tasnifi)</label>
                <div className="flex gap-2">
                  <input type="text" value={form.mxikCode} onChange={(e) => setForm({ ...form, mxikCode: e.target.value })} placeholder="MXIK kodni kiriting..."
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
                  <button onClick={async () => {
                    if (!form.mxikCode) return;
                    setMxikLoading(true); setMxikResult(null);
                    try { const { data } = await api.get('/mxik/lookup/' + form.mxikCode); setMxikResult(data.data || data); }
                    catch { setMxikResult({ error: true, message: 'Tasnif soliq bazasida topilmadi' }); }
                    finally { setMxikLoading(false); }
                  }} disabled={!form.mxikCode || mxikLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 shrink-0">
                    {mxikLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Tekshirish
                  </button>
                  <button onClick={async () => {
                    if (!form.name) return;
                    setMxikLoading(true); setMxikResult(null);
                    try { const { data } = await api.get('/mxik/search?q=' + encodeURIComponent(form.name)); setMxikResult(data.data || data); }
                    catch { setMxikResult({ error: true, message: 'Qidirishda xatolik' }); }
                    finally { setMxikLoading(false); }
                  }} disabled={!form.name || mxikLoading}
                    className="flex items-center gap-1.5 rounded-xl bg-gray-600 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 shrink-0">
                    <Search size={14} /> Qidirish
                  </button>
                </div>
                {mxikResult && !mxikResult.error && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <Info size={16} className="text-blue-500 shrink-0" />
                    <div><p className="text-xs font-mono text-blue-700">{mxikResult.code || mxikResult.mxikCode || form.mxikCode}</p><p className="text-sm font-medium text-blue-800 mt-0.5">{mxikResult.name || mxikResult.groupName || 'Tasnif topildi'}</p></div>
                  </div>
                )}
                {mxikResult?.error && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-600">
                    <AlertTriangle size={14} /> {mxikResult.message}
                  </div>
                )}
              </div>

              {/* Stock & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Ombordagi miqdor</label>
                  <input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Og'irlik / Hajm</label>
                  <input type="text" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="500g, 1L"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
                </div>
              </div>

              {barcodeResult && !barcodeResult.error && barcodeResult.image && (
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <img src={barcodeResult.image} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  <div><p className="text-sm font-medium text-gray-700">Barcode orqali topilgan rasm</p><p className="text-xs text-gray-400 mt-0.5">Rasm avtomatik saqlangan</p></div>
                </div>
              )}
            </>)}
            </div>

            {/* Footer — faqat asosiy tabda */}
            {(activeTab === 'main' || !editing) && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex gap-3">
              <button onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Bekor qilish</button>
              <button onClick={handleSave} disabled={!form.name || !form.price || saving}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all disabled:opacity-50">
                {saving ? 'Saqlanmoqda...' : editing ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
