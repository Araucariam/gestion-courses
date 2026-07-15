/**
 * NOTIFICATIONS.JS - Système de notifications toast
 * Types : success | error | warning | info | confirm
 * Support : actions, durée, file d'attente, priorité
 */

const Notifications = (() => {

  // ─── Configuration ────────────────────────────────────────────────────────

  const CONFIG = {
    maxVisible   : 4,        // Notifications simultanées max
    defaultDuration: 3500,   // ms
    animDuration : 350,      // ms animation entrée/sortie
    position     : 'bottom', // 'top' | 'bottom'
    gap          : 10,       // px entre toasts
  };

  const ICONS = {
    success : 'check_circle',
    error   : 'error',
    warning : 'warning',
    info    : 'info',
    confirm : 'help',
    loading : 'progress_activity',
  };

  const COLORS = {
    success : 'oklch(65% 0.2 145)',
    error   : 'oklch(60% 0.25 25)',
    warning : 'oklch(72% 0.2 70)',
    info    : 'oklch(65% 0.2 250)',
    confirm : 'oklch(65% 0.2 290)',
    loading : 'oklch(65% 0.15 250)',
  };

  // ─── État ─────────────────────────────────────────────────────────────────

  let container   = null;
  let queue       = [];          // notifications en attente
  let active      = new Map();   // id → { el, timer }
  let idCounter   = 0;

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    if (container) return;

    container = document.createElement('div');
    container.id = 'notifications-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');

    document.body.appendChild(container);
  }

  // ─── Créer une notification ───────────────────────────────────────────────

  /**
   * Afficher une notification toast
   * @param {object} options
   * @param {string} options.type      - 'success' | 'error' | 'warning' | 'info'
   * @param {string} options.message   - Message principal
   * @param {string} [options.title]   - Titre optionnel
   * @param {number} [options.duration]- Durée en ms (0 = persistant)
   * @param {Array}  [options.actions] - [{ label, onClick, style }]
   * @param {boolean}[options.closable]- Bouton fermer visible
   * @param {string} [options.icon]    - Icône Material override
   * @param {number} [options.priority]- 1=haute, 2=normale, 3=basse
   * @returns {string} id de la notification
   */
  function show(options = {}) {
    const {
      type      = 'info',
      message   = '',
      title     = '',
      duration  = CONFIG.defaultDuration,
      actions   = [],
      closable  = true,
      icon      = ICONS[type] || 'notifications',
      priority  = 2,
    } = options;

    const id = `notif-${++idCounter}`;
    const notif = { id, type, message, title, duration, actions, closable, icon, priority };

    // File d'attente si trop de notifications actives
    if (active.size >= CONFIG.maxVisible) {
      queue.push(notif);
    } else {
      _render(notif);
    }

    return id;
  }

  // ─── Types raccourcis ─────────────────────────────────────────────────────

  function success(message, options = {}) {
    return show({ ...options, type: 'success', message });
  }

  function error(message, options = {}) {
    return show({ ...options, type: 'error', message, duration: options.duration ?? 5000 });
  }

  function warning(message, options = {}) {
    return show({ ...options, type: 'warning', message });
  }

  function info(message, options = {}) {
    return show({ ...options, type: 'info', message });
  }

  /**
   * Notification de chargement (persistante jusqu'à dismiss manuel)
   * @returns {{ id, resolve, reject }}
   */
  function loading(message = 'Chargement...') {
    const id = show({
      type    : 'loading',
      message,
      duration: 0,
      closable: false,
      icon    : 'progress_activity',
    });

    return {
      id,
      resolve(successMsg = 'Terminé !') {
        dismiss(id);
        success(successMsg);
      },
      reject(errorMsg = 'Une erreur est survenue.') {
        dismiss(id);
        error(errorMsg);
      },
    };
  }

  /**
   * Dialogue de confirmation
   * @param {string} message
   * @param {object} options
   * @returns {Promise<boolean>}
   */
  function confirm(message, options = {}) {
    return new Promise((resolve) => {
      const {
        title       = 'Confirmation',
        confirmLabel = 'Confirmer',
        cancelLabel  = 'Annuler',
        type        = 'confirm',
      } = options;

      const id = show({
        type,
        message,
        title,
        duration : 0,
        closable : false,
        actions  : [
          {
            label  : cancelLabel,
            style  : 'secondary',
            onClick: () => { dismiss(id); resolve(false); },
          },
          {
            label  : confirmLabel,
            style  : 'primary',
            onClick: () => { dismiss(id); resolve(true); },
          },
        ],
      });
    });
  }

  // ─── Rendu DOM ────────────────────────────────────────────────────────────

  function _render(notif) {
    const { id, type, message, title, duration, actions, closable, icon } = notif;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.id        = id;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    toast.style.setProperty('--toast-color', COLORS[type] || COLORS.info);

    // ─ Icône
    const iconEl = document.createElement('span');
    iconEl.className = `toast__icon material-symbols-rounded ${type === 'loading' ? 'spin' : ''}`;
    iconEl.textContent = icon;

    // ─ Contenu
    const content = document.createElement('div');
    content.className = 'toast__content';

    if (title) {
      const titleEl = document.createElement('p');
      titleEl.className = 'toast__title';
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }

    const msgEl = document.createElement('p');
    msgEl.className = 'toast__message';
    msgEl.textContent = message;
    content.appendChild(msgEl);

    // ─ Actions
    if (actions.length > 0) {
      const actionsEl = document.createElement('div');
      actionsEl.className = 'toast__actions';

      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `toast__action toast__action--${action.style || 'primary'}`;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          action.onClick?.();
        });
        actionsEl.appendChild(btn);
      });

      content.appendChild(actionsEl);
    }

    // ─ Bouton fermer
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.style.display = closable ? 'flex' : 'none';
    closeBtn.innerHTML = '<span class="material-symbols-rounded">close</span>';
    closeBtn.addEventListener('click', () => dismiss(id));

    // ─ Barre de progression
    const progress = document.createElement('div');
    progress.className = 'toast__progress';
    if (duration > 0) {
      progress.style.animationDuration = `${duration}ms`;
      progress.classList.add('toast__progress--animated');
    }

    // ─ Assemblage
    toast.appendChild(iconEl);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    toast.appendChild(progress);

    // ─ Insertion + animation entrée
    container.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
      });
    });

    // ─ Timer de fermeture automatique
    let timer = null;
    if (duration > 0) {
      timer = setTimeout(() => dismiss(id), duration);
    }

    // ─ Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (timer) clearTimeout(timer);
      progress.style.animationPlayState = 'paused';
    });

    toast.addEventListener('mouseleave', () => {
      if (duration > 0) {
        progress.style.animationPlayState = 'running';
        timer = setTimeout(() => dismiss(id), 1000); // courts délai sur sortie
      }
    });

    // ─ Swipe to dismiss (mobile)
    _addSwipeDismiss(toast, id);

    active.set(id, { el: toast, timer });
  }

  // ─── Swipe to dismiss ─────────────────────────────────────────────────────

  function _addSwipeDismiss(el, id) {
    let startX = 0;
    let isDragging = false;

    el.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      el.style.transition = 'transform 0.1s ease';
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 10) {
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity   = `${1 - Math.abs(dx) / 200}`;
      }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const dx = e.changedTouches[0].clientX - startX;

      if (Math.abs(dx) > 80) {
        dismiss(id);
      } else {
        el.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        el.style.transform  = '';
        el.style.opacity    = '';
      }
    }, { passive: true });
  }

  // ─── Dismiss ──────────────────────────────────────────────────────────────

  /**
   * Fermer une notification
   * @param {string} id
   */
  function dismiss(id) {
    const record = active.get(id);
    if (!record) return;

    const { el, timer } = record;
    if (timer) clearTimeout(timer);

    // Animation sortie
    el.classList.remove('toast--visible');
    el.classList.add('toast--leaving');

    setTimeout(() => {
      el.remove();
      active.delete(id);

      // Dépiler la file d'attente
      if (queue.length > 0) {
        const next = queue.shift();
        _render(next);
      }
    }, CONFIG.animDuration);
  }

  /**
   * Fermer toutes les notifications
   */
  function dismissAll() {
    active.forEach((_, id) => dismiss(id));
    queue = [];
  }

  /**
   * Mettre à jour une notification existante
   * @param {string} id
   * @param {object} updates
   */
  function update(id, updates) {
    const record = active.get(id);
    if (!record) return;

    const { el } = record;

    if (updates.message) {
      const msgEl = el.querySelector('.toast__message');
      if (msgEl) msgEl.textContent = updates.message;
    }

    if (updates.type) {
      el.className = `toast toast--${updates.type} toast--visible`;
      el.style.setProperty('--toast-color', COLORS[updates.type] || COLORS.info);
      const iconEl = el.querySelector('.toast__icon');
      if (iconEl) {
        iconEl.textContent = ICONS[updates.type] || 'notifications';
        iconEl.classList.toggle('spin', updates.type === 'loading');
      }
    }
  }

  // ─── Notifications système (si permission accordée) ───────────────────────

  async function requestPermission() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  function sendSystemNotification(title, options = {}) {
    if (Notification.permission !== 'granted') return null;
    return new Notification(title, {
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/badge-72.png',
      ...options,
    });
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    init,
    show,
    success,
    error,
    warning,
    info,
    loading,
    confirm,
    dismiss,
    dismissAll,
    update,
    requestPermission,
    sendSystemNotification,
    get activeCount() { return active.size; },
    get queueLength()  { return queue.length; },
  };
})();

window.Notifications = Notifications;