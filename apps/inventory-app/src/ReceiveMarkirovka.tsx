// Markirovka Qabul Qilish Ekrani — Omborchi uchun
// apps/inventory-app/src/ReceiveMarkirovka.tsx

import React, {
  useState, useRef, useCallback, useEffect, useId,
} from 'react';
import {
  QrCode, Package, CheckCircle2, XCircle, Loader2, AlertTriangle,
  Download, Send, ChevronDown, ChevronUp, RotateCcw, Trash2,
  ScanLine, ClipboardList, BadgeCheck, ShieldX, Clock, Hash,
  Info, CheckCheck, AlertCircle, X,
} from 'lucide-react';
import api from './services/api';
import { cn, formatDate, formatTime } from './lib/utils';

// ==========================================
// KONSTANTALAR
// ==========================================

const MAX_BATCH       = 500;   // bir sessiyada maksimal kodlar soni
const VERIFY_TIMEOUT  = 8_000; // ms — har bir kod uchun timeout

// ==========================================
// TIPLAR
// ==========================================

type ItemStatus = 'pending' | 'checking' | 'ok' | 'error' | 'duplicate';

interface ScannedItem {
  uid:          string;
  markCode:     string;
  status:       ItemStatus;
  errorReason?: string;
  gtin?:        string;
  serialNumber?: string;
  expiryDate?:  string;
  productName?: string;
  checkedAt?:   Date;
  scannedAt:    Date;
}

interface BatchForm {
  batchNumber:   string;
  importerTin:   string;
  productId:     string;
  supplierId:    string;
  invoiceNumber: string;
  expiryDate:    string;
}

type AppStep = 'form' | 'scanning' | 'review' | 'submitting' | 'done';

interface SubmitSummary {
  total:   number;
  success: number;
  failed:  number;
  results: Array<{ markCode: string; success: boolean; error?: string }>;
}

interface CheckApiResponse {
  success: boolean;
  data: {
    valid:    boolean;
    reason?:  string;
    product?: {
      gtin:         string;
      serialNumber: string;
      expiryDate:   string | null;
      status:       string;
    };
  };
}

interface VerifyApiResponse {
  success: boolean;
  data: {
    valid:            boolean;
    queued?:          boolean;
    gtin?:            string;
    serialNumber?:    string;
    productName?:     string;
    expiryDate?:      string;
    manufacturerName?: string;
    status?:          string;
  };
}

interface BatchReceiveApiResponse {
  success: boolean;
  data: {
    results:  Array<{ markCode: string; success: boolean; error?: string }>;
    summary:  { total: number; success: number; failed: number };
  };
}

// ==========================================
// AUDIO
// ==========================================

function playBeep(type: 'ok' | 'error' | 'duplicate'): void {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'ok') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880,  ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'duplicate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch { /* ignore */ }
}

// ==========================================
// XATO MATNLARI
// ==========================================

function getErrorLabel(reason?: string): string {
  if (!reason) return 'Tekshirishdan o\'tmadi';
  const r = reason.toLowerCase();
  if (r.includes('allaqachon sotilgan'))       return 'Mahsulot allaqachon sotilgan';
  if (r.includes('muddati o\'tgan') || r.includes('expired')) return 'Muddati o\'tgan';
  if (r.includes('soxta') || r.includes('davlat server'))      return 'Soxta mahsulot';
  if (r.includes('boshqa restoran'))           return 'Boshqa restoranga tegishli';
  if (r.includes('bazada topilmadi'))          return 'Bazada topilmadi';
  if (r.includes('band') || r.includes('reserved')) return 'Boshqa buyurtmada band';
  return reason.length > 60 ? reason.slice(0, 60) + '…' : reason;
}

// ==========================================
// EKSPORT (CSV)
// ==========================================

function exportToCsv(items: ScannedItem[], batchNumber: string): void {
  const BOM    = '﻿';
  const header = ['#', 'Markirovka kodi', 'Status', 'Xato sababi', 'GTIN', 'Serial raqam', 'Yaroqlilik muddati', 'Skaner vaqti']
    .map(h => `"${h}"`).join(',');

  const rows = items.map((item, i) => [
    String(i + 1),
    item.markCode,
    item.status === 'ok'        ? 'OK'
      : item.status === 'error'     ? 'XATO'
      : item.status === 'duplicate' ? 'TAKROR'
      : 'NOMA\'LUM',
    item.errorReason ?? '',
    item.gtin         ?? '',
    item.serialNumber ?? '',
    item.expiryDate   ? formatDate(item.expiryDate) : '',
    item.scannedAt.toISOString(),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = BOM + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `markirovka-qabul-${batchNumber}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// KOD FORMATLASH
// ==========================================

function shortCode(code: string): string {
  if (code.length <= 16) return code;
  return `${code.slice(0, 8)}…${code.slice(-6)}`;
}

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({ status, reason }: { status: ItemStatus; reason?: string }) {
  if (status === 'checking') return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <Loader2 size={11} className="animate-spin" /> Tekshirilmoqda
    </span>
  );
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Clock size={11} /> Kutmoqda
    </span>
  );
  if (status === 'duplicate') return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
      <AlertTriangle size={11} /> Takror kod
    </span>
  );
  if (status === 'ok') return (
    <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium">
      <CheckCircle2 size={11} /> Qabul qilindi
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400" title={reason}>
      <XCircle size={11} /> {getErrorLabel(reason)}
    </span>
  );
}

// ==========================================
// FORM SECTION
// ==========================================

interface BatchInfoSectionProps {
  form:      BatchForm;
  onChange:  (field: keyof BatchForm, value: string) => void;
  collapsed: boolean;
  onToggle:  () => void;
  disabled:  boolean;
}

function BatchInfoSection({ form, onChange, collapsed, onToggle, disabled }: BatchInfoSectionProps) {
  const hasRequired = form.batchNumber.trim() && form.importerTin.trim() && form.productId.trim();

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-orange-400" />
          <span className="text-sm font-semibold text-white">Partiya ma'lumotlari</span>
          {hasRequired && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 size={11} /> To'ldirilgan
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronDown size={16} className="text-slate-400" />
          : <ChevronUp   size={16} className="text-slate-400" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700">
          {/* Partiya raqami */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 mt-3">
              Partiya raqami <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.batchNumber}
              onChange={e => onChange('batchNumber', e.target.value)}
              disabled={disabled}
              placeholder="Masalan: BATCH-2024-001"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Mahsulot ID */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 mt-3">
              Mahsulot UUID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.productId}
              onChange={e => onChange('productId', e.target.value)}
              disabled={disabled}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm font-mono placeholder:text-slate-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* INN / STIR */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 mt-1">
              Importyor INN (9 raqam) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.importerTin}
              onChange={e => onChange('importerTin', e.target.value.replace(/\D/g, '').slice(0, 9))}
              disabled={disabled}
              placeholder="123456789"
              maxLength={9}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm font-mono placeholder:text-slate-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Hisob-faktura */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 mt-1">
              Hisob-faktura raqami
            </label>
            <input
              type="text"
              value={form.invoiceNumber}
              onChange={e => onChange('invoiceNumber', e.target.value)}
              disabled={disabled}
              placeholder="INV-2024-001"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Yetkazib beruvchi ID */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 mt-1">
              Yetkazib beruvchi UUID
            </label>
            <input
              type="text"
              value={form.supplierId}
              onChange={e => onChange('supplierId', e.target.value)}
              disabled={disabled}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm font-mono placeholder:text-slate-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Yaroqlilik muddati */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 mt-1">
              Yaroqlilik muddati
            </label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={e => onChange('expiryDate', e.target.value)}
              disabled={disabled}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// STATS BAR
// ==========================================

function StatsBar({ items }: { items: ScannedItem[] }) {
  const total     = items.length;
  const ok        = items.filter(i => i.status === 'ok').length;
  const errors    = items.filter(i => i.status === 'error').length;
  const checking  = items.filter(i => i.status === 'checking' || i.status === 'pending').length;
  const duplicate = items.filter(i => i.status === 'duplicate').length;

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: 'Jami',       value: total,     color: 'text-white',        bg: 'bg-slate-700/60'  },
        { label: '✅ Qabul',   value: ok,        color: 'text-green-400',    bg: 'bg-green-500/10'  },
        { label: '❌ Xato',    value: errors,    color: 'text-red-400',      bg: 'bg-red-500/10'    },
        { label: '⏳ Tekshir', value: checking,  color: 'text-slate-400',    bg: 'bg-slate-700/40'  },
      ].map(({ label, value, color, bg }) => (
        <div key={label} className={cn('rounded-xl px-3 py-2 text-center', bg)}>
          <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{label}</p>
        </div>
      ))}
      {duplicate > 0 && (
        <div className="col-span-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          <AlertTriangle size={13} />
          {duplicate} ta takror kod aniqlandi — ular hisobga olinmaydi
        </div>
      )}
    </div>
  );
}

// ==========================================
// ASOSIY KOMPONENT
// ==========================================

export default function ReceiveMarkirovka() {
  // ─── Holat ───────────────────────────────
  const [step,       setStep]      = useState<AppStep>('form');
  const [items,      setItems]     = useState<ScannedItem[]>([]);
  const [scanInput,  setScanInput] = useState('');
  const [formError,  setFormError] = useState('');
  const [submitRes,  setSubmitRes] = useState<SubmitSummary | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [tableFilter,   setTableFilter]   = useState<'all' | 'ok' | 'error' | 'duplicate'>('all');
  const [confirmClose,  setConfirmClose]  = useState(false);

  const [form, setForm] = useState<BatchForm>({
    batchNumber:   '',
    importerTin:   '',
    productId:     '',
    supplierId:    '',
    invoiceNumber: '',
    expiryDate:    '',
  });

  const inputRef      = useRef<HTMLInputElement>(null);
  const tableBodyRef  = useRef<HTMLTableSectionElement>(null);
  const processingRef = useRef(new Set<string>());

  const formId = useId();

  // ─── Form yangilash ───────────────────────
  const handleFormChange = useCallback((field: keyof BatchForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormError('');
  }, []);

  // ─── Scanning boshlanadi ──────────────────
  const startScanning = () => {
    if (!form.batchNumber.trim()) { setFormError('Partiya raqami kiritilishi shart'); return; }
    if (!form.productId.trim())   { setFormError('Mahsulot UUID kiritilishi shart');  return; }
    if (!/^\d{9}$/.test(form.importerTin.trim())) {
      setFormError('INN aynan 9 raqamdan iborat bo\'lishi kerak');
      return;
    }
    setFormError('');
    setStep('scanning');
    setFormCollapsed(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ─── Kodni qayta ishlash ──────────────────
  const processCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (code.length < 20) {
      setFormError('Markirovka kodi kamida 20 belgidan iborat bo\'lishi kerak');
      playBeep('error');
      return;
    }
    if (items.length >= MAX_BATCH) {
      setFormError(`Maksimal ${MAX_BATCH} ta kod bir sessiyada qabul qilinadi`);
      playBeep('error');
      return;
    }

    // Takror tekshirish
    const isDuplicate = items.some(i => i.markCode === code);
    if (isDuplicate) {
      playBeep('duplicate');
      setFormError(`"${shortCode(code)}" kodi allaqachon qo'shilgan`);
      setTimeout(() => setFormError(''), 2500);
      return;
    }

    // Parallel tekshirish uchun — bir vaqtda ikki marta yuborilmasin
    if (processingRef.current.has(code)) return;
    processingRef.current.add(code);

    const uid: string = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Jadvalga qo'shish (checking holati)
    setItems(prev => [{
      uid, markCode: code, status: 'checking', scannedAt: new Date(),
    }, ...prev]);
    setScanInput('');
    setFormError('');

    // Scroll to top
    tableBodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Mahalliy check
    let checkOk    = false;
    let checkReason: string | undefined;
    let gtin: string | undefined, serialNumber: string | undefined, expiryDate: string | undefined;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT);

      const { data } = await api.get<CheckApiResponse>(
        `/markirovka/check/${encodeURIComponent(code)}`,
        { signal: ctrl.signal },
      );
      clearTimeout(timer);

      checkOk     = data.data.valid;
      checkReason = data.data.reason;
      gtin        = data.data.product?.gtin;
      serialNumber = data.data.product?.serialNumber;
      expiryDate  = data.data.product?.expiryDate ?? undefined;
    } catch (err: unknown) {
      checkReason = (err instanceof Error && err.name === 'AbortError')
        ? 'Server javob bermadi (timeout)'
        : 'Server bilan bog\'lanishda xato';
    }

    // Davlat serveri tekshiruvi (fon)
    let productName: string | undefined;
    if (checkOk) {
      api.post<VerifyApiResponse>(`/markirovka/verify/${encodeURIComponent(code)}`)
        .then(({ data }) => {
          if (data.data.productName) {
            setItems(prev => prev.map(i =>
              i.uid === uid ? { ...i, productName: data.data.productName } : i,
            ));
          }
        })
        .catch(() => { /* fon tekshiruv — ignore */ });
    }

    const finalStatus: ItemStatus = checkOk ? 'ok' : 'error';
    playBeep(finalStatus === 'ok' ? 'ok' : 'error');

    setItems(prev => prev.map(i =>
      i.uid === uid
        ? { ...i, status: finalStatus, errorReason: checkReason, gtin, serialNumber, expiryDate, productName, checkedAt: new Date() }
        : i,
    ));

    processingRef.current.delete(code);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [items]);

  // ─── Input submit ─────────────────────────
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) processCode(scanInput.trim());
  };

  // ─── Kod o'chirish ────────────────────────
  const removeItem = (uid: string) => {
    setItems(prev => prev.filter(i => i.uid !== uid));
  };

  // ─── Barcha xatolarni qayta tekshirish ────
  const retryErrors = useCallback(() => {
    const errorCodes = items
      .filter(i => i.status === 'error')
      .map(i => i.markCode);

    setItems(prev => prev.map(i =>
      i.status === 'error' ? { ...i, status: 'pending' } : i,
    ));

    errorCodes.forEach(code => {
      setTimeout(() => processCode(code), 100);
    });
  }, [items, processCode]);

  // ─── Qabul qilishni tugatish ──────────────
  const handleSubmit = async () => {
    const okItems = items.filter(i => i.status === 'ok');
    if (okItems.length === 0) {
      setFormError('Qabul qilish uchun kamida bitta tasdiqlangan kod bo\'lishi kerak');
      return;
    }

    setStep('submitting');

    const payload = {
      items: okItems.map(item => ({
        markCode:      item.markCode,
        batchNumber:   form.batchNumber,
        importerTin:   form.importerTin,
        productId:     form.productId,
        supplierId:    form.supplierId   || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        expiryDate:    form.expiryDate
          ? new Date(form.expiryDate).toISOString()
          : undefined,
      })),
    };

    try {
      const { data } = await api.post<BatchReceiveApiResponse>('/markirovka/batch-receive', payload);
      setSubmitRes({
        total:   data.data.summary.total,
        success: data.data.summary.success,
        failed:  data.data.summary.failed,
        results: data.data.results,
      });
      setStep('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Server bilan bog\'lanishda xato';
      setFormError(msg);
      setStep('scanning');
    }
  };

  // ─── Yangi sessiya ────────────────────────
  const handleReset = () => {
    setStep('form');
    setItems([]);
    setScanInput('');
    setSubmitRes(null);
    setFormError('');
    setFormCollapsed(false);
    setForm({ batchNumber: '', importerTin: '', productId: '', supplierId: '', invoiceNumber: '', expiryDate: '' });
    processingRef.current.clear();
  };

  // ─── Eksport ─────────────────────────────
  const handleExport = () => exportToCsv(items, form.batchNumber || 'batch');

  // ─── Jadval filtri ────────────────────────
  const filteredItems = items.filter(item => {
    if (tableFilter === 'all')       return true;
    if (tableFilter === 'ok')        return item.status === 'ok';
    if (tableFilter === 'error')     return item.status === 'error';
    if (tableFilter === 'duplicate') return item.status === 'duplicate';
    return true;
  });

  const okCount        = items.filter(i => i.status === 'ok').length;
  const errorCount     = items.filter(i => i.status === 'error').length;
  const checkingCount  = items.filter(i => i.status === 'checking' || i.status === 'pending').length;
  const hasErrors      = errorCount > 0;
  const canSubmit      = okCount > 0 && checkingCount === 0 && step === 'scanning';

  // ─────────────────────────────────────────
  // RENDER: DONE SCREEN
  // ─────────────────────────────────────────

  if (step === 'done' && submitRes) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">

          <div className="px-6 py-8 text-center">
            <div className={cn(
              'w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center',
              submitRes.failed === 0 ? 'bg-green-500/20' : 'bg-amber-500/20',
            )}>
              {submitRes.failed === 0
                ? <CheckCheck size={40} className="text-green-400" />
                : <AlertTriangle size={40} className="text-amber-400" />}
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">
              {submitRes.failed === 0 ? 'Muvaffaqiyatli qabul qilindi!' : 'Qisman qabul qilindi'}
            </h2>
            <p className="text-slate-400 text-sm">
              Partiya: <span className="text-white font-mono">{form.batchNumber}</span>
            </p>
          </div>

          {/* Natija */}
          <div className="grid grid-cols-3 divide-x divide-slate-700 border-t border-b border-slate-700">
            {[
              { label: 'Jami yuborildi', value: submitRes.total,   color: 'text-white'     },
              { label: '✅ Muvaffaqiyatli', value: submitRes.success, color: 'text-green-400' },
              { label: '❌ Xato',        value: submitRes.failed,  color: 'text-red-400'   },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-5 text-center">
                <p className={cn('text-3xl font-bold tabular-nums', color)}>{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Xato detallari */}
          {submitRes.failed > 0 && (
            <div className="px-6 py-4 max-h-52 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Xato kodlar
              </p>
              <div className="space-y-1.5">
                {submitRes.results
                  .filter(r => !r.success)
                  .map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                      <XCircle size={12} className="text-red-400 shrink-0" />
                      <span className="font-mono text-slate-300 flex-1 truncate">{shortCode(r.markCode)}</span>
                      <span className="text-red-400 truncate">{getErrorLabel(r.error)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Amallar */}
          <div className="px-6 pb-6 pt-4 flex gap-3">
            {submitRes.failed > 0 && (
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                <Download size={15} /> Eksport (CSV)
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <RotateCcw size={15} /> Yangi partiya
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // RENDER: ASOSIY EKRAN
  // ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Package size={18} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-none">Markirovka Qabul</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'form'       && 'Partiya ma\'lumotlarini kiriting'}
                {step === 'scanning'   && `${items.length} ta kod skanerlandi`}
                {step === 'submitting' && 'Serverga yuborilmoqda...'}
              </p>
            </div>
          </div>

          {/* O'ng tomon amallar */}
          <div className="flex items-center gap-2">
            {items.length > 0 && step !== 'submitting' && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
                title="CSV eksport"
              >
                <Download size={13} /> Eksport
              </button>
            )}
            {items.length > 0 && step === 'scanning' && (
              <button
                onClick={() => setConfirmClose(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 text-xs hover:text-red-400 transition-colors"
              >
                <RotateCcw size={13} /> Yangilash
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── ASOSIY KONTENT ── */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Form xatosi */}
        {formError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1">{formError}</span>
            <button onClick={() => setFormError('')}><X size={14} /></button>
          </div>
        )}

        {/* ── FORM ── */}
        <BatchInfoSection
          form={form}
          onChange={handleFormChange}
          collapsed={formCollapsed}
          onToggle={() => setFormCollapsed(p => !p)}
          disabled={step === 'submitting'}
        />

        {/* ── SCANNING BOSHLANMAGAN ── */}
        {step === 'form' && (
          <button
            onClick={startScanning}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <ScanLine size={20} /> Skanerlashni boshlash
          </button>
        )}

        {/* ── SCANNER INPUT ── */}
        {(step === 'scanning' || step === 'submitting') && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <QrCode size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-white">Markirovka kodini kiriting yoki skanerlang</span>
              {checkingCount > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 size={11} className="animate-spin" />
                  {checkingCount} ta tekshirilmoqda
                </span>
              )}
            </div>

            <form onSubmit={handleScanSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                disabled={step === 'submitting' || items.length >= MAX_BATCH}
                placeholder={
                  items.length >= MAX_BATCH
                    ? `Maksimal ${MAX_BATCH} ta kod`
                    : 'Kodni skanerlang yoki qo\'lda kiriting (Enter)...'
                }
                autoFocus
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-600 text-white font-mono text-sm placeholder:text-slate-500 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={!scanInput.trim() || step === 'submitting'}
                className="px-4 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 disabled:opacity-40 transition-colors"
              >
                <ScanLine size={16} />
              </button>
            </form>

            <p className="text-xs text-slate-500">
              USB/Bluetooth skaner qo'llab-quvvatlanadi • Enter tugmasi bilan yuboring •
              Maksimal <span className="text-slate-400">{MAX_BATCH}</span> kod
            </p>
          </div>
        )}

        {/* ── STATS BAR ── */}
        {items.length > 0 && (
          <StatsBar items={items} />
        )}

        {/* ── JADVAL ── */}
        {items.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">

            {/* Jadval header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Hash size={14} className="text-slate-400" />
                Skanerlangan kodlar ({filteredItems.length})
              </span>

              {/* Filter tabs */}
              <div className="flex gap-1">
                {([
                  { key: 'all',       label: 'Barchasi'  },
                  { key: 'ok',        label: `✅ ${okCount}`        },
                  { key: 'error',     label: `❌ ${errorCount}`     },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTableFilter(key)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      tableFilter === key
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-slate-400 hover:text-white',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Jadval */}
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-sm">
                  <tr>
                    {['#', 'Markirovka kodi', 'GTIN', 'Status', 'Vaqt', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs text-slate-400 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody ref={tableBodyRef} className="divide-y divide-slate-800">
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                        Bu filtr bo'yicha kod topilmadi
                      </td>
                    </tr>
                  )}
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={item.uid}
                      className={cn(
                        'transition-colors',
                        item.status === 'ok'        && 'bg-green-500/3 hover:bg-green-500/5',
                        item.status === 'error'     && 'bg-red-500/3 hover:bg-red-500/5',
                        item.status === 'checking'  && 'bg-slate-800/30',
                        item.status === 'duplicate' && 'bg-amber-500/3',
                      )}
                    >
                      {/* Tartib raqami */}
                      <td className="px-3 py-2.5 text-slate-500 text-xs tabular-nums whitespace-nowrap">
                        {items.indexOf(item) + 1}
                      </td>

                      {/* Kod */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-xs text-slate-200 cursor-pointer hover:text-white"
                            title={item.markCode}
                            onClick={() => navigator.clipboard.writeText(item.markCode).catch(() => {})}
                          >
                            {shortCode(item.markCode)}
                          </span>
                          {item.productName && (
                            <span className="text-xs text-slate-500 truncate max-w-[100px]" title={item.productName}>
                              {item.productName}
                            </span>
                          )}
                        </div>
                        {item.expiryDate && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock size={10} /> Muddati: {formatDate(item.expiryDate)}
                          </p>
                        )}
                      </td>

                      {/* GTIN */}
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-slate-400">
                          {item.gtin ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={item.status} reason={item.errorReason} />
                      </td>

                      {/* Vaqt */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-slate-500">
                          {formatTime(item.scannedAt)}
                        </span>
                      </td>

                      {/* O'chirish */}
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => removeItem(item.uid)}
                          disabled={step === 'submitting'}
                          className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                          title="O'chirish"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ACTION BAR ── */}
        {items.length > 0 && step === 'scanning' && (
          <div className="sticky bottom-4 z-20">
            <div className="rounded-2xl border border-slate-600 bg-slate-900/95 backdrop-blur-md shadow-2xl px-4 py-3 flex items-center gap-3">

              {/* Xatolarni qayta urinish */}
              {hasErrors && (
                <button
                  onClick={retryErrors}
                  disabled={checkingCount > 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw size={14} />
                  Xatolarni qayta ({errorCount})
                </button>
              )}

              {/* Eksport */}
              {hasErrors && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  <Download size={14} />
                  CSV eksport
                </button>
              )}

              {/* Qabul qilishni tugatish */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all',
                  canSubmit
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20'
                    : 'bg-slate-700 opacity-50 cursor-not-allowed',
                )}
              >
                {checkingCount > 0 ? (
                  <><Loader2 size={15} className="animate-spin" /> Tekshirilmoqda...</>
                ) : (
                  <><Send size={15} /> Qabul qilishni tugatish ({okCount} ta)</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl px-8 py-10 flex flex-col items-center gap-4 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Loader2 size={32} className="text-green-400 animate-spin" />
              </div>
              <p className="text-white font-semibold text-lg">Serverga yuborilmoqda</p>
              <p className="text-slate-400 text-sm">{okCount} ta kod qabul qilinmoqda...</p>
            </div>
          </div>
        )}

        {/* Yangilash tasdiq dialogi */}
        {confirmClose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Yangi sessiya boshlansinmi?</p>
                  <p className="text-sm text-slate-400">Barcha skanerlangan kodlar o'chib ketadi</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmClose(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => { setConfirmClose(false); handleReset(); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Ha, yangilash
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bo'sh holat */}
        {step === 'scanning' && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <ScanLine size={36} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">Hali kod skanerlangani yo'q</p>
            <p className="text-slate-600 text-sm mt-1">
              Markirovka QR kodini yuqoridagi maydonга skanerlang
            </p>
          </div>
        )}
      </main>

      {/* ── INFO PANEL (quyi) ── */}
      {step === 'scanning' && (
        <footer className="max-w-4xl mx-auto px-4 pb-28">
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-500">
            <Info size={13} className="shrink-0 mt-0.5 text-slate-500" />
            <span>
              Har bir markirovka kodi skanerlangandan so'ng avtomatik tekshiriladi.
              ✅ yashil — qabul uchun tayyor · ❌ qizil — xatolik (eksport qilib ko'ring) ·
              Takror kodlar hisobga olinmaydi.
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
