/**
 * GESTURES.JS - Gestures avancées
 * Features : Long press, Double tap, Pinch zoom (liste),
 *            Pull to refresh, Swipe navigation
 */

const Gestures = (() => {

  // ─── Config ───────────────────────────────────────────────────

  const CONFIG = {
    longPressDuration : 500,
    doubleTapDelay    : 300,
    pullRefreshThreshold: 80,
    swipeThreshold    : 60,
    pinchZoomEnabled  : false,
  };

  let _listeners       = [];
  let _pullState       = { active: false, startY: 0, distance: 0 };
  let _pullIndicator   = null;

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    _initPullToRefresh();
    _initSwipeNavigation();
    console.info('[Gestures] Initialisé');
  }

  function destroy() {
    _listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    _listeners = [];
    _pullIndicator?.remove();
  }

  // ─── Long Press ───────────────────────────────────────────────

  /**
   * Attacher un listener long press sur un élément
   * @param {HTMLElement} el
   * @param {Function} callback - (e) => void
   * @param {number} duration
   * @returns {Function} cleanup
   */
  function onLongPress(el, callback, duration = CONFIG.longPressDuration) {
    let timer     = null;
    let moved     = false;
    let startX    = 0;
    let startY    = 0;

    const start = (e) => {
      moved  = false;
      startX = (e.touches?.[0] || e).clientX;
      startY = (e.touches?.[0] || e).clientY;

      timer = setTimeout(() => {
        if (!moved) {
          // Feedback haptique
          if (navigator.vibrate) navigator.vibrate(40);

          // Animation visuelle
          el.classList.add('long-press-active');

          callback(e);
        }
      }, duration);
    };

    const move = (e) => {
      const x   = (e.touches?.[0] || e).clientX;
      const y   = (e.touches?.[0] || e).clientY;
      const dist = Math.hypot(x - startX, y - startY);
      if (dist > 10) {
        moved = true;
        clearTimeout(timer);
      }
    };

    const end = () => {
      clearTimeout(timer);
      el.classList.remove('long-press-active');
    };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove',  move,  { passive: true });
    el.addEventListener('touchend',   end,   { passive: true });
    el.addEventListener('mousedown',  start);
    el.addEventListener('mousemove',  move);
    el.addEventListener('mouseup',    end);

    _listeners.push(
      { el, type: 'touchstart', fn: start },
      { el, type: 'touchmove',  fn: move  },
      { el, type: 'touchend',   fn: end   },
      { el, type: 'mousedown',  fn: start },
      { el, type: 'mousemove',  fn: move  },
      { el, type: 'mouseup',    fn: end   },
    );

    // Retourne cleanup
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove',  move);
      el.removeEventListener('touchend',   end);
      el.removeEventListener('mousedown',  start);
      el.removeEventListener('mousemove',  move);
      el.removeEventListener('mouseup',    end);
    };
  }

  // ─── Double Tap ───────────────────────────────────────────────

  /**
   * @param {HTMLElement} el
   * @param {Function} callback
   * @returns {Function} cleanup
   */
  function onDoubleTap(el, callback) {
    let lastTap = 0;

    const handler = (e) => {
      const now  = Date.now();
      const diff = now - lastTap;

      if (diff < CONFIG.doubleTapDelay && diff > 0) {
        e.preventDefault();
        callback(e);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    };

    el.addEventListener('touchend', handler);
    _listeners.push({ el, type: 'touchend', fn: handler });

    return () => el.removeEventListener('touchend', handler);
  }

  // ─── Pull to Refresh ──────────────────────────────────────────

  function _initPullToRefresh() {
    const main = document.getElementById('app-main');
    if (!main) return;

    // Créer l'indicateur
    _pullIndicator = document.createElement('div');
    _pullIndicator.className = 'pull-to-refresh';
    _pullIndicator.setAttribute('aria-live', 'polite');
    _pullIndicator.innerHTML = `
      <div class="pull-to-refresh__content">
        <span class="material-symbols-rounded pull-to-refresh__icon">
          arrow_downward
        </span>
        <span class="pull-to-refresh__label">Tirer pour actualiser</span>
      </div>
    `;
    main.parentElement?.insertBefore(_pullIndicator, main);

    const onTouchStart = (e) => {
      if (main.scrollTop > 0) return;
      _pullState.startY  = e.touches[0].clientY;
      _pullState.active  = true;
    };

    const onTouchMove = (e) => {
      if (!_pullState.active) return;

      const distance = e.touches[0].clientY - _pullState.startY;
      if (distance < 0 || main.scrollTop > 0) {
        _pullState.active = false;
        return;
      }

      _pullState.distance = Math.min(distance, 120);
      const progress = _pullState.distance / CONFIG.pullRefreshThreshold;

      // Animer l'indicateur
      _pullIndicator.style.transform =
        `translateY(${_pullState.distance * 0.5}px)`;
      _pullIndicator.style.opacity   = Math.min(progress, 1).toString();

      const icon  = _pullIndicator.querySelector('.pull-to-refresh__icon');
      const label = _pullIndicator.querySelector('.pull-to-refresh__label');

      if (_pullState.distance >= CONFIG.pullRefreshThreshold) {
        _pullIndicator.classList.add('pull-to-refresh--ready');
        if (icon)  icon.textContent  = 'refresh';
        if (label) label.textContent = 'Relâcher pour actualiser';
      } else {
        _pullIndicator.classList.remove('pull-to-refresh--ready');
        if (icon)  icon.textContent  = 'arrow_downward';
        if (label) label.textContent = 'Tirer pour actualiser';
        // Rotation icône
        if (icon)  icon.style.transform = `rotate(${progress * 180}deg)`;
      }
    };

    const onTouchEnd = async () => {
      if (!_pullState.active) return;

      const triggered = _pullState.distance >= CONFIG.pullRefreshThreshold;
      _pullState.active   = false;
      _pullState.distance = 0;

      // Reset animé
      _pullIndicator.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      _pullIndicator.style.transform  = '';
      _pullIndicator.style.opacity    = '0';

      setTimeout(() => {
        _pullIndicator.style.transition = '';
        _pullIndicator.classList.remove('pull-to-refresh--ready');
      }, 300);

      if (triggered) {
        // Feedback haptique
        if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

        // Afficher loading
        _pullIndicator.classList.add('pull-to-refresh--loading');
        _pullIndicator.style.opacity = '1';

        const icon  = _pullIndicator.querySelector('.pull-to-refresh__icon');
        const label = _pullIndicator.querySelector('.pull-to-refresh__label');
        if (icon)  { icon.textContent = 'refresh'; icon.classList.add('spin'); }
        if (label) label.textContent  = 'Actualisation...';

        // Déclencher le refresh de la page courante
        await _triggerPageRefresh();

        // Masquer
        setTimeout(() => {
          _pullIndicator.classList.remove('pull-to-refresh--loading');
          if (icon) icon.classList.remove('spin');
          _pullIndicator.style.opacity = '0';
        }, 600);
      }
    };

    main.addEventListener('touchstart', onTouchStart, { passive: true });
    main.addEventListener('touchmove',  onTouchMove,  { passive: true });
    main.addEventListener('touchend',   onTouchEnd,   { passive: true });

    _listeners.push(
      { el: main, type: 'touchstart', fn: onTouchStart },
      { el: main, type: 'touchmove',  fn: onTouchMove  },
      { el: main, type: 'touchend',   fn: onTouchEnd   },
    );
  }

  async function _triggerPageRefresh() {
    const { route, params } = Router.getCurrentRoute();

    return new Promise(resolve => {
      setTimeout(() => {
        switch (route) {
          case '/':
            Lists.renderHomePage();
            break;
          case '/list/:id':
            if (params.id) Products.renderListPage(params.id);
            break;
          case '/categories':
            Categories.renderPage();
            break;
          case '/stats':
            UI.renderStatsPage();
            break;
          default:
            break;
        }
        Notifications.success('Page actualisée !');
        resolve();
      }, 500);
    });
  }

  // ─── Swipe navigation (entre pages) ──────────────────────────

  function _initSwipeNavigation() {
    let startX   = 0;
    let startY   = 0;
    let tracking = false;

    const onStart = (e) => {
      startX   = e.touches[0].clientX;
      startY   = e.touches[0].clientY;
      tracking = startX < 20; // Uniquement depuis le bord gauche
    };

    const onEnd = (e) => {
      if (!tracking) return;
      tracking = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx   = endX - startX;
      const dy   = Math.abs(endY - startY);

      // Swipe horizontal suffisant et principalement horizontal
      if (dx > CONFIG.swipeThreshold && dy < 60 && startX < 20) {
        const { route } = Router.getCurrentRoute();
        // Retour depuis une liste → home
        if (route === '/list/:id') {
          Router.goHome();
        }
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend',   onEnd,   { passive: true });

    _listeners.push(
      { el: document, type: 'touchstart', fn: onStart },
      { el: document, type: 'touchend',   fn: onEnd   },
    );
  }

  // ─── Attacher long press sur les cartes de liste ─────────────

  function attachListCardGestures(cardEl, list) {
    // Long press → menu contextuel
    const cleanupLongPress = onLongPress(cardEl, (e) => {
      e.preventDefault();
      // Simuler l'ouverture du menu contextuel
      const menuBtn = cardEl.querySelector('.list-card__menu-btn');
      menuBtn?.click();
    });

    // Double tap → ouvrir la liste
    const cleanupDoubleTap = onDoubleTap(cardEl, () => {
      Router.goToList(list.id);
    });

    return () => {
      cleanupLongPress();
      cleanupDoubleTap();
    };
  }

  // ─── API publique ─────────────────────────────────────────────
  return {
    init,
    destroy,
    onLongPress,
    onDoubleTap,
    attachListCardGestures,
    get config() { return { ...CONFIG }; },
  };
})();

window.Gestures = Gestures;