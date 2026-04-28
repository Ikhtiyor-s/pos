import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, X, Keyboard, Camera, Loader2, AlertCircle, CheckCircle,
  ShieldCheck, ShieldX, Clock, Hash, Package, AlertTriangle, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '../services/api';

// ==========================================
// TIPLAR
// ==========================================

interface CheckResult {
  valid: boolean;
  reason?: string;
  product?: {
    id: string;
    gtin: string;
    serialNumber: string;
    batchNumber: string | null;
    expiryDate:  string | null;
    status:      string;
  };
}

interface VerifyResult {
  valid:            boolean;
  queued?:          boolean;
  gtin?:            string;
  serialNumber?:    string;
  productName?:     string;
  expiryDate?:      string;
  manufacturerName?: string;
  status?:          string;
}

export interface VerifiedProduct {
  markCode:         string;
  gtin:             string;
  serialNumber:     string;
  productName?:     string;
  expiryDate?:      string;
  manufacturerName?: string;
  status:           string;
}

interface ScanHistoryItem {
  markCode: string;
  valid:    boolean;
  reason?:  string;
  at:       Date;
}

interface MarkirovkaScannerProps {
  isOpen:   boolean;
  onClose:  () => void;
  onAdd:    (product: VerifiedProduct) => void;
  title?:   string;
}

// ==========================================
// YORDAMCHI FUNKSIYALAR
// ==========================================

function playBeep(type: 'success' | 'error'): void {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880,  ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    }

    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    // AudioContext browser restriction — ignore
  }
}

function mapErrorReason(reason?: string): { label: string; icon: typeof AlertCircle; color: string } {
  if (!reason) return { label: 'Markirovka kodi tekshirishdan o\'tmadi', icon: AlertCircle, color: 'red' };

  const r = reason.toLowerCase();

  if (r.includes('allaqachon sotilgan') || r.includes('already sold'))
    return { label: 'Mahsulot allaqachon sotilgan', icon: AlertTriangle, color: 'amber' };

  if (r.includes('muddati o\'tgan') || r.includes('expired') || r.includes('muddati'))
    return { label: 'Muddati o\'tgan mahsulot', icon: Clock, color: 'orange' };

  if (r.includes('tasdiqlamadi') || r.includes('soxta') || r.includes('invalid') || r.includes('not found in government'))
    return { label: 'Soxta mahsulot — davlat serveri tasdiqlamadi', icon: ShieldX, color: 'red' };

  if (r.includes('boshqa restoran') || r.includes('tenant'))
    return { label: 'Bu kod boshqa restoranga tegishli', icon: AlertCircle, color: 'red' };

  if (r.includes('bazada topilmadi') || r.includes('not found'))
    return { label: 'Markirovka kodi bazada ro\'yxatdan o\'tmagan', icon: Hash, color: 'yellow' };

  if (r.includes('band') || r.includes('reserved'))
    return { label: 'Mahsulot boshqa buyurtma uchun band', icon: Package, color: 'amber' };

  return { label: reason, icon: AlertCircle, color: 'red' };
}

function formatMarkCode(code: string): string {
  if (code.length <= 12) return code;
  return `${code.slice(0, 8)}···${code.slice(-6)}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ==========================================
// ASOSIY KOMPONENT
// ==========================================

export function MarkirovkaScanner({
  isOpen,
  onClose,
  onAdd,
  title = 'Markirovka Skaneri',
}: MarkirovkaScannerProps) {
  const [mode, setMode]             = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading]       = useState(false);
  const [govLoading, setGovLoading] = useState(false);

  // Scan natijasi
  const [checkResult, setCheckResult]   = useState<CheckResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [scannedCode, setScannedCode]   = useState('');
  const [scanError, setScanError]       = useState('');

  // Kamera
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef   = useRef<Html5Qrcode | null>(null);
  const containerId  = useRef(`mark-qr-${Date.now()}`);

  // Scan tarixi (sessiya ichida)
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Oxirgi skanerlangan kod takrorlanmasin
  const lastCodeRef  = useRef('');
  const cooldownRef  = useRef(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ──────────────────────────────────────────
  // KAMERA
  // ──────────────────────────────────────────

  const stopCamera = useCallback(async () => {
    if (scannerRef.current && cameraActive) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      setCameraActive(false);
    }
  }, [cameraActive]);

  const startCamera = useCallback(async () => {
    if (cameraActive || !isOpen) return;
    try {
      const scanner = new Html5Qrcode(containerId.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          if (cooldownRef.current || decodedText === lastCodeRef.current) return;
          lastCodeRef.current = decodedText;
          cooldownRef.current = true;
          setTimeout(() => { cooldownRef.current = false; }, 2500);
          handleScan(decodedText);
        },
        () => { /* scan failure — ignore, scanning continues */ },
      );
      setCameraActive(true);
    } catch {
      setScanError('Kameraga ruxsat berilmadi. Qo\'lda kiritishdan foydalaning.');
      setMode('manual');
    }
  }, [cameraActive, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      const t = setTimeout(() => startCamera(), 350);
      return () => clearTimeout(t);
    } else {
      stopCamera();
    }
  }, [isOpen, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal yopilganda tozalash
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetState();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual mode da input ga focus
  useEffect(() => {
    if (mode === 'manual' && isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode, isOpen]);

  // ──────────────────────────────────────────
  // HOLAT TOZALASH
  // ──────────────────────────────────────────

  const resetState = () => {
    setCheckResult(null);
    setVerifyResult(null);
    setScannedCode('');
    setScanError('');
    setManualCode('');
    setLoading(false);
    setGovLoading(false);
    lastCodeRef.current = '';
  };

  // ──────────────────────────────────────────
  // ASOSIY SCAN MANTIQ
  // ──────────────────────────────────────────

  const handleScan = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 20) {
      setScanError('Markirovka kodi kamida 20 belgidan iborat bo\'lishi kerak');
      playBeep('error');
      return;
    }

    setScannedCode(trimmed);
    setScanError('');
    setCheckResult(null);
    setVerifyResult(null);
    setLoading(true);

    // 1. Tezkor mahalliy tekshiruv
    try {
      const { data } = await api.get<{ success: boolean; data: CheckResult }>(
        `/markirovka/check/${encodeURIComponent(trimmed)}`,
      );

      const result = data.data;
      setCheckResult(result);
      setLoading(false);

      // Ovoz
      playBeep(result.valid ? 'success' : 'error');

      // Tarixga qo'shish
      setHistory((prev) => [
        { markCode: trimmed, valid: result.valid, reason: result.reason, at: new Date() },
        ...prev.slice(0, 4),
      ]);

      if (!result.valid) return;

      // 2. Davlat serveri tekshiruvi (fon rejimida)
      setGovLoading(true);
      try {
        const { data: vData } = await api.post<{ success: boolean; data: VerifyResult }>(
          `/markirovka/verify/${encodeURIComponent(trimmed)}`,
        );
        setVerifyResult(vData.data);
      } catch {
        // Davlat serveri mavjud bo'lmasa — mahalliy natija yetarli
        setVerifyResult({ valid: true, status: 'OFFLINE' });
      } finally {
        setGovLoading(false);
      }
    } catch (err: unknown) {
      setLoading(false);
      setGovLoading(false);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Server bilan bog\'lanishda xato';
      setScanError(msg);
      playBeep('error');
    }
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) handleScan(manualCode.trim());
  };

  const handleAddToOrder = () => {
    if (!checkResult?.valid || !scannedCode) return;

    const product: VerifiedProduct = {
      markCode:         scannedCode,
      gtin:             verifyResult?.gtin     ?? checkResult.product?.gtin     ?? '',
      serialNumber:     verifyResult?.serialNumber ?? checkResult.product?.serialNumber ?? '',
      productName:      verifyResult?.productName,
      expiryDate:       verifyResult?.expiryDate ?? checkResult.product?.expiryDate ?? undefined,
      manufacturerName: verifyResult?.manufacturerName,
      status:           checkResult.product?.status ?? 'IN_STOCK',
    };

    onAdd(product);
    resetState();
    lastCodeRef.current = '';  // Keyingi scan uchun
  };

  // ──────────────────────────────────────────
  // RENDER YORDAMCHILARI
  // ──────────────────────────────────────────

  const errorInfo = mapErrorReason(checkResult?.reason ?? scanError);

  const colorMap = {
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400'    },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400'  },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  };

  if (!isOpen) return null;

  // ──────────────────────────────────────────
  // JSX
  // ──────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <QrCode size={20} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="text-xs text-slate-400">O'zbekiston markirovka tizimi</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── MODE TABS ── */}
        <div className="flex border-b border-slate-700 shrink-0">
          {([
            { id: 'camera' as const, label: 'Kamera',        Icon: Camera   },
            { id: 'manual' as const, label: 'Qo\'lda kiritish', Icon: Keyboard },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id !== mode) {
                  resetState();
                  setMode(id);
                }
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                mode === id
                  ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5'
                  : 'text-slate-400 hover:text-white',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── KONTENT ── */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {/* KAMERA MODE */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-square">
                {/* html5-qrcode konteyner */}
                <div
                  id={containerId.current}
                  className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                />

                {/* Scan maydon chizigi */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-56 h-56">
                      {/* To'rt burchak */}
                      <div className="absolute top-0 left-0  w-7 h-7 border-t-2 border-l-2 border-green-400 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-green-400 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0  w-7 h-7 border-b-2 border-l-2 border-green-400 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-green-400 rounded-br-md" />
                      {/* Skanerlash chizig'i */}
                      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-green-400/70 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    </div>
                  </div>
                )}

                {/* Kamera yuklanmoqda */}
                {!cameraActive && !scanError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 size={28} className="animate-spin text-green-400" />
                    <span className="text-xs">Kamera yuklanmoqda...</span>
                  </div>
                )}

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={28} className="animate-spin text-green-400" />
                    <span className="text-xs text-green-300">Tekshirilmoqda...</span>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-400">
                Markirovka QR kodini kamera oldiga tutib turing
              </p>
            </div>
          )}

          {/* QOLDA KIRITISH MODE */}
          {mode === 'manual' && !checkResult && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Markirovka kodi
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="01046015678901231234..."
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-mono text-sm tracking-wider placeholder:text-slate-500 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Kamida 20 belgi • DataMatrix yoki QR format
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || manualCode.trim().length < 20}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Tekshirilmoqda...</>
                ) : (
                  <><ShieldCheck size={16} /> Markirovkani tekshirish</>
                )}
              </button>
            </form>
          )}

          {/* ── TEKSHIRUV NATIJASI ── */}
          {scannedCode && !loading && (
            <div className="space-y-3">

              {/* Skanerlangan kod */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
                <Hash size={13} className="text-slate-500 shrink-0" />
                <span className="text-xs text-slate-300 font-mono flex-1 truncate">{formatMarkCode(scannedCode)}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(scannedCode).catch(() => {})}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Nusxa
                </button>
              </div>

              {/* MUVAFFAQIYATLI */}
              {checkResult?.valid && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 divide-y divide-green-500/10">

                  {/* Holat sarlavhasi */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle size={18} className="text-green-400" />
                    </div>
                    <div>
                      <p className="text-green-400 font-semibold text-sm">Markirovka kodi yaroqli ✅</p>
                      <p className="text-xs text-slate-400">Mahsulot sotish uchun ruxsat berilgan</p>
                    </div>
                  </div>

                  {/* Mahsulot ma'lumotlari */}
                  {(verifyResult || checkResult.product) && (
                    <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {(verifyResult?.productName) && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Mahsulot nomi</span>
                          <p className="text-white font-medium truncate">{verifyResult.productName}</p>
                        </div>
                      )}
                      {(verifyResult?.gtin || checkResult.product?.gtin) && (
                        <div>
                          <span className="text-slate-500">GTIN</span>
                          <p className="text-slate-200 font-mono">{verifyResult?.gtin ?? checkResult.product?.gtin}</p>
                        </div>
                      )}
                      {(verifyResult?.serialNumber || checkResult.product?.serialNumber) && (
                        <div>
                          <span className="text-slate-500">Serial №</span>
                          <p className="text-slate-200 font-mono truncate">
                            {verifyResult?.serialNumber ?? checkResult.product?.serialNumber}
                          </p>
                        </div>
                      )}
                      {checkResult.product?.batchNumber && (
                        <div>
                          <span className="text-slate-500">Partiya</span>
                          <p className="text-slate-200">{checkResult.product.batchNumber}</p>
                        </div>
                      )}
                      {(verifyResult?.expiryDate || checkResult.product?.expiryDate) && (
                        <div>
                          <span className="text-slate-500">Yaroqlilik muddati</span>
                          <p className="text-slate-200">{formatDate(verifyResult?.expiryDate ?? checkResult.product?.expiryDate)}</p>
                        </div>
                      )}
                      {verifyResult?.manufacturerName && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Ishlab chiqaruvchi</span>
                          <p className="text-slate-200 truncate">{verifyResult.manufacturerName}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Davlat tekshiruvi holati */}
                  <div className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <BadgeCheck size={12} className="text-slate-500" />
                      Davlat serveri
                    </span>
                    {govLoading ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Loader2 size={11} className="animate-spin" /> Tekshirilmoqda...
                      </span>
                    ) : verifyResult?.queued ? (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <Clock size={11} /> Navbatda
                      </span>
                    ) : verifyResult?.status === 'OFFLINE' ? (
                      <span className="text-xs text-yellow-400">Internet mavjud emas</span>
                    ) : verifyResult?.valid ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle size={11} /> Tasdiqlandi
                      </span>
                    ) : verifyResult ? (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <ShieldX size={11} /> Rad etildi
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>

                  {/* "Sotishga qo'shish" tugmasi */}
                  <div className="px-4 py-3">
                    <button
                      onClick={handleAddToOrder}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[0.98]"
                    >
                      <CheckCircle size={16} />
                      Sotishga qo'shish
                    </button>
                  </div>
                </div>
              )}

              {/* XATOLIK */}
              {(checkResult && !checkResult.valid) && (() => {
                const ei     = mapErrorReason(checkResult.reason);
                const colors = colorMap[ei.color as keyof typeof colorMap] ?? colorMap.red;
                const ErrIcon = ei.icon;
                return (
                  <div className={cn('rounded-xl border divide-y p-4 space-y-3', colors.bg, colors.border)}>
                    <div className="flex items-start gap-3">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
                        <ErrIcon size={18} className={colors.text} />
                      </div>
                      <div>
                        <p className={cn('font-semibold text-sm', colors.text)}>{ei.label} ❌</p>
                        {checkResult.product && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Status: {checkResult.product.status}
                            {checkResult.product.expiryDate && (
                              <> · Muddati: {formatDate(checkResult.product.expiryDate)}</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { resetState(); if (mode === 'manual') setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="w-full pt-3 text-sm text-slate-400 hover:text-white transition-colors text-center"
                    >
                      Qaytadan skanerlash →
                    </button>
                  </div>
                );
              })()}

              {/* Scan error (network/validation) */}
              {scanError && !checkResult && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-400 font-medium">{scanError}</p>
                    <button
                      onClick={() => { setScanError(''); setScannedCode(''); setManualCode(''); setTimeout(() => inputRef.current?.focus(), 50); }}
                      className="text-xs text-slate-400 hover:text-white mt-1 transition-colors"
                    >
                      Qaytadan urinish →
                    </button>
                  </div>
                </div>
              )}

              {/* Yana skanerlash (qolda rejimda) */}
              {mode === 'manual' && checkResult?.valid && (
                <button
                  onClick={() => { resetState(); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="w-full py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-white hover:border-slate-600 transition-colors"
                >
                  Boshqa kod kiritish
                </button>
              )}
            </div>
          )}

          {/* ── TARIX ── */}
          {history.length > 0 && !scannedCode && (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">
                Oxirgi skanlar
              </p>
              <div className="space-y-1.5">
                {history.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                      item.valid
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-red-500/5 border-red-500/20',
                    )}
                  >
                    {item.valid
                      ? <CheckCircle size={12} className="text-green-400 shrink-0" />
                      : <AlertCircle size={12} className="text-red-400 shrink-0"   />
                    }
                    <span className="font-mono text-slate-300 flex-1 truncate">
                      {formatMarkCode(item.markCode)}
                    </span>
                    {!item.valid && item.reason && (
                      <span className="text-red-400 truncate max-w-[100px]">
                        {mapErrorReason(item.reason).label.split(' ').slice(0, 2).join(' ')}
                      </span>
                    )}
                    <span className="text-slate-600 shrink-0">
                      {item.at.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-5 py-3 border-t border-slate-700 bg-slate-800/40 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Davlat serveri: <span className="text-slate-400">{import.meta.env.VITE_MARKIROVKA_API_URL || 'api.markirovka.uz'}</span>
          </p>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Tarixni tozalash
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EKSPORT: GLOBAL SCANNER HOOK
// POS ekranida doim ishlaydigan hardware skaner
// ==========================================

export function useMarkirovkaScannerListener(
  onScan:  (code: string) => void,
  enabled: boolean = true,
) {
  const bufferRef  = useRef('');
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 20) {
          onScan(bufferRef.current.trim());
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { bufferRef.current = ''; }, 80);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onScan, enabled]);
}
