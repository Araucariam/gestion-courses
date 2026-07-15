/**
 * STORE.JS - État global & persistance LocalStorage
 * Gestion centralisée de toutes les données de l'application
 */

const STORAGE_KEYS = {
  LISTS: 'gc_lists',
  CATEGORIES: 'gc_categories',
  SETTINGS: 'gc_settings',
  VERSION: 'gc_version',
};

const APP_VERSION = '1.0.0';

// ─── État initial par défaut ───────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  theme: 'light',         // 'light' | 'dark' | 'auto'
  currency: 'EUR',
  currencySymbol: '€',
  language: 'fr',
  sortProductsBy: 'category', // 'category' | 'name' | 'added'
  showPrices: true,
  compactMode: false,
  notifications: true,
};

// ─── Store principal ───────────────────────────────────────────────────────
const Store = (() => {
  let state = {
    lists: [],
    categories: [],
    settings: { ...DEFAULT_SETTINGS },
    currentListId: null,
    isLoaded: false,
  };

  // Listeners pour réactivité
  const listeners = new Map();

  /**
   * S'abonner aux changements d'état
   * @param {string} event - nom de l'événement
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  function subscribe(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);

    return () => listeners.get(event)?.delete(callback);
  }

  /**
   * Émettre un événement
   * @param {string} event
   * @param {*} data
   */
  function emit(event, data) {
    listeners.get(event)?.forEach(cb => cb(data));
    listeners.get('*')?.forEach(cb => cb({ event, data }));
  }

  // ─── Persistance ──────────────────────────────────────────────────────────

  function save(key) {
    try {
      switch (key) {
        case 'lists':
          localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(state.lists));
          break;
        case 'categories':
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
          break;
        case 'settings':
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
          break;
        default:
          // Sauvegarde complète
          localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(state.lists));
          localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      }
    } catch (e) {
      console.error('[Store] Erreur sauvegarde:', e);
      emit('error', { type: 'storage', message: 'Impossible de sauvegarder les données.' });
    }
  }

  function load() {
    try {
      const listsRaw = localStorage.getItem(STORAGE_KEYS.LISTS);
      const categoriesRaw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const settingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);

      if (listsRaw) state.lists = JSON.parse(listsRaw);
      if (categoriesRaw) state.categories = JSON.parse(categoriesRaw);
      if (settingsRaw) state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) };

      // Initialiser version si première fois
      if (!localStorage.getItem(STORAGE_KEYS.VERSION)) {
        localStorage.setItem(STORAGE_KEYS.VERSION, APP_VERSION);
      }

      state.isLoaded = true;
      emit('loaded', state);
    } catch (e) {
      console.error('[Store] Erreur chargement:', e);
      state.isLoaded = true;
      emit('error', { type: 'load', message: 'Erreur lors du chargement des données.' });
    }
  }

  // ─── LISTES ───────────────────────────────────────────────────────────────

  function getLists() {
    return [...state.lists];
  }

  function getListById(id) {
    return state.lists.find(l => l.id === id) || null;
  }

  function createList(data) {
    const list = {
      id: Utils.generateId(),
      name: data.name || 'Nouvelle liste',
      description: data.description || '',
      color: data.color || Utils.randomColor(),
      icon: data.icon || 'shopping_cart',
      emoji: data.emoji || '🛒',
      budget: data.budget ? parseFloat(data.budget) : null,
      products: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      isArchived: false,
      tags: data.tags || [],
    };

    state.lists.unshift(list);
    save('lists');
    emit('list:created', list);
    return list;
  }

  function updateList(id, data) {
    const index = state.lists.findIndex(l => l.id === id);
    if (index === -1) return null;

    state.lists[index] = {
      ...state.lists[index],
      ...data,
      id, // Immutable
      updatedAt: new Date().toISOString(),
    };

    save('lists');
    emit('list:updated', state.lists[index]);
    return state.lists[index];
  }

  function deleteList(id) {
    const index = state.lists.findIndex(l => l.id === id);
    if (index === -1) return false;

    const deleted = state.lists.splice(index, 1)[0];
    save('lists');
    emit('list:deleted', deleted);
    return true;
  }

  function archiveList(id) {
    return updateList(id, { isArchived: true, archivedAt: new Date().toISOString() });
  }

  function duplicateList(id) {
    const original = getListById(id);
    if (!original) return null;

    const copy = {
      ...original,
      id: Utils.generateId(),
      name: `${original.name} (copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      products: original.products.map(p => ({
        ...p,
        id: Utils.generateId(),
        checked: false,
      })),
    };

    state.lists.unshift(copy);
    save('lists');
    emit('list:created', copy);
    return copy;
  }

  // ─── PRODUITS ─────────────────────────────────────────────────────────────

  function getProducts(listId) {
    const list = getListById(listId);
    return list ? [...list.products] : [];
  }

  function addProduct(listId, data) {
    const list = getListById(listId);
    if (!list) return null;

    const product = {
      id: Utils.generateId(),
      name: data.name || 'Produit',
      category: data.category || 'other',
      quantity: parseFloat(data.quantity) || 1,
      unit: data.unit || 'pcs',
      price: data.price ? parseFloat(data.price) : null,
      note: data.note || '',
      checked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.products.push(product);
    list.updatedAt = new Date().toISOString();
    save('lists');
    emit('product:added', { listId, product });
    return product;
  }

  function updateProduct(listId, productId, data) {
    const list = getListById(listId);
    if (!list) return null;

    const index = list.products.findIndex(p => p.id === productId);
    if (index === -1) return null;

    list.products[index] = {
      ...list.products[index],
      ...data,
      id: productId,
      updatedAt: new Date().toISOString(),
    };

    list.updatedAt = new Date().toISOString();
    save('lists');
    emit('product:updated', { listId, product: list.products[index] });
    return list.products[index];
  }

  function deleteProduct(listId, productId) {
    const list = getListById(listId);
    if (!list) return false;

    const index = list.products.findIndex(p => p.id === productId);
    if (index === -1) return false;

    const deleted = list.products.splice(index, 1)[0];
    list.updatedAt = new Date().toISOString();
    save('lists');
    emit('product:deleted', { listId, product: deleted });
    return true;
  }

  function toggleProduct(listId, productId) {
    const list = getListById(listId);
    if (!list) return null;

    const product = list.products.find(p => p.id === productId);
    if (!product) return null;

    product.checked = !product.checked;
    product.updatedAt = new Date().toISOString();
    list.updatedAt = new Date().toISOString();

    // Vérifier si la liste est complète
    if (list.products.length > 0 && list.products.every(p => p.checked)) {
      list.completedAt = new Date().toISOString();
      emit('list:completed', list);
    } else {
      list.completedAt = null;
    }

    save('lists');
    emit('product:toggled', { listId, product });
    return product;
  }

  function reorderProducts(listId, newOrder) {
    const list = getListById(listId);
    if (!list) return false;

    list.products = newOrder;
    list.updatedAt = new Date().toISOString();
    save('lists');
    emit('products:reordered', { listId });
    return true;
  }

  // ─── CATÉGORIES ───────────────────────────────────────────────────────────

  function getCategories() {
    return [...state.categories];
  }

  function getCategoryById(id) {
    return state.categories.find(c => c.id === id) || null;
  }

  function setCategories(categories) {
    state.categories = categories;
    save('categories');
    emit('categories:updated', categories);
  }

  function addCategory(data) {
    const category = {
      id: data.id || Utils.generateId(),
      name: data.name,
      icon: data.icon || 'category',
      emoji: data.emoji || '📦',
      color: data.color || Utils.randomColor(),
      image: data.image || null,
      isCustom: data.isCustom !== false,
      createdAt: new Date().toISOString(),
    };

    state.categories.push(category);
    save('categories');
    emit('category:added', category);
    return category;
  }

  function updateCategory(id, data) {
    const index = state.categories.findIndex(c => c.id === id);
    if (index === -1) return null;

    state.categories[index] = { ...state.categories[index], ...data, id };
    save('categories');
    emit('category:updated', state.categories[index]);
    return state.categories[index];
  }

  function deleteCategory(id) {
    const index = state.categories.findIndex(c => c.id === id);
    if (index === -1) return false;

    state.categories.splice(index, 1);
    save('categories');
    emit('category:deleted', { id });
    return true;
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────

  function getSettings() {
    return { ...state.settings };
  }

  function updateSettings(data) {
    state.settings = { ...state.settings, ...data };
    save('settings');
    emit('settings:updated', state.settings);
    return state.settings;
  }

  // ─── CALCULS ──────────────────────────────────────────────────────────────

  function getListStats(listId) {
    const list = getListById(listId);
    if (!list) return null;

    const products = list.products;
    const total = products.reduce((sum, p) => {
      if (p.price && p.quantity) return sum + (p.price * p.quantity);
      return sum;
    }, 0);

    const checkedTotal = products
      .filter(p => p.checked)
      .reduce((sum, p) => {
        if (p.price && p.quantity) return sum + (p.price * p.quantity);
        return sum;
      }, 0);

    return {
      total,
      checkedTotal,
      remaining: total - checkedTotal,
      itemCount: products.length,
      checkedCount: products.filter(p => p.checked).length,
      progress: products.length > 0
        ? Math.round((products.filter(p => p.checked).length / products.length) * 100)
        : 0,
      overBudget: list.budget ? total > list.budget : false,
      budgetRemaining: list.budget ? list.budget - total : null,
    };
  }

  function getGlobalStats() {
    const activeLists = state.lists.filter(l => !l.isArchived);
    const globalTotal = activeLists.reduce((sum, list) => {
      const stats = getListStats(list.id);
      return sum + (stats?.total || 0);
    }, 0);

    const totalProducts = activeLists.reduce((sum, l) => sum + l.products.length, 0);
    const checkedProducts = activeLists.reduce(
      (sum, l) => sum + l.products.filter(p => p.checked).length, 0
    );

    return {
      listCount: activeLists.length,
      archivedCount: state.lists.filter(l => l.isArchived).length,
      totalProducts,
      checkedProducts,
      globalTotal,
      currency: state.settings.currency,
      currencySymbol: state.settings.currencySymbol,
    };
  }

  // ─── IMPORT / EXPORT ─────────────────────────────────────────────────────

  function exportData() {
    return {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      lists: state.lists,
      categories: state.categories,
      settings: state.settings,
    };
  }

  function importData(data, mode = 'merge') {
    try {
      if (mode === 'replace') {
        state.lists = data.lists || [];
        state.categories = data.categories || [];
      } else {
        // Merge : éviter les doublons par ID
        const existingListIds = new Set(state.lists.map(l => l.id));
        const newLists = (data.lists || []).filter(l => !existingListIds.has(l.id));
        state.lists = [...state.lists, ...newLists];

        const existingCatIds = new Set(state.categories.map(c => c.id));
        const newCats = (data.categories || []).filter(c => !existingCatIds.has(c.id));
        state.categories = [...state.categories, ...newCats];
      }

      save();
      emit('data:imported', { mode, listCount: state.lists.length });
      return true;
    } catch (e) {
      console.error('[Store] Erreur import:', e);
      return false;
    }
  }

  function clearAll() {
    state.lists = [];
    state.categories = [];
    save();
    emit('data:cleared');
  }

  // ─── ÉTAT COURANT ─────────────────────────────────────────────────────────

  function setCurrentList(id) {
    state.currentListId = id;
    emit('currentList:changed', id);
  }

  function getCurrentList() {
    return state.currentListId ? getListById(state.currentListId) : null;
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    // Init
    load,
    save,

    // Subscriptions
    subscribe,
    emit,

    // Listes
    getLists,
    getListById,
    createList,
    updateList,
    deleteList,
    archiveList,
    duplicateList,

    // Produits
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProduct,
    reorderProducts,

    // Catégories
    getCategories,
    getCategoryById,
    setCategories,
    addCategory,
    updateCategory,
    deleteCategory,

    // Settings
    getSettings,
    updateSettings,

    // Stats
    getListStats,
    getGlobalStats,

    // Import/Export
    exportData,
    importData,
    clearAll,

    // Navigation state
    setCurrentList,
    getCurrentList,

    // Getters état brut
    get state() { return state; },
    get version() { return APP_VERSION; },
  };
})();

// Export global
window.Store = Store;