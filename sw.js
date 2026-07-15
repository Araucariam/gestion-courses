/**
 * SW.JS - Service Worker
 * Stratégies : Cache First (assets), Network First (API),
 * Stale-While-Revalidate (pages), Background Sync
 */

const SW_VERSION    = 'v1.0.0';
const CACHE_STATIC  = `gc-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `gc-dynamic-${SW_VERSION}`;
const CACHE_IMAGES  = `gc-images-${SW_VERSION}`;

// ─── Assets à précacher ───────────────────────────────────────

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/sidebar.css',
  './css/modals.css',
  './css/cards.css',
  './css/animations.css',
  './js/utils.js',
  './js/store.js',
  './js/router.js',
  './js/notifications.js',
  './js/modals.js',
  './js/sidebar.js',
  './js/categories.js',
  './js/lists.js',
  './js/products.js',
  './js/importExport.js',
  './js/ui.js',
  './js/app.js',
  './data/defaultCategories.js',
  './manifest.json',
];

// Domaines externes à mettre en cache
const CACHEABLE_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://images.unsplash.com',
];

// ─── Install ──────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.info(`[SW] Installation ${SW_VERSION}`);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);

      // Précacher les assets critiques
      await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] Précache échoué: ${url}`, err.message);
          })
        )
      );

      // Activer immédiatement (skip waiting)
      await self.skipWaiting();
      console.info('[SW] Assets précachés');
    })()
  );
});

// ─── Activate ─────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.info(`[SW] Activation ${SW_VERSION}`);

  event.waitUntil(
    (async () => {
      // Supprimer les anciens caches
      const cacheNames  = await caches.keys();
      const validCaches = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES];

      await Promise.all(
        cacheNames
          .filter(name => !validCaches.includes(name))
          .map(name => {
            console.info(`[SW] Suppression ancien cache: ${name}`);
            return caches.delete(name);
          })
      );

      // Prendre le contrôle immédiatement
      await self.clients.claim();
      console.info('[SW] Actif et en contrôle');
    })()
  );
});

// ─── Fetch ────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url         = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les extensions browser
  if (url.protocol === 'chrome-extension:') return;
  if (url.protocol === 'moz-extension:') return;

  // ── Images Unsplash → Cache First avec expiration
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(_cacheFirstWithExpiry(request, CACHE_IMAGES, 7));
    return;
  }

  // ── Fonts Google → Cache First longue durée
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(_cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Assets statiques locaux → Cache First
  if (_isStaticAsset(url)) {
    event.respondWith(_cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ── Pages HTML → Network First avec fallback cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(_networkFirst(request, CACHE_DYNAMIC));
    return;
  }

  // ── Autres → Stale While Revalidate
  event.respondWith(_staleWhileRevalidate(request, CACHE_DYNAMIC));
});

// ─── Stratégies de cache ──────────────────────────────────────

/**
 * Cache First : cherche d'abord dans le cache, puis réseau
 */
async function _cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (_isValidResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return _offlineFallback(request);
  }
}

/**
 * Network First : essaie le réseau, fallback cache
 */
async function _networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, { signal: _timeoutSignal(5000) });
    if (_isValidResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback page HTML
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;

    return _offlineFallback(request);
  }
}

/**
 * Stale While Revalidate : retourne cache immédiatement,
 * met à jour en arrière-plan
 */
async function _staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(async (response) => {
    if (_isValidResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || _offlineFallback(request);
}

/**
 * Cache First avec expiration (N jours)
 */
async function _cacheFirstWithExpiry(request, cacheName, maxAgeDays = 7) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age      = (Date.now() - new Date(dateHeader).getTime()) / 1000 / 86400;
      if (age < maxAgeDays) return cached;
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (_isValidResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (cached) return cached;
    return _offlineFallback(request);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function _isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (
      url.pathname.startsWith('/css/') ||
      url.pathname.startsWith('/js/') ||
      url.pathname.startsWith('/data/') ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname === '/manifest.json'
    )
  );
}

function _isValidResponse(response) {
  return (
    response &&
    response.status === 200 &&
    response.type !== 'error'
  );
}

function _timeoutSignal(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function _offlineFallback(request) {
  const url = new URL(request.url);

  // Page HTML offline
  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hors ligne — Gestion de Courses</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100dvh;
            margin: 0;
            background: oklch(98% 0.005 250);
            color: oklch(18% 0.02 250);
          }
          .offline {
            text-align: center;
            padding: 2rem;
            max-width: 320px;
          }
          .offline__icon {
            font-size: 64px;
            margin-bottom: 1rem;
          }
          h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
          p { color: oklch(52% 0.012 250); font-size: 0.9rem; }
          button {
            margin-top: 1.5rem;
            padding: 0.75rem 1.5rem;
            background: oklch(55% 0.22 250);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="offline">
          <div class="offline__icon">📶</div>
          <h1>Vous êtes hors-ligne</h1>
          <p>Vérifiez votre connexion. Vos données locales restent disponibles.</p>
          <button onclick="location.reload()">Réessayer</button>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // Image placeholder
  if (url.hostname === 'images.unsplash.com') {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#e8eaf6"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em"
          fill="#9fa8da" font-size="48">📷</text>
      </svg>`,
      {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    );
  }

  return new Response('', { status: 503 });
}

// ─── Background Sync ──────────────────────────────────────────

self.addEventListener('sync', (event) => {
  console.info('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(_syncData());
  }
});

async function _syncData() {
  // Placeholder pour future synchronisation serveur
  console.info('[SW] Synchronisation des données...');
}

// ─── Push Notifications ───────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Gestion de Courses', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Gestion de Courses', {
      body   : data.body || '',
      icon   : './assets/icons/icon-192.png',
      badge  : './assets/icons/badge-72.png',
      tag    : data.tag || 'gc-notification',
      data   : data.data || {},
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si fenêtre ouverte → focus
        const existingWindow = windowClients.find(
          c => new URL(c.url).origin === self.location.origin
        );

        if (existingWindow) {
          existingWindow.focus();
          existingWindow.navigate(url);
        } else {
          clients.openWindow(url);
        }
      })
  );
});

// ─── Message handler ──────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then(names =>
          Promise.all(names.map(name => caches.delete(name)))
        ).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: SW_VERSION });
      break;

    case 'CACHE_URLS':
      if (Array.isArray(payload?.urls)) {
        event.waitUntil(
          caches.open(CACHE_DYNAMIC).then(cache =>
            cache.addAll(payload.urls)
          )
        );
      }
      break;

    default:
      break;
  }
});

console.info(`[SW] Service Worker ${SW_VERSION} chargé`);