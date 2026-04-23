import { useEffect, useRef } from 'react';
import { useOfflineStore } from '../store/offline';
import { syncService } from '../services/sync.service';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PING_INTERVAL = 15000;

export function useNetworkStatus() {
  const {
    connectionStatus,
    setConnectionStatus,
    applyPullData,
    lastPullAt,
  } = useOfflineStore();

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkConnection = async (): Promise<'online' | 'offline'> => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE}/healthz`, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(id);
      return res.ok ? 'online' : 'offline';
    } catch {
      return 'offline';
    }
  };

  const refreshCache = async () => {
    try {
      const data = await syncService.pull(lastPullAt || undefined);
      if (data) applyPullData({ settings: data.settings, syncedAt: data.syncedAt });
    } catch (err) {
      console.error('[Network] Cache yangilashda xatolik:', err);
    }
  };

  useEffect(() => {
    checkConnection().then(status => {
      setConnectionStatus(status);
      if (status === 'online') refreshCache();
    });

    const handleOnline = () => { setConnectionStatus('online'); refreshCache(); };
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    intervalRef.current = setInterval(async () => {
      const status = await checkConnection();
      setConnectionStatus(status);
      if (status === 'online') {
        const last = lastPullAt ? new Date(lastPullAt).getTime() : 0;
        if (Date.now() - last > 5 * 60 * 1000) refreshCache();
      }
    }, PING_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    connectionStatus,
    isOnline: connectionStatus === 'online',
    isOffline: connectionStatus === 'offline',
    refreshCache,
  };
}
