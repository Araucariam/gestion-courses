/**
 * LISTS.JS - Gestion des listes de courses
 * Features : rendu home, carte liste, détail, recherche,
 *            tri, filtres, actions (dupliquer, archiver, supprimer)
 */

const Lists = (() => {

  // ─── État local ───────────────────────────────────────────────────────────

  let searchQuery   = '';
  let sortBy        = 'updatedAt'; // 'updatedAt' | 'name' | 'total' | 'progress'
  let filterTag = null;
  let _menuJustOpened = false;
  let unsubscribers = [];
  

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    // Réabonner aux events du store
    unsubscribers.push(
      Store.subscribe('list:created',   _onListsChange),
      Store.subscribe('list:updated',   _onListsChange),
      Store.subscribe('list:deleted',   _onListsChange),
      Store.subscribe('product:added',  _onListsChange),
      Store.subscribe('product:updated',_onListsChange),
      Store.subscribe('product:deleted',_onListsChange),
      Store.subscribe('product:toggled',_onListsChange),
      Store.subscribe('data:imported',  _onListsChange),
    );

    console.info('[Lists] Initialisé');
  }

  function destroy() {
    unsubscribers.forEach(fn => fn?.());
    unsubscribers = [];
  }

  function _onListsChange() {
    const { route } = Router.getCurrentRoute();
    if (route === Router.ROUTES.HOME || route === '/') {
      renderHomePage();
    }
  }

  // ─── Page d'accueil ───────────────────────────────────────────────────────

  function renderHomePage() {
    const main = document.getElementById('app-main');
    if (!main) return;

    const allLists = Store.getLists().filter(l => !l.isArchived);
    const lists    = _filterAndSortLists(allLists);

    main.innerHTML = '';

    // ── En-tête avec actions
    main.appendChild(_buildHomeHeader(allLists.length));

    // ── Barre de recherche + filtres
    main.appendChild(_buildSearchBar());

    // ── Stats globales
    if (allLists.length > 0) {
      main.appendChild(_buildGlobalStats());
    }

    // ── Liste vide
    if (allLists.length === 0) {
      main.appendChild(_buildEmptyState());
    } else if (lists.length === 0) {
      main.appendChild(_buildNoResultState());
    } else {
      // ── Grille de listes
      const grid = _buildListsGrid(lists);
      main.appendChild(grid);
    }

    // ── FAB nouvelle liste
    _ensureFAB();

    Utils.animateIn(main, 'page-enter');
  }

  // ─── Header ───────────────────────────────────────────────────────────────

  function _buildHomeHeader(count) {
    const header = document.createElement('div');
    header.className = 'page-header';

    const now    = new Date();
    const hour   = now.getHours();
    let greeting = 'Bonjour';
    if (hour >= 12 && hour < 18) greeting = 'Bon après-midi';
    if (hour >= 18) greeting = 'Bonsoir';

    header.innerHTML = `
      <div class="page-header__content">
        <h1 class="page-header__title">${greeting} 👋</h1>
        <p class="page-header__subtitle">
          ${count === 0
            ? 'Créez votre première liste'
            : `${count} liste${count > 1 ? 's' : ''} active${count > 1 ? 's' : ''}`
          }
        </p>
      </div>
      <div class="page-header__actions">
        <button class="icon-btn" id="sort-btn" aria-label="Trier">
          <span class="material-symbols-rounded">sort</span>
        </button>
        <button class="btn btn--primary btn--sm" id="new-list-header-btn">
          <span class="material-symbols-rounded">add</span>
          <span>Nouvelle</span>
        </button>
      </div>
    `;

    header.querySelector('#new-list-header-btn')
      ?.addEventListener('click', openNewListModal);

    header.querySelector('#sort-btn')
      ?.addEventListener('click', _openSortMenu);

    return header;
  }

  // ─── Barre de recherche ───────────────────────────────────────────────────

  function _buildSearchBar() {
    const wrap = document.createElement('div');
    wrap.className = 'search-bar-wrap';
    wrap.innerHTML = `
      <div class="search-bar">
        <span class="search-bar__icon material-symbols-rounded">search</span>
        <input
          type="search"
          class="search-bar__input"
          id="lists-search"
          placeholder="Rechercher une liste..."
          value="${searchQuery}"
          autocomplete="off"
        />
        <button class="search-bar__clear${searchQuery ? '' : ' hidden'}"
          id="search-clear" aria-label="Effacer">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    `;

    const input = wrap.querySelector('#lists-search');
    const clear = wrap.querySelector('#search-clear');

    input?.addEventListener('input', Utils.debounce((e) => {
      searchQuery = e.target.value;
      clear?.classList.toggle('hidden', !searchQuery);
      renderHomePage();
    }, 300));

    clear?.addEventListener('click', () => {
      searchQuery = '';
      if (input) input.value = '';
      clear.classList.add('hidden');
      renderHomePage();
    });

    return wrap;
  }

  // ─── Stats globales ───────────────────────────────────────────────────────

  function _buildGlobalStats() {
    const stats    = Store.getGlobalStats();
    const settings = Store.getSettings();
    const wrap     = document.createElement('div');
    wrap.className = 'global-stats';

    wrap.innerHTML = `
      <div class="global-stat-card">
        <span class="global-stat-card__icon material-symbols-rounded">list_alt</span>
        <div class="global-stat-card__info">
          <span class="global-stat-card__value">${stats.listCount}</span>
          <span class="global-stat-card__label">Listes</span>
        </div>
      </div>
      <div class="global-stat-card">
        <span class="global-stat-card__icon material-symbols-rounded">inventory_2</span>
        <div class="global-stat-card__info">
          <span class="global-stat-card__value">${stats.totalProducts}</span>
          <span class="global-stat-card__label">Produits</span>
        </div>
      </div>
      <div class="global-stat-card global-stat-card--accent">
        <span class="global-stat-card__icon material-symbols-rounded">payments</span>
        <div class="global-stat-card__info">
          <span class="global-stat-card__value">
            ${Utils.formatCurrency(stats.globalTotal, settings.currencySymbol)}
          </span>
          <span class="global-stat-card__label">Total estimé</span>
        </div>
      </div>
    `;

    return wrap;
  }

  // ─── Grille de listes ─────────────────────────────────────────────────────

  function _buildListsGrid(lists) {
    const grid = document.createElement('div');
    grid.className = 'lists-grid';
    grid.id        = 'lists-grid';

    lists.forEach((list, index) => {
      const card = _buildListCard(list);
      card.style.animationDelay = `${index * 60}ms`;
      grid.appendChild(card);
    });

    return grid;
  }

  // ─── Carte liste ──────────────────────────────────────────────────────────

  function _buildListCard(list) {
    const stats    = Store.getListStats(list.id);
    const settings = Store.getSettings();
    const card     = document.createElement('article');
    card.className = 'list-card animate-in';
    card.dataset.listId = list.id;
    card.style.setProperty('--list-color', list.color);

    const progressPct  = stats.progress;
    const isCompleted  = progressPct === 100 && list.products.length > 0;
    const overBudget   = stats.overBudget;

    // Top catégories de la liste (max 3)
    const topCats      = _getTopCategories(list.products, 3);

    card.innerHTML = `
      <div class="list-card__color-bar"></div>

      <div class="list-card__header">
        <div class="list-card__icon-wrap">
          <span class="list-card__emoji">${list.emoji || '🛒'}</span>
        </div>
        <div class="list-card__meta">
          <h2 class="list-card__name">${_escHtml(list.name)}</h2>
          <p class="list-card__date">
            <span class="material-symbols-rounded">schedule</span>
            ${Utils.formatRelativeTime(list.updatedAt)}
          </p>
        </div>
        <button class="list-card__menu-btn icon-btn"
          data-list-id="${list.id}"
          aria-label="Options de ${_escHtml(list.name)}"
          aria-haspopup="true">
          <span class="material-symbols-rounded">more_vert</span>
        </button>
      </div>

      ${list.description ? `
        <p class="list-card__desc">${_escHtml(list.description)}</p>
      ` : ''}

      <!-- Progression -->
      <div class="list-card__progress-wrap">
        <div class="list-card__progress-bar">
          <div class="list-card__progress-fill${isCompleted ? ' list-card__progress-fill--complete' : ''}"
            style="width: ${progressPct}%"></div>
        </div>
        <span class="list-card__progress-text">
          ${stats.checkedCount}/${stats.itemCount}
          ${isCompleted ? '✓' : ''}
        </span>
      </div>

      <!-- Infos -->
      <div class="list-card__footer">
        <div class="list-card__footer-left">
          ${topCats.map(cat => `
            <span class="cat-dot" style="background: ${cat.color}"
              title="${cat.name}">${cat.emoji}</span>
          `).join('')}
          ${list.products.length === 0
            ? '<span class="list-card__empty-hint">Liste vide</span>'
            : ''}
        </div>
        <div class="list-card__footer-right">
          ${settings.showPrices && stats.total > 0 ? `
            <span class="list-card__total ${overBudget ? 'list-card__total--over' : ''}">
              ${overBudget ? '<span class="material-symbols-rounded">warning</span>' : ''}
              ${Utils.formatCurrency(stats.total, settings.currencySymbol)}
            </span>
          ` : ''}
          ${list.budget ? `
            <span class="list-card__budget">
              / ${Utils.formatCurrency(list.budget, settings.currencySymbol)}
            </span>
          ` : ''}
        </div>
      </div>

      ${isCompleted ? `
        <div class="list-card__completed-banner">
          <span class="material-symbols-rounded">check_circle</span>
          Liste complète !
        </div>
      ` : ''}
    `;

    // ── Clic → ouvrir liste
    card.addEventListener('click', (e) => {
      if (e.target.closest('.list-card__menu-btn')) return;
      Router.goToList(list.id);
    });

    // ── Menu contextuel
    card.querySelector('.list-card__menu-btn')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        _openListMenu(list, e.currentTarget);
      });

    return card;
  }

  // ─── Menu contextuel liste ────────────────────────────────────────────────

  // ─── Context menu ─────────────────────────────────────────────
  
  // FLAG global pour éviter la fermeture immédiate
  // let _menuJustOpened = false;
  
  function _openListMenu(list, triggerEl) {
    _closeContextMenu();
  
    const menu = document.createElement('div');
    menu.className  = 'context-menu';
    menu.id         = 'list-context-menu';
    menu.setAttribute('role', 'menu');
  
    const items = [
      {
        icon : 'open_in_new',
        label: 'Ouvrir',
        action: () => Router.goToList(list.id),
      },
      {
        icon : 'edit',
        label: 'Modifier',
        action: () => openEditListModal(list),
      },
      {
        icon : 'content_copy',
        label: 'Dupliquer',
        action: () => duplicateList(list.id),
      },
      {
        icon : 'share',
        label: 'Partager',
        action: () => shareList(list.id),
      },
      { divider: true },
      {
        icon : 'archive',
        label: 'Archiver',
        action: () => archiveList(list.id),
      },
      {
        icon : 'delete',
        label: 'Supprimer',
        danger: true,
        action: () => deleteList(list.id),
      },
    ];
  
    items.forEach(item => {
      if (item.divider) {
        const div = document.createElement('div');
        div.className = 'context-menu__divider';
        menu.appendChild(div);
        return;
      }
  
      const btn = document.createElement('button');
      btn.className = `context-menu__item${item.danger ? ' context-menu__item--danger' : ''}`;
      btn.setAttribute('role', 'menuitem');
      btn.innerHTML = `
        <span class="material-symbols-rounded">${item.icon}</span>
        <span>${item.label}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _closeContextMenu();
        item.action();
      });
      menu.appendChild(btn);
    });
  
    document.body.appendChild(menu);
    _positionContextMenu(menu, triggerEl);
    _registerMenuDismiss();
  }
  
  function _positionContextMenu(menu, trigger) {
    const rect       = trigger.getBoundingClientRect();
    const menuW      = 220;
    const menuH      = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
  
    menu.style.position = 'fixed';
    menu.style.zIndex   = '9999';
  
    // Horizontal
    if (rect.right - menuW > 0) {
      menu.style.right = `${window.innerWidth - rect.right}px`;
      menu.style.left  = 'auto';
    } else {
      menu.style.left  = `${rect.left}px`;
      menu.style.right = 'auto';
    }
  
    // Vertical
    if (spaceBelow > menuH) {
      menu.style.top    = `${rect.bottom + 6}px`;
      menu.style.bottom = 'auto';
    } else {
      menu.style.bottom = `${window.innerHeight - rect.top + 6}px`;
      menu.style.top    = 'auto';
    }
  
    // Forcer reflow puis animer
    requestAnimationFrame(() => menu.classList.add('context-menu--visible'));
  }
  
  function _closeContextMenu() {
    const menu = document.getElementById('list-context-menu') ||
                 document.getElementById('sort-context-menu') ||
                 document.getElementById('sort-products-menu');
    if (!menu) return;
  
    menu.classList.remove('context-menu--visible');
    setTimeout(() => menu.remove(), 200);
  }
  
  /**
   * Enregistre le listener de fermeture APRÈS le cycle d'événement courant
   * Évite la fermeture immédiate par propagation du clic d'ouverture
   */
  function _registerMenuDismiss() {
    _menuJustOpened = true;
  
    // Attendre la fin du cycle d'événements avec double rAF
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _menuJustOpened = false;
  
        const handler = (e) => {
          // Ne pas fermer si on clique sur un item du menu
          const menu = document.getElementById('list-context-menu') ||
                       document.getElementById('sort-context-menu') ||
                       document.getElementById('sort-products-menu');
          if (menu && menu.contains(e.target)) return;
  
          _closeContextMenu();
          document.removeEventListener('click', handler);
          document.removeEventListener('keydown', keyHandler);
        };
  
        const keyHandler = (e) => {
          if (e.key === 'Escape') {
            _closeContextMenu();
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', keyHandler);
          }
        };
  
        document.addEventListener('click', handler);
        document.addEventListener('keydown', keyHandler);
      });
    });
  }
  
  // ─── Menu de tri ──────────────────────────────────────────────
  
  function _openSortMenu(e) {
    // Si déjà ouvert → fermer
    const existing = document.getElementById('sort-context-menu');
    if (existing) {
      _closeContextMenu();
      return;
    }
  
    const options = [
      { value: 'updatedAt', label: 'Récemment modifiées', icon: 'schedule' },
      { value: 'name',      label: 'Nom (A → Z)',          icon: 'sort_by_alpha' },
      { value: 'total',     label: 'Total (croissant)',     icon: 'payments' },
      { value: 'progress',  label: 'Progression',          icon: 'pie_chart' },
    ];
  
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id        = 'sort-context-menu';
  
    const titleEl = document.createElement('div');
    titleEl.className   = 'context-menu__title';
    titleEl.textContent = 'Trier par';
    menu.appendChild(titleEl);
  
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `context-menu__item${sortBy === opt.value
        ? ' context-menu__item--active' : ''}`;
      btn.innerHTML = `
        <span class="material-symbols-rounded">${opt.icon}</span>
        <span>${opt.label}</span>
        ${sortBy === opt.value
          ? '<span class="material-symbols-rounded context-menu__check">check</span>'
          : ''}
      `;
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        sortBy = opt.value;
        _closeContextMenu();
        renderHomePage();
      });
      menu.appendChild(btn);
    });
  
    document.body.appendChild(menu);
    _positionContextMenu(menu, e.currentTarget);
    _registerMenuDismiss();
  }

  // ─── Menu de tri ──────────────────────────────────────────────────────────

  function _openSortMenu(e) {
    _closeContextMenu();

    const options = [
      { value: 'updatedAt', label: 'Récemment modifiées', icon: 'schedule' },
      { value: 'name',      label: 'Nom (A → Z)',          icon: 'sort_by_alpha' },
      { value: 'total',     label: 'Total (croissant)',     icon: 'payments' },
      { value: 'progress',  label: 'Progression',          icon: 'pie_chart' },
    ];

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id        = 'sort-context-menu';

    const titleEl = document.createElement('div');
    titleEl.className   = 'context-menu__title';
    titleEl.textContent = 'Trier par';
    menu.appendChild(titleEl);

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `context-menu__item${sortBy === opt.value ? ' context-menu__item--active' : ''}`;
      btn.innerHTML = `
        <span class="material-symbols-rounded">${opt.icon}</span>
        <span>${opt.label}</span>
        ${sortBy === opt.value
          ? '<span class="material-symbols-rounded context-menu__check">check</span>'
          : ''}
      `;
      btn.addEventListener('click', () => {
        sortBy = opt.value;
        _closeContextMenu();
        renderHomePage();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    _positionContextMenu(menu, e.currentTarget);
    setTimeout(() => {
      document.addEventListener('click', _closeContextMenu, { once: true });
    }, 10);
  }

  // ─── Filtre & Tri ─────────────────────────────────────────────────────────

  function _filterAndSortLists(lists) {
    let result = [...lists];

    // Filtre recherche
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.tags && l.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Filtre tag
    if (filterTag) {
      result = result.filter(l => l.tags?.includes(filterTag));
    }

    // Tri
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        break;
      case 'total':
        result.sort((a, b) => {
          const sa = Store.getListStats(a.id)?.total || 0;
          const sb = Store.getListStats(b.id)?.total || 0;
          return sa - sb;
        });
        break;
      case 'progress':
        result.sort((a, b) => {
          const pa = Store.getListStats(a.id)?.progress || 0;
          const pb = Store.getListStats(b.id)?.progress || 0;
          return pb - pa;
        });
        break;
      case 'updatedAt':
      default:
        result.sort((a, b) =>
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    return result;
  }

  // ─── États vides ──────────────────────────────────────────────────────────

  function _buildEmptyState() {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';
    wrap.innerHTML = `
      <div class="empty-state__illustration">
        <img
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80"
          alt="Illustration vide"
          class="empty-state__img"
        />
        <div class="empty-state__icon-overlay">
          <span class="material-symbols-rounded">add_shopping_cart</span>
        </div>
      </div>
      <h2 class="empty-state__title">Aucune liste pour l'instant</h2>
      <p class="empty-state__desc">
        Créez votre première liste de courses et commencez à organiser vos achats.
      </p>
      <button class="btn btn--primary btn--lg" id="empty-create-btn">
        <span class="material-symbols-rounded">add</span>
        Créer ma première liste
      </button>
    `;
    wrap.querySelector('#empty-create-btn')
      ?.addEventListener('click', openNewListModal);
    return wrap;
  }

  function _buildNoResultState() {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state';
    wrap.innerHTML = `
      <span class="material-symbols-rounded empty-state__icon">search_off</span>
      <h2 class="empty-state__title">Aucun résultat</h2>
      <p class="empty-state__desc">
        Aucune liste ne correspond à "<strong>${_escHtml(searchQuery)}</strong>".
      </p>
      <button class="btn btn--ghost" id="clear-search-btn">
        <span class="material-symbols-rounded">close</span>
        Effacer la recherche
      </button>
    `;
    wrap.querySelector('#clear-search-btn')?.addEventListener('click', () => {
      searchQuery = '';
      const input = document.getElementById('lists-search');
      if (input) input.value = '';
      renderHomePage();
    });
    return wrap;
  }

  // ─── FAB ──────────────────────────────────────────────────────────────────

  function _ensureFAB() {
    let fab = document.getElementById('fab-new-list');
    if (!fab) {
      fab = document.createElement('button');
      fab.id          = 'fab-new-list';
      fab.className   = 'fab';
      fab.setAttribute('aria-label', 'Nouvelle liste');
      fab.innerHTML   = `
        <span class="material-symbols-rounded fab__icon">add</span>
        <span class="fab__label">Nouvelle liste</span>
      `;
      fab.addEventListener('click', openNewListModal);
      document.getElementById('app-root')?.appendChild(fab);
    }
  }

  // ─── Modales liste ────────────────────────────────────────────────────────

  function openNewListModal() {
    Modals.openListForm(null, (data) => {
      const list = Store.createList(data);
      Notifications.success(`🛒 Liste "${list.name}" créée !`, {
        actions: [{
          label  : 'Ouvrir',
          style  : 'primary',
          onClick: () => Router.goToList(list.id),
        }],
      });
    });
  }

  function openEditListModal(list) {
    Modals.openListForm(list, (data) => {
      Store.updateList(list.id, data);
      Notifications.success(`Liste "${data.name}" mise à jour !`);
    });
  }

  // ─── Actions liste ────────────────────────────────────────────────────────

  async function deleteList(id) {
    const list = Store.getListById(id);
    if (!list) return;

    const confirmed = await Modals.confirm({
      title  : 'Supprimer la liste',
      message: `Supprimer définitivement "${list.name}" et ses ${list.products.length} produit(s) ?`,
      danger : true,
      confirmLabel: 'Supprimer',
    });

    if (!confirmed) return;

    Store.deleteList(id);
    Notifications.success(`Liste "${list.name}" supprimée.`);

    // Si on était sur la liste, retour home
    const { route, params } = Router.getCurrentRoute();
    if (route === Router.ROUTES.LIST && params.id === id) {
      Router.goHome();
    }
  }

  function duplicateList(id) {
    const copy = Store.duplicateList(id);
    if (!copy) return;
    Notifications.success(`Liste "${copy.name}" créée !`, {
      actions: [{
        label  : 'Ouvrir',
        style  : 'primary',
        onClick: () => Router.goToList(copy.id),
      }],
    });
  }

  async function archiveList(id) {
    const list = Store.getListById(id);
    if (!list) return;

    Store.archiveList(id);
    Notifications.success(`"${list.name}" archivée.`, {
      actions: [{
        label  : 'Annuler',
        style  : 'secondary',
        onClick: () => {
          Store.updateList(id, { isArchived: false, archivedAt: null });
          Notifications.info('Archivage annulé.');
        },
      }],
      duration: 5000,
    });

    const { route, params } = Router.getCurrentRoute();
    if (route === Router.ROUTES.LIST && params.id === id) {
      Router.goHome();
    }
  }

  async function shareList(id) {
    const list  = Store.getListById(id);
    if (!list) return;

    const stats = Store.getListStats(id);
    const text  = _listToShareText(list, stats);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Liste : ${list.name}`,
          text,
        });
      } catch (e) {
        if (e.name !== 'AbortError') {
          await Utils.copyToClipboard(text);
          Notifications.success('Liste copiée dans le presse-papiers !');
        }
      }
    } else {
      await Utils.copyToClipboard(text);
      Notifications.success('Liste copiée dans le presse-papiers !');
    }
  }

  function _listToShareText(list, stats) {
    const settings = Store.getSettings();
    const lines = [
      `🛒 ${list.name}`,
      list.description ? `📝 ${list.description}` : '',
      '',
      ...list.products.map(p => {
        const cat = Store.getCategoryById(p.category);
        const qty = Utils.formatQuantity(p.quantity, p.unit);
        const price = p.price
          ? ` — ${Utils.formatCurrency(p.price * p.quantity, settings.currencySymbol)}`
          : '';
        return `${p.checked ? '✅' : '☐'} ${p.name} (${qty})${price}`;
      }),
      '',
      `💰 Total : ${Utils.formatCurrency(stats.total, settings.currencySymbol)}`,
    ];
    return lines.filter(l => l !== null).join('\n');
  }

  // ─── Page liste archivée ──────────────────────────────────────────────────

  function renderArchivedPage() {
    const main   = document.getElementById('app-main');
    if (!main) return;

    const lists  = Store.getLists().filter(l => l.isArchived);
    main.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <div class="page-header__content">
        <h1 class="page-header__title">
          <span class="material-symbols-rounded">archive</span>
          Archivées
        </h1>
        <p class="page-header__subtitle">
          ${lists.length} liste${lists.length > 1 ? 's' : ''} archivée${lists.length > 1 ? 's' : ''}
        </p>
      </div>
    `;
    main.appendChild(header);

    if (lists.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <span class="material-symbols-rounded empty-state__icon">inventory</span>
        <h2 class="empty-state__title">Aucune liste archivée</h2>
        <p class="empty-state__desc">Les listes archivées apparaîtront ici.</p>
      `;
      main.appendChild(empty);
    } else {
      const grid = _buildListsGrid(lists);
      // Ajouter bouton restore sur chaque carte
      grid.querySelectorAll('.list-card__menu-btn').forEach(btn => {
        const listId = btn.dataset.listId;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          _openArchivedMenu(Store.getListById(listId), btn);
        });
      });
      main.appendChild(grid);

      // Bouton tout supprimer
      if (lists.length > 0) {
        const clearBtn = document.createElement('button');
        clearBtn.className   = 'btn btn--danger btn--full btn--mt';
        clearBtn.innerHTML   = `
          <span class="material-symbols-rounded">delete_sweep</span>
          Vider les archives
        `;
        clearBtn.addEventListener('click', _clearArchives);
        main.appendChild(clearBtn);
      }
    }

    Utils.animateIn(main, 'page-enter');
  }

  function _openArchivedMenu(list, trigger) {
    _closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id        = 'list-context-menu';

    const items = [
      {
        icon : 'unarchive',
        label: 'Restaurer',
        action: () => {
          Store.updateList(list.id, { isArchived: false, archivedAt: null });
          Notifications.success(`"${list.name}" restaurée.`);
        },
      },
      {
        icon   : 'delete',
        label  : 'Supprimer définitivement',
        danger : true,
        action : () => deleteList(list.id),
      },
    ];

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `context-menu__item${item.danger ? ' context-menu__item--danger' : ''}`;
      btn.innerHTML = `
        <span class="material-symbols-rounded">${item.icon}</span>
        <span>${item.label}</span>
      `;
      btn.addEventListener('click', () => { _closeContextMenu(); item.action(); });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    _positionContextMenu(menu, trigger);
    setTimeout(() => {
      document.addEventListener('click', _closeContextMenu, { once: true });
    }, 10);
  }

  async function _clearArchives() {
    const lists = Store.getLists().filter(l => l.isArchived);
    const confirmed = await Modals.confirm({
      title  : 'Vider les archives',
      message: `Supprimer définitivement ${lists.length} liste(s) archivée(s) ?`,
      danger : true,
      confirmLabel: 'Tout supprimer',
    });
    if (!confirmed) return;

    lists.forEach(l => Store.deleteList(l.id));
    Notifications.success('Archives vidées.');
    renderArchivedPage();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _getTopCategories(products, max = 3) {
    const catMap   = new Map();
    const categories = Store.getCategories();

    products.forEach(p => {
      catMap.set(p.category, (catMap.get(p.category) || 0) + 1);
    });

    return [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([id]) => categories.find(c => c.id === id) || {
        id, emoji: '📦', name: 'Autre', color: 'oklch(60% 0.08 250)',
      });
  }

  function _escHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    destroy,
    renderHomePage,
    renderArchivedPage,
    openNewListModal,
    openEditListModal,
    deleteList,
    duplicateList,
    archiveList,
    shareList,
  };
})();

window.Lists = Lists;