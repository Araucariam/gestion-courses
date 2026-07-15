/**
 * SW.JS - Service Worker corrigé pour GitHub Pages
 * Gestion du sous-chemin automatique
 */

const SW_VERSION    = 'v2.0.0';

// ── Détecter le scope automatiquement ────────────────────────
// Sur GitHub Pages : /gestion-courses/
// Sur Netlify/Vercel : /
const SCOPE = self.registration.scope;
const BASE  = new URL(SCOPE).pathname; // ex: '/gestion-courses/' ou '/'

const CACHE_STATIC  = `gc-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `gc-dynamic-${SW_VERSION}`;
const CACHE_IMAGES  = `gc-images-${SW_VERSION}`;

// ── Assets à précacher (chemins relatifs) ─────────────────────
const STATIC_ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}css/main.css`,
  `${BASE}css/sidebar.css`,
  `${BASE}css/modals.css`,
  `${BASE}css/cards.css`,
  `${BASE}css/animations.css`,
  `${BASE}css/voice.css`,
  `${BASE}css/templates.css`,
  `${BASE}css/themes.css`,
  `${BASE}js/utils.js`,
  `${BASE}js/store.js`,
  `${BASE}js/router.js`,
  `${BASE}js/notifications.js`,
  `${BASE}js/modals.js`,
  `${BASE}js/sidebar.js`,
  `${BASE}js/categories.js`,
  `${BASE}js/lists.js`,
  `${BASE}js/products.js`,
  `${BASE}js/importExport.js`,
  `${BASE}js/ui.js`,
  `${BASE}js/voice.js`,
  `${BASE}js/templates.js`,
  `${BASE}js/themes.js`,
  `${BASE}js/gestures.js`,
  `${BASE}js/app.js`,
  `${BASE}data/defaultCategories.js`,
  `${BASE}manifest.json`,
];

// ─── Install ──────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.info(`[SW] Installation ${SW_VERSION} — BASE: ${BASE}`);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_STATIC);

      await Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] Précache échoué: ${url}`, err.message);
          })
        )
      );

      await self.skipWaiting();
      console.info('[SW] Assets précachés — scope:', SCOPE);
    })()
  );
});

// ─── Activate ─────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.info(`[SW] Activation ${SW_VERSION}`);

  event.waitUntil(
    (async () => {
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

      await self.clients.claim();
      console.info('[SW] Actif et en contrôle');
    })()
  );
});

// ─── Fetch ────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url         = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.protocol === 'moz-extension:') return;

  // Images Unsplash
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(_cacheFirstWithExpiry(request, CACHE_IMAGES, 7));
    return;
  }

  // Fonts Google
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(_cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Assets statiques locaux
  if (_isStaticAsset(url)) {
    event.respondWith(_cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Pages HTML
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(_networkFirst(request, CACHE_DYNAMIC));
    return;
  }

  // Autres
  event.respondWith(_staleWhileRevalidate(request, CACHE_DYNAMIC));
});

// ─── Stratégies ───────────────────────────────────────────────

async function _cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (_isValid(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return _fallback(request);
  }
}

async function _networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, {
      signal: _timeout(5000),
    });
    if (_isValid(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback → index.html du bon chemin
    const indexUrl = `${BASE}index.html`;
    const cachedIndex = await caches.match(indexUrl);
    if (cachedIndex) return cachedIndex;

    return _fallback(request);
  }
}

async function _staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(async (response) => {
    if (_isValid(response)) await cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || _fallback(request);
}

async function _cacheFirstWithExpiry(request, cacheName, maxAgeDays) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const date = cached.headers.get('date');
    if (date) {
      const age = (Date.now() - new Date(date).getTime()) / 86400000;
      if (age < maxAgeDays) return cached;
    } else {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (_isValid(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return cached || _fallback(request);
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function _isStaticAsset(url) {
  return (
    url.origin === self.location.origin && (
      url.pathname.includes('/css/') ||
      url.pathname.includes('/js/')  ||
      url.pathname.includes('/data/')||
      url.pathname.includes('/assets/') ||
      url.pathname.endsWith('.js')   ||
      url.pathname.endsWith('.css')  ||
      url.pathname.endsWith('.png')  ||
      url.pathname.endsWith('.svg')  ||
      url.pathname.endsWith('.ico')  ||
      url.pathname.endsWith('.woff2')||
      url.pathname.endsWith('manifest.json')
    )
  );
}

function _isValid(response) {
  return response && response.status === 200 && response.type !== 'error';
}

function _timeout(ms) {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

function _fallback(request) {
  const url = new URL(request.url);

  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Hors ligne</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;
      justify-content:center;min-height:100dvh;margin:0;
      background:oklch(98% 0.005 250);color:oklch(18% 0.02 250)}
    .wrap{text-align:center;padding:2rem;max-width:320px}
    .icon{font-size:64px;margin-bottom:1rem}
    h1{font-size:1.4rem;margin:0 0 .5rem}
    p{color:oklch(52% 0.012 250);font-size:.9rem;line-height:1.6}
    button{margin-top:1.5rem;padding:.75rem 1.5rem;
      background:oklch(55% 0.22 250);color:white;border:none;
      border-radius:12px;font-size:.9rem;font-weight:600;cursor:pointer}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">📶</div>
    <h1>Vous êtes hors-ligne</h1>
    <p>Vérifiez votre connexion internet.<br>
       Vos données locales restent disponibles.</p>
    <button onclick="location.reload()">Réessayer</button>
  </div>
</body>
</html>`, {
      status : 200,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
    });
  }

  if (url.hostname === 'images.unsplash.com') {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg"
        width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#e8eaf6"/>
        <text x="200" y="160" text-anchor="middle"
          font-size="64" opacity=".4">🖼️</text>
      </svg>`,
      { status: 200, headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }

  return new Response('', { status: 503 });
}

// ─── Messages ─────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then(names => Promise.all(names.map(n => caches.delete(n))))
          .then(() => event.ports[0]?.postMessage({ success: true }))
      );
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: SW_VERSION, base: BASE });
      break;

    default:
      break;
  }
});

console.info(`[SW] ${SW_VERSION} chargé — scope: ${SCOPE}`);