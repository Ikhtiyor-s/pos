import { useState, useEffect, useRef, useCallback } from 'react';
import { ScanBarcode, X, Keyboard, Camera, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { productService, type Product } from '../services/product.service';

interface BarcodeScannerProps {
  onProductFound: (product: Product) => void;
  onClose: () => void;
}

// ==========================================
// BARCODE SCANNER COMPONENT
//
// 3 ta rejim:
// 1. HARDWARE SCANNER — USB/Bluetooth skaner (klaviatura emulatsiya)
// 2. CAMERA — Qurilma kamerasi orqali
// 3. MANUAL — Qo'lda barcode kiritish
// ==========================================

export function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'scanner' | 'camera' | 'manual'>('scanner');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ==========================================
  // HARDWARE SCANNER MODE
  // USB/Bluetooth skanerlar klaviatura sifatida ishlaydi
  // Tez ketma-ket kelgan harflarni yig'ib, Enter da qidiradi
  // ==========================================

  useEffect(() => {
    if (mode !== 'scanner') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (bufferRef.current.length >= 3) {
          searchByBarcode(bufferRef.current.trim());
        }
        bufferRef.current = '';
        return;
      }

      // Printable character
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Auto-reset buffer after 100ms pause (manual typing is slower)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode]);

  // Focus input on mount (manual mode)
  useEffect(() => {
    if (mode === 'manual' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  // Camera cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ==========================================
  // CAMERA MODE
  // ==========================================

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('camera');
    } catch {
      setError('Kameraga ruxsat berilmadi');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ==========================================
  // BARCODE SEARCH
  // ==========================================

  const searchByBarcode = async (code: string) => {
    if (!code || code.length < 3) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const product = await productService.getByBarcode(code);
      if (product) {
        setLastScanned(product);
        setSuccess(`${product.name} topildi!`);
        onProductFound(product);

        // Auto-clear success after 2s
        setTimeout(() => {
          setSuccess('');
          setLastScanned(null);
          setBarcode('');
        }, 2000);
      }
    } catch {
      setError(`"${code}" barcode bo'yicha mahsulot topilmadi`);
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      searchByBarcode(barcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <ScanBarcode size={20} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Barcode Scanner</h2>
              <p className="text-xs text-slate-400">Mahsulotni skanerlang yoki kodni kiriting</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-700">
          {[
            { id: 'scanner' as const, label: 'USB Scanner', icon: ScanBarcode },
            { id: 'camera' as const, label: 'Kamera', icon: Camera },
            { id: 'manual' as const, label: 'Qo\'lda', icon: Keyboard },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id !== 'camera') stopCamera();
                if (tab.id === 'camera') startCamera();
                else setMode(tab.id);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors
                ${mode === tab.id
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5'
                  : 'text-slate-400 hover:text-white'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">

          {/* Scanner Mode */}
          {mode === 'scanner' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <ScanBarcode size={36} className="text-orange-500 animate-pulse" />
              </div>
              <p className="text-white font-medium mb-2">USB/Bluetooth skaner tayyor</p>
              <p className="text-slate-400 text-sm">
                Barcode ni skanerlang — mahsulot avtomatik qo'shiladi
              </p>
              <div className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-500">
                Skaner klaviatura rejimida ishlaydi (HID mode)
              </div>
            </div>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Scan line animation */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-0.5 bg-orange-500/80 animate-pulse" />
                </div>
                {/* Corner markers */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-orange-500 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-orange-500 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-orange-500 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-orange-500 rounded-br-lg" />
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                Barcode ni kamera oldiga tutib turing
              </p>
              {/* Manual input for camera mode too */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="Yoki kodni kiriting..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !barcode.trim()}
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Qidirish'}
                </button>
              </form>
            </div>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Barcode raqami
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="Masalan: PROD-A1B2C3-123456"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-lg font-mono tracking-wider focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !barcode.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Qidirilmoqda...</>
                  ) : (
                    <><ScanBarcode size={18} /> Mahsulotni topish</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Status Messages */}
          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {success && lastScanned && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle size={18} className="text-green-500 shrink-0" />
              <div>
                <p className="text-green-400 text-sm font-medium">{success}</p>
                <p className="text-slate-400 text-xs">
                  {Number(lastScanned.price).toLocaleString()} so'm — savatga qo'shildi
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-500 text-center">
            USB skaner, kamera yoki qo'lda kiritish orqali barcode skanerlang
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BARCODE LISTENER HOOK
// POS ekranida doim ishlaydigan background scanner
// USB skaner Enter bilan tugatadi
// ==========================================

export function useBarcodeScannerListener(
  onScan: (barcode: string) => void,
  enabled: boolean = true,
) {
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Agar input/textarea da bo'lsa — ignore
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 4) {
          onScan(bufferRef.current.trim());
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 80);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onScan, enabled]);
}
