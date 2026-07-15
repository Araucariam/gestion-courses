/**
 * THEMES.JS - Thèmes personnalisés OKLCH
 * Features : palette de thèmes, éditeur de couleurs,
 *            thème par heure, aperçu live
 */

const Themes = (() => {

  // ─── Thèmes prédéfinis ────────────────────────────────────────

  const BUILTIN_THEMES = [
    {
      id   : 'ocean',
      name : 'Océan',
      emoji: '🌊',
      vars : {
        '--clr-primary'        : 'oklch(55% 0.22 250)',
        '--clr-secondary'      : 'oklch(60% 0.2 200)',
        '--clr-accent'         : 'oklch(68% 0.22 180)',
      },
    },
    {
      id   : 'forest',
      name : 'Forêt',
      emoji: '🌿',
      vars : {
        '--clr-primary'        : 'oklch(52% 0.22 145)',
        '--clr-secondary'      : 'oklch(58% 0.18 120)',
        '--clr-accent'         : 'oklch(68% 0.2 95)',
      },
    },
    {
      id   : 'sunset',
      name : 'Coucher de soleil',
      emoji: '🌅',
      vars : {
        '--clr-primary'        : 'oklch(60% 0.22 25)',
        '--clr-secondary'      : 'oklch(65% 0.2 50)',
        '--clr-accent'         : 'oklch(72% 0.2 80)',
      },
    },
    {
      id   : 'lavender',
      name : 'Lavande',
      emoji: '💜',
      vars : {
        '--clr-primary'        : 'oklch(58% 0.2 290)',
        '--clr-secondary'      : 'oklch(65% 0.18 310)',
        '--clr-accent'         : 'oklch(72% 0.15 330)',
      },
    },
    {
      id   : 'rose',
      name : 'Rose doré',
      emoji: '🌸',
      vars : {
        '--clr-primary'        : 'oklch(62% 0.2 350)',
        '--clr-secondary'      : 'oklch(68% 0.18 20)',
        '--clr-accent'         : 'oklch(75% 0.15 60)',
      },
    },
    {
      id   : 'midnight',
      name : 'Minuit',
      emoji: '🌙',
      vars : {
        '--clr-primary'        : 'oklch(65% 0.15 260)',
        '--clr-secondary'      : 'oklch(60% 0.18 280)',
        '--clr-accent'         : 'oklch(70% 0.12 230)',
      },
    },
    {
      id   : 'cherry',
      name : 'Cerise',
      emoji: '🍒',
      vars : {
        '--clr-primary'        : 'oklch(55% 0.25 15)',
        '--clr-secondary'      : 'oklch(60% 0.22 350)',
        '--clr-accent'         : 'oklch(68% 0.2 330)',
      },
    },
    {
      id   : 'citrus',
      name : 'Citrus',
      emoji: '🍊',
      vars : {
        '--clr-primary'        : 'oklch(68% 0.22 55)',
        '--clr-secondary'      : 'oklch(72% 0.2 75)',
        '--clr-accent'         : 'oklch(78% 0.18 95)',
      },
    },
  ];

  let currentThemeId = 'ocean';
  let autoThemeTimer = null;

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    const saved = Utils.safeGetItem('gc_theme_id', 'ocean');
    applyTheme(saved);

    const settings = Store.getSettings();
    if (settings.autoThemeByTime) {
      enableAutoThemeByTime();
    }

    console.info('[Themes] Initialisé — thème:', saved);
  }

  // ─── Appliquer un thème ───────────────────────────────────────

  function applyTheme(themeId, preview = false) {
    const theme = getAllThemes().find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;

    // Appliquer les variables CSS
    Object.entries(theme.vars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });

    // Mettre à jour meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      // Extraire la couleur oklch du primary
      metaTheme.content = theme.vars['--clr-primary'];
    }

    if (!preview) {
      currentThemeId = themeId;
      Utils.safeSetItem('gc_theme_id', themeId);
      Store.emit('theme:changed', { themeId, theme });
    }
  }

  function resetTheme() {
    const root = document.documentElement;
    const defaultVars = [
      '--clr-primary', '--clr-secondary', '--clr-accent',
    ];
    defaultVars.forEach(v => root.style.removeProperty(v));
    currentThemeId = 'ocean';
    Utils.safeSetItem('gc_theme_id', 'ocean');
    applyTheme('ocean');
  }

  // ─── Thème automatique selon l'heure ─────────────────────────

  function enableAutoThemeByTime() {
    _applyTimeTheme();
    autoThemeTimer = setInterval(_applyTimeTheme, 60 * 1000);
  }

  function disableAutoThemeByTime() {
    if (autoThemeTimer) {
      clearInterval(autoThemeTimer);
      autoThemeTimer = null;
    }
  }

  function _applyTimeTheme() {
    const hour = new Date().getHours();
    let themeId;

    if (hour >= 5  && hour < 9)  themeId = 'citrus';    // Matin → orange vif
    else if (hour >= 9  && hour < 12) themeId = 'ocean';    // Matinée → bleu clair
    else if (hour >= 12 && hour < 14) themeId = 'forest';   // Midi → vert
    else if (hour >= 14 && hour < 18) themeId = 'lavender'; // Après-midi → violet
    else if (hour >= 18 && hour < 21) themeId = 'sunset';   // Soir → coucher
    else themeId = 'midnight';                               // Nuit → sombre

    applyTheme(themeId);
  }

  // ─── Page de sélection de thème ──────────────────────────────

  function openThemePicker() {
    const themes   = getAllThemes();
    const settings = Store.getSettings();

    const content = `
      <div class="theme-picker">

        <!-- Thème auto par heure -->
        <div class="theme-auto-section">
          <div class="settings-item" style="border-radius:var(--radius-lg);
            border:1px solid var(--clr-border);margin-bottom:var(--space-4)">
            <div class="settings-item__info">
              <span class="settings-item__label">
                <span class="material-symbols-rounded">schedule</span>
                Thème selon l'heure
              </span>
              <span class="settings-item__desc">
                Change automatiquement selon le moment de la journée
              </span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="auto-theme-toggle"
                ${settings.autoThemeByTime ? 'checked' : ''} />
              <span class="toggle-switch__track">
                <span class="toggle-switch__thumb"></span>
              </span>
            </label>
          </div>
        </div>

        <!-- Grille de thèmes -->
        <h3 class="theme-picker__section">Thèmes prédéfinis</h3>
        <div class="theme-grid" id="theme-grid">
          ${themes.map(theme => `
            <button
              class="theme-swatch ${theme.id === currentThemeId ? 'theme-swatch--active' : ''}"
              data-theme-id="${theme.id}"
              aria-label="${theme.name}"
              aria-pressed="${theme.id === currentThemeId}"
            >
              <div class="theme-swatch__preview">
                <div class="theme-swatch__colors">
                  <div class="theme-swatch__color"
                    style="background:${theme.vars['--clr-primary']}"></div>
                  <div class="theme-swatch__color"
                    style="background:${theme.vars['--clr-secondary']}"></div>
                  <div class="theme-swatch__color"
                    style="background:${theme.vars['--clr-accent']}"></div>
                </div>
                <div class="theme-swatch__mockup">
                  <div class="theme-swatch__mock-bar"
                    style="background:${theme.vars['--clr-primary']}"></div>
                  <div class="theme-swatch__mock-card">
                    <div class="theme-swatch__mock-dot"
                      style="background:${theme.vars['--clr-primary']}"></div>
                    <div class="theme-swatch__mock-lines">
                      <div class="theme-swatch__mock-line"></div>
                      <div class="theme-swatch__mock-line theme-swatch__mock-line--short"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="theme-swatch__footer">
                <span class="theme-swatch__emoji">${theme.emoji}</span>
                <span class="theme-swatch__name">${theme.name}</span>
                ${theme.id === currentThemeId ? `
                  <span class="material-symbols-rounded theme-swatch__check">check_circle</span>
                ` : ''}
              </div>
            </button>
          `).join('')}
        </div>

        <!-- Éditeur custom -->
        <h3 class="theme-picker__section" style="margin-top:var(--space-6)">
          Couleur personnalisée
        </h3>
        <div class="theme-custom-editor">
          <div class="theme-custom-editor__colors">
            ${[
              { key: '--clr-primary',   label: 'Primaire',    icon: 'palette' },
              { key: '--clr-secondary', label: 'Secondaire',  icon: 'palette' },
              { key: '--clr-accent',    label: 'Accent',      icon: 'palette' },
            ].map(item => `
              <div class="theme-color-row">
                <label class="form-label theme-color-row__label">
                  <span class="material-symbols-rounded">${item.icon}</span>
                  ${item.label}
                </label>
                <div class="theme-color-row__inputs">
                  <div class="theme-color-preview" id="preview-${item.key.slice(2)}"
                    style="background:var(${item.key})"></div>
                  <input type="range" class="oklch-slider oklch-slider--l"
                    data-var="${item.key}" data-channel="l"
                    min="20" max="90" step="1" value="55"
                    aria-label="Luminosité ${item.label}" />
                  <input type="range" class="oklch-slider oklch-slider--c"
                    data-var="${item.key}" data-channel="c"
                    min="0" max="35" step="1" value="22"
                    aria-label="Chroma ${item.label}" />
                  <input type="range" class="oklch-slider oklch-slider--h"
                    data-var="${item.key}" data-channel="h"
                    min="0" max="360" step="1" value="250"
                    aria-label="Teinte ${item.label}" />
                </div>
              </div>
            `).join('')}
          </div>
          <button class="btn btn--secondary btn--sm btn--full" id="save-custom-theme">
            <span class="material-symbols-rounded">save</span>
            Sauvegarder comme thème custom
          </button>
        </div>

      </div>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : '🎨 Thèmes',
      icon    : 'palette',
      content,
      closable: true,
      actions : [],
    });

    // Events après DOM
    setTimeout(() => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      // Sélection thème
      modal.querySelector('#theme-grid')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.theme-swatch');
        if (!btn) return;

        const themeId = btn.dataset.themeId;
        applyTheme(themeId);

        modal.querySelectorAll('.theme-swatch').forEach(s => {
          s.classList.remove('theme-swatch--active');
          s.setAttribute('aria-pressed', 'false');
          s.querySelector('.theme-swatch__check')?.remove();
        });

        btn.classList.add('theme-swatch--active');
        btn.setAttribute('aria-pressed', 'true');

        const footer = btn.querySelector('.theme-swatch__footer');
        if (footer && !footer.querySelector('.theme-swatch__check')) {
          const check = document.createElement('span');
          check.className   = 'material-symbols-rounded theme-swatch__check';
          check.textContent = 'check_circle';
          footer.appendChild(check);
        }

        Notifications.success(`Thème "${getAllThemes().find(t => t.id === themeId)?.name}" appliqué !`);
      });

      // Toggle thème auto
      modal.querySelector('#auto-theme-toggle')?.addEventListener('change', (e) => {
        Store.updateSettings({ autoThemeByTime: e.target.checked });
        if (e.target.checked) {
          enableAutoThemeByTime();
          Notifications.info('Thème automatique activé !');
        } else {
          disableAutoThemeByTime();
          Notifications.info('Thème automatique désactivé.');
        }
      });

      // Sliders OKLCH custom
      const customVars = {
        '--clr-primary'   : { l: 55, c: 22, h: 250 },
        '--clr-secondary' : { l: 60, c: 20, h: 290 },
        '--clr-accent'    : { l: 68, c: 22, h: 145 },
      };

      modal.querySelectorAll('.oklch-slider').forEach(slider => {
        slider.addEventListener('input', () => {
          const varKey  = slider.dataset.var;
          const channel = slider.dataset.channel;
          if (!customVars[varKey]) return;

          customVars[varKey][channel] = parseFloat(slider.value);
          const { l, c, h } = customVars[varKey];
          const oklchVal = `oklch(${l}% 0.${c.toString().padStart(2,'0')} ${h})`;

          document.documentElement.style.setProperty(varKey, oklchVal);

          // Mise à jour prévisualisation
          const previewId = `preview-${varKey.slice(2)}`;
          const preview   = modal.querySelector(`#${previewId}`);
          if (preview) preview.style.background = oklchVal;
        });
      });

      // Sauvegarder thème custom
      modal.querySelector('#save-custom-theme')?.addEventListener('click', () => {
        const customTheme = {
          id   : `custom-${Date.now()}`,
          name : 'Mon thème',
          emoji: '✨',
          vars : {},
          isCustom: true,
        };

        Object.entries(customVars).forEach(([key, { l, c, h }]) => {
          customTheme.vars[key] =
            `oklch(${l}% 0.${c.toString().padStart(2,'0')} ${h})`;
        });

        saveCustomTheme(customTheme);
        applyTheme(customTheme.id);
        Modals.close(modalId);
        Notifications.success('Thème personnalisé sauvegardé !');
      });
    }, 150);

    return modalId;
  }

  // ─── Thèmes custom ────────────────────────────────────────────

  function getCustomThemes() {
    return Utils.safeGetItem('gc_custom_themes', []);
  }

  function getAllThemes() {
    return [...BUILTIN_THEMES, ...getCustomThemes()];
  }

  function saveCustomTheme(theme) {
    const customs = getCustomThemes();
    customs.unshift(theme);
    Utils.safeSetItem('gc_custom_themes', customs);
    Store.emit('themes:updated');
  }

  function deleteCustomTheme(id) {
    const customs = getCustomThemes().filter(t => t.id !== id);
    Utils.safeSetItem('gc_custom_themes', customs);
    if (currentThemeId === id) resetTheme();
    Store.emit('themes:updated');
  }

  // ─── API publique ─────────────────────────────────────────────
  return {
    init,
    applyTheme,
    resetTheme,
    openThemePicker,
    getAllThemes,
    getCustomThemes,
    saveCustomTheme,
    deleteCustomTheme,
    enableAutoThemeByTime,
    disableAutoThemeByTime,
    get currentThemeId() { return currentThemeId; },
  };
})();

window.Themes = Themes;