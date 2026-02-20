import { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle,
  Store,
  MapPin,
  Phone,
  RefreshCw,
  Search,
} from 'lucide-react';
import { nonborService, type NonborStatus, type NonborBusiness } from '../services/nonbor.service';

interface NonborSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export function NonborSetup({ isOpen, onClose, onStatusChange }: NonborSetupProps) {
  const [status, setStatus] = useState<NonborStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [businesses, setBusinesses] = useState<NonborBusiness[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBusinessList, setShowBusinessList] = useState(false);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const s = await nonborService.getStatus();
      setStatus(s);
    } catch {
      setStatus({ enabled: false, sellerId: null, businessName: null });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    const id = parseInt(sellerId);
    if (isNaN(id) || id <= 0) {
      setError('Seller ID raqam bo\'lishi kerak');
      return;
    }

    setConnecting(true);
    setError('');
    try {
      await nonborService.connect(id);
      await fetchStatus();
      onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ulanishda xatolik');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      await nonborService.disconnect();
      setStatus({ enabled: false, sellerId: null, businessName: null });
      setSellerId('');
      onStatusChange();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Uzishda xatolik');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await nonborService.sync();
      await fetchStatus();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadBusinesses = async () => {
    setLoadingBusinesses(true);
    try {
      const list = await nonborService.getBusinesses();
      setBusinesses(list);
      setShowBusinessList(true);
    } catch {
      setError('Bizneslar ro\'yxatini yuklashda xatolik');
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const handleSelectBusiness = (biz: NonborBusiness) => {
    if (biz.id) {
      setSellerId(biz.id.toString());
      setShowBusinessList(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.title?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nonbor Integratsiya</h2>
              <p className="text-xs text-slate-400">Biznesni ulash va boshqarish</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : status?.enabled ? (
            /* Ulangan holat */
            <>
              {/* Status card */}
              <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                    <Wifi size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-400">Ulangan</p>
                    <p className="text-xs text-slate-400">Seller ID: {status.sellerId}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {status.businessName && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Store size={14} className="text-purple-400 shrink-0" />
                      <span className="font-medium">{status.businessName}</span>
                    </div>
                  )}
                  {status.businessAddress && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <MapPin size={14} className="text-slate-500 shrink-0" />
                      <span>{status.businessAddress}</span>
                    </div>
                  )}
                  {status.businessPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Phone size={14} className="text-slate-500 shrink-0" />
                      <span>{status.businessPhone}</span>
                    </div>
                  )}
                </div>

                {/* Nonbor order stats */}
                {status.nonborOrderStats && (
                  <div className="mt-3 pt-3 border-t border-green-500/20 grid grid-cols-3 gap-2 text-center">
                    {Object.entries(status.nonborOrderStats).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-slate-800/50 p-2">
                        <p className="text-xs text-slate-500 capitalize">{key}</p>
                        <p className="text-sm font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Sync...' : 'Hozir sync'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <WifiOff size={16} />
                  Uzish
                </button>
              </div>
            </>
          ) : (
            /* Ulanmagan holat */
            <>
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Seller ID input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Seller ID (biznes raqami)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={sellerId}
                    onChange={(e) => { setSellerId(e.target.value); setError(''); }}
                    placeholder="Masalan: 42"
                    className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleLoadBusinesses}
                    disabled={loadingBusinesses}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                    title="Bizneslar ro'yxati"
                  >
                    {loadingBusinesses ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
              </div>

              {/* Business list */}
              {showBusinessList && (
                <div className="rounded-xl border border-slate-700 max-h-48 overflow-y-auto">
                  <div className="sticky top-0 bg-slate-800 px-3 py-2 border-b border-slate-700">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Biznes qidirish..."
                      className="w-full bg-slate-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  {filteredBusinesses.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-500 text-center">Topilmadi</p>
                  ) : (
                    filteredBusinesses.map((biz) => (
                      <button
                        key={biz.id}
                        onClick={() => handleSelectBusiness(biz)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800 border-b border-slate-800 last:border-0 transition-colors"
                      >
                        <Store size={14} className="text-purple-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{biz.title}</p>
                          <p className="text-xs text-slate-500 truncate">{biz.address}</p>
                        </div>
                        <span className="ml-auto text-xs text-slate-600">#{biz.id}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Connect button */}
              <button
                onClick={handleConnect}
                disabled={connecting || !sellerId}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 py-3.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Ulanmoqda...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Nonbor bilan ulash
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
