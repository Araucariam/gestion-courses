/**
 * TEMPLATES.JS - Templates de listes prédéfinies
 * Features : catalogue de templates, aperçu, création rapide,
 *            templates custom, import/export
 */

const Templates = (() => {

  // ─── Catalogue de templates ───────────────────────────────────

  const BUILTIN_TEMPLATES = [
    {
      id         : 'tpl-semaine',
      name       : 'Courses de la semaine',
      description: 'Essentiels du quotidien pour 4 personnes',
      emoji      : '🛒',
      icon       : 'shopping_cart',
      color      : 'oklch(65% 0.2 250)',
      image      : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
      tags       : ['quotidien', 'semaine', 'famille'],
      budget     : 120,
      isBuiltin  : true,
      products   : [
        { name: 'Lait demi-écrémé',    category: 'produits-laitiers', quantity: 6,   unit: 'bouteille', price: 1.05 },
        { name: 'Œufs',                category: 'produits-laitiers', quantity: 12,  unit: 'pcs',       price: 0.25 },
        { name: 'Beurre',              category: 'produits-laitiers', quantity: 1,   unit: 'pcs',       price: 2.20 },
        { name: 'Yaourts nature',      category: 'produits-laitiers', quantity: 8,   unit: 'pcs',       price: 0.38 },
        { name: 'Fromage râpé',        category: 'produits-laitiers', quantity: 1,   unit: 'pcs',       price: 2.90 },
        { name: 'Pain de campagne',    category: 'boulangerie',       quantity: 2,   unit: 'pcs',       price: 2.50 },
        { name: 'Pâtes spaghetti',     category: 'epicerie',          quantity: 3,   unit: 'pcs',       price: 1.20 },
        { name: 'Riz basmati',         category: 'epicerie',          quantity: 1,   unit: 'kg',        price: 2.80 },
        { name: 'Sauce tomate',        category: 'epicerie',          quantity: 3,   unit: 'boite',     price: 0.95 },
        { name: 'Huile d\'olive',      category: 'epicerie',          quantity: 1,   unit: 'bouteille', price: 5.90 },
        { name: 'Tomates',             category: 'fruits-legumes',    quantity: 1,   unit: 'kg',        price: 2.90 },
        { name: 'Carottes',            category: 'fruits-legumes',    quantity: 1,   unit: 'kg',        price: 1.50 },
        { name: 'Salade verte',        category: 'fruits-legumes',    quantity: 1,   unit: 'pcs',       price: 1.20 },
        { name: 'Pommes',              category: 'fruits-legumes',    quantity: 6,   unit: 'pcs',       price: 0.55 },
        { name: 'Bananes',             category: 'fruits-legumes',    quantity: 1,   unit: 'kg',        price: 1.80 },
        { name: 'Poulet entier',       category: 'viandes-poissons',  quantity: 1,   unit: 'pcs',       price: 8.90 },
        { name: 'Steak haché',         category: 'viandes-poissons',  quantity: 4,   unit: 'pcs',       price: 1.80 },
        { name: 'Jambon',              category: 'viandes-poissons',  quantity: 6,   unit: 'pcs',       price: 0.75 },
        { name: 'Eau minérale',        category: 'boissons',          quantity: 6,   unit: 'bouteille', price: 0.45 },
        { name: 'Jus d\'orange',       category: 'boissons',          quantity: 2,   unit: 'bouteille', price: 1.90 },
        { name: 'Café moulu',          category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 4.50 },
        { name: 'Sucre',               category: 'epicerie',          quantity: 1,   unit: 'kg',        price: 1.10 },
        { name: 'Farine',              category: 'epicerie',          quantity: 1,   unit: 'kg',        price: 0.90 },
      ],
    },
    {
      id         : 'tpl-barbecue',
      name       : 'Barbecue entre amis',
      description: 'Pour un barbecue réussi avec 8 convives',
      emoji      : '🍖',
      icon       : 'outdoor_grill',
      color      : 'oklch(60% 0.22 25)',
      image      : 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&q=80',
      tags       : ['barbecue', 'fête', 'été'],
      budget     : 80,
      isBuiltin  : true,
      products   : [
        { name: 'Merguez',             category: 'viandes-poissons',  quantity: 800, unit: 'g',         price: 0.012 },
        { name: 'Chipolatas',          category: 'viandes-poissons',  quantity: 800, unit: 'g',         price: 0.011 },
        { name: 'Côtes de porc',       category: 'viandes-poissons',  quantity: 1.5, unit: 'kg',        price: 8.50 },
        { name: 'Blanc de poulet',     category: 'viandes-poissons',  quantity: 1,   unit: 'kg',        price: 9.90 },
        { name: 'Brochettes bœuf',     category: 'viandes-poissons',  quantity: 8,   unit: 'pcs',       price: 2.20 },
        { name: 'Baguette',            category: 'boulangerie',       quantity: 4,   unit: 'pcs',       price: 0.95 },
        { name: 'Salade verte',        category: 'fruits-legumes',    quantity: 2,   unit: 'pcs',       price: 1.20 },
        { name: 'Tomates cerise',      category: 'fruits-legumes',    quantity: 500, unit: 'g',         price: 3.50 },
        { name: 'Maïs épi',            category: 'fruits-legumes',    quantity: 8,   unit: 'pcs',       price: 0.80 },
        { name: 'Poivrons',            category: 'fruits-legumes',    quantity: 4,   unit: 'pcs',       price: 0.90 },
        { name: 'Pommes de terre',     category: 'fruits-legumes',    quantity: 2,   unit: 'kg',        price: 2.20 },
        { name: 'Ketchup',             category: 'epicerie',          quantity: 1,   unit: 'bouteille', price: 2.50 },
        { name: 'Moutarde',            category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 1.80 },
        { name: 'Mayonnaise',          category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 2.10 },
        { name: 'Bières',              category: 'boissons',          quantity: 24,  unit: 'pcs',       price: 0.85 },
        { name: 'Sodas assortis',      category: 'boissons',          quantity: 12,  unit: 'pcs',       price: 0.70 },
        { name: 'Eau gazeuse',         category: 'boissons',          quantity: 6,   unit: 'bouteille', price: 0.65 },
        { name: 'Charbon barbecue',    category: 'other',             quantity: 1,   unit: 'pcs',       price: 8.90 },
        { name: 'Allume-feu',          category: 'other',             quantity: 1,   unit: 'pcs',       price: 2.50 },
        { name: 'Assiettes jetables',  category: 'entretien',         quantity: 1,   unit: 'pack',      price: 3.90 },
        { name: 'Couverts jetables',   category: 'entretien',         quantity: 1,   unit: 'pack',      price: 2.90 },
      ],
    },
    {
      id         : 'tpl-petit-dejeuner',
      name       : 'Petit-déjeuner complet',
      description: 'Tout pour bien démarrer la journée',
      emoji      : '☕',
      icon       : 'free_breakfast',
      color      : 'oklch(75% 0.18 65)',
      image      : 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
      tags       : ['matin', 'petit-déjeuner', 'quotidien'],
      budget     : 35,
      isBuiltin  : true,
      products   : [
        { name: 'Lait entier',         category: 'produits-laitiers', quantity: 2,   unit: 'bouteille', price: 1.15 },
        { name: 'Beurre',              category: 'produits-laitiers', quantity: 1,   unit: 'pcs',       price: 2.20 },
        { name: 'Yaourts',             category: 'produits-laitiers', quantity: 4,   unit: 'pcs',       price: 0.38 },
        { name: 'Œufs',                category: 'produits-laitiers', quantity: 6,   unit: 'pcs',       price: 0.28 },
        { name: 'Pain de mie',         category: 'boulangerie',       quantity: 1,   unit: 'pcs',       price: 1.90 },
        { name: 'Croissants',          category: 'boulangerie',       quantity: 4,   unit: 'pcs',       price: 1.10 },
        { name: 'Brioche',             category: 'boulangerie',       quantity: 1,   unit: 'pcs',       price: 2.80 },
        { name: 'Café moulu',          category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 4.50 },
        { name: 'Thé assortiment',     category: 'epicerie',          quantity: 1,   unit: 'boite',     price: 3.20 },
        { name: 'Confiture fraise',    category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 2.60 },
        { name: 'Miel',                category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 4.90 },
        { name: 'Nutella',             category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 3.50 },
        { name: 'Céréales muesli',     category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 3.80 },
        { name: 'Oranges à presser',   category: 'fruits-legumes',    quantity: 6,   unit: 'pcs',       price: 0.65 },
        { name: 'Bananes',             category: 'fruits-legumes',    quantity: 4,   unit: 'pcs',       price: 0.35 },
        { name: 'Jus de pomme',        category: 'boissons',          quantity: 1,   unit: 'bouteille', price: 2.20 },
      ],
    },
    {
      id         : 'tpl-apero',
      name       : 'Apéro dinatoire',
      description: 'Tapas et bouchées pour 6 personnes',
      emoji      : '🥂',
      icon       : 'wine_bar',
      color      : 'oklch(60% 0.2 290)',
      image      : 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
      tags       : ['apéro', 'fête', 'soirée'],
      budget     : 60,
      isBuiltin  : true,
      products   : [
        { name: 'Chips assortis',      category: 'epicerie',          quantity: 3,   unit: 'sachet',    price: 2.20 },
        { name: 'Cacahuètes',          category: 'epicerie',          quantity: 2,   unit: 'sachet',    price: 1.80 },
        { name: 'Olives marinées',     category: 'epicerie',          quantity: 2,   unit: 'boite',     price: 2.50 },
        { name: 'Crackers',            category: 'epicerie',          quantity: 2,   unit: 'pcs',       price: 2.10 },
        { name: 'Taramosalata',        category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 3.20 },
        { name: 'Guacamole',           category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 2.90 },
        { name: 'Houmous',             category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 2.50 },
        { name: 'Saucisson sec',       category: 'viandes-poissons',  quantity: 1,   unit: 'pcs',       price: 4.50 },
        { name: 'Jambon de Bayonne',   category: 'viandes-poissons',  quantity: 150, unit: 'g',         price: 0.065},
        { name: 'Chorizo',             category: 'viandes-poissons',  quantity: 1,   unit: 'pcs',       price: 3.20 },
        { name: 'Camembert',           category: 'produits-laitiers', quantity: 1,   unit: 'pcs',       price: 2.90 },
        { name: 'Comté',               category: 'produits-laitiers', quantity: 200, unit: 'g',         price: 0.040},
        { name: 'Tomates cerises',     category: 'fruits-legumes',    quantity: 250, unit: 'g',         price: 2.80 },
        { name: 'Concombre',           category: 'fruits-legumes',    quantity: 1,   unit: 'pcs',       price: 0.90 },
        { name: 'Champagne',           category: 'boissons',          quantity: 2,   unit: 'bouteille', price: 12.90},
        { name: 'Vin blanc sec',       category: 'boissons',          quantity: 2,   unit: 'bouteille', price: 7.50 },
        { name: 'Jus de raisin',       category: 'boissons',          quantity: 1,   unit: 'bouteille', price: 2.90 },
        { name: 'Serviettes cocktail', category: 'entretien',         quantity: 1,   unit: 'pack',      price: 1.90 },
      ],
    },
    {
      id         : 'tpl-bebe',
      name       : 'Courses bébé',
      description: 'Essentiels pour bébé 0-12 mois',
      emoji      : '👶',
      icon       : 'child_care',
      color      : 'oklch(80% 0.15 60)',
      image      : 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80',
      tags       : ['bébé', 'enfant'],
      budget     : 90,
      isBuiltin  : true,
      products   : [
        { name: 'Couches taille 2',    category: 'bebe',              quantity: 1,   unit: 'pack',      price: 14.90 },
        { name: 'Lingettes bébé',      category: 'bebe',              quantity: 3,   unit: 'pack',      price: 3.20 },
        { name: 'Lait 1er âge',        category: 'bebe',              quantity: 2,   unit: 'boite',     price: 12.50 },
        { name: 'Petits pots légumes', category: 'bebe',              quantity: 6,   unit: 'pcs',       price: 1.20 },
        { name: 'Compotes pomme',      category: 'bebe',              quantity: 4,   unit: 'pcs',       price: 1.80 },
        { name: 'Biscuits bébé',       category: 'bebe',              quantity: 1,   unit: 'pcs',       price: 2.90 },
        { name: 'Crème bébé',          category: 'hygiene-beaute',    quantity: 1,   unit: 'pcs',       price: 5.50 },
        { name: 'Gel lavant bébé',     category: 'hygiene-beaute',    quantity: 1,   unit: 'pcs',       price: 4.90 },
        { name: 'Thermomètre',         category: 'bebe',              quantity: 1,   unit: 'pcs',       price: 8.90 },
        { name: 'Sérum physiologique', category: 'hygiene-beaute',    quantity: 2,   unit: 'pack',      price: 3.50 },
      ],
    },
    {
      id         : 'tpl-sante',
      name       : 'Alimentation saine',
      description: 'Produits bio & healthy pour la semaine',
      emoji      : '🥗',
      icon       : 'nutrition',
      color      : 'oklch(65% 0.2 145)',
      image      : 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
      tags       : ['bio', 'healthy', 'végétarien'],
      budget     : 100,
      isBuiltin  : true,
      products   : [
        { name: 'Quinoa',              category: 'epicerie',          quantity: 500, unit: 'g',         price: 4.90 },
        { name: 'Lentilles corail',    category: 'epicerie',          quantity: 500, unit: 'g',         price: 2.20 },
        { name: 'Pois chiches',        category: 'epicerie',          quantity: 400, unit: 'g',         price: 1.50 },
        { name: 'Tofu ferme',          category: 'viandes-poissons',  quantity: 2,   unit: 'pcs',       price: 2.80 },
        { name: 'Saumon bio',          category: 'viandes-poissons',  quantity: 400, unit: 'g',         price: 12.90},
        { name: 'Épinards frais',      category: 'fruits-legumes',    quantity: 300, unit: 'g',         price: 2.50 },
        { name: 'Avocat',              category: 'fruits-legumes',    quantity: 4,   unit: 'pcs',       price: 1.20 },
        { name: 'Brocoli',             category: 'fruits-legumes',    quantity: 1,   unit: 'pcs',       price: 1.90 },
        { name: 'Myrtilles',           category: 'fruits-legumes',    quantity: 250, unit: 'g',         price: 3.90 },
        { name: 'Graines de chia',     category: 'epicerie',          quantity: 200, unit: 'g',         price: 4.50 },
        { name: 'Huile de coco',       category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 6.90 },
        { name: 'Lait d\'amande',      category: 'boissons',          quantity: 2,   unit: 'bouteille', price: 2.50 },
        { name: 'Yaourt grec',         category: 'produits-laitiers', quantity: 4,   unit: 'pcs',       price: 1.10 },
        { name: 'Amandes',             category: 'epicerie',          quantity: 200, unit: 'g',         price: 4.20 },
        { name: 'Miel bio',            category: 'epicerie',          quantity: 1,   unit: 'pcs',       price: 6.50 },
      ],
    },
  ];

  // ─── Getters ──────────────────────────────────────────────────

  function getBuiltinTemplates() {
    return BUILTIN_TEMPLATES;
  }

  function getCustomTemplates() {
    return Utils.safeGetItem('gc_custom_templates', []);
  }

  function getAllTemplates() {
    return [...BUILTIN_TEMPLATES, ...getCustomTemplates()];
  }

  function getTemplateById(id) {
    return getAllTemplates().find(t => t.id === id) || null;
  }

  // ─── Page Templates ───────────────────────────────────────────

  function openCatalog(targetListId = null) {
    const templates = getAllTemplates();
    const settings  = Store.getSettings();

    const content = `
      <div class="templates-catalog">

        <!-- Recherche -->
        <div class="search-bar search-bar--sm" style="margin-bottom:var(--space-4)">
          <span class="material-symbols-rounded search-bar__icon">search</span>
          <input type="search" class="search-bar__input"
            id="tpl-search" placeholder="Rechercher un template..." />
        </div>

        <!-- Tags filtres -->
        <div class="tpl-tags" id="tpl-tags">
          <button class="tpl-tag tpl-tag--active" data-tag="">Tous</button>
          ${_getUniqueTags(templates).map(tag => `
            <button class="tpl-tag" data-tag="${tag}">${tag}</button>
          `).join('')}
        </div>

        <!-- Grille templates -->
        <div class="tpl-grid" id="tpl-grid">
          ${_buildTemplateCards(templates, settings)}
        </div>

      </div>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Templates de listes',
      icon    : 'auto_awesome',
      content,
      size    : 'lg',
      closable: true,
      actions : [
        {
          label  : 'Créer un template',
          type   : 'secondary',
          icon   : 'add',
          onClick: () => {
            Modals.close(modalId);
            openCreateTemplate();
          },
        },
      ],
    });

    // Events après DOM
    setTimeout(() => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      // Recherche
      const searchInput = modal.querySelector('#tpl-search');
      searchInput?.addEventListener('input', Utils.debounce((e) => {
        const q    = e.target.value.toLowerCase();
        const grid = modal.querySelector('#tpl-grid');
        const all  = getAllTemplates().filter(t =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.includes(q))
        );
        if (grid) grid.innerHTML = _buildTemplateCards(all, Store.getSettings());
        _bindCardEvents(modal, modalId, targetListId);
      }, 250));

      // Filtres tags
      modal.querySelector('#tpl-tags')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.tpl-tag');
        if (!btn) return;

        modal.querySelectorAll('.tpl-tag')
          .forEach(b => b.classList.remove('tpl-tag--active'));
        btn.classList.add('tpl-tag--active');

        const tag  = btn.dataset.tag;
        const grid = modal.querySelector('#tpl-grid');
        const all  = getAllTemplates().filter(t =>
          !tag || t.tags.includes(tag)
        );
        if (grid) grid.innerHTML = _buildTemplateCards(all, Store.getSettings());
        _bindCardEvents(modal, modalId, targetListId);
      });

      _bindCardEvents(modal, modalId, targetListId);
    }, 150);

    return modalId;
  }

  function _buildTemplateCards(templates, settings) {
    if (templates.length === 0) {
      return `
        <div class="tpl-empty">
          <span class="material-symbols-rounded">search_off</span>
          <p>Aucun template trouvé</p>
        </div>
      `;
    }

    return templates.map(tpl => {
      const totalPrice = tpl.products.reduce(
        (sum, p) => sum + (p.price ? p.price * p.quantity : 0), 0
      );

      return `
        <div class="tpl-card animate-in" data-tpl-id="${tpl.id}"
          style="--tpl-color: ${tpl.color}">

          <div class="tpl-card__image-wrap">
            <img class="tpl-card__image" src="${tpl.image}"
              alt="${tpl.name}" loading="lazy"
              onerror="this.style.display='none'" />
            <div class="tpl-card__image-overlay">
              <span class="tpl-card__emoji">${tpl.emoji}</span>
            </div>
            ${!tpl.isBuiltin ? `
              <button class="tpl-card__delete-btn" data-delete-tpl="${tpl.id}"
                aria-label="Supprimer le template">
                <span class="material-symbols-rounded">delete</span>
              </button>
            ` : ''}
          </div>

          <div class="tpl-card__body">
            <h3 class="tpl-card__name">${tpl.name}</h3>
            <p class="tpl-card__desc">${tpl.description}</p>

            <div class="tpl-card__meta">
              <span class="tpl-card__count">
                <span class="material-symbols-rounded">inventory_2</span>
                ${tpl.products.length} produits
              </span>
              ${tpl.budget ? `
                <span class="tpl-card__budget">
                  <span class="material-symbols-rounded">account_balance_wallet</span>
                  Budget : ${Utils.formatCurrency(tpl.budget, settings.currencySymbol)}
                </span>
              ` : ''}
              ${totalPrice > 0 ? `
                <span class="tpl-card__total">
                  <span class="material-symbols-rounded">payments</span>
                  ~${Utils.formatCurrency(totalPrice, settings.currencySymbol)}
                </span>
              ` : ''}
            </div>

            <div class="tpl-card__tags">
              ${tpl.tags.map(tag => `
                <span class="tpl-tag-chip">${tag}</span>
              `).join('')}
            </div>
          </div>

          <div class="tpl-card__actions">
            <button class="btn btn--ghost btn--sm tpl-card__preview-btn"
              data-preview-tpl="${tpl.id}">
              <span class="material-symbols-rounded">preview</span>
              Aperçu
            </button>
            <button class="btn btn--primary btn--sm tpl-card__use-btn"
              data-use-tpl="${tpl.id}">
              <span class="material-symbols-rounded">add_shopping_cart</span>
              Utiliser
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function _bindCardEvents(modal, catalogModalId, targetListId) {
    // Aperçu
    modal.querySelectorAll('[data-preview-tpl]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPreview(btn.dataset.previewTpl, catalogModalId, targetListId);
      });
    });

    // Utiliser
    modal.querySelectorAll('[data-use-tpl]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Modals.close(catalogModalId);
        applyTemplate(btn.dataset.useTpl, targetListId);
      });
    });

    // Supprimer template custom
    modal.querySelectorAll('[data-delete-tpl]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await Modals.confirm({
          title  : 'Supprimer le template',
          message: 'Supprimer ce template personnalisé ?',
          danger : true,
          confirmLabel: 'Supprimer',
        });
        if (confirmed) {
          deleteCustomTemplate(btn.dataset.deleteTpl);
          // Refresh
          const grid    = modal.querySelector('#tpl-grid');
          const all     = getAllTemplates();
          if (grid) grid.innerHTML = _buildTemplateCards(all, Store.getSettings());
          _bindCardEvents(modal, catalogModalId, targetListId);
        }
      });
    });
  }

  // ─── Aperçu d'un template ─────────────────────────────────────

  function openPreview(templateId, parentModalId = null, targetListId = null) {
    const tpl      = getTemplateById(templateId);
    if (!tpl) return;

    const settings   = Store.getCategories();
    const categories = Store.getCategories();
    const appSettings = Store.getSettings();

    // Grouper produits par catégorie
    const groups = Utils.groupByCategory(tpl.products, categories);

    const content = `
      <div class="tpl-preview">

        <!-- Banner -->
        <div class="tpl-preview__banner" style="--tpl-color:${tpl.color}">
          <img src="${tpl.image}" alt="${tpl.name}"
            class="tpl-preview__banner-img"
            onerror="this.style.display='none'" />
          <div class="tpl-preview__banner-overlay">
            <span class="tpl-preview__emoji">${tpl.emoji}</span>
            <div>
              <h2 class="tpl-preview__title">${tpl.name}</h2>
              <p class="tpl-preview__desc">${tpl.description}</p>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="tpl-preview__stats">
          <div class="tpl-preview__stat">
            <span class="material-symbols-rounded">inventory_2</span>
            <strong>${tpl.products.length}</strong>
            <span>produits</span>
          </div>
          <div class="tpl-preview__stat">
            <span class="material-symbols-rounded">category</span>
            <strong>${groups.length}</strong>
            <span>catégories</span>
          </div>
          <div class="tpl-preview__stat">
            <span class="material-symbols-rounded">payments</span>
            <strong>
              ${Utils.formatCurrency(
                tpl.products.reduce((s, p) => s + (p.price ? p.price * p.quantity : 0), 0),
                appSettings.currencySymbol
              )}
            </strong>
            <span>estimé</span>
          </div>
        </div>

        <!-- Liste produits groupés -->
        <div class="tpl-preview__products">
          ${groups.map(({ category, products }) => `
            <div class="tpl-preview__group">
              <div class="tpl-preview__group-header"
                style="--cat-color:${category.color}">
                <span>${category.emoji}</span>
                <span>${category.name}</span>
                <span class="tpl-preview__group-count">${products.length}</span>
              </div>
              <ul class="tpl-preview__product-list">
                ${products.map(p => `
                  <li class="tpl-preview__product-item">
                    <span class="material-symbols-rounded">radio_button_unchecked</span>
                    <span class="tpl-preview__product-name">${p.name}</span>
                    <span class="tpl-preview__product-qty">
                      ${Utils.formatQuantity(p.quantity, p.unit)}
                    </span>
                    ${p.price ? `
                      <span class="tpl-preview__product-price">
                        ${Utils.formatCurrency(p.price * p.quantity, appSettings.currencySymbol)}
                      </span>
                    ` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>

      </div>
    `;

    const previewId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Aperçu du template',
      icon    : 'preview',
      content,
      closable: true,
      actions : [
        {
          label  : 'Retour',
          type   : 'ghost',
          onClick: () => Modals.close(previewId),
        },
        {
          label  : 'Utiliser ce template',
          type   : 'primary',
          icon   : 'add_shopping_cart',
          onClick: () => {
            Modals.close(previewId);
            if (parentModalId) Modals.close(parentModalId);
            applyTemplate(templateId, targetListId);
          },
        },
      ],
    });
  }

  // ─── Appliquer un template ────────────────────────────────────

  async function applyTemplate(templateId, targetListId = null) {
    const tpl = getTemplateById(templateId);
    if (!tpl) return;

    if (targetListId) {
      // Ajouter à une liste existante
      const list = Store.getListById(targetListId);
      if (!list) return;

      const confirmed = await Modals.confirm({
        title  : 'Ajouter le template',
        message: `Ajouter ${tpl.products.length} produit(s) de "${tpl.name}" à "${list.name}" ?`,
        confirmLabel: 'Ajouter',
      });

      if (!confirmed) return;

      const loader = Notifications.loading('Ajout des produits...');
      tpl.products.forEach(p => Store.addProduct(targetListId, { ...p, checked: false }));
      loader.resolve(`${tpl.products.length} produits ajoutés !`);

    } else {
      // Créer une nouvelle liste depuis le template
      _openCreateFromTemplate(tpl);
    }
  }

  function _openCreateFromTemplate(tpl) {
    const settings = Store.getSettings();

    const content = `
      <form id="tpl-create-form" class="modal-form">
        <div class="form-group">
          <label class="form-label" for="tpl-list-name">
            <span class="material-symbols-rounded">label</span>
            Nom de la liste
          </label>
          <input type="text" id="tpl-list-name" name="name"
            class="form-input" value="${tpl.name}" required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="tpl-list-emoji">
              <span class="material-symbols-rounded">mood</span>
              Emoji
            </label>
            <input type="text" id="tpl-list-emoji" name="emoji"
              class="form-input form-input--emoji"
              value="${tpl.emoji}" maxlength="2" />
          </div>
          <div class="form-group">
            <label class="form-label" for="tpl-list-budget">
              <span class="material-symbols-rounded">payments</span>
              Budget (${settings.currencySymbol})
            </label>
            <input type="number" id="tpl-list-budget" name="budget"
              class="form-input" value="${tpl.budget || ''}"
              min="0" step="0.01" />
          </div>
        </div>

        <!-- Sélection des produits -->
        <div class="form-group">
          <div class="tpl-products-header">
            <label class="form-label">
              <span class="material-symbols-rounded">inventory_2</span>
              Produits à inclure
            </label>
            <div class="tpl-select-actions">
              <button type="button" class="btn btn--ghost btn--sm" id="tpl-select-all">
                Tout sélectionner
              </button>
              <button type="button" class="btn btn--ghost btn--sm" id="tpl-deselect-all">
                Tout désélectionner
              </button>
            </div>
          </div>
          <div class="tpl-product-checklist" id="tpl-product-checklist">
            ${tpl.products.map((p, i) => {
              const cat = Store.getCategoryById(p.category) || { emoji:'📦', name:'Autre' };
              return `
                <label class="tpl-product-check">
                  <input type="checkbox" name="products" value="${i}" checked />
                  <span class="tpl-product-check__info">
                    <span class="tpl-product-check__cat">${cat.emoji}</span>
                    <span class="tpl-product-check__name">${p.name}</span>
                    <span class="tpl-product-check__qty">
                      ${Utils.formatQuantity(p.quantity, p.unit)}
                    </span>
                  </span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      </form>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : `Créer depuis "${tpl.name}"`,
      icon    : 'auto_awesome',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => Modals.close(modalId),
        },
        {
          label  : 'Créer la liste',
          type   : 'primary',
          icon   : 'add_shopping_cart',
          onClick: () => _submitCreateFromTemplate(modalId, tpl),
        },
      ],
    });

    // Select all / deselect all
    setTimeout(() => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.querySelector('#tpl-select-all')?.addEventListener('click', () => {
        modal.querySelectorAll('.tpl-product-check input')
          .forEach(cb => { cb.checked = true; });
      });

      modal.querySelector('#tpl-deselect-all')?.addEventListener('click', () => {
        modal.querySelectorAll('.tpl-product-check input')
          .forEach(cb => { cb.checked = false; });
      });
    }, 100);
  }

  function _submitCreateFromTemplate(modalId, tpl) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const form     = modal.querySelector('#tpl-create-form');
    const nameInput = form.querySelector('#tpl-list-name');
    const name     = nameInput?.value.trim();

    if (!name) {
      Utils.shake(nameInput);
      return;
    }

    // Produits sélectionnés
    const checkedIndices = [...form.querySelectorAll('input[name="products"]:checked')]
      .map(cb => parseInt(cb.value));

    const selectedProducts = tpl.products
      .filter((_, i) => checkedIndices.includes(i));

    if (selectedProducts.length === 0) {
      Notifications.warning('Sélectionnez au moins un produit.');
      return;
    }

    // Créer la liste
    const list = Store.createList({
      name  : name,
      emoji : form.querySelector('#tpl-list-emoji')?.value || tpl.emoji,
      color : tpl.color,
      icon  : tpl.icon,
      budget: parseFloat(form.querySelector('#tpl-list-budget')?.value) || null,
    });

    // Ajouter les produits
    selectedProducts.forEach(p => Store.addProduct(list.id, { ...p, checked: false }));

    Modals.close(modalId);
    Notifications.success(
      `✨ Liste "${list.name}" créée avec ${selectedProducts.length} produits !`,
      {
        duration: 5000,
        actions: [{
          label  : 'Ouvrir',
          style  : 'primary',
          onClick: () => Router.goToList(list.id),
        }],
      }
    );

    Router.goToList(list.id);
  }

  // ─── Créer un template custom ─────────────────────────────────

  function openCreateTemplate(sourceListId = null) {
    const sourceList = sourceListId ? Store.getListById(sourceListId) : null;

    const content = `
      <form id="custom-tpl-form" class="modal-form">
        <div class="form-group">
          <label class="form-label" for="ctpl-name">
            <span class="material-symbols-rounded">label</span>
            Nom du template *
          </label>
          <input type="text" id="ctpl-name" name="name"
            class="form-input"
            value="${sourceList?.name ? `Template ${sourceList.name}` : ''}"
            placeholder="Ex : Mes courses habituelles" required />
        </div>

        <div class="form-group">
          <label class="form-label" for="ctpl-desc">
            <span class="material-symbols-rounded">notes</span>
            Description
          </label>
          <textarea id="ctpl-desc" name="description"
            class="form-input form-textarea" rows="2"
            placeholder="Décrivez ce template..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ctpl-emoji">
              <span class="material-symbols-rounded">mood</span>
              Emoji
            </label>
            <input type="text" id="ctpl-emoji" name="emoji"
              class="form-input form-input--emoji"
              value="${sourceList?.emoji || '📝'}" maxlength="2" />
          </div>
          <div class="form-group">
            <label class="form-label" for="ctpl-budget">
              <span class="material-symbols-rounded">payments</span>
              Budget type
            </label>
            <input type="number" id="ctpl-budget" name="budget"
              class="form-input"
              value="${sourceList?.budget || ''}"
              min="0" step="0.01" placeholder="0.00" />
          </div>
        </div>

        ${sourceList && sourceList.products.length > 0 ? `
          <div class="form-group">
            <p class="form-hint" style="font-size:var(--text-sm);color:var(--clr-success)">
              <span class="material-symbols-rounded" style="font-size:16px">check_circle</span>
              ${sourceList.products.length} produits de "${sourceList.name}"
              seront inclus dans ce template.
            </p>
          </div>
        ` : `
          <div class="form-group">
            <p class="form-hint">
              Ce template sera créé sans produits. Vous pourrez en ajouter plus tard.
            </p>
          </div>
        `}
      </form>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Créer un template',
      icon    : 'bookmark_add',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => Modals.close(modalId),
        },
        {
          label  : 'Créer',
          type   : 'primary',
          icon   : 'save',
          onClick: () => _submitCreateTemplate(modalId, sourceList),
        },
      ],
    });

    return modalId;
  }

  function _submitCreateTemplate(modalId, sourceList = null) {
    const modal     = document.getElementById(modalId);
    if (!modal) return;

    const form      = modal.querySelector('#custom-tpl-form');
    const nameInput = form.querySelector('#ctpl-name');
    const name      = nameInput?.value.trim();

    if (!name) { Utils.shake(nameInput); return; }

    const products = sourceList
      ? sourceList.products.map(p => ({
          name    : p.name,
          category: p.category,
          quantity: p.quantity,
          unit    : p.unit,
          price   : p.price,
          note    : p.note,
        }))
      : [];

    const template = {
      id         : Utils.generateId(),
      name,
      description: form.querySelector('#ctpl-desc')?.value || '',
      emoji      : form.querySelector('#ctpl-emoji')?.value || '📝',
      icon       : 'bookmark',
      color      : sourceList?.color || Utils.randomColor(),
      image      : 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=80',
      tags       : ['personnalisé'],
      budget     : parseFloat(form.querySelector('#ctpl-budget')?.value) || null,
      isBuiltin  : false,
      products,
      createdAt  : new Date().toISOString(),
    };

    saveCustomTemplate(template);
    Modals.close(modalId);
    Notifications.success(`Template "${name}" créé avec ${products.length} produits !`);
  }

  // ─── CRUD templates custom ────────────────────────────────────

  function saveCustomTemplate(template) {
    const customs = getCustomTemplates();
    const existing = customs.findIndex(t => t.id === template.id);
    if (existing > -1) {
      customs[existing] = template;
    } else {
      customs.unshift(template);
    }
    Utils.safeSetItem('gc_custom_templates', customs);
    Store.emit('templates:updated');
  }

  function deleteCustomTemplate(id) {
    const customs = getCustomTemplates().filter(t => t.id !== id);
    Utils.safeSetItem('gc_custom_templates', customs);
    Notifications.success('Template supprimé.');
    Store.emit('templates:updated');
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function _getUniqueTags(templates) {
    const tags = new Set();
    templates.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return [...tags];
  }

  // ─── API publique ─────────────────────────────────────────────
  return {
    getBuiltinTemplates,
    getCustomTemplates,
    getAllTemplates,
    getTemplateById,
    openCatalog,
    openPreview,
    applyTemplate,
    openCreateTemplate,
    saveCustomTemplate,
    deleteCustomTemplate,
  };
})();

window.Templates = Templates;