/**
 * UTILS.JS - Utilitaires partagés
 */

const Utils = (() => {

  // ─── IDs ──────────────────────────────────────────────────────────────────

  function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ─── Couleurs OKLCH ───────────────────────────────────────────────────────

  const PRESET_COLORS = [
    'oklch(65% 0.2 25)',    // rouge
    'oklch(65% 0.2 60)',    // orange
    'oklch(70% 0.2 95)',    // jaune
    'oklch(65% 0.2 145)',   // vert
    'oklch(65% 0.2 195)',   // cyan
    'oklch(65% 0.2 250)',   // bleu
    'oklch(65% 0.2 290)',   // violet
    'oklch(65% 0.2 330)',   // rose
  ];

  function randomColor() {
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }

  function getPresetColors() {
    return [...PRESET_COLORS];
  }

  // ─── Formatage ────────────────────────────────────────────────────────────

  function formatCurrency(amount, symbol = '€', decimals = 2) {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return `${parseFloat(amount).toFixed(decimals)} ${symbol}`;
  }

  function formatDate(isoString, options = {}) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const defaults = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    };
    return new Intl.DateTimeFormat('fr-FR', defaults).format(date);
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const date = new Date(isoString);
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7) return `il y a ${days}j`;
    return formatDate(isoString);
  }

  function formatQuantity(qty, unit) {
    const units = {
      pcs: { label: 'pcs', plural: 'pcs' },
      kg: { label: 'kg', plural: 'kg' },
      g: { label: 'g', plural: 'g' },
      l: { label: 'L', plural: 'L' },
      ml: { label: 'mL', plural: 'mL' },
      pack: { label: 'pack', plural: 'packs' },
      boite: { label: 'boîte', plural: 'boîtes' },
      bouteille: { label: 'bouteille', plural: 'bouteilles' },
      sachet: { label: 'sachet', plural: 'sachets' },
    };

    const unitInfo = units[unit] || { label: unit, plural: unit };
    const label = qty > 1 ? unitInfo.plural : unitInfo.label;
    return `${qty} ${label}`;
  }

  const UNITS = [
    { value: 'pcs', label: 'Pièce(s)' },
    { value: 'kg', label: 'Kilogramme (kg)' },
    { value: 'g', label: 'Gramme (g)' },
    { value: 'l', label: 'Litre (L)' },
    { value: 'ml', label: 'Millilitre (mL)' },
    { value: 'pack', label: 'Pack' },
    { value: 'boite', label: 'Boîte' },
    { value: 'bouteille', label: 'Bouteille' },
    { value: 'sachet', label: 'Sachet' },
  ];

  // ─── DOM ──────────────────────────────────────────────────────────────────

  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dKey, dVal]) => {
          el.dataset[dKey] = dVal;
        });
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'html') {
        el.innerHTML = value;
      } else if (key === 'text') {
        el.textContent = value;
      } else {
        el.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });

    return el;
  }

  function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ─── Animations ───────────────────────────────────────────────────────────

  function animateIn(el, animationClass = 'animate-in') {
    el.classList.remove(animationClass);
    void el.offsetWidth; // reflow
    el.classList.add(animationClass);
  }

  function fadeOut(el, duration = 300) {
    return new Promise(resolve => {
      el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
      el.style.opacity = '0';
      el.style.transform = 'scale(0.95)';
      setTimeout(() => {
        el.style.display = 'none';
        resolve();
      }, duration);
    });
  }

  function shake(el) {
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  function validateListForm(data) {
    const errors = {};
    if (!data.name || data.name.trim().length < 1) {
      errors.name = 'Le nom est requis';
    }
    if (data.name && data.name.length > 50) {
      errors.name = 'Le nom est trop long (50 car. max)';
    }
    if (data.budget && isNaN(parseFloat(data.budget))) {
      errors.budget = 'Budget invalide';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  function validateProductForm(data) {
    const errors = {};
    if (!data.name || data.name.trim().length < 1) {
      errors.name = 'Le nom du produit est requis';
    }
    if (data.quantity && (isNaN(data.quantity) || data.quantity <= 0)) {
      errors.quantity = 'Quantité invalide';
    }
    if (data.price && (isNaN(data.price) || data.price < 0)) {
      errors.price = 'Prix invalide';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  }

  // ─── Debounce / Throttle ─────────────────────────────────────────────────

  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function throttle(fn, limit = 100) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        fn(...args);
      }
    };
  }

  // ─── Tri & Filtre ─────────────────────────────────────────────────────────

  function sortProducts(products, by = 'category') {
    const sorted = [...products];
    switch (by) {
      case 'category':
        return sorted.sort((a, b) => {
          if (a.category < b.category) return -1;
          if (a.category > b.category) return 1;
          return a.name.localeCompare(b.name, 'fr');
        });
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      case 'price':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'checked':
        return sorted.sort((a, b) => {
          if (a.checked === b.checked) return 0;
          return a.checked ? 1 : -1;
        });
      case 'added':
      default:
        return sorted.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
    }
  }

  function groupByCategory(products, categories) {
    const groups = new Map();

    products.forEach(product => {
      const catId = product.category;
      if (!groups.has(catId)) {
        const cat = categories.find(c => c.id === catId) || {
          id: catId,
          name: 'Autre',
          emoji: '📦',
          icon: 'category',
        };
        groups.set(catId, { category: cat, products: [] });
      }
      groups.get(catId).products.push(product);
    });

    return [...groups.values()];
  }

  function filterProducts(products, query) {
    if (!query) return products;
    const q = query.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.note && p.note.toLowerCase().includes(q))
    );
  }

  // ─── Couleur ──────────────────────────────────────────────────────────────

  function hexToOklch(hex) {
    // Conversion basique hex → oklch approximative pour interface
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    return `oklch(${(l * 100).toFixed(0)}% 0.15 ${Math.random() * 360 | 0})`;
  }

  // ─── Local Storage safe ───────────────────────────────────────────────────

  function safeGetItem(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  // ─── Clipboard ───────────────────────────────────────────────────────────

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    generateId,
    randomColor,
    getPresetColors,
    PRESET_COLORS,
    UNITS,

    formatCurrency,
    formatDate,
    formatRelativeTime,
    formatQuantity,

    $,
    $$,
    createElement,
    clearElement,

    animateIn,
    fadeOut,
    shake,

    validateListForm,
    validateProductForm,

    debounce,
    throttle,

    sortProducts,
    groupByCategory,
    filterProducts,

    hexToOklch,
    safeGetItem,
    safeSetItem,
    copyToClipboard,
  };
})();

window.Utils = Utils;