// ==========================================
// SERVICE WORKER — POS Offline Sync
// Background Sync API orqali queue ni qayta ishlash
// ==========================================

const SW_VERSION = '1.0.0';
const SYNC_TAG = 'pos-sync';
const CACHE_NAME = `pos-static-v${SW_VERSION}`;

// Offline cache qiladigan URL lar
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// ==========================================
// INSTALL
// ==========================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ==========================================
// ACTIVATE
// ==========================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// FETCH — API so'rovlarini ushlab olish
// ==========================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // /api/* so'rovlari — network first, offline bo'lsa xato
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, offline: true, message: 'Offline rejimda' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Static fayllar — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// ==========================================
// BACKGROUND SYNC
// ==========================================

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processSyncQueue());
  }
});

// ==========================================
// PUSH NOTIFICATION (kelajak uchun)
// ==========================================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'POS', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// ==========================================
// MESSAGE — main thread bilan muloqot
// ==========================================

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_NOW') {
    event.waitUntil(processSyncQueue());
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==========================================
// QUEUE PROCESSOR (SW context)
// ==========================================

async function processSyncQueue() {
  try {
    // Main thread ga xabar — sync boshlandi
    notifyClients({ type: 'SYNC_STARTED' });

    const db = await openDB();
    const pending = await getPendingItems(db);

    if (pending.length === 0) {
      notifyClients({ type: 'SYNC_COMPLETE', synced: 0 });
      return;
    }

    // Batch boyicha yuboring
    const BATCH_SIZE = 20;
    let totalSynced = 0;
    let totalErrors = 0;

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);

      try {
        const token = await getAuthToken();
        if (!token) break;

        const response = await fetch('/api/sync/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            operations: batch.map(item => ({
              queueId: item.id,
              operation: item.operation,
              url: item.url,
              method: item.method,
              body: item.body,
              deviceId: item.deviceId,
            })),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const results = result.data?.results || [];

          for (const r of results) {
            if (r.success) {
              await markItemDone(db, r.queueId);
              totalSynced++;
            } else if (r.conflict) {
              await markItemConflict(db, r.queueId, r.message);
            } else {
              const item = batch.find(b => b.id === r.queueId);
              if (item) {
                await markItemFailed(db, r.queueId, r.message, item.retryCount + 1);
                totalErrors++;
              }
            }
          }
        } else if (response.status === 401) {
          // Token muddati tugagan — to'xtatamiz
          break;
        }
      } catch {
        totalErrors += batch.length;
      }
    }

    db.close();

    notifyClients({ type: 'SYNC_COMPLETE', synced: totalSynced, errors: totalErrors });
  } catch (err) {
    notifyClients({ type: 'SYNC_ERROR', error: String(err) });
  }
}

// ==========================================
// IDB HELPERS (SW context — simplified)
// ==========================================

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pos-offline-db', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingItems(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const store = tx.objectStore('queue');
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(
        all
          .filter(i => i.status === 'pending' || i.status === 'failed')
          .sort((a, b) => a.timestamp - b.timestamp)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

function updateItem(db, id, updates) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (!getReq.result) { resolve(); return; }
      const putReq = store.put({ ...getReq.result, ...updates });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

function markItemDone(db, id) {
  return updateItem(db, id, { status: 'done', resolvedAt: Date.now() });
}

function markItemFailed(db, id, error, retryCount) {
  return updateItem(db, id, {
    status: retryCount >= 5 ? 'failed' : 'pending',
    lastError: error,
    retryCount,
  });
}

function markItemConflict(db, id, error) {
  return updateItem(db, id, { status: 'conflict', lastError: error });
}

// Auth token ni localStorage dan olish (SW context da indexedDB dan)
async function getAuthToken() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('meta', 'readonly');
      const store = tx.objectStore('meta');
      const req = store.get('authToken');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ==========================================
// NOTIFY CLIENTS
// ==========================================

async function notifyClients(message) {
  const allClients = await clients.matchAll({ type: 'window' });
  allClients.forEach(client => client.postMessage(message));
}
