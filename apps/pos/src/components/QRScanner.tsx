import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Keyboard, Search, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { productService, type Product } from '../services/product.service';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
}

export function QRScanner({ isOpen, onClose, onProductFound }: QRScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('qr-reader-' + Date.now());

  const stopCamera = useCallback(async () => {
    if (scannerRef.current && cameraActive) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      setCameraActive(false);
    }
  }, [cameraActive]);

  const lookupBarcode = useCallback(async (barcode: string) => {
    if (!barcode || loading) return;
    setLoading(true);
    setError('');
    setFoundProduct(null);

    try {
      const product = await productService.getByBarcode(barcode);
      setFoundProduct(product);
    } catch {
      setError('Mahsulot topilmadi');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const startCamera = useCallback(async () => {
    if (cameraActive || !isOpen) return;

    try {
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR/barcode skanerlandi
          lookupBarcode(decodedText);
        },
        () => {
          // Scan failed — ignore, davom etadi
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.error('[QRScanner] Kamera xatosi:', err);
      setError('Kamerani ochib bo\'lmadi. Qo\'lda kiritishdan foydalaning.');
      setMode('manual');
    }
  }, [cameraActive, isOpen, lookupBarcode]);

  // Kamerani ochish/yopish
  useEffect(() => {
    if (isOpen && mode === 'camera') {
      // Kamera konteyner render bo'lishi uchun kichik delay
      const timer = setTimeout(() => startCamera(), 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen, mode, startCamera, stopCamera]);

  // Modal yopilganda tozalash
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setFoundProduct(null);
      setError('');
      setManualBarcode('');
      setMode('camera');
    }
  }, [isOpen, stopCamera]);

  const handleAddToCart = () => {
    if (foundProduct) {
      onProductFound(foundProduct);
      setFoundProduct(null);
      setError('');
      setManualBarcode('');
    }
  };

  const handleManualSearch = () => {
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-bold text-white">QR / Barcode Skaner</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setMode('camera')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'camera'
                ? 'border-b-2 border-orange-500 text-orange-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera size={16} />
            Kamera
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'border-b-2 border-orange-500 text-orange-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard size={16} />
            Qo'lda kiritish
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Camera mode */}
          {mode === 'camera' && (
            <div className="space-y-4">
              <div
                id={containerRef.current}
                className="mx-auto aspect-square max-w-[300px] overflow-hidden rounded-xl bg-slate-800"
              />
              <p className="text-center text-sm text-slate-400">
                QR kod yoki barkodni kamera oldiga tutib turing
              </p>
            </div>
          )}

          {/* Manual mode */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  placeholder="Barcode raqamini kiriting..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleManualSearch}
                  disabled={!manualBarcode.trim() || loading}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Qidirilmoqda...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Found product */}
          {foundProduct && (
            <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-4">
                {foundProduct.image && (
                  <img
                    src={foundProduct.image}
                    alt={foundProduct.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="text-lg font-bold text-white">{foundProduct.name}</p>
                  <p className="text-orange-400 font-semibold">
                    {new Intl.NumberFormat('uz-UZ').format(foundProduct.price)} so'm
                  </p>
                  {foundProduct.barcode && (
                    <p className="text-xs text-slate-500 mt-1">{foundProduct.barcode}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleAddToCart}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-3 font-semibold text-white hover:bg-green-600 transition-colors"
              >
                <ShoppingCart size={16} />
                Savatga qo'shish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
