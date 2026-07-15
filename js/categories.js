/**
 * CATEGORIES.JS - Gestion des catégories
 * Features : initialisation, auto-détection, vue grille,
 *            formulaire création/édition, recherche produit → catégorie
 */

const Categories = (() => {

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    // Charger catégories par défaut si aucune en store
    if (Store.getCategories().length === 0) {
      Store.setCategories([...DEFAULT_CATEGORIES]);
    }

    // Écouter les events
    Store.subscribe('category:added',   _onCategoriesChange);
    Store.subscribe('category:updated', _onCategoriesChange);
    Store.subscribe('category:deleted', _onCategoriesChange);

    console.info('[Categories] Initialisé —', Store.getCategories().length, 'catégories');
  }

  function _onCategoriesChange() {
    // Rafraîchir la page si on est sur /categories
    const { route } = Router.getCurrentRoute();
    if (route === Router.ROUTES.CATEGORIES) {
      renderPage();
    }
  }

  // ─── Auto-détection de catégorie ──────────────────────────────────────────

  /**
   * Détecter automatiquement la catégorie d'un produit selon son nom
   * @param {string} productName
   * @returns {string} id de catégorie
   */
  function detectCategory(productName) {
    if (!productName) return 'other';

    const name       = productName.toLowerCase().trim();
    const categories = Store.getCategories();

    let bestMatch    = { id: 'other', score: 0 };

    for (const cat of categories) {
      if (cat.id === 'other') continue;

      for (const keyword of (cat.keywords || [])) {
        // Correspondance exacte = score max
        if (name === keyword) {
          return cat.id;
        }
        // Contenu
        if (name.includes(keyword) || keyword.includes(name)) {
          const score = keyword.length / Math.max(name.length, keyword.length);
          if (score > bestMatch.score) {
            bestMatch = { id: cat.id, score };
          }
        }
      }
    }

    return bestMatch.score > 0.3 ? bestMatch.id : 'other';
  }

  /**
   * Suggestions de catégories pour un nom de produit (top 3)
   * @param {string} productName
   * @returns {Array}
   */
  function suggestCategories(productName) {
    if (!productName) return [];

    const name       = productName.toLowerCase().trim();
    const categories = Store.getCategories();
    const scores     = [];

    for (const cat of categories) {
      if (cat.id === 'other') continue;
      let score = 0;

      for (const keyword of (cat.keywords || [])) {
        if (name === keyword) { score = Math.max(score, 1); break; }
        if (name.includes(keyword) || keyword.includes(name)) {
          score = Math.max(score, keyword.length / Math.max(name.length, keyword.length));
        }
      }

      if (score > 0) scores.push({ category: cat, score });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.category);
  }

  // ─── Rendu page /categories ───────────────────────────────────────────────

  function renderPage() {
    const main = document.getElementById('app-main');
    if (!main) return;

    const categories = Store.getCategories();
    const custom     = categories.filter(c => c.isCustom);
    const defaults   = categories.filter(c => !c.isCustom);

    main.innerHTML = '';

    // ── En-tête
    const header = _buildPageHeader(categories.length);
    main.appendChild(header);

    // ── Catégories par défaut
    if (defaults.length > 0) {
      const section = _buildCategorySection('Par défaut', defaults, false);
      main.appendChild(section);
    }

    // ── Catégories personnalisées
    const customSection = _buildCategorySection(
      'Mes catégories',
      custom,
      true,
    );
    main.appendChild(customSection);

    // ── Bouton ajout
    const addBtn = _buildAddButton();
    main.appendChild(addBtn);

    // Animation entrée
    Utils.animateIn(main, 'page-enter');
  }

  function _buildPageHeader(count) {
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <div class="page-header__content">
        <h1 class="page-header__title">
          <span class="material-symbols-rounded">category</span>
          Catégories
        </h1>
        <p class="page-header__subtitle">${count} catégorie${count > 1 ? 's' : ''}</p>
      </div>
      <div class="page-header__actions">
        <button class="btn btn--primary btn--sm" id="add-category-btn">
          <span class="material-symbols-rounded">add</span>
          <span>Nouvelle</span>
        </button>
      </div>
    `;

    header.querySelector('#add-category-btn')
      ?.addEventListener('click', () => openCategoryForm());

    return header;
  }

  function _buildCategorySection(title, categories, showEmpty) {
    const section = document.createElement('section');
    section.className = 'categories-section';

    const titleEl = document.createElement('h2');
    titleEl.className   = 'categories-section__title';
    titleEl.textContent = title;
    section.appendChild(titleEl);

    if (categories.length === 0 && showEmpty) {
      const empty = document.createElement('div');
      empty.className = 'categories-empty';
      empty.innerHTML = `
        <span class="material-symbols-rounded categories-empty__icon">add_circle</span>
        <p>Aucune catégorie personnalisée</p>
        <button class="btn btn--ghost btn--sm" id="empty-add-cat">
          <span class="material-symbols-rounded">add</span>Créer une catégorie
        </button>
      `;
      empty.querySelector('#empty-add-cat')
        ?.addEventListener('click', () => openCategoryForm());
      section.appendChild(empty);
      return section;
    }

    const grid = document.createElement('div');
    grid.className = 'categories-grid';

    categories.forEach((cat, index) => {
      const card = _buildCategoryCard(cat);
      card.style.animationDelay = `${index * 50}ms`;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
  }

  function _buildCategoryCard(cat) {
    const card = document.createElement('div');
    card.className = 'category-card animate-in';
    card.style.setProperty('--cat-color', cat.color);

    // Compter les produits de cette catégorie
    const lists          = Store.getLists();
    const productCount   = lists.reduce((sum, list) => {
      return sum + list.products.filter(p => p.category === cat.id).length;
    }, 0);

    card.innerHTML = `
      <div class="category-card__image-wrap">
        <img
          class="category-card__image"
          src="${cat.imageThumb || cat.image}"
          alt="${cat.name}"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        />
        <div class="category-card__image-fallback" style="display:none">
          <span class="material-symbols-rounded">${cat.icon}</span>
        </div>
        <div class="category-card__overlay">
          <span class="category-card__emoji">${cat.emoji}</span>
        </div>
        ${productCount > 0 ? `
          <div class="category-card__badge">${productCount}</div>
        ` : ''}
      </div>
      <div class="category-card__body">
        <h3 class="category-card__name">${cat.name}</h3>
        <p class="category-card__count">
          ${productCount > 0
            ? `${productCount} produit${productCount > 1 ? 's' : ''}`
            : 'Aucun produit'}
        </p>
      </div>
      ${cat.isCustom ? `
        <div class="category-card__actions">
          <button class="category-card__action-btn" data-action="edit" data-id="${cat.id}"
            aria-label="Modifier ${cat.name}">
            <span class="material-symbols-rounded">edit</span>
          </button>
          <button class="category-card__action-btn category-card__action-btn--danger"
            data-action="delete" data-id="${cat.id}"
            aria-label="Supprimer ${cat.name}">
            <span class="material-symbols-rounded">delete</span>
          </button>
        </div>
      ` : ''}
    `;

    // Events
    card.querySelector('[data-action="edit"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openCategoryForm(cat);
    });

    card.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await Modals.confirm({
        title  : 'Supprimer la catégorie',
        message: `Supprimer "${cat.name}" ? Les produits associés passeront en "Autre".`,
        danger : true,
        confirmLabel: 'Supprimer',
      });
      if (confirmed) deleteCategory(cat.id);
    });

    return card;
  }

  function _buildAddButton() {
    const wrap = document.createElement('div');
    wrap.className = 'categories-add-wrap';
    wrap.innerHTML = `
      <button class="btn btn--primary btn--lg btn--full" id="categories-add-btn">
        <span class="material-symbols-rounded">add</span>
        Nouvelle catégorie
      </button>
    `;
    wrap.querySelector('#categories-add-btn')
      ?.addEventListener('click', () => openCategoryForm());
    return wrap;
  }

  // ─── Formulaire catégorie ─────────────────────────────────────────────────

  function openCategoryForm(category = null) {
    const isEdit   = !!category;
    const colors   = Utils.getPresetColors();
    const icons    = [
      'nutrition','set_meal','egg','bakery_dining','shelves',
      'local_bar','ac_unit','spa','cleaning_services','child_care',
      'pets','devices','category','storefront','local_grocery_store',
      'restaurant','coffee','cake','local_pizza','fastfood',
    ];

    const formContent = `
      <form id="category-form" class="modal-form" novalidate>

        <div class="form-group">
          <label class="form-label" for="cat-name">
            <span class="material-symbols-rounded">label</span>
            Nom *
          </label>
          <input
            type="text"
            id="cat-name"
            name="name"
            class="form-input"
            placeholder="Ex : Végétarien"
            value="${category?.name || ''}"
            maxlength="40"
            required
          />
          <span class="form-error" id="error-name"></span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="cat-emoji">
              <span class="material-symbols-rounded">mood</span>
              Emoji
            </label>
            <input
              type="text"
              id="cat-emoji"
              name="emoji"
              class="form-input form-input--emoji"
              value="${category?.emoji || '📦'}"
              maxlength="2"
              placeholder="📦"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="cat-image">
              <span class="material-symbols-rounded">image</span>
              URL image
            </label>
            <input
              type="url"
              id="cat-image"
              name="image"
              class="form-input"
              placeholder="https://..."
              value="${category?.image || ''}"
            />
          </div>
        </div>

        <!-- Prévisualisation image -->
        <div class="form-group" id="image-preview-wrap" style="${category?.image ? '' : 'display:none'}">
          <div class="image-preview">
            <img id="image-preview" src="${category?.image || ''}" alt="Aperçu" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-symbols-rounded">palette</span>
            Couleur
          </label>
          <div class="color-picker" id="cat-color-picker">
            ${colors.map(color => `
              <button type="button"
                class="color-swatch${(category?.color || colors[0]) === color ? ' color-swatch--selected' : ''}"
                data-color="${color}"
                style="background: ${color}"
                aria-label="Couleur"
              >
                ${(category?.color || colors[0]) === color
                  ? '<span class="material-symbols-rounded">check</span>'
                  : ''}
              </button>
            `).join('')}
          </div>
          <input type="hidden" name="color" id="cat-color"
            value="${category?.color || colors[0]}" />
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-symbols-rounded">category</span>
            Icône
          </label>
          <div class="icon-picker" id="cat-icon-picker">
            ${icons.map(icon => `
              <button type="button"
                class="icon-swatch${(category?.icon || 'category') === icon ? ' icon-swatch--selected' : ''}"
                data-icon="${icon}"
                aria-label="${icon}"
              >
                <span class="material-symbols-rounded">${icon}</span>
              </button>
            `).join('')}
          </div>
          <input type="hidden" name="icon" id="cat-icon"
            value="${category?.icon || 'category'}" />
        </div>

      </form>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie',
      icon    : isEdit ? 'edit' : 'add',
      content : formContent,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => Modals.close(modalId),
        },
        {
          label  : isEdit ? 'Enregistrer' : 'Créer',
          type   : 'primary',
          icon   : isEdit ? 'save' : 'add',
          onClick: () => _submitCategoryForm(modalId, category),
        },
      ],
    });

    // Init pickers après DOM
    setTimeout(() => _initCategoryFormEvents(modalId), 100);
    return modalId;
  }

  function _initCategoryFormEvents(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Color picker
    const colorPicker = modal.querySelector('#cat-color-picker');
    const colorHidden = modal.querySelector('#cat-color');
    colorPicker?.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      colorPicker.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.remove('color-swatch--selected');
        s.innerHTML = '';
      });
      swatch.classList.add('color-swatch--selected');
      swatch.innerHTML = '<span class="material-symbols-rounded">check</span>';
      if (colorHidden) colorHidden.value = swatch.dataset.color;
    });

    // Icon picker
    const iconPicker = modal.querySelector('#cat-icon-picker');
    const iconHidden = modal.querySelector('#cat-icon');
    iconPicker?.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-swatch');
      if (!btn) return;
      iconPicker.querySelectorAll('.icon-swatch').forEach(b =>
        b.classList.remove('icon-swatch--selected')
      );
      btn.classList.add('icon-swatch--selected');
      if (iconHidden) iconHidden.value = btn.dataset.icon;
    });

    // Prévisualisation image
    const imageInput   = modal.querySelector('#cat-image');
    const previewWrap  = modal.querySelector('#image-preview-wrap');
    const previewImg   = modal.querySelector('#image-preview');

    imageInput?.addEventListener('input', Utils.debounce((e) => {
      const url = e.target.value.trim();
      if (url && previewImg && previewWrap) {
        previewImg.src           = url;
        previewWrap.style.display = '';
        previewImg.onerror       = () => { previewWrap.style.display = 'none'; };
      } else if (previewWrap) {
        previewWrap.style.display = 'none';
      }
    }, 500));
  }

  function _submitCategoryForm(modalId, existing) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const form = modal.querySelector('#category-form');
    const data = {};
    new FormData(form).forEach((v, k) => data[k] = v);
    form.querySelectorAll('input[type="hidden"]').forEach(i => data[i.name] = i.value);

    // Validation
    if (!data.name || !data.name.trim()) {
      const nameInput = form.querySelector('#cat-name');
      const errorEl   = form.querySelector('#error-name');
      if (errorEl)   errorEl.textContent = 'Le nom est requis';
      if (nameInput) {
        nameInput.classList.add('form-input--error');
        Utils.shake(nameInput);
      }
      return;
    }

    if (existing) {
      Store.updateCategory(existing.id, { ...data, isCustom: true });
      Notifications.success(`Catégorie "${data.name}" mise à jour !`);
    } else {
      Store.addCategory({ ...data, isCustom: true });
      Notifications.success(`Catégorie "${data.name}" créée !`);
    }

    Modals.close(modalId);
  }

  // ─── Suppression ──────────────────────────────────────────────────────────

  function deleteCategory(id) {
    const cat = Store.getCategoryById(id);
    if (!cat) return;

    // Réassigner les produits vers 'other'
    const lists = Store.getLists();
    lists.forEach(list => {
      list.products
        .filter(p => p.category === id)
        .forEach(p => Store.updateProduct(list.id, p.id, { category: 'other' }));
    });

    Store.deleteCategory(id);
    Notifications.success(`Catégorie "${cat.name}" supprimée.`);
  }

  // ─── Helpers UI ───────────────────────────────────────────────────────────

  /**
   * Générer le badge HTML d'une catégorie
   * @param {string} categoryId
   * @returns {string} HTML
   */
  function getCategoryBadgeHTML(categoryId) {
    const cat = Store.getCategoryById(categoryId) || {
      emoji: '📦', name: 'Autre', color: 'oklch(60% 0.08 250)',
    };
    return `
      <span class="category-badge" style="--cat-color: ${cat.color}">
        <span class="category-badge__emoji">${cat.emoji}</span>
        <span class="category-badge__name">${cat.name}</span>
      </span>
    `;
  }

  /**
   * Options select HTML pour les catégories
   * @param {string} selectedId
   * @returns {string} HTML options
   */
  function getCategoryOptionsHTML(selectedId = 'other') {
    return Store.getCategories()
      .map(cat => `
        <option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>
          ${cat.emoji} ${cat.name}
        </option>
      `)
      .join('');
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    detectCategory,
    suggestCategories,
    renderPage,
    openCategoryForm,
    deleteCategory,
    getCategoryBadgeHTML,
    getCategoryOptionsHTML,
  };
})();

window.Categories = Categories;