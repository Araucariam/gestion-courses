/**
 * MODALS.JS - Système de modales universel
 * Types : dialog | bottomSheet | fullscreen | confirm
 * Features : pile de modales, focus trap, animations, formulaires
 */

const Modals = (() => {

  // ─── État ─────────────────────────────────────────────────────────────────

  let stack        = [];      // pile de modales ouvertes
  let overlay      = null;    // fond sombre partagé
  let idCounter    = 0;
  let scrollY      = 0;       // position scroll avant ouverture

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _createOverlay();
    _bindKeyboard();
  }

  function _createOverlay() {
    overlay = document.createElement('div');
    overlay.id        = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('aria-hidden', 'true');
  
    // Clic sur overlay → ferme UNIQUEMENT la modale du dessus
    overlay.addEventListener('click', (e) => {
      // S'assurer qu'on clique bien sur l'overlay et pas sur une modale
      if (e.target !== overlay) return;
      const top = stack[stack.length - 1];
      if (top && top.closable !== false) close(top.id);
    });
  
    document.body.appendChild(overlay);
  }

  function _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.closable !== false) close(top.id);
      }
    });
  }

  function _onOverlayClick(e) {
    if (e.target !== overlay) return;
    const top = stack[stack.length - 1];
    if (top && top.closable !== false) close(top.id);
  }

  // ─── Ouvrir une modale ────────────────────────────────────────────────────

  /**
   * @param {object} options
   * @param {string}   options.id          - ID unique (auto-généré si absent)
   * @param {string}   options.type        - 'dialog' | 'bottomSheet' | 'fullscreen'
   * @param {string}   options.title       - Titre de la modale
   * @param {string}   options.subtitle    - Sous-titre
   * @param {string|HTMLElement} options.content - Contenu HTML ou nœud DOM
   * @param {Array}    options.actions     - Boutons [{label, type, onClick, disabled}]
   * @param {boolean}  options.closable    - Fermeture possible (défaut: true)
   * @param {boolean}  options.scrollable  - Contenu scrollable (défaut: true)
   * @param {string}   options.size        - 'sm' | 'md' | 'lg' (dialog seulement)
   * @param {Function} options.onOpen      - Callback après ouverture
   * @param {Function} options.onClose     - Callback après fermeture
   * @returns {string} id de la modale
   */

   function open(options = {}) {
     const {
       id         = `modal-${++idCounter}`,
       type       = 'dialog',
       title      = '',
       subtitle   = '',
       content    = '',
       actions    = [],
       closable   = true,
       scrollable = true,
       size       = 'md',
       onOpen     = null,
       onClose    = null,
       icon       = '',
     } = options;
   
     // ── Bloquer scroll body (une seule fois)
     if (stack.length === 0) {
       scrollY = window.scrollY;
       document.body.style.position   = 'fixed';
       document.body.style.top        = `-${scrollY}px`;
       document.body.style.width      = '100%';
       document.body.style.overflowY  = 'scroll';
     }
   
     // ── Afficher et configurer l'overlay
     overlay.classList.add('modal-overlay--visible');
     overlay.setAttribute('aria-hidden', 'false');
     overlay.style.zIndex = 1000 + stack.length * 10;
     overlay.style.opacity = Math.min(0.6 + stack.length * 0.1, 0.85).toString();
   
     // ── Construire le DOM
     const modal = _buildModal({
       id, type, title, subtitle, content,
       actions, closable, scrollable, size, icon,
     });
     modal.style.zIndex = 1001 + stack.length * 10;
     document.body.appendChild(modal);
   
     // ── Empiler
     stack.push({ id, type, el: modal, onClose, closable });
   
     // ── Animation entrée
     requestAnimationFrame(() => {
       requestAnimationFrame(() => {
         modal.classList.add('modal--visible');
       });
     });
   
     // ── Focus trap
     _trapFocus(modal);
   
     // ── Callback
     setTimeout(() => onOpen?.(), 350);
   
     Store.emit('modal:opened', { id, type });
     return id;
   }

  // ─── Construction DOM ─────────────────────────────────────────────────────

  function _buildModal({ id, type, title, subtitle, content,
                          actions, closable, scrollable, size, icon }) {
    const modal = document.createElement('div');
    modal.id        = id;
    modal.className = `modal modal--${type} modal--${size}`;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `${id}-title`);

    // ─ Header
    const header = _buildHeader({ id, title, subtitle, closable, icon });

    // ─ Body
    const body = document.createElement('div');
    body.className = `modal__body${scrollable ? ' modal__body--scrollable' : ''}`;

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    // ─ Footer
    const footer = actions.length > 0 ? _buildFooter(id, actions) : null;

    // ─ Handle (bottomSheet seulement)
    if (type === 'bottomSheet') {
      const handle = document.createElement('div');
      handle.className = 'modal__handle';
      modal.appendChild(handle);
      _addDragDismiss(modal, id);
    }

    modal.appendChild(header);
    modal.appendChild(body);
    if (footer) modal.appendChild(footer);

    return modal;
  }

  function _buildHeader({ id, title, subtitle, closable, icon }) {
    const header = document.createElement('div');
    header.className = 'modal__header';

    if (icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'modal__header-icon material-symbols-rounded';
      iconEl.textContent = icon;
      header.appendChild(iconEl);
    }

    const titleWrap = document.createElement('div');
    titleWrap.className = 'modal__title-wrap';

    const titleEl = document.createElement('h2');
    titleEl.id          = `${id}-title`;
    titleEl.className   = 'modal__title';
    titleEl.textContent = title;
    titleWrap.appendChild(titleEl);

    if (subtitle) {
      const subEl = document.createElement('p');
      subEl.className   = 'modal__subtitle';
      subEl.textContent = subtitle;
      titleWrap.appendChild(subEl);
    }

    header.appendChild(titleWrap);

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className      = 'modal__close';
      closeBtn.setAttribute('aria-label', 'Fermer');
      closeBtn.innerHTML      = '<span class="material-symbols-rounded">close</span>';
      closeBtn.addEventListener('click', () => {
        const modalRecord = stack.find(m => m.el === header.closest('.modal'));
        if (modalRecord) close(modalRecord.id);
      });
      header.appendChild(closeBtn);
    }

    return header;
  }

  function _buildFooter(modalId, actions) {
    const footer = document.createElement('div');
    footer.className = 'modal__footer';

    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `btn btn--${action.type || 'secondary'} btn--modal`;

      if (action.icon) {
        const iconEl = document.createElement('span');
        iconEl.className   = 'material-symbols-rounded';
        iconEl.textContent = action.icon;
        btn.appendChild(iconEl);
      }

      const labelSpan = document.createElement('span');
      labelSpan.textContent = action.label || '';
      btn.appendChild(labelSpan);

      if (action.disabled) btn.disabled = true;
      if (action.id) btn.id = `${modalId}-btn-${action.id}`;

      btn.addEventListener('click', async (e) => {
        btn.classList.add('btn--loading');
        btn.disabled = true;
        try {
          await action.onClick?.(e, modalId);
        } finally {
          if (document.contains(btn)) {
            btn.classList.remove('btn--loading');
            btn.disabled = !!action.disabled;
          }
        }
      });

      footer.appendChild(btn);
    });

    return footer;
  }

  // ─── Fermer une modale ────────────────────────────────────────────────────

  /**
   * @param {string} id - ID de la modale à fermer
   * @param {*} result  - Valeur retournée à la promesse (si applicable)
   */
  
   function close(id, result = null) {
     const index = stack.findIndex(m => m.id === id);
     if (index === -1) return;
   
     const record = stack[index];
     const { el, onClose } = record;
   
     // Animation sortie
     el.classList.remove('modal--visible');
     el.classList.add('modal--leaving');
   
     setTimeout(() => {
       // Supprimer le DOM en toute sécurité
       if (document.contains(el)) el.remove();
       stack.splice(index, 1);
   
       if (stack.length === 0) {
         // ── Plus aucune modale ouverte : tout nettoyer
         _hideOverlay();
         _restoreBodyScroll();
       } else {
         // ── Il reste des modales : ajuster l'overlay
         overlay.style.opacity = Math.min(
           0.6 + stack.length * 0.1, 0.85
         ).toString();
   
         // Focus sur la modale précédente
         const prev = stack[stack.length - 1];
         if (prev?.el) _trapFocus(prev.el);
       }
   
       onClose?.(result);
       Store.emit('modal:closed', { id, result });
     }, 350);
   }

   function _hideOverlay() {
     if (!overlay) return;
   
     // Retirer la visibilité CSS
     overlay.classList.remove('modal-overlay--visible');
   
     // Reset complet des styles inline (opacity, zIndex, etc.)
     overlay.style.opacity  = '';
     overlay.style.zIndex   = '';
   
     // Remettre aria-hidden
     overlay.setAttribute('aria-hidden', 'true');
   }

  
   function _restoreBodyScroll() {
     document.body.style.position  = '';
     document.body.style.top       = '';
     document.body.style.width     = '';
     document.body.style.overflowY = '';
     window.scrollTo(0, scrollY);
   }

   function closeAll() {
     // Fermer du haut de la pile vers le bas
     const ids = stack.map(m => m.id).reverse();
     ids.forEach((id, i) => {
       setTimeout(() => close(id), i * 80);
     });
   }
   
   function closeTop() {
     if (stack.length > 0) {
       const top = stack[stack.length - 1];
       if (top.closable !== false) close(top.id);
     }
   }

  // ─── Mise à jour d'une modale ─────────────────────────────────────────────

  function updateContent(id, newContent) {
    const record = stack.find(m => m.id === id);
    if (!record) return;
    const body = record.el.querySelector('.modal__body');
    if (!body) return;

    if (typeof newContent === 'string') {
      body.innerHTML = newContent;
    } else if (newContent instanceof HTMLElement) {
      Utils.clearElement(body);
      body.appendChild(newContent);
    }
  }

  function setLoading(id, isLoading = true) {
    const record = stack.find(m => m.id === id);
    if (!record) return;
    record.el.classList.toggle('modal--loading', isLoading);
    const btns = record.el.querySelectorAll('.btn--modal');
    btns.forEach(btn => { btn.disabled = isLoading; });
  }

  // ─── Focus Trap ───────────────────────────────────────────────────────────

  function _trapFocus(modal) {
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    // Focus initial
    setTimeout(() => {
      const firstInput = modal.querySelector('input, textarea, select');
      (firstInput || first)?.focus();
    }, 360);

    // Piéger le focus
    modal._focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) { e.preventDefault(); return; }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    modal.addEventListener('keydown', modal._focusTrapHandler);
  }

  // ─── Drag to dismiss (bottomSheet) ───────────────────────────────────────

  function _addDragDismiss(modal, id) {
    let startY    = 0;
    let currentY  = 0;
    let isDragging = false;

    const handle = modal.querySelector('.modal__handle');
    const dragTarget = handle || modal;

    dragTarget.addEventListener('touchstart', (e) => {
      startY     = e.touches[0].clientY;
      isDragging = true;
      modal.style.transition = 'none';
    }, { passive: true });

    dragTarget.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const delta = currentY - startY;
      if (delta > 0) {
        modal.style.transform = `translateY(${delta}px)`;
      }
    }, { passive: true });

    dragTarget.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      modal.style.transition = '';

      const delta = currentY - startY;
      if (delta > 120) {
        close(id);
      } else {
        modal.style.transform = '';
      }
    });
  }

  // ─── Modales prédéfinies ──────────────────────────────────────────────────

  /**
   * Modale de confirmation simple
   * @returns {Promise<boolean>}
   */
  function confirm({
    title   = 'Confirmation',
    message = 'Êtes-vous sûr ?',
    confirmLabel = 'Confirmer',
    cancelLabel  = 'Annuler',
    danger  = false,
  } = {}) {
    return new Promise((resolve) => {
      const id = open({
        type    : 'dialog',
        size    : 'sm',
        title,
        icon    : danger ? 'warning' : 'help',
        content : `<p class="modal-confirm__message">${message}</p>`,
        closable: true,
        onClose : () => resolve(false),
        actions : [
          {
            label  : cancelLabel,
            type   : 'ghost',
            onClick: () => { close(id, false); resolve(false); },
          },
          {
            label  : confirmLabel,
            type   : danger ? 'danger' : 'primary',
            onClick: () => { close(id, true); resolve(true); },
          },
        ],
      });
    });
  }

  /**
   * Modale formulaire pour création/édition de liste
   */
  function openListForm(list = null, onSubmit) {
    const isEdit   = !!list;
    const formId   = 'list-form';
    const settings = Store.getSettings();

    const content = _buildListFormHTML(list, settings);

    const id = open({
      type    : 'bottomSheet',
      title   : isEdit ? 'Modifier la liste' : 'Nouvelle liste',
      icon    : isEdit ? 'edit' : 'add_shopping_cart',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => close(id),
        },
        {
          label  : isEdit ? 'Enregistrer' : 'Créer',
          type   : 'primary',
          icon   : isEdit ? 'save' : 'add',
          onClick: async () => {
            const form = document.getElementById(formId);
            const data = _extractFormData(form);
            const { isValid, errors } = Utils.validateListForm(data);

            if (!isValid) {
              _showFormErrors(form, errors);
              return;
            }

            await onSubmit?.(data);
            close(id);
          },
        },
      ],
    });

    // Init color picker après insertion DOM
    setTimeout(() => _initColorPicker(id), 100);
    return id;
  }

  function _buildListFormHTML(list, settings) {
    const colors   = Utils.getPresetColors();
    const selColor = list?.color || colors[0];
    const icons    = [
      'shopping_cart','shopping_bag','store','local_grocery_store',
      'kitchen','restaurant','lunch_dining','coffee','cake','local_pizza',
    ];

    return `
      <form id="list-form" class="modal-form" novalidate>

        <div class="form-group">
          <label class="form-label" for="list-name">
            <span class="material-symbols-rounded">label</span>
            Nom de la liste *
          </label>
          <input
            type="text"
            id="list-name"
            name="name"
            class="form-input"
            placeholder="Ex : Courses du weekend"
            value="${list?.name || ''}"
            maxlength="50"
            autocomplete="off"
            required
          />
          <span class="form-error" id="error-name"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="list-desc">
            <span class="material-symbols-rounded">notes</span>
            Description
          </label>
          <textarea
            id="list-desc"
            name="description"
            class="form-input form-textarea"
            placeholder="Optionnel..."
            rows="2"
          >${list?.description || ''}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="list-budget">
              <span class="material-symbols-rounded">payments</span>
              Budget (${settings.currencySymbol})
            </label>
            <input
              type="number"
              id="list-budget"
              name="budget"
              class="form-input"
              placeholder="0.00"
              value="${list?.budget || ''}"
              min="0"
              step="0.01"
            />
            <span class="form-error" id="error-budget"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="list-emoji">
              <span class="material-symbols-rounded">mood</span>
              Emoji
            </label>
            <input
              type="text"
              id="list-emoji"
              name="emoji"
              class="form-input form-input--emoji"
              value="${list?.emoji || '🛒'}"
              maxlength="2"
              placeholder="🛒"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-symbols-rounded">palette</span>
            Couleur
          </label>
          <div class="color-picker" id="color-picker">
            ${colors.map(color => `
              <button
                type="button"
                class="color-swatch${color === selColor ? ' color-swatch--selected' : ''}"
                data-color="${color}"
                style="background: ${color}"
                aria-label="Couleur ${color}"
              >
                ${color === selColor
                  ? '<span class="material-symbols-rounded">check</span>'
                  : ''}
              </button>
            `).join('')}
          </div>
          <input type="hidden" name="color" id="list-color" value="${selColor}" />
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-symbols-rounded">category</span>
            Icône
          </label>
          <div class="icon-picker" id="icon-picker">
            ${icons.map(icon => `
              <button
                type="button"
                class="icon-swatch${(list?.icon || 'shopping_cart') === icon ? ' icon-swatch--selected' : ''}"
                data-icon="${icon}"
                aria-label="${icon}"
              >
                <span class="material-symbols-rounded">${icon}</span>
              </button>
            `).join('')}
          </div>
          <input type="hidden" name="icon" id="list-icon" value="${list?.icon || 'shopping_cart'}" />
        </div>

      </form>
    `;
  }

  /**
   * Modale formulaire produit
   */
  function openProductForm(product = null, listId, onSubmit) {
    const isEdit     = !!product;
    const formId     = 'product-form';
    const categories = Store.getCategories();
    const content    = _buildProductFormHTML(product, categories);

    const id = open({
      type    : 'bottomSheet',
      title   : isEdit ? 'Modifier le produit' : 'Ajouter un produit',
      icon    : isEdit ? 'edit' : 'add_circle',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => close(id),
        },
        {
          label  : isEdit ? 'Enregistrer' : 'Ajouter',
          type   : 'primary',
          icon   : isEdit ? 'save' : 'add',
          onClick: async () => {
            const form = document.getElementById(formId);
            const data = _extractFormData(form);
            const { isValid, errors } = Utils.validateProductForm(data);

            if (!isValid) {
              _showFormErrors(form, errors);
              return;
            }

            await onSubmit?.(data);
            close(id);
          },
        },
      ],
    });

    return id;
  }

  function _buildProductFormHTML(product, categories) {
    const units = Utils.UNITS;

    return `
      <form id="product-form" class="modal-form" novalidate>

        <div class="form-group">
          <label class="form-label" for="product-name">
            <span class="material-symbols-rounded">inventory_2</span>
            Nom du produit *
          </label>
          <input
            type="text"
            id="product-name"
            name="name"
            class="form-input"
            placeholder="Ex : Lait entier"
            value="${product?.name || ''}"
            maxlength="80"
            autocomplete="off"
            required
          />
          <span class="form-error" id="error-name"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="product-category">
            <span class="material-symbols-rounded">category</span>
            Catégorie
          </label>
          <select id="product-category" name="category" class="form-select">
            ${categories.map(cat => `
              <option
                value="${cat.id}"
                ${product?.category === cat.id ? 'selected' : ''}
              >
                ${cat.emoji} ${cat.name}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="product-qty">
              <span class="material-symbols-rounded">numbers</span>
              Quantité
            </label>
            <input
              type="number"
              id="product-qty"
              name="quantity"
              class="form-input"
              value="${product?.quantity || 1}"
              min="0.1"
              step="0.1"
              placeholder="1"
            />
            <span class="form-error" id="error-quantity"></span>
          </div>

          <div class="form-group">
            <label class="form-label" for="product-unit">
              <span class="material-symbols-rounded">straighten</span>
              Unité
            </label>
            <select id="product-unit" name="unit" class="form-select">
              ${units.map(u => `
                <option
                  value="${u.value}"
                  ${(product?.unit || 'pcs') === u.value ? 'selected' : ''}
                >
                  ${u.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="product-price">
            <span class="material-symbols-rounded">euro</span>
            Prix unitaire (€)
          </label>
          <input
            type="number"
            id="product-price"
            name="price"
            class="form-input"
            value="${product?.price || ''}"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          <span class="form-error" id="error-price"></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="product-note">
            <span class="material-symbols-rounded">sticky_note_2</span>
            Note
          </label>
          <input
            type="text"
            id="product-note"
            name="note"
            class="form-input"
            placeholder="Ex : Bio, marque X..."
            value="${product?.note || ''}"
            maxlength="100"
          />
        </div>

      </form>
    `;
  }

  // ─── Helpers formulaires ──────────────────────────────────────────────────

  function _extractFormData(form) {
    const data = {};
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    // Champs non inclus dans FormData automatiquement
    form.querySelectorAll('input[type="hidden"]').forEach(input => {
      data[input.name] = input.value;
    });
    return data;
  }

  function _showFormErrors(form, errors) {
    // Reset
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-input--error').forEach(el => {
      el.classList.remove('form-input--error');
    });

    // Afficher
    Object.entries(errors).forEach(([field, msg]) => {
      const errorEl = form.querySelector(`#error-${field}`);
      const inputEl = form.querySelector(`[name="${field}"]`);
      if (errorEl) errorEl.textContent = msg;
      if (inputEl) {
        inputEl.classList.add('form-input--error');
        Utils.shake(inputEl);
      }
    });

    // Focus premier champ en erreur
    const firstError = form.querySelector('.form-input--error');
    firstError?.focus();
  }

  function _initColorPicker(modalId) {
    const modal      = document.getElementById(modalId);
    if (!modal) return;
    const picker     = modal.querySelector('#color-picker');
    const hidden     = modal.querySelector('#list-color');
    if (!picker || !hidden) return;

    picker.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;

      // Désélectionner tous
      picker.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.remove('color-swatch--selected');
        s.innerHTML = '';
      });

      // Sélectionner
      swatch.classList.add('color-swatch--selected');
      swatch.innerHTML = '<span class="material-symbols-rounded">check</span>';
      hidden.value = swatch.dataset.color;
    });

    // Icon picker
    const iconPicker = modal.querySelector('#icon-picker');
    const iconHidden = modal.querySelector('#list-icon');
    if (!iconPicker || !iconHidden) return;

    iconPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-swatch');
      if (!btn) return;
      iconPicker.querySelectorAll('.icon-swatch').forEach(b =>
        b.classList.remove('icon-swatch--selected')
      );
      btn.classList.add('icon-swatch--selected');
      iconHidden.value = btn.dataset.icon;
    });
  }

  // ─── Getters ──────────────────────────────────────────────────────────────

  function isOpen(id) {
    return stack.some(m => m.id === id);
  }

  function getStack() {
    return [...stack];
  }

  function getTop() {
    return stack[stack.length - 1] || null;
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    open,
    close,
    closeAll,
    closeTop,
    updateContent,
    setLoading,
    confirm,
    openListForm,
    openProductForm,
    isOpen,
    getStack,
    getTop,
  };
})();

window.Modals = Modals;