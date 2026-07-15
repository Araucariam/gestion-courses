/**
 * SIDEBAR.JS - Sidebar hamburger avec navigation
 * Features : animation fluide, overlay, swipe gesture,
 *            navigation active, stats globales, thème
 */

const Sidebar = (() => {

  // ─── État ─────────────────────────────────────────────────────────────────

  let isOpen      = false;
  let sidebarEl   = null;
  let overlayEl   = null;
  let toggleBtn   = null;
  let startX      = 0;
  let isDragging  = false;

  const NAV_ITEMS = [
    {
      id    : 'home',
      label : 'Mes listes',
      icon  : 'shopping_cart',
      route : '/',
      badge : null,
    },
    {
      id    : 'archived',
      label : 'Archivées',
      icon  : 'archive',
      route : '/archived',
      badge : null,
    },
    {
      id    : 'stats',
      label : 'Statistiques',
      icon  : 'bar_chart',
      route : '/stats',
      badge : null,
    },
    {
      id    : 'categories',
      label : 'Catégories',
      icon  : 'category',
      route : '/categories',
      badge : null,
    },
    {
      id    : 'settings',
      label : 'Paramètres',
      icon  : 'settings',
      route : '/settings',
      badge : null,
    },
  ];

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _buildDOM();
    _bindEvents();
    _initSwipeGesture();
    _updateStats();

    // Réagir aux changements de route
    Store.subscribe('router:navigated', ({ route }) => {
      _updateActiveNav(route);
    });

    // Réagir aux changements de données
    Store.subscribe('list:created',  _updateStats);
    Store.subscribe('list:deleted',  _updateStats);
    Store.subscribe('list:updated',  _updateStats);
    Store.subscribe('data:imported', _updateStats);

    // Réagir aux settings (thème)
    Store.subscribe('settings:updated', (settings) => {
      _applyTheme(settings.theme);
    });

    console.info('[Sidebar] Initialisé');
  }

  // ─── Construction DOM ─────────────────────────────────────────────────────

  function _buildDOM() {
    // ── Overlay ──────────────────────────────────────────────────────────────
    overlayEl = document.createElement('div');
    overlayEl.id        = 'sidebar-overlay';
    overlayEl.className = 'sidebar-overlay';
    overlayEl.addEventListener('click', close);
    document.body.appendChild(overlayEl);

    // ── Sidebar ───────────────────────────────────────────────────────────────
    sidebarEl = document.createElement('aside');
    sidebarEl.id            = 'sidebar';
    sidebarEl.className     = 'sidebar';
    sidebarEl.setAttribute('aria-label', 'Navigation principale');
    sidebarEl.setAttribute('aria-hidden', 'true');

    sidebarEl.innerHTML = `

      <!-- En-tête sidebar -->
      <div class="sidebar__header">
        <div class="sidebar__brand">
          <div class="sidebar__brand-icon">
            <span class="material-symbols-rounded">shopping_basket</span>
          </div>
          <div class="sidebar__brand-text">
            <span class="sidebar__brand-name">Courses</span>
            <span class="sidebar__brand-tagline">Gestion intelligente</span>
          </div>
        </div>
        <button class="sidebar__close" id="sidebar-close" aria-label="Fermer le menu">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>

      <!-- Stats globales -->
      <div class="sidebar__stats" id="sidebar-stats">
        <div class="sidebar__stat">
          <span class="sidebar__stat-value" id="stat-lists">0</span>
          <span class="sidebar__stat-label">Listes</span>
        </div>
        <div class="sidebar__stat-divider"></div>
        <div class="sidebar__stat">
          <span class="sidebar__stat-value" id="stat-products">0</span>
          <span class="sidebar__stat-label">Produits</span>
        </div>
        <div class="sidebar__stat-divider"></div>
        <div class="sidebar__stat">
          <span class="sidebar__stat-value" id="stat-total">0 €</span>
          <span class="sidebar__stat-label">Total</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar__nav" role="navigation">
        <ul class="sidebar__nav-list" id="sidebar-nav-list">
        </ul>
      </nav>

      <!-- Actions rapides -->
      <div class="sidebar__quick-actions">
        <p class="sidebar__section-title">Actions rapides</p>
        <button class="sidebar__quick-btn" id="quick-new-list">
          <span class="material-symbols-rounded">add_shopping_cart</span>
          <span>Nouvelle liste</span>
        </button>
        <button class="sidebar__quick-btn" id="quick-import">
          <span class="material-symbols-rounded">file_upload</span>
          <span>Importer</span>
        </button>
        <button class="sidebar__quick-btn" id="quick-export">
          <span class="material-symbols-rounded">file_download</span>
          <span>Exporter tout</span>
        </button>
      </div>

      <!-- Pied de sidebar -->
      <div class="sidebar__footer">
        <button class="sidebar__theme-toggle" id="theme-toggle" aria-label="Changer le thème">
          <span class="material-symbols-rounded" id="theme-icon">dark_mode</span>
          <span id="theme-label">Mode sombre</span>
          <div class="sidebar__theme-switch">
            <div class="sidebar__theme-thumb"></div>
          </div>
        </button>
        <p class="sidebar__version">v1.0.0</p>
      </div>
    `;

    document.body.appendChild(sidebarEl);

    // Construire les items de navigation
    _buildNavItems();
  }

  function _buildNavItems() {
    const navList = document.getElementById('sidebar-nav-list');
    if (!navList) return;

    navList.innerHTML = '';

    NAV_ITEMS.forEach(item => {
      const li = document.createElement('li');
      li.className = 'sidebar__nav-item';

      const btn = document.createElement('button');
      btn.className        = 'sidebar__nav-btn';
      btn.id               = `nav-${item.id}`;
      btn.setAttribute('data-route', item.route);
      btn.setAttribute('aria-label', item.label);

      btn.innerHTML = `
        <span class="sidebar__nav-icon material-symbols-rounded">${item.icon}</span>
        <span class="sidebar__nav-label">${item.label}</span>
        ${item.badge
          ? `<span class="sidebar__nav-badge" id="badge-${item.id}">${item.badge}</span>`
          : `<span class="sidebar__nav-badge sidebar__nav-badge--hidden" id="badge-${item.id}"></span>`
        }
        <span class="sidebar__nav-arrow material-symbols-rounded">chevron_right</span>
      `;

      btn.addEventListener('click', () => {
        Router.navigate(item.route);
        close();
      });

      li.appendChild(btn);
      navList.appendChild(li);
    });

    // Marquer la route active
    const { route } = Router.getCurrentRoute();
    _updateActiveNav(route);
  }

  // ─── Événements ───────────────────────────────────────────────────────────

  function _bindEvents() {
    // Bouton toggle hamburger (injecté dans le header de l'app)
    toggleBtn = document.getElementById('hamburger-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // Fermer sidebar
    const closeBtn = document.getElementById('sidebar-close');
    closeBtn?.addEventListener('click', close);

    // Actions rapides
    document.getElementById('quick-new-list')?.addEventListener('click', () => {
      close();
      setTimeout(() => {
        Modals.openListForm(null, (data) => {
          const list = Store.createList(data);
          Notifications.success(`Liste "${list.name}" créée !`);
          Router.goToList(list.id);
        });
      }, 300);
    });

    document.getElementById('quick-import')?.addEventListener('click', () => {
      close();
      setTimeout(() => ImportExport.openImportDialog(), 300);
    });

    document.getElementById('quick-export')?.addEventListener('click', () => {
      close();
      ImportExport.exportAll();
    });

    // Toggle thème
    document.getElementById('theme-toggle')?.addEventListener('click', _toggleTheme);
  }

  // ─── Swipe gesture ────────────────────────────────────────────────────────

  function _initSwipeGesture() {
    // Ouvrir depuis le bord gauche
    document.addEventListener('touchstart', (e) => {
      startX    = e.touches[0].clientX;
      isDragging = false;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (isOpen) return;
      const dx = e.touches[0].clientX - startX;
      if (startX < 20 && dx > 0) {
        isDragging = true;
        const progress = Math.min(dx / 280, 1);
        sidebarEl.style.transform = `translateX(${-280 + dx}px)`;
        overlayEl.style.opacity   = (progress * 0.5).toString();
        overlayEl.style.display   = 'block';
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      const dx = e.changedTouches[0].clientX - startX;
      sidebarEl.style.transform = '';
      sidebarEl.style.transition = '';

      if (dx > 100) {
        open();
      } else {
        overlayEl.style.opacity = '';
        overlayEl.style.display = '';
      }
      isDragging = false;
    }, { passive: true });

    // Swipe pour fermer
    sidebarEl.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    sidebarEl.addEventListener('touchmove', (e) => {
      if (!isOpen) return;
      const dx = e.touches[0].clientX - startX;
      if (dx < 0) {
        const translate = Math.max(dx, -280);
        sidebarEl.style.transition = 'none';
        sidebarEl.style.transform  = `translateX(${translate}px)`;
        overlayEl.style.opacity    = (0.5 + (dx / 280) * 0.5).toString();
      }
    }, { passive: true });

    sidebarEl.addEventListener('touchend', (e) => {
      if (!isOpen) return;
      const dx = e.changedTouches[0].clientX - startX;
      sidebarEl.style.transition = '';

      if (dx < -100) {
        close();
      } else {
        sidebarEl.style.transform = '';
        overlayEl.style.opacity   = '';
      }
    }, { passive: true });
  }

  // ─── Open / Close / Toggle ────────────────────────────────────────────────

  function open() {
    isOpen = true;
    sidebarEl.classList.add('sidebar--open');
    sidebarEl.setAttribute('aria-hidden', 'false');
    overlayEl.classList.add('sidebar-overlay--visible');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    toggleBtn?.classList.add('hamburger--active');

    // Focus premier élément
    setTimeout(() => {
      sidebarEl.querySelector('.sidebar__close')?.focus();
    }, 350);

    document.addEventListener('keydown', _handleKeydown);
    Store.emit('sidebar:opened');
  }

  function close() {
    isOpen = false;
    sidebarEl.classList.remove('sidebar--open');
    sidebarEl.setAttribute('aria-hidden', 'true');
    overlayEl.classList.remove('sidebar-overlay--visible');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    toggleBtn?.classList.remove('hamburger--active');

    // Reset styles swipe
    sidebarEl.style.transform = '';
    overlayEl.style.opacity   = '';
    overlayEl.style.display   = '';

    document.removeEventListener('keydown', _handleKeydown);
    toggleBtn?.focus();
    Store.emit('sidebar:closed');
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function _handleKeydown(e) {
    if (e.key === 'Escape') close();
  }

  // ─── Navigation active ────────────────────────────────────────────────────

  function _updateActiveNav(route) {
    NAV_ITEMS.forEach(item => {
      const btn = document.getElementById(`nav-${item.id}`);
      if (!btn) return;

      const isActive = item.route === route ||
        (item.route === '/' && (!route || route === '/'));

      btn.classList.toggle('sidebar__nav-btn--active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  function _updateStats() {
    const stats = Store.getGlobalStats();
    const settings = Store.getSettings();

    const listsEl    = document.getElementById('stat-lists');
    const productsEl = document.getElementById('stat-products');
    const totalEl    = document.getElementById('stat-total');

    if (listsEl)    listsEl.textContent    = stats.listCount;
    if (productsEl) productsEl.textContent = stats.totalProducts;
    if (totalEl)    totalEl.textContent    = Utils.formatCurrency(
      stats.globalTotal, settings.currencySymbol
    );

    // Mettre à jour badge archivées
    const archivedBadge = document.getElementById('badge-archived');
    if (archivedBadge && stats.archivedCount > 0) {
      archivedBadge.textContent = stats.archivedCount;
      archivedBadge.classList.remove('sidebar__nav-badge--hidden');
    } else if (archivedBadge) {
      archivedBadge.classList.add('sidebar__nav-badge--hidden');
    }
  }

  // ─── Thème ────────────────────────────────────────────────────────────────

  function _toggleTheme() {
    const settings    = Store.getSettings();
    const isDark      = settings.theme === 'dark';
    const newTheme    = isDark ? 'light' : 'dark';

    Store.updateSettings({ theme: newTheme });
    _applyTheme(newTheme);
  }

  function _applyTheme(theme) {
    const root      = document.documentElement;
    const icon      = document.getElementById('theme-icon');
    const label     = document.getElementById('theme-label');
    const toggle    = document.getElementById('theme-toggle');

    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      if (icon)   icon.textContent  = 'light_mode';
      if (label)  label.textContent = 'Mode clair';
      if (toggle) toggle.classList.add('sidebar__theme-toggle--active');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', 'light');
      if (icon)   icon.textContent  = 'dark_mode';
      if (label)  label.textContent = 'Mode sombre';
      if (toggle) toggle.classList.remove('sidebar__theme-toggle--active');
    }
  }

  // ─── Mise à jour badge ────────────────────────────────────────────────────

  function updateBadge(itemId, count) {
    const badge = document.getElementById(`badge-${itemId}`);
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('sidebar__nav-badge--hidden');
    } else {
      badge.classList.add('sidebar__nav-badge--hidden');
    }
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    open,
    close,
    toggle,
    updateBadge,
    updateStats: _updateStats,
    applyTheme : _applyTheme,
    get isOpen() { return isOpen; },
  };
})();

window.Sidebar = Sidebar;