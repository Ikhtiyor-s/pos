import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, AlertTriangle, Loader2, Trash2, ExternalLink, Shield, ShieldOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';

// ==========================================
// MXIK TAB — Mahsulot tahrirlash modalida
// "MXIK ma'lumotlari" tab kontenti
// ==========================================

interface MxikData {
  productId: string;
  productName: string;
  mxikCode: string | null;
  mxikName: string | null;
  mxikVatRate: number | null;
  mxikExcise: number | null;
  mxikVerified: boolean;
}

interface MxikSearchItem {
  code: string;
  name: string;
  nameRu?: string;
  groupName?: string;
  className?: string;
  positionName?: string;
  unitName?: string;
}

interface MxikTabProps {
  productId: string;
  productName: string;
  userRole?: string;
}

const VAT_OPTIONS = [
  { value: 0,  label: '0% — Soliqsiz (tibbiyot, eksport)' },
  { value: 12, label: '12% — Standart QQS' },
  { value: 20, label: '20% — Yuqori QQS' },
];

// MXIK kod validatsiyasi: 10–14 raqam
function validateMxikCode(code: string): string | null {
  const clean = code.trim().replace(/\s/g, '');
  if (!clean) return null;
  if (!/^\d{10,14}$/.test(clean)) return '10–14 ta raqam bo\'lishi kerak';
  return null;
}

export default function MxikTab({ productId, productName, userRole }: MxikTabProps) {
  const canEdit = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';

  // Holat
  const [mxikData, setMxikData] = useState<MxikData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Forma
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [vatRate, setVatRate] = useState<number>(12);
  const [excise, setExcise] = useState('');
  const [verifiedByAdmin, setVerifiedByAdmin] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Katalog qidirish
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MxikSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Soliq bazasi tekshiruv natijasi
  const [lookupResult, setLookupResult] = useState<{ found: boolean; name?: string; code?: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Xabarlar
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ==========================================
  // MA'LUMOTLARNI YUKLASH
  // ==========================================

  const loadMxikData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/products/${productId}/mxik`);
      const d: MxikData = data.data;
      setMxikData(d);
      if (d.mxikCode) {
        setCode(d.mxikCode);
        setName(d.mxikName || '');
        setVatRate(d.mxikVatRate ?? 12);
        setExcise(d.mxikExcise ? String(d.mxikExcise) : '');
      }
    } catch {
      setErrorMsg('Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadMxikData(); }, [loadMxikData]);

  // ==========================================
  // KATALOGDAN QIDIRISH
  // ==========================================

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await api.get('/mxik/search', { params: { q: searchQuery, limit: 10 } });
        setSearchResults(data.data?.items || []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectFromCatalog = (item: MxikSearchItem) => {
    setCode(item.code);
    setName(item.name || item.groupName || '');
    setCodeError(null);
    setShowDropdown(false);
    setSearchQuery('');
    setLookupResult({ found: true, name: item.name, code: item.code });
  };

  // ==========================================
  // SOLIQ BAZASIDA TEKSHIRISH (kod kiritilganda)
  // ==========================================

  const lookupCode = async (mxikCode: string) => {
    const err = validateMxikCode(mxikCode);
    setCodeError(err);
    if (err || !mxikCode.trim()) { setLookupResult(null); return; }

    setLookupLoading(true);
    setLookupResult(null);
    try {
      const { data } = await api.get(`/mxik/lookup/${mxikCode.trim()}`);
      const result = data.data;
      setLookupResult({ found: result.found, name: result.name, code: result.code });
      if (result.found && result.name && !name) setName(result.name);
    } catch {
      setLookupResult({ found: false });
    } finally {
      setLookupLoading(false);
    }
  };

  // ==========================================
  // SAQLASH
  // ==========================================

  const handleSave = async () => {
    const err = validateMxikCode(code);
    if (err) { setCodeError(err); return; }

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const payload = {
        mxikCode: code.trim(),
        mxikName: name || undefined,
        mxikVatRate: vatRate,
        mxikExcise: excise ? Number(excise) : undefined,
        verifiedByAdmin,
      };
      const { data } = await api.post(`/products/${productId}/mxik`, payload);
      setSuccessMsg(data.message || 'MXIK kod saqlandi');
      if (data.warning) setErrorMsg(data.warning);
      await loadMxikData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // O'CHIRISH
  // ==========================================

  const handleClear = async () => {
    if (!confirm('MXIK ma\'lumotlarini o\'chirmoqchimisiz?')) return;
    setClearing(true);
    try {
      await api.delete(`/products/${productId}/mxik`);
      setCode(''); setName(''); setVatRate(12); setExcise('');
      setLookupResult(null); setMxikData(null);
      setSuccessMsg('MXIK kod o\'chirildi');
      await loadMxikData();
    } catch {
      setErrorMsg('O\'chirishda xatolik');
    } finally {
      setClearing(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500 mr-2" size={20} />
        <span className="text-gray-500 text-sm">Yuklanmoqda...</span>
      </div>
    );
  }

  const hasMxik = Boolean(mxikData?.mxikCode);

  return (
    <div className="space-y-5">

      {/* Joriy holat banneri */}
      {hasMxik && (
        <div className={cn(
          'flex items-start gap-3 rounded-xl border p-4',
          mxikData?.mxikVerified
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200',
        )}>
          {mxikData?.mxikVerified
            ? <Shield size={18} className="text-green-600 mt-0.5 shrink-0" />
            : <ShieldOff size={18} className="text-yellow-600 mt-0.5 shrink-0" />
          }
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', mxikData?.mxikVerified ? 'text-green-800' : 'text-yellow-800')}>
              {mxikData?.mxikVerified ? 'Tasdiqlangan MXIK' : 'Tasdiqlanmagan MXIK'}
            </p>
            <p className="text-xs mt-0.5 font-mono text-gray-600">{mxikData?.mxikCode}</p>
            {mxikData?.mxikName && <p className="text-xs text-gray-500 mt-0.5">{mxikData.mxikName}</p>}
            {mxikData?.mxikVatRate !== null && mxikData?.mxikVatRate !== undefined && (
              <p className="text-xs text-gray-500">QQS: {mxikData.mxikVatRate}%</p>
            )}
          </div>
        </div>
      )}

      {/* ===== KATALOGDAN QIDIRISH ===== */}
      {canEdit && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Katalogdan qidirish
          </label>
          <div className="relative">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Mahsulot nomini yozing (masalan: non, go'sht, sharbat...)"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              {searchLoading && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-400" />
              )}
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {searchResults.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectFromCatalog(item)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-800">{item.name || item.groupName}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {item.code}
                      {item.className && ` · ${item.className}`}
                      {item.unitName && ` · ${item.unitName}`}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchResults.length === 0 && !searchLoading && searchQuery.length >= 2 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3">
                <p className="text-sm text-gray-500">Topilmadi — kodni qo'lda kiriting</p>
              </div>
            )}
          </div>

          <a
            href="https://tasnif.soliq.uz"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:underline mt-1.5"
          >
            <ExternalLink size={11} /> Tasnif.soliq.uz da qidirish
          </a>
        </div>
      )}

      {/* ===== MXIK KOD MAYDONI ===== */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          MXIK Kodi <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value); setCodeError(validateMxikCode(e.target.value)); setLookupResult(null); }}
              onBlur={() => code && lookupCode(code)}
              placeholder="Masalan: 17230000001000"
              disabled={!canEdit}
              maxLength={14}
              className={cn(
                'w-full px-3 py-2.5 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 bg-white',
                codeError ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-orange-400',
                !canEdit && 'bg-gray-50 cursor-not-allowed',
              )}
            />
            {lookupLoading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-orange-400" />
            )}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => lookupCode(code)}
              disabled={!code || lookupLoading}
              className="px-3 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-40"
            >
              Tekshir
            </button>
          )}
        </div>

        {codeError && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle size={11} /> {codeError}
          </p>
        )}

        {/* Soliq bazasi tekshiruv natijasi */}
        {lookupResult && (
          <div className={cn(
            'mt-2 flex items-center gap-2 text-xs px-3 py-2 rounded-lg',
            lookupResult.found
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200',
          )}>
            {lookupResult.found
              ? <CheckCircle size={13} />
              : <AlertTriangle size={13} />
            }
            <span>
              {lookupResult.found
                ? `Soliq bazasida topildi: ${lookupResult.name}`
                : "Soliq bazasida topilmadi — kodni tasnif.soliq.uz dan tekshiring"
              }
            </span>
          </div>
        )}
      </div>

      {/* ===== MXIK NOMI ===== */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Rasmiy nomi (MXIK katalogdan)
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Mahsulotning rasmiy klassifikatsiya nomi"
          disabled={!canEdit}
          className={cn(
            'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white',
            !canEdit && 'bg-gray-50 cursor-not-allowed',
          )}
        />
      </div>

      {/* ===== QQS VA AKSIZ ===== */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            QQS stavkasi
          </label>
          <select
            value={vatRate}
            onChange={e => setVatRate(Number(e.target.value))}
            disabled={!canEdit}
            className={cn(
              'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white',
              !canEdit && 'bg-gray-50 cursor-not-allowed',
            )}
          >
            {VAT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Aksiz solig'i (so'm)
          </label>
          <input
            type="number"
            value={excise}
            onChange={e => setExcise(e.target.value)}
            placeholder="0"
            min="0"
            disabled={!canEdit}
            className={cn(
              'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white',
              !canEdit && 'bg-gray-50 cursor-not-allowed',
            )}
          />
        </div>
      </div>

      {/* ===== ADMIN TASDIQLASH ===== */}
      {canEdit && (
        <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
          <input
            type="checkbox"
            checked={verifiedByAdmin}
            onChange={e => setVerifiedByAdmin(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <div>
            <p className="text-sm font-medium text-blue-800">Admin tomonidan tasdiqlangan</p>
            <p className="text-xs text-blue-600">
              Soliq bazasida topilmasa, o'zingiz tasdiqlashingiz mumkin
            </p>
          </div>
          <Shield size={16} className="ml-auto text-blue-500 shrink-0" />
        </label>
      )}

      {/* ===== XABARLAR ===== */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle size={15} /> {errorMsg}
        </div>
      )}

      {/* ===== TUGMALAR ===== */}
      {canEdit && (
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !code || Boolean(codeError)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
            {saving ? 'Saqlanmoqda...' : 'MXIK saqlash'}
          </button>

          {hasMxik && (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
            >
              {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              O'chirish
            </button>
          )}
        </div>
      )}

      {/* ===== FOYDALANUVCHI UCHUN ESLATMA ===== */}
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">MXIK nima?</p>
        <p>Mahsulot va Xizmatlar Identifikatsiya Kodi — O'zbekiston Soliq qo'mitasining mahsulot klassifikatsiya tizimi.</p>
        <p>Chekda: <span className="font-mono bg-white border border-gray-200 px-1 rounded">{productName} [{code || 'XXXXXXXXXXXXXXXX'}]</span></p>
        <p>Majburiylik: elektron chek (OFD) bilan ishlashda har bir mahsulotga MXIK kod talab etiladi.</p>
      </div>
    </div>
  );
}
