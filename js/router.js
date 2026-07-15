/**
 * ROUTER.JS - Navigation API (moderne)
 * Gestion des routes SPA avec la nouvelle Navigation API du navigateur
 * Fallback History API pour les navigateurs non compatibles
 */

const Router = (() => {

  // ─── Définition des routes ────────────────────────────────────────────────

  const ROUTES = {
    HOME:       '/',
    LIST:       '/list/:id',
    CATEGORIES: '/categories',
    SETTINGS:   '/settings',
    ARCHIVED:   '/archived',
    STATS:      '/stats',
  };

  // ─── État interne ─────────────────────────────────────────────────────────

  let currentRoute = null;
  let currentParams = {};
  let previousRoute = null;

  const handlers = new Map();   // route pattern → handler fn
  const guards   = [];          // middleware avant navigation
  const history  = [];          // historique interne

  let isNavigationAPISupported = false;

  // ─── Initialisation ───────────────────────────────────────────────────────

  function init() {
    isNavigationAPISupported = 'navigation' in window;

    if (isNavigationAPISupported) {
      _initNavigationAPI();
    } else {
      _initHistoryAPI();
    }

    // Route initiale
    _resolve(location.pathname || '/');

    console.info(
      `[Router] Initialisé avec ${isNavigationAPISupported ? 'Navigation API' : 'History API'}`
    );
  }

  // ─── Navigation API (moderne) ─────────────────────────────────────────────

  function _initNavigationAPI() {
    window.navigation.addEventListener('navigate', (event) => {
      // Ignorer navigations externes / téléchargements
      if (!event.canIntercept) return;
      if (event.downloadRequest !== null) return;

      const url = new URL(event.destination.url);

      // Ignorer les navigations vers des domaines externes
      if (url.origin !== location.origin) return;

      event.intercept({
        async handler() {
          await _handleNavigation(url.pathname, event.destination.state || {});
        },
      });
    });

    // Écouter les changements d'état (back/forward)
    window.navigation.addEventListener('navigatesuccess', () => {
      Store.emit('router:navigated', { route: currentRoute, params: currentParams });
    });

    window.navigation.addEventListener('navigateerror', (event) => {
      console.error('[Router] Erreur navigation:', event.error);
      Store.emit('router:error', event.error);
    });
  }

  // ─── History API (fallback) ───────────────────────────────────────────────

  function _initHistoryAPI() {
    window.addEventListener('popstate', (event) => {
      _resolve(location.pathname, event.state || {});
    });
  }

  // ─── Résolution de route ──────────────────────────────────────────────────

  /**
   * Résoudre un chemin vers un handler
   * @param {string} path
   * @param {object} state
   */
  function _resolve(path, state = {}) {
    // Normaliser le chemin
    const normalizedPath = path === '' ? '/' : path;

    for (const [pattern, handler] of handlers) {
      const result = _matchRoute(pattern, normalizedPath);
      if (result.match) {
        previousRoute = currentRoute;
        currentRoute  = pattern;
        currentParams = { ...result.params, ...state };

        history.push({
          pattern,
          path: normalizedPath,
          params: currentParams,
          timestamp: Date.now(),
        });

        // Appliquer guards
        const canNavigate = _runGuards(pattern, currentParams);
        if (!canNavigate) return;

        // Exécuter handler
        handler(currentParams, normalizedPath);
        return;
      }
    }

    // Route 404
    _handle404(normalizedPath);
  }

  /**
   * Matcher de route avec paramètres dynamiques (:id, :name...)
   * @param {string} pattern  ex: '/list/:id'
   * @param {string} path     ex: '/list/abc-123'
   * @returns {{ match: boolean, params: object }}
   */
  function _matchRoute(pattern, path) {
    if (pattern === path) return { match: true, params: {} };

    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts    = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return { match: false, params: {} };
    }

    const params = {};

    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      const sp = pathParts[i];

      if (pp.startsWith(':')) {
        // Paramètre dynamique
        params[pp.slice(1)] = decodeURIComponent(sp);
      } else if (pp !== sp) {
        return { match: false, params: {} };
      }
    }

    return { match: true, params };
  }

  async function _handleNavigation(path, state) {
    _resolve(path, state);
  }

  function _handle404(path) {
    console.warn(`[Router] Route non trouvée: ${path}`);
    // Rediriger vers home
    navigate('/');
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  function addGuard(guardFn) {
    guards.push(guardFn);
    return () => {
      const idx = guards.indexOf(guardFn);
      if (idx > -1) guards.splice(idx, 1);
    };
  }

  function _runGuards(route, params) {
    return guards.every(guard => {
      try {
        return guard(route, params) !== false;
      } catch (e) {
        console.error('[Router] Erreur guard:', e);
        return true;
      }
    });
  }

  // ─── Enregistrement de routes ─────────────────────────────────────────────

  /**
   * Enregistrer une route
   * @param {string} pattern  - ex: '/', '/list/:id'
   * @param {Function} handler - (params, path) => void
   */
  function on(pattern, handler) {
    handlers.set(pattern, handler);
    return Router; // Chainable
  }

  // ─── Navigation programmatique ────────────────────────────────────────────

  /**
   * Naviguer vers une route
   * @param {string} path
   * @param {object} state
   * @param {object} options
   */
  async function navigate(path, state = {}, options = {}) {
    const { replace = false, animate = true } = options;

    if (animate) {
      document.documentElement.setAttribute('data-navigating', 'true');
    }

    if (isNavigationAPISupported) {
      try {
        const navOptions = { state };
        if (replace) {
          await window.navigation.navigate(path, { ...navOptions, history: 'replace' }).finished;
        } else {
          await window.navigation.navigate(path, navOptions).finished;
        }
      } catch (e) {
        // Navigation annulée ou erreur — fallback
        _fallbackNavigate(path, state, replace);
      }
    } else {
      _fallbackNavigate(path, state, replace);
    }

    if (animate) {
      setTimeout(() => {
        document.documentElement.removeAttribute('data-navigating');
      }, 300);
    }
  }

  function _fallbackNavigate(path, state, replace) {
    if (replace) {
      window.history.replaceState(state, '', path);
    } else {
      window.history.pushState(state, '', path);
    }
    _resolve(path, state);
  }

  /**
   * Retour arrière
   */
  function back() {
    if (isNavigationAPISupported && window.navigation.canGoBack) {
      window.navigation.back();
    } else {
      window.history.back();
    }
  }

  /**
   * Construire une URL avec paramètres
   * @param {string} pattern  ex: '/list/:id'
   * @param {object} params   ex: { id: 'abc-123' }
   */
  function buildPath(pattern, params = {}) {
    let path = pattern;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, encodeURIComponent(value));
    });
    return path;
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  function getCurrentRoute() {
    return { route: currentRoute, params: currentParams };
  }

  function getPreviousRoute() {
    return previousRoute;
  }

  function getHistory() {
    return [...history];
  }

  function isActive(pattern) {
    return currentRoute === pattern;
  }

  function isNavigationAPIAvailable() {
    return isNavigationAPISupported;
  }

  // ─── Helpers de navigation rapide ────────────────────────────────────────

  function goHome()              { navigate('/'); }
  function goToList(id)          { navigate(buildPath('/list/:id', { id })); }
  function goToCategories()      { navigate('/categories'); }
  function goToSettings()        { navigate('/settings'); }
  function goToArchived()        { navigate('/archived'); }
  function goToStats()           { navigate('/stats'); }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    ROUTES,
    init,
    on,
    navigate,
    back,
    buildPath,
    addGuard,
    getCurrentRoute,
    getPreviousRoute,
    getHistory,
    isActive,
    isNavigationAPIAvailable,

    // Helpers rapides
    goHome,
    goToList,
    goToCategories,
    goToSettings,
    goToArchived,
    goToStats,
  };
})();

window.Router = Router;