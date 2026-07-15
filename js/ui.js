/**
 * UI.JS - Interface utilisateur globale
 * Features : shell de l'app, topbar, page stats,
 *            page settings, skeleton loaders, transitions de page,
 *            gestion thème, PWA install prompt
 */

const UI = (() => {

  // ─── État ─────────────────────────────────────────────────────────────────

  let deferredInstallPrompt = null;
  let isTransitioning       = false;
  let currentPageCleanup    = null;

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _buildShell();
    _initTheme();
    _initPWAInstall();
    _initNetworkStatus();
    _initScrollBehavior();

    console.info('[UI] Initialisé');
  }

  // ─── Shell de l'application ───────────────────────────────────────────────

  function _buildShell() {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `

      <!-- Topbar -->
      <header class="topbar" id="app-topbar" role="banner">
        <div class="topbar__left">
          <button
            class="hamburger"
            id="hamburger-btn"
            aria-label="Ouvrir le menu"
            aria-expanded="false"
            aria-controls="sidebar"
          >
            <span class="hamburger__line"></span>
            <span class="hamburger__line"></span>
            <span class="hamburger__line"></span>
          </button>
        </div>

        <div class="topbar__center">
          <span class="topbar__logo material-symbols-rounded">shopping_basket</span>
          <span class="topbar__title" id="topbar-title">Mes Courses</span>
        </div>

        <div class="topbar__right" id="topbar-actions">
          <!-- Actions dynamiques selon la route -->
        </div>
      </header>

      <!-- Contenu principal -->
      <main class="app-main" id="app-main" role="main" tabindex="-1">
        <!-- Rendu dynamique par le router -->
        ${_buildSkeletonHTML()}
      </main>

      <!-- FAB zone -->
      <div class="fab-zone" id="fab-zone" aria-live="polite"></div>

      <!-- Install PWA banner -->
      <div class="pwa-banner" id="pwa-banner" style="display:none" role="complementary">
        <div class="pwa-banner__content">
          <span class="material-symbols-rounded pwa-banner__icon">install_mobile</span>
          <div class="pwa-banner__text">
            <strong>Installer l'application</strong>
            <span>Accès rapide depuis l'écran d'accueil</span>
          </div>
        </div>
        <div class="pwa-banner__actions">
          <button class="btn btn--ghost btn--sm" id="pwa-dismiss">Plus tard</button>
          <button class="btn btn--primary btn--sm" id="pwa-install">Installer</button>
        </div>
      </div>

      <!-- Indicateur réseau -->
      <div class="network-status" id="network-status" aria-live="polite"></div>
    `;
  }

  // ─── Topbar ───────────────────────────────────────────────────────────────

  /**
   * Mettre à jour le titre de la topbar
   * @param {string} title
   * @param {boolean} showBack
   */
  function setTopbarTitle(title, showBack = false) {
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = title;
  }

  /**
   * Définir les actions de la topbar selon la route
   * @param {Array} actions - [{icon, label, onClick, id}]
   */
  function setTopbarActions(actions = []) {
    const container = document.getElementById('topbar-actions');
    if (!container) return;

    container.innerHTML = actions.map(action => `
      <button
        class="icon-btn topbar__action-btn"
        id="${action.id || ''}"
        aria-label="${action.label}"
        title="${action.label}"
      >
        <span class="material-symbols-rounded">${action.icon}</span>
        ${action.badge
          ? `<span class="topbar__badge">${action.badge}</span>`
          : ''}
      </button>
    `).join('');

    actions.forEach(action => {
      if (action.id) {
        document.getElementById(action.id)
          ?.addEventListener('click', action.onClick);
      }
    });
  }

  // ─── Transitions de page ──────────────────────────────────────────────────

  /**
   * Transition animée entre pages
   * @param {Function} renderFn - Fonction de rendu de la nouvelle page
   * @param {string} direction  - 'forward' | 'back' | 'fade'
   */
  async function navigateTo(renderFn, direction = 'forward') {
    if (isTransitioning) return;
    isTransitioning = true;

    const main = document.getElementById('app-main');
    if (!main) { isTransitioning = false; return; }

    // Cleanup page courante
    if (currentPageCleanup) {
      currentPageCleanup();
      currentPageCleanup = null;
    }

    // Animation sortie
    main.classList.add(`page-exit--${direction}`);

    await new Promise(resolve => setTimeout(resolve, 200));

    // Vider et rendre
    main.innerHTML = '';
    main.classList.remove(`page-exit--${direction}`);
    main.classList.add(`page-enter--${direction}`);

    // Remettre en haut
    main.scrollTop = 0;

    // Render
    renderFn();

    await new Promise(resolve => setTimeout(resolve, 50));
    main.classList.remove(`page-enter--${direction}`);

    isTransitioning = false;
  }

  /**
   * Enregistrer le cleanup de la page courante
   * @param {Function} fn
   */
  function setPageCleanup(fn) {
    currentPageCleanup = fn;
  }

  // ─── Skeleton Loaders ─────────────────────────────────────────────────────

  function _buildSkeletonHTML() {
    return `
      <div class="skeleton-page" aria-hidden="true">
        <div class="skeleton-header">
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--subtitle"></div>
        </div>
        <div class="skeleton-cards">
          ${Array(3).fill(0).map(() => `
            <div class="skeleton-card">
              <div class="skeleton skeleton--circle"></div>
              <div class="skeleton-card__lines">
                <div class="skeleton skeleton--line skeleton--line-long"></div>
                <div class="skeleton skeleton--line skeleton--line-short"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function showSkeleton() {
    const main = document.getElementById('app-main');
    if (main) main.innerHTML = _buildSkeletonHTML();
  }

  function showSkeletonList() {
    const main = document.getElementById('app-main');
    if (!main) return;
    main.innerHTML = `
      <div class="skeleton-page" aria-hidden="true">
        <div class="skeleton-list-header">
          <div class="skeleton skeleton--back-btn"></div>
          <div>
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--progress"></div>
          </div>
        </div>
        ${Array(6).fill(0).map(() => `
          <div class="skeleton-product-item">
            <div class="skeleton skeleton--circle skeleton--sm"></div>
            <div class="skeleton-product-item__lines">
              <div class="skeleton skeleton--line skeleton--line-long"></div>
              <div class="skeleton skeleton--line skeleton--line-short"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── Page Statistiques ────────────────────────────────────────────────────

  function renderStatsPage() {
    const main = document.getElementById('app-main');
    if (!main) return;

    const globalStats = Store.getGlobalStats();
    const settings    = Store.getSettings();
    const lists       = Store.getLists().filter(l => !l.isArchived);

    main.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <div class="page-header__content">
        <h1 class="page-header__title">
          <span class="material-symbols-rounded">bar_chart</span>
          Statistiques
        </h1>
        <p class="page-header__subtitle">Vue d'ensemble de vos courses</p>
      </div>
    `;
    main.appendChild(header);

    // Cards stats globales
    main.appendChild(_buildStatsOverview(globalStats, settings));

    // Répartition par catégorie
    if (globalStats.totalProducts > 0) {
      main.appendChild(_buildCategoryStats(lists, settings));
    }

    // Top listes par dépense
    if (lists.length > 0) {
      main.appendChild(_buildTopLists(lists, settings));
    }

    // Historique simplifié
    main.appendChild(_buildRecentActivity(lists, settings));

    Utils.animateIn(main, 'page-enter');
  }

  function _buildStatsOverview(stats, settings) {
    const section = document.createElement('section');
    section.className = 'stats-overview';

    const cards = [
      {
        icon : 'list_alt',
        label: 'Listes actives',
        value: stats.listCount,
        color: 'oklch(65% 0.2 250)',
        sub  : `${stats.archivedCount} archivée(s)`,
      },
      {
        icon : 'inventory_2',
        label: 'Produits total',
        value: stats.totalProducts,
        color: 'oklch(65% 0.2 145)',
        sub  : `${stats.checkedProducts} cochés`,
      },
      {
        icon : 'payments',
        label: 'Total estimé',
        value: Utils.formatCurrency(stats.globalTotal, settings.currencySymbol),
        color: 'oklch(65% 0.2 60)',
        sub  : 'toutes listes',
      },
      {
        icon : 'percent',
        label: 'Progression moy.',
        value: stats.totalProducts > 0
          ? `${Math.round((stats.checkedProducts / stats.totalProducts) * 100)}%`
          : '0%',
        color: 'oklch(65% 0.2 25)',
        sub  : 'articles cochés',
      },
    ];

    section.innerHTML = `
      <h2 class="stats-section-title">Vue d'ensemble</h2>
      <div class="stats-cards-grid">
        ${cards.map((card, i) => `
          <div class="stats-card animate-in" style="animation-delay:${i * 80}ms;
            --card-color: ${card.color}">
            <div class="stats-card__icon-wrap">
              <span class="material-symbols-rounded stats-card__icon">${card.icon}</span>
            </div>
            <div class="stats-card__info">
              <span class="stats-card__value">${card.value}</span>
              <span class="stats-card__label">${card.label}</span>
              <span class="stats-card__sub">${card.sub}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return section;
  }

  function _buildCategoryStats(lists, settings) {
    const section    = document.createElement('section');
    section.className = 'stats-categories';

    // Agréger par catégorie
    const catMap     = new Map();
    const categories = Store.getCategories();

    lists.forEach(list => {
      list.products.forEach(p => {
        const current = catMap.get(p.category) || { count: 0, total: 0 };
        catMap.set(p.category, {
          count: current.count + 1,
          total: current.total + (p.price ? p.price * p.quantity : 0),
        });
      });
    });

    const catData = [...catMap.entries()]
      .map(([id, data]) => {
        const cat = categories.find(c => c.id === id) || {
          id, name: 'Autre', emoji: '📦', color: 'oklch(60% 0.08 250)',
        };
        return { ...cat, ...data };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const maxCount = Math.max(...catData.map(c => c.count), 1);

    section.innerHTML = `
      <h2 class="stats-section-title">Par catégorie</h2>
      <div class="stats-cat-list">
        ${catData.map((cat, i) => `
          <div class="stats-cat-item animate-in" style="animation-delay:${i * 60}ms">
            <div class="stats-cat-item__left">
              <span class="stats-cat-item__emoji">${cat.emoji}</span>
              <div class="stats-cat-item__info">
                <span class="stats-cat-item__name">${cat.name}</span>
                <span class="stats-cat-item__count">${cat.count} produit(s)</span>
              </div>
            </div>
            <div class="stats-cat-item__right">
              <div class="stats-cat-item__bar-wrap">
                <div class="stats-cat-item__bar"
                  style="width: ${(cat.count / maxCount * 100).toFixed(0)}%;
                         background: ${cat.color}">
                </div>
              </div>
              ${cat.total > 0
                ? `<span class="stats-cat-item__total">
                    ${Utils.formatCurrency(cat.total, settings.currencySymbol)}
                   </span>`
                : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return section;
  }

  function _buildTopLists(lists, settings) {
    const section = document.createElement('section');
    section.className = 'stats-top-lists';

    const sorted = [...lists]
      .map(list => ({
        ...list,
        stats: Store.getListStats(list.id),
      }))
      .sort((a, b) => (b.stats?.total || 0) - (a.stats?.total || 0))
      .slice(0, 5);

    section.innerHTML = `
      <h2 class="stats-section-title">Top listes par dépense</h2>
      <div class="stats-top-list">
        ${sorted.map((list, i) => `
          <div class="stats-top-item animate-in"
            style="animation-delay:${i * 60}ms; --list-color: ${list.color}"
            data-list-id="${list.id}"
            role="button"
            tabindex="0">
            <span class="stats-top-item__rank">#${i + 1}</span>
            <span class="stats-top-item__emoji">${list.emoji || '🛒'}</span>
            <div class="stats-top-item__info">
              <span class="stats-top-item__name">${list.name}</span>
              <span class="stats-top-item__meta">
                ${list.stats?.itemCount || 0} articles •
                ${list.stats?.progress || 0}% complété
              </span>
            </div>
            <span class="stats-top-item__total">
              ${Utils.formatCurrency(list.stats?.total || 0, settings.currencySymbol)}
            </span>
          </div>
        `).join('')}
      </div>
    `;

    // Navigation vers la liste au clic
    section.querySelectorAll('.stats-top-item').forEach(item => {
      const handler = () => Router.goToList(item.dataset.listId);
      item.addEventListener('click', handler);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') handler();
      });
    });

    return section;
  }

  function _buildRecentActivity(lists, settings) {
    const section = document.createElement('section');
    section.className = 'stats-activity';

    // Collecter les 8 dernières modifications
    const activities = lists
      .flatMap(list => list.products.map(p => ({
        listName : list.name,
        listColor: list.color,
        listEmoji: list.emoji,
        listId   : list.id,
        product  : p,
        date     : new Date(p.updatedAt || p.createdAt),
      })))
      .sort((a, b) => b.date - a.date)
      .slice(0, 8);

    if (activities.length === 0) {
      section.innerHTML = `
        <h2 class="stats-section-title">Activité récente</h2>
        <p class="stats-empty">Aucune activité récente.</p>
      `;
      return section;
    }

    section.innerHTML = `
      <h2 class="stats-section-title">Activité récente</h2>
      <div class="activity-list">
        ${activities.map((act, i) => `
          <div class="activity-item animate-in"
            style="animation-delay:${i * 40}ms; --list-color: ${act.listColor}">
            <div class="activity-item__dot"></div>
            <div class="activity-item__content">
              <span class="activity-item__product">${act.product.name}</span>
              <span class="activity-item__list">
                ${act.listEmoji} ${act.listName}
              </span>
            </div>
            <span class="activity-item__time">
              ${Utils.formatRelativeTime(act.product.updatedAt || act.product.createdAt)}
            </span>
          </div>
        `).join('')}
      </div>
    `;

    return section;
  }

  // ─── Page Paramètres ──────────────────────────────────────────────────────

  function renderSettingsPage() {
    const main     = document.getElementById('app-main');
    if (!main) return;

    const settings = Store.getSettings();
    main.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <div class="page-header__content">
        <h1 class="page-header__title">
          <span class="material-symbols-rounded">settings</span>
          Paramètres
        </h1>
      </div>
    `;
    main.appendChild(header);

    // Sections de paramètres
    main.appendChild(_buildAppearanceSettings(settings));
    main.appendChild(_buildDisplaySettings(settings));
    main.appendChild(_buildDataSettings());
    main.appendChild(_buildAboutSection());

    Utils.animateIn(main, 'page-enter');
  }

  function _buildAppearanceSettings(settings) {
    const section = document.createElement('section');
    section.className = 'settings-section';

    section.innerHTML = `
      <h2 class="settings-section__title">
        <span class="material-symbols-rounded">palette</span>
        Apparence
      </h2>

      <!-- Thème -->
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__label">Thème</span>
          <span class="settings-item__desc">Apparence de l'interface</span>
        </div>
        <div class="settings-item__control">
          <select class="form-select form-select--sm" id="setting-theme">
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>
              ☀️ Clair
            </option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>
              🌙 Sombre
            </option>
            <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>
              🌓 Automatique
            </option>
          </select>
        </div>
      </div>
    `;

    // Events
    section.querySelector('#setting-theme')
      ?.addEventListener('change', (e) => {
        Store.updateSettings({ theme: e.target.value });
        Sidebar.applyTheme(e.target.value);
        Notifications.success('Thème mis à jour !');
      });

    return section;
  }

  function _buildDisplaySettings(settings) {
    const section = document.createElement('section');
    section.className = 'settings-section';

    section.innerHTML = `
      <h2 class="settings-section__title">
        <span class="material-symbols-rounded">tune</span>
        Affichage
      </h2>

      <!-- Devise -->
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__label">Devise</span>
          <span class="settings-item__desc">Symbole monétaire affiché</span>
        </div>
        <div class="settings-item__control">
          <select class="form-select form-select--sm" id="setting-currency">
            <option value="EUR" data-symbol="€" ${settings.currency === 'EUR' ? 'selected' : ''}>
              € Euro
            </option>
            <option value="USD" data-symbol="$" ${settings.currency === 'USD' ? 'selected' : ''}>
              $ Dollar
            </option>
            <option value="GBP" data-symbol="£" ${settings.currency === 'GBP' ? 'selected' : ''}>
              £ Livre
            </option>
            <option value="CHF" data-symbol="CHF" ${settings.currency === 'CHF' ? 'selected' : ''}>
              CHF Franc suisse
            </option>
            <option value="MAD" data-symbol="DH" ${settings.currency === 'MAD' ? 'selected' : ''}>
              DH Dirham
            </option>
          </select>
        </div>
      </div>

      <!-- Afficher les prix -->
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__label">Afficher les prix</span>
          <span class="settings-item__desc">Montants et totaux visibles</span>
        </div>
        <div class="settings-item__control">
          <label class="toggle-switch">
            <input type="checkbox" id="setting-show-prices"
              ${settings.showPrices ? 'checked' : ''} />
            <span class="toggle-switch__track">
              <span class="toggle-switch__thumb"></span>
            </span>
          </label>
        </div>
      </div>

      <!-- Mode compact -->
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__label">Mode compact</span>
          <span class="settings-item__desc">Réduire l'espacement des éléments</span>
        </div>
        <div class="settings-item__control">
          <label class="toggle-switch">
            <input type="checkbox" id="setting-compact"
              ${settings.compactMode ? 'checked' : ''} />
            <span class="toggle-switch__track">
              <span class="toggle-switch__thumb"></span>
            </span>
          </label>
        </div>
      </div>

      <!-- Tri des produits -->
      <div class="settings-item">
        <div class="settings-item__info">
          <span class="settings-item__label">Tri par défaut</span>
          <span class="settings-item__desc">Ordre d'affichage des produits</span>
        </div>
        <div class="settings-item__control">
          <select class="form-select form-select--sm" id="setting-sort">
            <option value="category" ${settings.sortProductsBy === 'category' ? 'selected' : ''}>
              Catégorie
            </option>
            <option value="name" ${settings.sortProductsBy === 'name' ? 'selected' : ''}>
              Nom
            </option>
            <option value="added" ${settings.sortProductsBy === 'added' ? 'selected' : ''}>
              Ajout récent
            </option>
          </select>
        </div>
      </div>
    `;

    // Events
    section.querySelector('#setting-currency')
      ?.addEventListener('change', (e) => {
        const opt    = e.target.selectedOptions[0];
        const symbol = opt.dataset.symbol || e.target.value;
        Store.updateSettings({ currency: e.target.value, currencySymbol: symbol });
        Notifications.success('Devise mise à jour !');
      });

    section.querySelector('#setting-show-prices')
      ?.addEventListener('change', (e) => {
        Store.updateSettings({ showPrices: e.target.checked });
      });

    section.querySelector('#setting-compact')
      ?.addEventListener('change', (e) => {
        Store.updateSettings({ compactMode: e.target.checked });
        document.documentElement.classList.toggle('compact-mode', e.target.checked);
      });

    section.querySelector('#setting-sort')
      ?.addEventListener('change', (e) => {
        Store.updateSettings({ sortProductsBy: e.target.value });
        Notifications.success('Préférence de tri enregistrée !');
      });

    return section;
  }

  function _buildDataSettings() {
    const section = document.createElement('section');
    section.className = 'settings-section';

    const stats = Store.getGlobalStats();
    const listsCount = Store.getLists().length;

    // Calcul taille stockage
    const storageSize = _calcStorageSize();

    section.innerHTML = `
      <h2 class="settings-section__title">
        <span class="material-symbols-rounded">storage</span>
        Données
      </h2>

      <!-- Info stockage -->
      <div class="settings-item settings-item--info">
        <div class="settings-item__info">
          <span class="settings-item__label">Stockage utilisé</span>
          <span class="settings-item__desc">
            ${listsCount} liste(s) · ${stats.totalProducts} produit(s)
          </span>
        </div>
        <span class="settings-item__value">${storageSize}</span>
      </div>

      <!-- Export JSON -->
      <div class="settings-item settings-item--action" id="action-export-json">
        <div class="settings-item__info">
          <span class="settings-item__label">
            <span class="material-symbols-rounded">file_download</span>
            Exporter (JSON)
          </span>
          <span class="settings-item__desc">Sauvegarde complète réimportable</span>
        </div>
        <span class="material-symbols-rounded settings-item__chevron">chevron_right</span>
      </div>

      <!-- Export CSV -->
      <div class="settings-item settings-item--action" id="action-export-csv">
        <div class="settings-item__info">
          <span class="settings-item__label">
            <span class="material-symbols-rounded">table_chart</span>
            Exporter (CSV)
          </span>
          <span class="settings-item__desc">Pour Excel ou Google Sheets</span>
        </div>
        <span class="material-symbols-rounded settings-item__chevron">chevron_right</span>
      </div>

      <!-- Import -->
      <div class="settings-item settings-item--action" id="action-import">
        <div class="settings-item__info">
          <span class="settings-item__label">
            <span class="material-symbols-rounded">file_upload</span>
            Importer
          </span>
          <span class="settings-item__desc">Restaurer depuis un fichier JSON</span>
        </div>
        <span class="material-symbols-rounded settings-item__chevron">chevron_right</span>
      </div>

      <!-- Tout effacer -->
      <div class="settings-item settings-item--action settings-item--danger" id="action-clear">
        <div class="settings-item__info">
          <span class="settings-item__label">
            <span class="material-symbols-rounded">delete_forever</span>
            Effacer toutes les données
          </span>
          <span class="settings-item__desc">Action irréversible</span>
        </div>
        <span class="material-symbols-rounded settings-item__chevron">chevron_right</span>
      </div>
    `;

    // Events
    section.querySelector('#action-export-json')
      ?.addEventListener('click', () => ImportExport.exportAll());

    section.querySelector('#action-export-csv')
      ?.addEventListener('click', () => ImportExport.exportAllCSV());

    section.querySelector('#action-import')
      ?.addEventListener('click', () => ImportExport.openImportDialog());

    section.querySelector('#action-clear')
      ?.addEventListener('click', _confirmClearAll);

    return section;
  }

  function _buildAboutSection() {
    const section = document.createElement('section');
    section.className = 'settings-section settings-section--about';

    section.innerHTML = `
      <h2 class="settings-section__title">
        <span class="material-symbols-rounded">info</span>
        À propos
      </h2>

      <div class="about-card">
        <div class="about-card__logo">
          <span class="material-symbols-rounded">shopping_basket</span>
        </div>
        <div class="about-card__info">
          <h3>Gestion de Courses</h3>
          <p>Version 1.0.0</p>
          <p class="about-card__desc">
            Application de gestion de listes de courses.<br>
            Données stockées localement sur votre appareil.
          </p>
        </div>
      </div>

      <div class="settings-item settings-item--action" id="action-pwa-install"
        style="display:none">
        <div class="settings-item__info">
          <span class="settings-item__label">
            <span class="material-symbols-rounded">install_mobile</span>
            Installer l'application
          </span>
          <span class="settings-item__desc">
            Ajouter à l'écran d'accueil
          </span>
        </div>
        <span class="material-symbols-rounded settings-item__chevron">chevron_right</span>
      </div>

      <div class="settings-item settings-item--action" id="action-notifications">
        <div class="settings-item__info">
          <span class="settings-item__label">
            <span class="material-symbols-rounded">notifications</span>
            Notifications système
          </span>
          <span class="settings-item__desc">Autoriser les notifications</span>
        </div>
        <span class="material-symbols-rounded settings-item__chevron">chevron_right</span>
      </div>
    `;

    // PWA install
    if (deferredInstallPrompt) {
      const installItem = section.querySelector('#action-pwa-install');
      if (installItem) installItem.style.display = '';
      installItem?.addEventListener('click', _triggerPWAInstall);
    }

    // Notifications
    section.querySelector('#action-notifications')
      ?.addEventListener('click', async () => {
        const granted = await Notifications.requestPermission();
        Notifications.success(
          granted
            ? 'Notifications autorisées !'
            : 'Notifications refusées.'
        );
      });

    return section;
  }

  // ─── Thème ────────────────────────────────────────────────────────────────

  function _initTheme() {
    const settings = Store.getSettings();
    Sidebar.applyTheme(settings.theme);

    // Mode compact
    if (settings.compactMode) {
      document.documentElement.classList.add('compact-mode');
    }

    // Écouter préférence système
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (Store.getSettings().theme === 'auto') {
          document.documentElement.setAttribute(
            'data-theme', e.matches ? 'dark' : 'light'
          );
        }
      });
  }

  // ─── PWA Install ──────────────────────────────────────────────────────────

  function _initPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      _showPWABanner();
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      _hidePWABanner();
      Notifications.success('Application installée !');
    });

    // Boutons banner
    document.getElementById('pwa-install')
      ?.addEventListener('click', _triggerPWAInstall);

    document.getElementById('pwa-dismiss')
      ?.addEventListener('click', () => {
        _hidePWABanner();
        // Rappel dans 3 jours
        Utils.safeSetItem('gc_pwa_dismissed', Date.now());
      });
  }

  function _showPWABanner() {
    // Ne pas montrer si déjà dismissé récemment
    const dismissed = Utils.safeGetItem('gc_pwa_dismissed');
    if (dismissed && Date.now() - dismissed < 3 * 24 * 60 * 60 * 1000) return;

    const banner = document.getElementById('pwa-banner');
    if (banner) banner.style.display = '';
  }

  function _hidePWABanner() {
    const banner = document.getElementById('pwa-banner');
    if (banner) banner.style.display = 'none';
  }

  async function _triggerPWAInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      _hidePWABanner();
    }
  }

  // ─── Statut réseau ────────────────────────────────────────────────────────

  function _initNetworkStatus() {
    const updateStatus = () => {
      const el      = document.getElementById('network-status');
      const online  = navigator.onLine;
      if (!el) return;

      if (!online) {
        el.innerHTML = `
          <span class="material-symbols-rounded">wifi_off</span>
          Mode hors-ligne
        `;
        el.classList.add('network-status--offline');
      } else {
        el.classList.remove('network-status--offline');
        el.innerHTML = '';
      }
    };

    window.addEventListener('online',  () => {
      updateStatus();
      Notifications.success('Connexion rétablie !');
    });
    window.addEventListener('offline', () => {
      updateStatus();
      Notifications.warning('Vous êtes hors-ligne. Les données restent disponibles.');
    });
  }

  // ─── Scroll behavior ──────────────────────────────────────────────────────

  function _initScrollBehavior() {
    let lastScrollY = 0;
    const topbar    = document.getElementById('app-topbar');
    const main      = document.getElementById('app-main');

    main?.addEventListener('scroll', Utils.throttle(() => {
      const currentScrollY = main.scrollTop;
      const scrollingDown  = currentScrollY > lastScrollY;

      if (topbar) {
        // Cacher la topbar en scrollant vers le bas (sur mobile)
        if (scrollingDown && currentScrollY > 60) {
          topbar.classList.add('topbar--hidden');
        } else {
          topbar.classList.remove('topbar--hidden');
        }

        // Ombre au scroll
        topbar.classList.toggle('topbar--scrolled', currentScrollY > 10);
      }

      lastScrollY = currentScrollY;
    }, 100));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _calcStorageSize() {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith('gc_')) {
          total += (localStorage.getItem(key) || '').length * 2; // UTF-16
        }
      }
      if (total < 1024) return `${total} o`;
      if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} Ko`;
      return `${(total / (1024 * 1024)).toFixed(2)} Mo`;
    } catch {
      return 'N/A';
    }
  }

  async function _confirmClearAll() {
    const confirmed = await Modals.confirm({
      title  : '⚠ Effacer toutes les données',
      message: 'Cette action supprimera DÉFINITIVEMENT toutes vos listes, produits et paramètres. Impossible d\'annuler.',
      danger : true,
      confirmLabel: 'Tout effacer',
    });

    if (!confirmed) return;

    // Double confirmation
    const confirmed2 = await Modals.confirm({
      title  : 'Dernière confirmation',
      message: 'Êtes-vous vraiment sûr ? Toutes vos données seront perdues.',
      danger : true,
      confirmLabel: 'Oui, tout effacer',
    });

    if (!confirmed2) return;

    Store.clearAll();
    Notifications.success('Toutes les données ont été supprimées.');
    Router.goHome();
  }

  // ─── Helpers publics ──────────────────────────────────────────────────────

  /**
   * Afficher une page d'erreur générique
   */
  function showError(message = 'Une erreur est survenue.') {
    const main = document.getElementById('app-main');
    if (!main) return;

    main.innerHTML = `
      <div class="error-page">
        <span class="material-symbols-rounded error-page__icon">error</span>
        <h2 class="error-page__title">Oups !</h2>
        <p class="error-page__message">${message}</p>
        <button class="btn btn--primary" id="error-home-btn">
          <span class="material-symbols-rounded">home</span>
          Retour à l'accueil
        </button>
      </div>
    `;

    document.getElementById('error-home-btn')
      ?.addEventListener('click', () => Router.goHome());
  }

  /**
   * Mettre à jour le titre de la page (document.title)
   */
  function setPageTitle(title) {
    document.title = title
      ? `${title} — Gestion de Courses`
      : 'Gestion de Courses';
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    setTopbarTitle,
    setTopbarActions,
    navigateTo,
    setPageCleanup,
    showSkeleton,
    showSkeletonList,
    renderStatsPage,
    renderSettingsPage,
    showError,
    setPageTitle,
    get isTransitioning() { return isTransitioning; },
  };
})();

window.UI = UI;