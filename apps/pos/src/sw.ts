// ==========================================
// SERVICE WORKER — Oshxona POS
//
// VitePWA (injectManifest) orqali build qilinadi.
// Output: dist/sw.js  →  served as /sw.js
//
// Xususiyatlar:
//  - Precache: VitePWA tomonidan inject qilingan manifest
//  - Fetch: network-first /api, cache-first static
//  - Background Sync: 'pos-sync' tag orqali offline queue
//  - Push Notifications
//  - IndexedDB: pos-offline-db / queue store
// ==========================================

/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ==========================================
// CONSTANTS
// ==========================================

const SW_VERSION  = '2.0.0';
const SYNC_TAG    = 'pos-sync';
const CACHE_SHELL = `pos-shell-v${SW_VERSION}`;
const CACHE_API   = `pos-api-v${SW_VERSION}`;

const IDB_NAME  = 'pos-offline-db';
const IDB_STORE = 'queue';
const IDB_META  = 'meta';

// VitePWA inject qiladi — build paytida haqiqiy URL'lar bilan to'ldiriladi
const WB_MANIFEST: string[] =
  typeof self.__WB_MANIFEST !== 'undefined'
    ? self.__WB_MANIFEST.map(e => e.url)
    : [];

const SHELL_URLS = [...new Set([...WB_MANIFEST, '/', '/index.html'])];

// ==========================================
// INSTALL — static shell ni precache qilish
// ==========================================

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_URLS).catch(() => cache.addAll(['/', '/index.html'])))
      .then(() => self.skipWaiting()),
  );
});

// ==========================================
// ACTIVATE — eski cache'larni tozalash
// ==========================================

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_SHELL && k !== CACHE_API)
            .map(k => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ==========================================
// FETCH — tarmoq strategiyasi
// ==========================================

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Faqat bir xil origin
  if (url.origin !== self.location.origin) return;

  // Non-GET — queue orqali boshqariladi (background sync)
  if (request.method !== 'GET') return;

  // /api/* — Network First, offline bo'lsa cache yoki 503
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // /socket.io — skip (WebSocket)
  if (url.pathname.startsWith('/socket.io')) return;

  // Static assets — Cache First
  event.respondWith(cacheFirstStatic(request));
});

async function networkFirstApi(request: Request): Promise<Response> {
  try {
    const res   = await fetch(request);
    const clone = res.clone();
    caches.open(CACHE_API).then(c => c.put(request, clone)).catch(() => null);
    return res;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ??
      new Response(
        JSON.stringify({ success: false, offline: true, message: 'Offline rejimda' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    );
  }
}

async function cacheFirstStatic(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res.ok) {
      caches.open(CACHE_SHELL).then(c => c.put(request, res.clone())).catch(() => null);
    }
    return res;
  } catch {
    // SPA fallback — index.html qaytarish
    const fallback = await caches.match('/index.html');
    return fallback ?? new Response('Offline', { status: 503 });
  }
}

// ==========================================
// BACKGROUND SYNC
// ==========================================

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

self.addEventListener('sync', (event: Event) => {
  const se = event as SyncEvent;
  if (se.tag === SYNC_TAG) {
    se.waitUntil(processSyncQueue());
  }
});

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let data: { title?: string; body?: string; url?: string; icon?: string } = {};
  try { data = event.data.json(); } catch { data = { body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Oshxona POS', {
      body:  data.body  || '',
      icon:  data.icon  || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data:  data.url   || '/',
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const focused = clients.find(c => c.url === event.notification.data);
        if (focused) return focused.focus();
        return self.clients.openWindow(event.notification.data || '/');
      }),
  );
});

// ==========================================
// MESSAGE — main thread bilan muloqot
// ==========================================

self.addEventListener('message', (event: MessageEvent) => {
  if (!event.data?.type) return;
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'SYNC_NOW':
      processSyncQueue().catch(() => null);
      break;
  }
});

// ==========================================
// QUEUE PROCESSOR — IDB dan pending itemlarni replay
// ==========================================

interface QueueItem {
  id:         string;
  operation:  string;
  url:        string;
  method:     'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body:       unknown;
  timestamp:  number;
  retryCount: number;
  maxRetries: number;
  status:     'pending' | 'processing' | 'failed' | 'conflict' | 'done';
  lastError?: string;
  deviceId:   string;
}

async function processSyncQueue(): Promise<void> {
  const db = await openIDB();
  if (!db) return;

  const pending = await getPending(db);
  if (!pending.length) {
    await notifyClients({ type: 'SYNC_COMPLETE', synced: 0, errors: 0 });
    return;
  }

  await notifyClients({ type: 'SYNC_STARTED' });

  const token = await getAuthToken(db);
  if (!token) {
    await notifyClients({ type: 'SYNC_ERROR', error: 'Auth token topilmadi' });
    db.close();
    return;
  }

  const BATCH = 20;
  let synced  = 0;
  let errors  = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);

    try {
      const res = await fetch('/api/sync/batch', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          operations: batch.map(item => ({
            queueId:   item.id,
            operation: item.operation,
            url:       item.url,
            method:    item.method,
            body:      item.body,
            deviceId:  item.deviceId,
          })),
        }),
      });

      if (res.status === 401) break;

      if (res.ok) {
        const json = await res.json() as { data?: { results?: Array<{ queueId: string; success: boolean; conflict: boolean; message: string }> } };
        const results = json.data?.results ?? [];

        for (const r of results) {
          if (r.success) {
            await updateIDB(db, r.queueId, { status: 'done', resolvedAt: Date.now() });
            synced++;
          } else if (r.conflict) {
            await updateIDB(db, r.queueId, { status: 'conflict', lastError: r.message });
          } else {
            const item = batch.find(b => b.id === r.queueId);
            if (item) {
              const next = (item.retryCount ?? 0) + 1;
              await updateIDB(db, r.queueId, {
                status:     next >= (item.maxRetries ?? 5) ? 'failed' : 'pending',
                retryCount: next,
                lastError:  r.message,
              });
              errors++;
            }
          }
        }
      } else {
        errors += batch.length;
      }
    } catch {
      errors += batch.length;
    }
  }

  db.close();
  await notifyClients({ type: 'SYNC_COMPLETE', synced, errors });
}

// ==========================================
// IDB HELPERS
// ==========================================

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    const req = indexedDB.open(IDB_NAME);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) { db.close(); resolve(null); return; }
      resolve(db);
    };
    req.onerror  = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function getPending(db: IDBDatabase): Promise<QueueItem[]> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result ?? []) as QueueItem[];
      resolve(
        all
          .filter(i => i.status === 'pending')
          .sort((a, b) => a.timestamp - b.timestamp),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

function updateIDB(db: IDBDatabase, id: string, updates: Partial<QueueItem>): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const get   = store.get(id);
    get.onsuccess = () => {
      if (!get.result) { resolve(); return; }
      const put = store.put({ ...get.result, ...updates });
      put.onsuccess = () => resolve();
      put.onerror   = () => reject(put.error);
    };
    get.onerror = () => reject(get.error);
  });
}

function getAuthToken(db: IDBDatabase): Promise<string | null> {
  return new Promise(resolve => {
    if (!db.objectStoreNames.contains(IDB_META)) { resolve(null); return; }
    const tx  = db.transaction(IDB_META, 'readonly');
    const req = tx.objectStore(IDB_META).get('authToken');
    req.onsuccess = () => resolve((req.result as { value?: string } | undefined)?.value ?? null);
    req.onerror   = () => resolve(null);
  });
}

// ==========================================
// BROADCAST TO CLIENTS
// ==========================================

async function notifyClients(msg: object): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(c => c.postMessage(msg));
}

export {};
