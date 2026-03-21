import { useEffect, useRef } from 'react';
import { useOfflineStore, type ConnectionStatus } from '../store/offline';
import { productService, categoryService } from '../services/product.service';
import { tableService } from '../services/table.service';

// ==========================================
// NETWORK STATUS HOOK
// Internet/LAN holatini kuzatadi va cache yangilaydi
// ==========================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PING_INTERVAL = 15000;

export function useNetworkStatus() {
  const {
    connectionStatus,
    setConnectionStatus,
    cacheProducts,
    cacheCategories,
    cacheTables,
    lastSyncAt,
  } = useOfflineStore();

  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkConnection = async (): Promise<ConnectionStatus> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${API_BASE}/healthz`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      return response.ok ? 'online' : 'offline';
    } catch {
      return 'offline';
    }
  };

  const refreshCache = async () => {
    try {
      const [products, categories, tables] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
        tableService.getAll(),
      ]);

      cacheProducts(
        (products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: p.image,
          categoryId: p.categoryId,
          categoryName: p.category?.name || '',
          isActive: p.isActive,
        }))
      );

      cacheCategories(
        (categories || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          sortOrder: c.sortOrder || 0,
        }))
      );

      cacheTables(
        (tables || []).map((t: any) => ({
          id: t.id,
          number: t.number,
          name: t.name,
          capacity: t.capacity,
          status: t.status?.toLowerCase() || 'free',
        }))
      );

      console.log(`[Offline] Cache yangilandi: ${products?.length || 0} product, ${categories?.length || 0} category, ${tables?.length || 0} table`);
    } catch (error) {
      console.error('[Offline] Cache yangilashda xatolik:', error);
    }
  };

  useEffect(() => {
    checkConnection().then(status => {
      setConnectionStatus(status);
      if (status === 'online') refreshCache();
    });

    const handleOnline = () => {
      setConnectionStatus('online');
      refreshCache();
    };
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    intervalRef.current = setInterval(async () => {
      const status = await checkConnection();
      setConnectionStatus(status);

      if (status === 'online') {
        const lastSync = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;
        if (Date.now() - lastSync > 5 * 60 * 1000) {
          refreshCache();
        }
      }
    }, PING_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { connectionStatus, isOnline: connectionStatus === 'online', isOffline: connectionStatus === 'offline', refreshCache };
}
