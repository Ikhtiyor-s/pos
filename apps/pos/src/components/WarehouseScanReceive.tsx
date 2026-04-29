import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanBarcode, Package, Plus, Minus, Check, X, History,
  Keyboard, Camera, Loader2, AlertCircle, LogOut, Warehouse,
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScannedProduct {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  image?: string | null;
  category?: { id: string; name: string } | null;
  stockQuantity: number | null;
}

interface ReceiveRecord {
  id: string;
  productName: string;
  barcode: string;
  quantity: number;
  time: string;
  stockTotal: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  userName?: string;
  onLogout: () => void;
}

export function WarehouseScanReceive({ userName, onLogout }: Props) {
  const [mode, setMode]                   = useState<'scanner' | 'camera' | 'manual'>('scanner');
  const [product, setProduct]             = useState<ScannedProduct | null>(null);
  const [quantity, setQuantity]           = useState(1);
  const [note, setNote]                   = useState('');
  const [loading, setLoading]             = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [history, setHistory]             = useState<ReceiveRecord[]>([]);
  const [showHistory, setShowHistory]     = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const inputRef    = useRef<HTMLInputElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const bufferRef   = useRef('');
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanLockRef = useRef(false); // double-scan blocker

  // ── Hardware scanner (USB/Bluetooth) keyboard listener ──────────────────────
  useEffect(() => {
    if (mode !== 'scanner') return;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = bufferRef.current.trim();
        if (val.length >= 3) lookup(val);
        bufferRef.current = '';
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { bufferRef.current = ''; }, 120);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode]);

  // ── Camera mode ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'camera') { stopCamera(); return; }
    startCamera();
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // ZXing scan loop (if available)
      const { BrowserMultiFormatReader } = await import('@zxing/browser').catch(() => ({ BrowserMultiFormatReader: null }));
      if (BrowserMultiFormatReader && videoRef.current) {
        const reader = new (BrowserMultiFormatReader as any)();
        reader.decodeFromVideoElement(videoRef.current, (result: any) => {
          if (result && !scanLockRef.current) {
            scanLockRef.current = true;
            lookup(result.getText());
            setTimeout(() => { scanLockRef.current = false; }, 2000);
          }
        }).catch(() => null);
      }
    } catch {
      setError('Kamera ochilmadi');
      setMode('manual');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // ── Barcode lookup ───────────────────────────────────────────────────────────
  const lookup = useCallback(async (barcode: string) => {
    if (!barcode.trim() || lookupLoading) return;
    setLookupLoading(true);
    setError('');
    setSuccess('');
    setProduct(null);
    setQuantity(1);
    setNote('');

    try {
      const { data } = await api.get(`/warehouse/scan/${encodeURIComponent(barcode.trim())}`);
      setProduct(data.data.product);
      // Beep feedback
      playBeep(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Barcode topilmadi';
      setError(msg);
      playBeep(false);
    } finally {
      setLookupLoading(false);
      setManualBarcode('');
    }
  }, [lookupLoading]);

  // ── Submit (qabul qilish) ─────────────────────────────────────────────────────
  const handleReceive = async () => {
    if (!product || loading) return;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/warehouse/scan-receive', {
        barcode: product.barcode,
        quantity,
        note: note.trim() || undefined,
      });

      const result = data.data;
      setSuccess(`✅ ${result.product.name} — ${result.received} ta qabul qilindi`);

      setHistory(prev => [{
        id: Date.now().toString(),
        productName: result.product.name,
        barcode: product.barcode ?? '',
        quantity,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        stockTotal: result.inventoryTotal,
      }, ...prev.slice(0, 49)]);

      setTimeout(() => {
        setProduct(null);
        setQuantity(1);
        setNote('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // ── Beep sound ────────────────────────────────────────────────────────────────
  const playBeep = (ok: boolean) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = ok ? 880 : 220;
      osc.type = ok ? 'sine' : 'sawtooth';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* ignore */ }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-orange-50 flex flex-col">

      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-white/80 backdrop-blur border-b border-gray-200 px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900">Ombor qabul</span>
            <p className="text-xs text-gray-500">Barcode skanerlash</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              showHistory
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <History size={16} />
            <span className="hidden sm:inline">Tarix</span>
            {history.length > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs rounded-full px-1.5 py-0.5">
                {history.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl">
            <span className="text-sm font-medium text-gray-700">{userName}</span>
            <button
              onClick={onLogout}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 gap-4 p-4 max-w-4xl mx-auto w-full">

        {/* Left: Scanner */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Mode tabs */}
          <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {(['scanner', 'camera', 'manual'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {m === 'scanner' && <ScanBarcode size={16} />}
                {m === 'camera'  && <Camera size={16} />}
                {m === 'manual'  && <Keyboard size={16} />}
                <span className="capitalize hidden sm:inline">
                  {m === 'scanner' ? 'Skaner' : m === 'camera' ? 'Kamera' : "Qo'lda"}
                </span>
              </button>
            ))}
          </div>

          {/* Scanner area */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Hardware scanner mode */}
            {mode === 'scanner' && (
              <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
                <div className={cn(
                  'flex h-24 w-24 items-center justify-center rounded-2xl',
                  lookupLoading ? 'bg-orange-100 animate-pulse' : 'bg-orange-50'
                )}>
                  {lookupLoading
                    ? <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                    : <ScanBarcode className="h-12 w-12 text-orange-400" />
                  }
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">Skanerni ulang</p>
                  <p className="text-sm text-gray-500 mt-1">USB yoki Bluetooth skaner tayyor</p>
                  <p className="text-xs text-gray-400 mt-2">Barcode skanerlanganda avtomatik qidiradi</p>
                </div>
              </div>
            )}

            {/* Camera mode */}
            {mode === 'camera' && (
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-40 border-2 border-orange-400 rounded-lg opacity-70" />
                </div>
                {lookupLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Manual mode */}
            {mode === 'manual' && (
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-3">Barcode raqamini kiriting:</p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') lookup(manualBarcode); }}
                    placeholder="Barcode..."
                    autoFocus
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <button
                    onClick={() => lookup(manualBarcode)}
                    disabled={!manualBarcode.trim() || lookupLoading}
                    className="px-5 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-40 transition-colors"
                  >
                    {lookupLoading ? <Loader2 size={20} className="animate-spin" /> : 'Qidirish'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error / Success */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-700">
              <Check size={18} className="shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {/* Found product card */}
          {product && !success && (
            <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden animate-in slide-in-from-bottom-2">
              <div className="flex gap-4 p-4 border-b border-gray-100">
                {product.image
                  ? <img src={product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
                  : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-50">
                      <Package className="h-8 w-8 text-orange-400" />
                    </div>
                  )
                }
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{product.category?.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{product.barcode}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-semibold text-orange-600">
                      {Number(product.price).toLocaleString('uz-UZ')} so'm
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      (product.stockQuantity ?? 0) < 10
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    )}>
                      Ombor: {product.stockQuantity ?? 0} ta
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity + Note */}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-20">Miqdor:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center text-xl font-bold border-2 border-orange-200 rounded-xl py-1 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-20">Izoh:</span>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Yetkazib beruvchi, partiya..."
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setProduct(null); setError(''); }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Bekor
                  </button>
                  <button
                    onClick={handleReceive}
                    disabled={loading}
                    className="flex-2 flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {loading
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Check size={18} />
                    }
                    {loading ? 'Saqlanmoqda...' : `${quantity} ta qabul qilish`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: History panel */}
        {showHistory && (
          <div className="w-72 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Bugungi qabul</span>
              <button onClick={() => setHistory([])} className="text-xs text-red-400 hover:text-red-600">
                Tozalash
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                  <Package size={32} className="opacity-40" />
                  <span className="text-sm">Hali qabul yo'q</span>
                </div>
              ) : history.map(r => (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 leading-tight">{r.productName}</p>
                    <span className="shrink-0 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      +{r.quantity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono text-gray-400">{r.barcode}</span>
                    <span className="text-xs text-gray-400">{r.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Jami: {r.stockTotal} ta</p>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-orange-50">
              <p className="text-xs text-orange-700 font-medium">
                Jami {history.reduce((s, r) => s + r.quantity, 0)} ta qabul qilindi
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
