import { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function QRScannerModal({ isOpen, onClose, onScan, title = 'QR Kod Skanerlash' }: QRScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsStarting(true);
    setError(null);

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (mounted) {
              onScan(decodedText);
              stopScanner();
              onClose();
            }
          },
          () => {
            // QR code not detected - ignore
          }
        );

        if (mounted) {
          setIsStarting(false);
        }
      } catch (err) {
        if (mounted) {
          setIsStarting(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Kamerani ochishda xatolik yuz berdi'
          );
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {error ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-red-100 p-4">
                <Camera className="h-8 w-8 text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-800">Kamera xatoligi</p>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Yopish
              </button>
            </div>
          ) : (
            <>
              {isStarting && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500">Kamera ochilmoqda...</p>
                </div>
              )}
              <div
                id={scannerContainerId}
                className="overflow-hidden rounded-xl"
                style={{ display: isStarting ? 'none' : 'block' }}
              />
              <p className="mt-4 text-center text-sm text-gray-500">
                QR kodni kamera oldiga qo'ying
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
