/**
 * PRODUCTS.JS - Gestion des produits dans une liste
 * Features : rendu page liste, groupe par catégorie, drag & drop,
 *            recherche, filtres, actions rapides, auto-complétion
 */

const Products = (() => {

  // ─── État local ───────────────────────────────────────────────────────────

  let currentListId   = null;
  let searchQuery     = '';
  let sortBy          = 'category';   // 'category' | 'name' | 'added' | 'price'
  let showChecked     = true;
  let dragSrc         = null;
  let unsubscribers   = [];

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    console.info('[Products] Initialisé');
  }

  function destroy() {
    unsubscribers.forEach(fn => fn?.());
    unsubscribers = [];
    currentListId = null;
  }

  // ─── Page liste ───────────────────────────────────────────────────────────

  /**
   * Rendre la page complète d'une liste
   * @param {string} listId
   */
  function renderListPage(listId) {
    currentListId = listId;
    Store.setCurrentList(listId);

    const list = Store.getListById(listId);
    if (!list) {
      Router.goHome();
      Notifications.error('Liste introuvable.');
      return;
    }

    const main = document.getElementById('app-main');
    if (!main) return;

    main.innerHTML = '';
    main.appendChild(_buildListHeader(list));
    main.appendChild(_buildListToolbar(list));
    main.appendChild(_buildBudgetBar(list));
    main.appendChild(_buildProductsContent(list));

    _ensureProductFAB(listId);
    _subscribeToListChanges(listId);

    Utils.animateIn(main, 'page-enter');
  }

  // ─── Souscriptions réactives ──────────────────────────────────────────────

  function _subscribeToListChanges(listId) {
    // Nettoyer les anciennes souscriptions
    unsubscribers.forEach(fn => fn?.());
    unsubscribers = [];

    const refresh = ({ listId: id }) => {
      if (id !== listId) return;
      _refreshProductsContent(listId);
      _refreshListHeader(listId);
      _refreshBudgetBar(listId);
      Sidebar.updateStats();
    };

    const refreshAll = () => {
      if (Store.getListById(listId)) {
        _refreshProductsContent(listId);
        _refreshListHeader(listId);
        _refreshBudgetBar(listId);
      }
    };

    unsubscribers.push(
      Store.subscribe('product:added',   refresh),
      Store.subscribe('product:updated', refresh),
      Store.subscribe('product:deleted', refresh),
      Store.subscribe('product:toggled', refresh),
      Store.subscribe('list:updated',    refreshAll),
      Store.subscribe('list:completed',  _onListCompleted),
    );
  }

  function _onListCompleted(list) {
    if (list.id !== currentListId) return;
    setTimeout(() => {
      Notifications.show({
        type    : 'success',
        title   : '🎉 Liste complète !',
        message : `Vous avez coché tous les articles de "${list.name}"`,
        duration: 5000,
        actions : [{
          label  : 'Archiver',
          style  : 'primary',
          onClick: () => Lists.archiveList(list.id),
        }],
      });
    }, 400);
  }

  // ─── Header de la liste ───────────────────────────────────────────────────

  function _buildListHeader(list) {
    const stats    = Store.getListStats(list.id);
    const settings = Store.getSettings();
    const header   = document.createElement('div');
    header.className = 'list-header';
    header.id        = 'list-header';
    header.style.setProperty('--list-color', list.color);

    header.innerHTML = `
      <div class="list-header__top">
        <button class="icon-btn list-header__back" id="back-btn" aria-label="Retour">
          <span class="material-symbols-rounded">arrow_back</span>
        </button>
        <div class="list-header__title-wrap">
          <span class="list-header__emoji">${list.emoji || '🛒'}</span>
          <div>
            <h1 class="list-header__title" id="list-header-title">${_esc(list.name)}</h1>
            ${list.description
              ? `<p class="list-header__desc">${_esc(list.description)}</p>`
              : ''}
          </div>
        </div>
        <button class="icon-btn" id="list-edit-btn" aria-label="Modifier la liste">
          <span class="material-symbols-rounded">edit</span>
        </button>
      </div>

      <div class="list-header__stats" id="list-header-stats">
        ${_buildHeaderStatsHTML(stats, settings)}
      </div>

      <div class="list-header__progress-wrap">
        <div class="list-header__progress-bar">
          <div class="list-header__progress-fill"
            id="list-progress-fill"
            style="width: ${stats.progress}%">
          </div>
        </div>
        <span class="list-header__progress-text" id="list-progress-text">
          ${stats.checkedCount}/${stats.itemCount} articles
        </span>
      </div>
    `;

    header.querySelector('#back-btn')
      ?.addEventListener('click', () => Router.goHome());

    header.querySelector('#list-edit-btn')
      ?.addEventListener('click', () => Lists.openEditListModal(list));

    return header;
  }

  function _buildHeaderStatsHTML(stats, settings) {
    return `
      <div class="list-stat">
        <span class="material-symbols-rounded">inventory_2</span>
        <span id="stat-item-count">${stats.itemCount} article${stats.itemCount > 1 ? 's' : ''}</span>
      </div>
      ${settings.showPrices ? `
        <div class="list-stat list-stat--price ${stats.overBudget ? 'list-stat--over' : ''}">
          <span class="material-symbols-rounded">
            ${stats.overBudget ? 'warning' : 'payments'}
          </span>
          <span id="stat-total">
            ${Utils.formatCurrency(stats.total, settings.currencySymbol)}
          </span>
        </div>
        <div class="list-stat">
          <span class="material-symbols-rounded">check_circle</span>
          <span id="stat-checked-total">
            ${Utils.formatCurrency(stats.checkedTotal, settings.currencySymbol)}
          </span>
        </div>
      ` : ''}
    `;
  }

  function _refreshListHeader(listId) {
    const list  = Store.getListById(listId);
    if (!list) return;
    const stats    = Store.getListStats(listId);
    const settings = Store.getSettings();

    const titleEl  = document.getElementById('list-header-title');
    const statsEl  = document.getElementById('list-header-stats');
    const fillEl   = document.getElementById('list-progress-fill');
    const textEl   = document.getElementById('list-progress-text');

    if (titleEl)  titleEl.textContent  = list.name;
    if (statsEl)  statsEl.innerHTML    = _buildHeaderStatsHTML(stats, settings);
    if (fillEl)   fillEl.style.width   = `${stats.progress}%`;
    if (textEl)   textEl.textContent   = `${stats.checkedCount}/${stats.itemCount} articles`;
  }

  // ─── Barre budget ─────────────────────────────────────────────────────────

  function _buildBudgetBar(list) {
    const wrap = document.createElement('div');
    wrap.id    = 'budget-bar-wrap';
    wrap.appendChild(_buildBudgetBarContent(list));
    return wrap;
  }

  function _buildBudgetBarContent(list) {
    const stats    = Store.getListStats(list.id);
    const settings = Store.getSettings();

    if (!list.budget || !settings.showPrices) {
      const empty = document.createElement('div');
      empty.style.display = 'none';
      return empty;
    }

    const pct     = Math.min((stats.total / list.budget) * 100, 100);
    const bar     = document.createElement('div');
    bar.className = 'budget-bar';
    bar.innerHTML = `
      <div class="budget-bar__labels">
        <span>
          <span class="material-symbols-rounded">account_balance_wallet</span>
          Budget
        </span>
        <span class="budget-bar__amounts ${stats.overBudget ? 'budget-bar__amounts--over' : ''}">
          ${Utils.formatCurrency(stats.total, settings.currencySymbol)}
          /
          ${Utils.formatCurrency(list.budget, settings.currencySymbol)}
          ${stats.overBudget
            ? `<span class="budget-bar__over">+${Utils.formatCurrency(
                Math.abs(stats.budgetRemaining), settings.currencySymbol
              )}</span>`
            : `<span class="budget-bar__remaining">
                reste ${Utils.formatCurrency(stats.budgetRemaining, settings.currencySymbol)}
               </span>`
          }
        </span>
      </div>
      <div class="budget-bar__track">
        <div class="budget-bar__fill ${stats.overBudget ? 'budget-bar__fill--over' : ''}"
          style="width: ${pct}%">
        </div>
      </div>
    `;
    return bar;
  }

  function _refreshBudgetBar(listId) {
    const list = Store.getListById(listId);
    if (!list) return;
    const wrap = document.getElementById('budget-bar-wrap');
    if (!wrap) return;
    Utils.clearElement(wrap);
    wrap.appendChild(_buildBudgetBarContent(list));
  }

  // ─── Toolbar ──────────────────────────────────────────────────────────────

  function _buildListToolbar(list) {
    const toolbar = document.createElement('div');
    toolbar.className = 'list-toolbar';
    toolbar.innerHTML = `
      <div class="search-bar search-bar--sm">
        <span class="search-bar__icon material-symbols-rounded">search</span>
        <input
          type="search"
          class="search-bar__input"
          id="products-search"
          placeholder="Rechercher un produit..."
          autocomplete="off"
        />
      </div>
      <div class="list-toolbar__actions">
        <button class="icon-btn ${!showChecked ? 'icon-btn--active' : ''}"
          id="toggle-checked-btn"
          aria-label="${showChecked ? 'Masquer' : 'Afficher'} les cochés"
          title="${showChecked ? 'Masquer les cochés' : 'Afficher les cochés'}">
          <span class="material-symbols-rounded">
            ${showChecked ? 'visibility' : 'visibility_off'}
          </span>
        </button>
        <button class="icon-btn" id="products-sort-btn"
          aria-label="Trier les produits">
          <span class="material-symbols-rounded">filter_list</span>
        </button>
        <button class="icon-btn" id="uncheck-all-btn"
          aria-label="Tout décocher">
          <span class="material-symbols-rounded">remove_done</span>
        </button>
      </div>
    `;

    // Recherche
    const searchInput = toolbar.querySelector('#products-search');
    searchInput?.addEventListener('input', Utils.debounce((e) => {
      searchQuery = e.target.value;
      _refreshProductsContent(list.id);
    }, 250));

    // Toggle cochés
    toolbar.querySelector('#toggle-checked-btn')
      ?.addEventListener('click', (e) => {
        showChecked = !showChecked;
        const btn  = e.currentTarget;
        const icon = btn.querySelector('.material-symbols-rounded');
        btn.classList.toggle('icon-btn--active', !showChecked);
        if (icon) icon.textContent = showChecked ? 'visibility' : 'visibility_off';
        _refreshProductsContent(list.id);
      });

    // Tri
    toolbar.querySelector('#products-sort-btn')
      ?.addEventListener('click', (e) => _openProductSortMenu(e, list.id));

    // Tout décocher
    toolbar.querySelector('#uncheck-all-btn')
      ?.addEventListener('click', () => _uncheckAll(list.id));

    return toolbar;
  }

  // ─── Contenu produits ─────────────────────────────────────────────────────

  function _buildProductsContent(list) {
    const wrap = document.createElement('div');
    wrap.id    = 'products-content';
    wrap.appendChild(_renderProducts(list));
    return wrap;
  }

  function _refreshProductsContent(listId) {
    const list = Store.getListById(listId);
    if (!list) return;
    const wrap = document.getElementById('products-content');
    if (!wrap) return;
    Utils.clearElement(wrap);
    wrap.appendChild(_renderProducts(list));
  }

  function _renderProducts(list) {
    let products = [...list.products];

    // Filtre recherche
    if (searchQuery) {
      products = Utils.filterProducts(products, searchQuery);
    }

    // Filtre cochés
    if (!showChecked) {
      products = products.filter(p => !p.checked);
    }

    // Vide
    if (products.length === 0) {
      return _buildProductsEmptyState(list);
    }

    // Tri
    const sorted = Utils.sortProducts(products, sortBy);

    // Grouper par catégorie ou liste plate
    if (sortBy === 'category') {
      return _buildGroupedProducts(sorted, list.id);
    }
    return _buildFlatProducts(sorted, list.id);
  }

  // ─── Vue groupée par catégorie ────────────────────────────────────────────

  function _buildGroupedProducts(products, listId) {
    const categories = Store.getCategories();
    const groups     = Utils.groupByCategory(products, categories);
    const container  = document.createElement('div');
    container.className = 'products-grouped';

    groups.forEach(({ category, products: groupProducts }) => {
      const section = document.createElement('section');
      section.className = 'product-group';
      section.style.setProperty('--cat-color', category.color || 'oklch(65% 0.15 250)');

      // En-tête groupe
      const groupHeader = document.createElement('div');
      groupHeader.className = 'product-group__header';
      groupHeader.innerHTML = `
        <div class="product-group__title">
          <span class="product-group__emoji">${category.emoji}</span>
          <h3 class="product-group__name">${category.name}</h3>
          <span class="product-group__count">${groupProducts.length}</span>
        </div>
        <button class="product-group__add icon-btn"
          data-category="${category.id}"
          aria-label="Ajouter dans ${category.name}">
          <span class="material-symbols-rounded">add</span>
        </button>
      `;

      groupHeader.querySelector('.product-group__add')
        ?.addEventListener('click', (e) => {
          openAddProductModal(listId, e.currentTarget.dataset.category);
        });

      section.appendChild(groupHeader);

      // Items
      const ul = document.createElement('ul');
      ul.className = 'product-list';
      ul.setAttribute('aria-label', `Produits ${category.name}`);

      groupProducts.forEach(product => {
        ul.appendChild(_buildProductItem(product, listId));
      });

      section.appendChild(ul);
      container.appendChild(section);
    });

    return container;
  }

  // ─── Vue liste plate ──────────────────────────────────────────────────────

  function _buildFlatProducts(products, listId) {
    const container = document.createElement('div');
    container.className = 'products-flat';

    const ul = document.createElement('ul');
    ul.className = 'product-list';

    products.forEach(product => {
      ul.appendChild(_buildProductItem(product, listId));
    });

    container.appendChild(ul);
    return container;
  }

  // ─── Item produit ─────────────────────────────────────────────────────────

  function _buildProductItem(product, listId) {
    const li       = document.createElement('li');
    li.className   = `product-item${product.checked ? ' product-item--checked' : ''}`;
    li.id          = `product-${product.id}`;
    li.setAttribute('draggable', 'true');
    li.dataset.productId = product.id;

    const settings = Store.getSettings();
    const cat      = Store.getCategoryById(product.category) || {
      emoji: '📦', color: 'oklch(60% 0.08 250)',
    };
    const subtotal = (product.price && product.quantity)
      ? product.price * product.quantity
      : null;

    li.innerHTML = `
      <div class="product-item__drag-handle" aria-hidden="true">
        <span class="material-symbols-rounded">drag_indicator</span>
      </div>

      <button class="product-item__check"
        aria-label="${product.checked ? 'Décocher' : 'Cocher'} ${product.name}"
        aria-pressed="${product.checked}">
        <span class="material-symbols-rounded">
          ${product.checked ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </button>

      <div class="product-item__content">
        <div class="product-item__top">
          <span class="product-item__name">${_esc(product.name)}</span>
          ${product.note
            ? `<span class="product-item__note">${_esc(product.note)}</span>`
            : ''}
        </div>
        <div class="product-item__bottom">
          <span class="product-item__qty">
            ${Utils.formatQuantity(product.quantity, product.unit)}
          </span>
          <span class="product-item__cat-dot"
            style="background: ${cat.color}"
            title="${cat.emoji}">
          </span>
          ${settings.showPrices && product.price ? `
            <span class="product-item__price">
              ${Utils.formatCurrency(product.price, settings.currencySymbol)}
            </span>
            ${subtotal !== null && product.quantity > 1 ? `
              <span class="product-item__subtotal">
                = ${Utils.formatCurrency(subtotal, settings.currencySymbol)}
              </span>
            ` : ''}
          ` : ''}
        </div>
      </div>

      <div class="product-item__actions">
        <button class="product-item__action-btn"
          data-action="edit"
          aria-label="Modifier ${_esc(product.name)}">
          <span class="material-symbols-rounded">edit</span>
        </button>
        <button class="product-item__action-btn product-item__action-btn--danger"
          data-action="delete"
          aria-label="Supprimer ${_esc(product.name)}">
          <span class="material-symbols-rounded">delete</span>
        </button>
      </div>
    `;

    // ── Cocher / décocher
    li.querySelector('.product-item__check')
      ?.addEventListener('click', () => _toggleProduct(listId, product.id));

    // ── Double clic pour cocher
    li.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.product-item__actions')) {
        _toggleProduct(listId, product.id);
      }
    });

    // ── Éditer
    li.querySelector('[data-action="edit"]')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditProductModal(listId, product);
      });

    // ── Supprimer
    li.querySelector('[data-action="delete"]')
      ?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await _deleteProduct(listId, product.id, product.name);
      });

    // ── Swipe to delete (mobile)
    _addSwipeActions(li, listId, product);

    // ── Drag & Drop
    _addDragEvents(li, listId);

    return li;
  }

  // ─── Toggle produit ───────────────────────────────────────────────────────

  function _toggleProduct(listId, productId) {
    const product = Store.toggleProduct(listId, productId);
    if (!product) return;

    // Animation micro
    const item = document.getElementById(`product-${productId}`);
    if (item) {
      item.classList.toggle('product-item--checked', product.checked);
      const icon = item.querySelector('.product-item__check .material-symbols-rounded');
      if (icon) {
        icon.textContent = product.checked ? 'check_circle' : 'radio_button_unchecked';
      }
      const checkBtn = item.querySelector('.product-item__check');
      checkBtn?.setAttribute('aria-pressed', product.checked.toString());

      // Micro-animation
      item.classList.add('product-item--bounce');
      item.addEventListener('animationend', () => {
        item.classList.remove('product-item--bounce');
      }, { once: true });
    }
  }

  // ─── Swipe actions (mobile) ───────────────────────────────────────────────

  function _addSwipeActions(li, listId, product) {
    let startX    = 0;
    let currentX  = 0;
    let swiping   = false;
    const THRESHOLD = 80;

    li.addEventListener('touchstart', (e) => {
      // Ne pas activer si on touche les boutons d'action
      if (e.target.closest('.product-item__actions, .product-item__check')) return;
      startX  = e.touches[0].clientX;
      swiping = true;
      li.style.transition = 'none';
    }, { passive: true });

    li.addEventListener('touchmove', (e) => {
      if (!swiping) return;
      currentX  = e.touches[0].clientX;
      const dx  = currentX - startX;

      if (dx < -10) {
        // Swipe gauche → supprimer
        const translate = Math.max(dx, -120);
        li.style.transform = `translateX(${translate}px)`;
        li.style.opacity   = `${1 - Math.abs(translate) / 150}`;
      } else if (dx > 10) {
        // Swipe droite → cocher
        const translate = Math.min(dx, 80);
        li.style.transform = `translateX(${translate}px)`;
      }
    }, { passive: true });

    li.addEventListener('touchend', async () => {
      if (!swiping) return;
      swiping = false;
      li.style.transition = '';

      const dx = currentX - startX;

      if (dx < -THRESHOLD) {
        // Swipe gauche = supprimer
        await _deleteProduct(listId, product.id, product.name);
      } else if (dx > THRESHOLD) {
        // Swipe droite = cocher
        li.style.transform = '';
        li.style.opacity   = '';
        _toggleProduct(listId, product.id);
      } else {
        li.style.transform = '';
        li.style.opacity   = '';
      }
    }, { passive: true });
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  function _addDragEvents(li, listId) {
    li.addEventListener('dragstart', (e) => {
      dragSrc = li;
      li.classList.add('product-item--dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.dataset.productId);
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('product-item--dragging');
      document.querySelectorAll('.product-item--drag-over')
        .forEach(el => el.classList.remove('product-item--drag-over'));
      dragSrc = null;
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dragSrc && dragSrc !== li) {
        li.classList.add('product-item--drag-over');
      }
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('product-item--drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('product-item--drag-over');
      if (!dragSrc || dragSrc === li) return;

      const list     = Store.getListById(listId);
      if (!list) return;

      const srcId    = dragSrc.dataset.productId;
      const tgtId    = li.dataset.productId;
      const products = [...list.products];
      const srcIdx   = products.findIndex(p => p.id === srcId);
      const tgtIdx   = products.findIndex(p => p.id === tgtId);

      if (srcIdx === -1 || tgtIdx === -1) return;

      // Réordonner
      const [moved] = products.splice(srcIdx, 1);
      products.splice(tgtIdx, 0, moved);
      Store.reorderProducts(listId, products);
    });
  }

  // ─── Actions produit ──────────────────────────────────────────────────────

  async function _deleteProduct(listId, productId, name) {
    const confirmed = await Modals.confirm({
      title  : 'Supprimer le produit',
      message: `Supprimer "${name}" de la liste ?`,
      danger : true,
      confirmLabel: 'Supprimer',
    });
    if (!confirmed) return;

    Store.deleteProduct(listId, productId);
    Notifications.success(`"${name}" supprimé.`);
  }

  function _uncheckAll(listId) {
    const list = Store.getListById(listId);
    if (!list) return;

    const checked = list.products.filter(p => p.checked);
    if (checked.length === 0) {
      Notifications.info('Aucun article coché.');
      return;
    }

    checked.forEach(p => Store.updateProduct(listId, p.id, { checked: false }));
    Notifications.success(`${checked.length} article(s) décoché(s).`);
    _refreshProductsContent(listId);
    _refreshListHeader(listId);
  }

  // ─── Modales produit ──────────────────────────────────────────────────────

  /**
   * Ouvrir la modale d'ajout de produit
   * @param {string} listId
   * @param {string} [defaultCategory]
   */
  function openAddProductModal(listId, defaultCategory = null) {
    const categories = Store.getCategories();
    const content    = _buildProductFormContent(null, categories, defaultCategory);

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Ajouter un produit',
      icon    : 'add_shopping_cart',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => Modals.close(modalId),
        },
        {
          label  : 'Ajouter',
          type   : 'primary',
          icon   : 'add',
          onClick: () => _submitProductForm(modalId, listId, null),
        },
      ],
    });

    setTimeout(() => _initProductFormEvents(modalId, listId), 100);
    return modalId;
  }

  /**
   * Ouvrir la modale d'édition de produit
   * @param {string} listId
   * @param {object} product
   */
  function openEditProductModal(listId, product) {
    const categories = Store.getCategories();
    const content    = _buildProductFormContent(product, categories, null);

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Modifier le produit',
      icon    : 'edit',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => Modals.close(modalId),
        },
        {
          label  : 'Enregistrer',
          type   : 'primary',
          icon   : 'save',
          onClick: () => _submitProductForm(modalId, listId, product),
        },
      ],
    });

    setTimeout(() => _initProductFormEvents(modalId, listId, product), 100);
    return modalId;
  }

  // ─── Formulaire produit ───────────────────────────────────────────────────

  function _buildProductFormContent(product, categories, defaultCategory) {
    const selCat  = defaultCategory || product?.category || categories[0]?.id || 'other';
    const units   = Utils.UNITS;

    return `
      <form id="product-form" class="modal-form" novalidate autocomplete="off">

        <!-- Nom + auto-complétion -->
        <div class="form-group form-group--autocomplete">
          <label class="form-label" for="pf-name">
            <span class="material-symbols-rounded">inventory_2</span>
            Nom du produit *
          </label>
          <div class="autocomplete-wrap">
            <input
              type="text"
              id="pf-name"
              name="name"
              class="form-input"
              placeholder="Ex : Lait entier"
              value="${_esc(product?.name || '')}"
              maxlength="80"
              required
            />
            <div class="autocomplete-dropdown" id="autocomplete-dropdown"></div>
          </div>
          <span class="form-error" id="error-name"></span>
          <!-- Suggestions catégorie -->
          <div class="cat-suggestions" id="cat-suggestions"></div>
        </div>

        <!-- Catégorie -->
        <div class="form-group">
          <label class="form-label" for="pf-category">
            <span class="material-symbols-rounded">category</span>
            Catégorie
          </label>
          <select id="pf-category" name="category" class="form-select">
            ${categories.map(cat => `
              <option value="${cat.id}" ${selCat === cat.id ? 'selected' : ''}>
                ${cat.emoji} ${cat.name}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Quantité + Unité -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="pf-qty">
              <span class="material-symbols-rounded">numbers</span>
              Quantité
            </label>
            <div class="qty-input-wrap">
              <button type="button" class="qty-btn" id="qty-minus" aria-label="Moins">
                <span class="material-symbols-rounded">remove</span>
              </button>
              <input
                type="number"
                id="pf-qty"
                name="quantity"
                class="form-input form-input--qty"
                value="${product?.quantity || 1}"
                min="0.1"
                step="0.1"
                placeholder="1"
              />
              <button type="button" class="qty-btn" id="qty-plus" aria-label="Plus">
                <span class="material-symbols-rounded">add</span>
              </button>
            </div>
            <span class="form-error" id="error-quantity"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="pf-unit">
              <span class="material-symbols-rounded">straighten</span>
              Unité
            </label>
            <select id="pf-unit" name="unit" class="form-select">
              ${units.map(u => `
                <option value="${u.value}"
                  ${(product?.unit || 'pcs') === u.value ? 'selected' : ''}>
                  ${u.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Prix -->
        <div class="form-group">
          <label class="form-label" for="pf-price">
            <span class="material-symbols-rounded">euro</span>
            Prix unitaire (€)
          </label>
          <input
            type="number"
            id="pf-price"
            name="price"
            class="form-input"
            value="${product?.price || ''}"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          <span class="form-error" id="error-price"></span>
          <!-- Aperçu sous-total -->
          <span class="form-hint" id="subtotal-hint"></span>
        </div>

        <!-- Note -->
        <div class="form-group">
          <label class="form-label" for="pf-note">
            <span class="material-symbols-rounded">sticky_note_2</span>
            Note
          </label>
          <input
            type="text"
            id="pf-note"
            name="note"
            class="form-input"
            placeholder="Ex : Bio, marque X, sans gluten..."
            value="${_esc(product?.note || '')}"
            maxlength="100"
          />
        </div>

      </form>
    `;
  }

  // ─── Events formulaire produit ────────────────────────────────────────────

  function _initProductFormEvents(modalId, listId, product = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const nameInput  = modal.querySelector('#pf-name');
    const qtyInput   = modal.querySelector('#pf-qty');
    const priceInput = modal.querySelector('#pf-price');
    const catSelect  = modal.querySelector('#pf-category');
    const qtyMinus   = modal.querySelector('#qty-minus');
    const qtyPlus    = modal.querySelector('#qty-plus');
    const hintEl     = modal.querySelector('#subtotal-hint');

    // ── Sous-total en temps réel
    const updateSubtotal = () => {
      const qty   = parseFloat(qtyInput?.value) || 0;
      const price = parseFloat(priceInput?.value) || 0;
      if (qty > 0 && price > 0 && hintEl) {
        const settings = Store.getSettings();
        hintEl.textContent =
          `Sous-total : ${Utils.formatCurrency(qty * price, settings.currencySymbol)}`;
      } else if (hintEl) {
        hintEl.textContent = '';
      }
    };

    qtyInput?.addEventListener('input', updateSubtotal);
    priceInput?.addEventListener('input', updateSubtotal);
    updateSubtotal();

    // ── Boutons +/-
    qtyMinus?.addEventListener('click', () => {
      const val = parseFloat(qtyInput.value) || 1;
      qtyInput.value = Math.max(0.1, val - 1).toString();
      updateSubtotal();
    });

    qtyPlus?.addEventListener('click', () => {
      const val = parseFloat(qtyInput.value) || 0;
      qtyInput.value = (val + 1).toString();
      updateSubtotal();
    });

    // ── Auto-complétion + auto-catégorie
    nameInput?.addEventListener('input', Utils.debounce((e) => {
      const val = e.target.value.trim();
      _updateAutoComplete(modal, val, listId);
      _updateCategorySuggestions(modal, val, catSelect);
    }, 250));

    // ── Focus auto-complétion
    nameInput?.addEventListener('focus', () => {
      const val = nameInput.value.trim();
      if (val.length > 0) _updateAutoComplete(modal, val, listId);
    });

    // Focus initial
    setTimeout(() => nameInput?.focus(), 100);
  }

  // ─── Auto-complétion ──────────────────────────────────────────────────────

  function _updateAutoComplete(modal, query, listId) {
    const dropdown = modal.querySelector('#autocomplete-dropdown');
    if (!dropdown || query.length < 2) {
      if (dropdown) dropdown.innerHTML = '';
      return;
    }

    // Collecter tous les noms de produits existants (toutes listes)
    const allProducts = Store.getLists()
      .flatMap(l => l.products)
      .map(p => p.name)
      .filter((name, i, arr) => arr.indexOf(name) === i); // unique

    const matches = allProducts
      .filter(name => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 6);

    if (matches.length === 0) {
      dropdown.innerHTML = '';
      return;
    }

    dropdown.innerHTML = matches.map(name => `
      <button type="button" class="autocomplete-item" data-name="${_esc(name)}">
        <span class="material-symbols-rounded">history</span>
        ${_esc(name)}
      </button>
    `).join('');

    dropdown.querySelectorAll('.autocomplete-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const nameInput = modal.querySelector('#pf-name');
        if (nameInput) {
          nameInput.value = btn.dataset.name;
          nameInput.dispatchEvent(new Event('input'));
        }
        dropdown.innerHTML = '';
      });
    });
  }

  // ─── Suggestions catégorie ────────────────────────────────────────────────

  function _updateCategorySuggestions(modal, query, catSelect) {
    const suggestEl = modal.querySelector('#cat-suggestions');
    if (!suggestEl || !query) { if (suggestEl) suggestEl.innerHTML = ''; return; }

    const suggestions = Categories.suggestCategories(query);
    if (suggestions.length === 0) { suggestEl.innerHTML = ''; return; }

    suggestEl.innerHTML = `
      <span class="cat-suggestions__label">Catégorie suggérée :</span>
      ${suggestions.map(cat => `
        <button type="button" class="cat-suggestion-btn" data-cat-id="${cat.id}">
          ${cat.emoji} ${cat.name}
        </button>
      `).join('')}
    `;

    suggestEl.querySelectorAll('.cat-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (catSelect) {
          catSelect.value = btn.dataset.catId;
          // Highlight
          suggestEl.querySelectorAll('.cat-suggestion-btn')
            .forEach(b => b.classList.remove('cat-suggestion-btn--selected'));
          btn.classList.add('cat-suggestion-btn--selected');
        }
      });
    });

    // Auto-sélection si suggestion forte
    const detected = Categories.detectCategory(query);
    if (detected !== 'other' && catSelect) {
      catSelect.value = detected;
    }
  }

  // ─── Soumission formulaire ────────────────────────────────────────────────

  function _submitProductForm(modalId, listId, existing) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const form = modal.querySelector('#product-form');
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });

    // Validation
    const { isValid, errors } = Utils.validateProductForm(data);
    if (!isValid) {
      _showFormErrors(form, errors);
      return;
    }

    if (existing) {
      Store.updateProduct(listId, existing.id, data);
      Notifications.success(`"${data.name}" mis à jour !`);
    } else {
      Store.addProduct(listId, data);
      Notifications.success(`"${data.name}" ajouté !`);
    }

    Modals.close(modalId);
  }

  function _showFormErrors(form, errors) {
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-input--error').forEach(el =>
      el.classList.remove('form-input--error'));

    Object.entries(errors).forEach(([field, msg]) => {
      const errorEl = form.querySelector(`#error-${field}`);
      const inputEl = form.querySelector(`[name="${field}"]`);
      if (errorEl) errorEl.textContent = msg;
      if (inputEl) {
        inputEl.classList.add('form-input--error');
        Utils.shake(inputEl);
      }
    });
  }

  // ─── Menu tri produits ────────────────────────────────────────────────────

  function _openProductSortMenu(e, listId) {
    const options = [
      { value: 'category', label: 'Par catégorie',     icon: 'category' },
      { value: 'name',     label: 'Nom (A → Z)',        icon: 'sort_by_alpha' },
      { value: 'price',    label: 'Prix (décroissant)', icon: 'payments' },
      { value: 'added',    label: 'Ajout récent',       icon: 'schedule' },
      { value: 'checked',  label: 'Non cochés en tête', icon: 'check_circle' },
    ];

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id        = 'sort-products-menu';

    const title = document.createElement('div');
    title.className   = 'context-menu__title';
    title.textContent = 'Trier les produits';
    menu.appendChild(title);

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
        document.getElementById('sort-products-menu')?.remove();
        _refreshProductsContent(listId);
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.zIndex   = '9999';
    menu.style.right    = `${window.innerWidth - rect.right}px`;
    menu.style.top      = `${rect.bottom + 4}px`;

    requestAnimationFrame(() => menu.classList.add('context-menu--visible'));
    setTimeout(() => {
      document.addEventListener('click', () => {
        menu.classList.remove('context-menu--visible');
        setTimeout(() => menu.remove(), 200);
      }, { once: true });
    }, 10);
  }

  // ─── FAB produit ──────────────────────────────────────────────────────────

  function _ensureProductFAB(listId) {
    // Supprimer FAB listes si présent
    const oldFab = document.getElementById('fab-new-list');
    if (oldFab) oldFab.remove();

    let fab = document.getElementById('fab-add-product');
    if (!fab) {
      fab = document.createElement('button');
      fab.id        = 'fab-add-product';
      fab.className = 'fab';
      fab.setAttribute('aria-label', 'Ajouter un produit');
      fab.innerHTML = `
        <span class="material-symbols-rounded fab__icon">add</span>
        <span class="fab__label">Ajouter un produit</span>
      `;
      document.getElementById('app-root')?.appendChild(fab);
    }

    fab.onclick = () => openAddProductModal(listId);
  }

  // ─── État vide produits ───────────────────────────────────────────────────

  function _buildProductsEmptyState(list) {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state empty-state--products';

    if (searchQuery) {
      wrap.innerHTML = `
        <span class="material-symbols-rounded empty-state__icon">search_off</span>
        <h3 class="empty-state__title">Aucun résultat</h3>
        <p class="empty-state__desc">
          Aucun produit ne correspond à "<strong>${_esc(searchQuery)}</strong>"
        </p>
      `;
    } else {
      wrap.innerHTML = `
        <div class="empty-state__illustration">
          <img
            src="https://images.unsplash.com/photo-1506617420156-8e4536971650?w=280&q=70"
            alt="Liste vide"
            class="empty-state__img"
          />
        </div>
        <h3 class="empty-state__title">Liste vide</h3>
        <p class="empty-state__desc">
          Ajoutez vos premiers produits à "${_esc(list.name)}"
        </p>
        <button class="btn btn--primary" id="empty-add-product-btn">
          <span class="material-symbols-rounded">add</span>
          Ajouter un produit
        </button>
      `;
      wrap.querySelector('#empty-add-product-btn')
        ?.addEventListener('click', () => openAddProductModal(list.id));
    }

    return wrap;
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    destroy,
    renderListPage,
    openAddProductModal,
    openEditProductModal,
  };
})();

window.Products = Products;