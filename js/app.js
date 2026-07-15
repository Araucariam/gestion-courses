/**
 * APP.JS - Point d'entrée principal
 * Initialise tous les modules, configure le router,
 * gère le cycle de vie de l'application
 * Version 2.0 — avec Voice, Templates, Themes, Gestures
 */

const App = (() => {

  // ─── État ─────────────────────────────────────────────────────

  let isInitialized   = false;
  let autoBackupTimer = null;

  // ─── Bootstrap ────────────────────────────────────────────────

  async function init() {
    if (isInitialized) return;

    console.info('🛒 [App] Démarrage Gestion de Courses v2.0.0');

    try {
      // 1. Charger les données persistées
      Store.load();

      // 2. Construire le shell de l'interface
      UI.init();

      // 3. Initialiser les modules de base
      Notifications.init();
      Modals.init();
      Sidebar.init();
      Categories.init();
      Lists.init();
      Products.init();

      // 4. Initialiser les nouvelles fonctionnalités
      Voice.init();
      Themes.init();
      Gestures.init();

      // 5. Configurer les routes
      _setupRoutes();

      // 6. Initialiser le router (résoudre route initiale)
      Router.init();

      // 7. Sauvegarde automatique
      autoBackupTimer = ImportExport.enableAutoBackup(5 * 60 * 1000);

      // 8. Service Worker
      _registerServiceWorker();

      // 9. Écouter erreurs globales
      _setupErrorHandling();

      // 10. Raccourcis clavier
      _setupKeyboardShortcuts();

      // 11. Gérer shortcut PWA (?action=new-list)
      _handleURLActions();

      // 12. Écouter changements settings → thème
      Store.subscribe('settings:updated', (settings) => {
        if (settings.autoThemeByTime) {
          Themes.enableAutoThemeByTime();
        } else {
          Themes.disableAutoThemeByTime();
        }
      });

      isInitialized = true;
      console.info('✅ [App] Application prête');

      // Émettre event prêt
      Store.emit('app:ready');

    } catch (error) {
      console.error('❌ [App] Erreur initialisation:', error);
      UI.showError('Erreur au démarrage de l\'application.');
    }
  }

  // ─── Configuration des routes ─────────────────────────────────

  function _setupRoutes() {

    // ── Page d'accueil ──────────────────────────────────────────
    Router.on('/', () => {
      UI.setPageTitle('Mes listes');
      UI.setTopbarTitle('Mes Courses');
      UI.setTopbarActions([
        {
          id     : 'topbar-themes',
          icon   : 'palette',
          label  : 'Thèmes',
          onClick: () => Themes.openThemePicker(),
        },
        {
          id     : 'topbar-templates',
          icon   : 'auto_awesome',
          label  : 'Templates',
          onClick: () => Templates.openCatalog(),
        },
        {
          id     : 'topbar-import',
          icon   : 'file_upload',
          label  : 'Importer',
          onClick: () => ImportExport.openImportDialog(),
        },
      ]);

      // Supprimer FABs spécifiques aux autres pages
      _removeFAB('fab-add-product');
      _removeFAB('voice-fab');

      UI.navigateTo(() => {
        Lists.renderHomePage();
      }, _getNavDirection('/'));

      UI.setPageCleanup(() => {
        Lists.destroy?.();
        Gestures.destroy?.();
      });
    });

    // ── Détail liste ────────────────────────────────────────────
    Router.on('/list/:id', (params) => {
      const list = Store.getListById(params.id);
      if (!list) {
        Router.goHome();
        Notifications.error('Liste introuvable.');
        return;
      }

      UI.setPageTitle(list.name);
      UI.setTopbarTitle(list.name);
      UI.setTopbarActions([
        {
          id     : 'topbar-voice-help',
          icon   : 'mic',
          label  : 'Aide vocale',
          onClick: () => Voice.showHelp(),
        },
        {
          id     : 'topbar-templates-list',
          icon   : 'auto_awesome',
          label  : 'Ajouter un template',
          onClick: () => Templates.openCatalog(params.id),
        },
        {
          id     : 'topbar-export-list',
          icon   : 'ios_share',
          label  : 'Exporter',
          onClick: () => ImportExport.openListExportMenu(params.id),
        },
        {
          id     : 'topbar-list-options',
          icon   : 'more_vert',
          label  : 'Options',
          onClick: (e) => _openListTopbarMenu(params.id, e.currentTarget),
        },
      ]);

      // Supprimer FAB listes si présent
      _removeFAB('fab-new-list');

      UI.navigateTo(() => {
        Products.renderListPage(params.id);
      }, _getNavDirection('/list/:id'));

      // Monter le bouton vocal après le rendu
      setTimeout(() => {
        Voice.mountFloatingUI(params.id);
      }, 350);

      UI.setPageCleanup(() => {
        Products.destroy();
        Voice.unmountFloatingUI();
      });

      Store.setCurrentList(params.id);
    });

    // ── Catégories ──────────────────────────────────────────────
    Router.on('/categories', () => {
      UI.setPageTitle('Catégories');
      UI.setTopbarTitle('Catégories');
      UI.setTopbarActions([
        {
          id     : 'topbar-add-cat',
          icon   : 'add',
          label  : 'Nouvelle catégorie',
          onClick: () => Categories.openCategoryForm(),
        },
      ]);

      _removeFAB('fab-add-product');
      _removeFAB('fab-new-list');
      _removeFAB('voice-fab');

      UI.navigateTo(() => {
        Categories.renderPage();
      }, _getNavDirection('/categories'));
    });

    // ── Statistiques ────────────────────────────────────────────
    Router.on('/stats', () => {
      UI.setPageTitle('Statistiques');
      UI.setTopbarTitle('Statistiques');
      UI.setTopbarActions([
        {
          id     : 'topbar-export-stats',
          icon   : 'file_download',
          label  : 'Exporter CSV',
          onClick: () => ImportExport.exportAllCSV(),
        },
      ]);

      _removeFAB('fab-add-product');
      _removeFAB('fab-new-list');
      _removeFAB('voice-fab');

      UI.navigateTo(() => {
        UI.renderStatsPage();
      }, _getNavDirection('/stats'));
    });

    // ── Paramètres ──────────────────────────────────────────────
    Router.on('/settings', () => {
      UI.setPageTitle('Paramètres');
      UI.setTopbarTitle('Paramètres');
      UI.setTopbarActions([]);

      _removeFAB('fab-add-product');
      _removeFAB('fab-new-list');
      _removeFAB('voice-fab');

      UI.navigateTo(() => {
        UI.renderSettingsPage();
      }, _getNavDirection('/settings'));
    });

    // ── Archivées ───────────────────────────────────────────────
    Router.on('/archived', () => {
      UI.setPageTitle('Listes archivées');
      UI.setTopbarTitle('Archivées');
      UI.setTopbarActions([]);

      _removeFAB('fab-add-product');
      _removeFAB('fab-new-list');
      _removeFAB('voice-fab');

      UI.navigateTo(() => {
        Lists.renderArchivedPage();
      }, _getNavDirection('/archived'));
    });

    // ── Guards ──────────────────────────────────────────────────
    Router.addGuard((route, params) => {
      if (route === '/list/:id' && params.id) {
        if (!Store.getListById(params.id)) {
          Notifications.warning('Cette liste n\'existe plus.');
          return false;
        }
      }
      return true;
    });

    console.info('[App] Routes configurées');
  }

  // ─── Direction de navigation ──────────────────────────────────

  function _getNavDirection(targetRoute) {
    const prev      = Router.getPreviousRoute();
    const hierarchy = [
      '/',
      '/list/:id',
      '/categories',
      '/stats',
      '/settings',
      '/archived',
    ];

    const prevIdx = hierarchy.indexOf(prev || '/');
    const currIdx = hierarchy.indexOf(targetRoute);

    if (prevIdx === -1 || currIdx === -1) return 'fade';
    if (currIdx > prevIdx) return 'forward';
    if (currIdx < prevIdx) return 'back';
    return 'fade';
  }

  // ─── Supprimer un FAB ─────────────────────────────────────────

  function _removeFAB(id) {
    document.getElementById(id)?.remove();
  }

  // ─── Menu topbar liste ────────────────────────────────────────

  function _openListTopbarMenu(listId, triggerEl) {
    const list = Store.getListById(listId);
    if (!list) return;

    // Fermer tout menu existant
    const existingMenu = document.getElementById('topbar-list-menu');
    if (existingMenu) {
      existingMenu.classList.remove('context-menu--visible');
      setTimeout(() => existingMenu.remove(), 200);
      return;
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id        = 'topbar-list-menu';

    const items = [
      {
        icon  : 'edit',
        label : 'Modifier la liste',
        action: () => Lists.openEditListModal(list),
      },
      {
        icon  : 'auto_awesome',
        label : 'Ajouter un template',
        action: () => Templates.openCatalog(listId),
      },
      {
        icon  : 'content_copy',
        label : 'Dupliquer',
        action: () => {
          Lists.duplicateList(listId);
          Router.goHome();
        },
      },
      {
        icon  : 'save_as',
        label : 'Sauver comme template',
        action: () => Templates.openCreateTemplate(listId),
      },
      {
        icon  : 'remove_done',
        label : 'Tout décocher',
        action: () => {
          const products = Store.getProducts(listId).filter(p => p.checked);
          products.forEach(p =>
            Store.updateProduct(listId, p.id, { checked: false })
          );
          if (products.length > 0) {
            Notifications.success(`${products.length} article(s) décoché(s).`);
          } else {
            Notifications.info('Aucun article coché.');
          }
        },
      },
      {
        icon  : 'delete_sweep',
        label : 'Supprimer cochés',
        action: async () => {
          const products = Store.getProducts(listId).filter(p => p.checked);
          if (products.length === 0) {
            Notifications.info('Aucun article coché à supprimer.');
            return;
          }
          const ok = await Modals.confirm({
            title  : 'Supprimer les articles cochés',
            message: `Supprimer ${products.length} article(s) coché(s) ?`,
            danger : true,
            confirmLabel: 'Supprimer',
          });
          if (ok) {
            products.forEach(p => Store.deleteProduct(listId, p.id));
            Notifications.success(`${products.length} article(s) supprimé(s).`);
          }
        },
      },
      { divider: true },
      {
        icon  : 'archive',
        label : 'Archiver la liste',
        action: () => Lists.archiveList(listId),
      },
      {
        icon  : 'delete',
        label : 'Supprimer la liste',
        danger: true,
        action: () => Lists.deleteList(listId),
      },
    ];

    items.forEach(item => {
      if (item.divider) {
        const div     = document.createElement('div');
        div.className = 'context-menu__divider';
        menu.appendChild(div);
        return;
      }

      const btn     = document.createElement('button');
      btn.className = `context-menu__item${item.danger
        ? ' context-menu__item--danger' : ''}`;
      btn.innerHTML = `
        <span class="material-symbols-rounded">${item.icon}</span>
        <span>${item.label}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _closeTopbarMenu();
        item.action();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    // Positionnement
    const rect = triggerEl.getBoundingClientRect();
    menu.style.cssText = `
      position: fixed;
      z-index: 9999;
      right: ${window.innerWidth - rect.right}px;
      top: ${rect.bottom + 6}px;
    `;

    requestAnimationFrame(() => menu.classList.add('context-menu--visible'));

    // Fermer au clic extérieur — avec double rAF pour éviter fermeture immédiate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const handler = (e) => {
          if (menu.contains(e.target)) return;
          _closeTopbarMenu();
          document.removeEventListener('click', handler);
          document.removeEventListener('keydown', keyHandler);
        };
        const keyHandler = (e) => {
          if (e.key === 'Escape') {
            _closeTopbarMenu();
            document.removeEventListener('click', handler);
            document.removeEventListener('keydown', keyHandler);
          }
        };
        document.addEventListener('click', handler);
        document.addEventListener('keydown', keyHandler);
      });
    });
  }

  function _closeTopbarMenu() {
    const menu = document.getElementById('topbar-list-menu');
    if (!menu) return;
    menu.classList.remove('context-menu--visible');
    setTimeout(() => menu.remove(), 200);
  }

  // ─── Actions URL (PWA shortcuts) ──────────────────────────────

  function _handleURLActions() {
    const url    = new URL(location.href);
    const action = url.searchParams.get('action');

    if (action === 'new-list') {
      // Attendre que l'app soit prête puis ouvrir la modale
      setTimeout(() => {
        Lists.openNewListModal();
        // Nettoyer l'URL
        url.searchParams.delete('action');
        history.replaceState({}, '', url.toString());
      }, 800);
    }
  }

  // ─── Service Worker ───────────────────────────────────────────

  async function _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.info('[App] Service Worker enregistré:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            Notifications.show({
              type    : 'info',
              title   : 'Mise à jour disponible',
              message : 'Une nouvelle version est disponible.',
              duration: 0,
              actions : [{
                label  : 'Actualiser',
                style  : 'primary',
                onClick: () => {
                  // Dire au SW de skip waiting
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                },
              }],
            });
          }
        });
      });

    } catch (e) {
      console.warn('[App] Service Worker non enregistré:', e.message);
    }
  }

  // ─── Gestion erreurs globales ─────────────────────────────────

  function _setupErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('[App] Erreur globale:', e.error);
      if (e.error?.name !== 'NavigationError') {
        Notifications.error('Une erreur inattendue s\'est produite.');
      }
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('[App] Promesse rejetée:', e.reason);
      if (e.reason?.name !== 'AbortError') {
        Notifications.error('Erreur lors d\'une opération asynchrone.');
      }
      e.preventDefault();
    });

    Store.subscribe('error', ({ message }) => {
      Notifications.error(message);
    });
  }

  // ─── Raccourcis clavier ───────────────────────────────────────

  function _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {

      // Ignorer si dans un champ de saisie
      if (
        e.target.tagName === 'INPUT'    ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT'   ||
        e.target.isContentEditable
      ) return;

      const { route, params } = Router.getCurrentRoute();

      switch (true) {

        // ── n = Nouvelle liste (home)
        case e.key === 'n' && !e.ctrlKey && !e.metaKey && route === '/':
          e.preventDefault();
          Lists.openNewListModal();
          break;

        // ── a = Ajouter produit (liste)
        case e.key === 'a' && !e.ctrlKey && !e.metaKey
          && route === '/list/:id':
          e.preventDefault();
          Products.openAddProductModal(params.id);
          break;

        // ── v = Vocal (liste)
        case e.key === 'v' && !e.ctrlKey && !e.metaKey
          && route === '/list/:id':
          e.preventDefault();
          if (Voice.isSupported) {
            Voice.toggle(params.id, (product) => {
              if (product) {
                Notifications.success(`🎤 "${product.name}" ajouté !`);
              }
            });
          } else {
            Notifications.warning(
              'Reconnaissance vocale non disponible sur ce navigateur.'
            );
          }
          break;

        // ── t = Thèmes
        case e.key === 't' && !e.ctrlKey && !e.metaKey:
          e.preventDefault();
          Themes.openThemePicker();
          break;

        // ── p = Templates (catalogue)
        case e.key === 'p' && !e.ctrlKey && !e.metaKey:
          e.preventDefault();
          if (route === '/list/:id') {
            Templates.openCatalog(params.id);
          } else {
            Templates.openCatalog();
          }
          break;

        // ── g = Accueil
        case e.key === 'g' && !e.ctrlKey && !e.metaKey:
          e.preventDefault();
          Router.goHome();
          break;

        // ── , = Paramètres
        case e.key === ',' && !e.ctrlKey && !e.metaKey:
          e.preventDefault();
          Router.goToSettings();
          break;

        // ── Backspace / Alt+← = Retour
        case (e.key === 'Backspace' || e.key === 'ArrowLeft') && e.altKey:
          e.preventDefault();
          Router.back();
          break;

        // ── Ctrl+E = Exporter
        case e.key === 'e' && (e.ctrlKey || e.metaKey):
          e.preventDefault();
          if (route === '/list/:id') {
            ImportExport.openListExportMenu(params.id);
          } else {
            ImportExport.exportAll();
          }
          break;

        // ── Ctrl+I = Importer
        case e.key === 'i' && (e.ctrlKey || e.metaKey):
          e.preventDefault();
          ImportExport.openImportDialog();
          break;

        // ── m = Menu sidebar
        case e.key === 'm' && !e.ctrlKey && !e.metaKey:
          e.preventDefault();
          Sidebar.toggle();
          break;

        // ── ? = Aide raccourcis
        case e.key === '?' && !e.ctrlKey && !e.metaKey:
          e.preventDefault();
          _showKeyboardHelp();
          break;

        // ── Escape = Fermer modales / menus
        case e.key === 'Escape':
          // Géré par Modals et les context menus individuellement
          break;

        default:
          break;
      }
    });
  }

  // ─── Aide raccourcis clavier ──────────────────────────────────

  function _showKeyboardHelp() {
    const shortcuts = [
      { keys: ['n'],          desc: 'Nouvelle liste (sur l\'accueil)',    ctx: 'Accueil' },
      { keys: ['a'],          desc: 'Ajouter un produit',                 ctx: 'Liste' },
      { keys: ['v'],          desc: 'Reconnaissance vocale',              ctx: 'Liste' },
      { keys: ['t'],          desc: 'Ouvrir les thèmes',                  ctx: 'Partout' },
      { keys: ['p'],          desc: 'Catalogue de templates',             ctx: 'Partout' },
      { keys: ['g'],          desc: 'Retour à l\'accueil',               ctx: 'Partout' },
      { keys: ['m'],          desc: 'Ouvrir/fermer le menu',             ctx: 'Partout' },
      { keys: [','],          desc: 'Paramètres',                         ctx: 'Partout' },
      { keys: ['Alt', '←'],   desc: 'Page précédente',                    ctx: 'Partout' },
      { keys: ['Ctrl', 'E'],  desc: 'Exporter',                           ctx: 'Partout' },
      { keys: ['Ctrl', 'I'],  desc: 'Importer',                           ctx: 'Partout' },
      { keys: ['?'],          desc: 'Afficher cette aide',                ctx: 'Partout' },
    ];

    const content = `
      <div class="keyboard-help">
        <p class="keyboard-help__intro">
          Utilisez ces raccourcis pour naviguer rapidement dans l'application.
        </p>
        <div class="keyboard-help__list">
          ${shortcuts.map(sc => `
            <div class="keyboard-help__item">
              <div class="keyboard-help__keys">
                ${sc.keys.map(k => `
                  <kbd class="keyboard-help__key">${k}</kbd>
                `).join('<span class="keyboard-help__plus">+</span>')}
              </div>
              <div class="keyboard-help__info">
                <span class="keyboard-help__desc">${sc.desc}</span>
                <span class="keyboard-help__ctx">${sc.ctx}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    Modals.open({
      type    : 'dialog',
      size    : 'md',
      title   : 'Raccourcis clavier',
      icon    : 'keyboard',
      content,
      closable: true,
      actions : [{
        label  : 'Fermer',
        type   : 'primary',
        onClick: () => Modals.closeTop(),
      }],
    });
  }

  // ─── API publique ─────────────────────────────────────────────
  return {
    init,
    get isReady()  { return isInitialized; },
    get version()  { return '2.0.0'; },
  };
})();

window.App = App;

// ─── Démarrage ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});