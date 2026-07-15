/**
 * IMPORT-EXPORT.JS - Gestion import/export des données
 * Formats : JSON (complet), CSV (produits), partage natif
 * Features : import merge/replace, validation, prévisualisation
 */

const ImportExport = (() => {

  // ─── EXPORT ───────────────────────────────────────────────────────────────

  /**
   * Exporter toutes les données en JSON
   */
  function exportAll() {
    const data     = Store.exportData();
    const json     = JSON.stringify(data, null, 2);
    const filename = `courses_backup_${_dateStamp()}.json`;
    _downloadFile(json, filename, 'application/json');
    Notifications.success(`Export réussi : ${filename}`);
  }

  /**
   * Exporter une liste spécifique en JSON
   * @param {string} listId
   */
  function exportList(listId) {
    const list = Store.getListById(listId);
    if (!list) return;

    const data = {
      version   : Store.version,
      exportedAt: new Date().toISOString(),
      lists     : [list],
      categories: Store.getCategories(),
    };

    const json     = JSON.stringify(data, null, 2);
    const filename = `liste_${_sanitizeFilename(list.name)}_${_dateStamp()}.json`;
    _downloadFile(json, filename, 'application/json');
    Notifications.success(`"${list.name}" exportée !`);
  }

  /**
   * Exporter une liste en CSV
   * @param {string} listId
   */
  function exportListCSV(listId) {
    const list     = Store.getListById(listId);
    if (!list) return;

    const settings   = Store.getSettings();
    const categories = Store.getCategories();

    const rows = [
      // En-tête
      ['Produit', 'Catégorie', 'Quantité', 'Unité', `Prix (${settings.currencySymbol})`,
       `Sous-total (${settings.currencySymbol})`, 'Coché', 'Note'],
      // Données
      ...list.products.map(p => {
        const cat = categories.find(c => c.id === p.category);
        return [
          p.name,
          cat?.name || 'Autre',
          p.quantity,
          p.unit,
          p.price || '',
          p.price ? (p.price * p.quantity).toFixed(2) : '',
          p.checked ? 'Oui' : 'Non',
          p.note || '',
        ];
      }),
      // Total
      ['', '', '', '', 'TOTAL',
       Store.getListStats(listId)?.total.toFixed(2) || '0', '', ''],
    ];

    const csv      = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const filename = `liste_${_sanitizeFilename(list.name)}_${_dateStamp()}.csv`;
    _downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
    Notifications.success(`CSV exporté : ${filename}`);
  }

  /**
   * Exporter toutes les listes en CSV global
   */
  function exportAllCSV() {
    const lists    = Store.getLists().filter(l => !l.isArchived);
    const settings = Store.getSettings();
    const categories = Store.getCategories();

    const rows = [
      ['Liste', 'Produit', 'Catégorie', 'Quantité', 'Unité',
       `Prix (${settings.currencySymbol})`, `Sous-total (${settings.currencySymbol})`,
       'Coché', 'Note'],
    ];

    lists.forEach(list => {
      list.products.forEach(p => {
        const cat = categories.find(c => c.id === p.category);
        rows.push([
          list.name,
          p.name,
          cat?.name || 'Autre',
          p.quantity,
          p.unit,
          p.price || '',
          p.price ? (p.price * p.quantity).toFixed(2) : '',
          p.checked ? 'Oui' : 'Non',
          p.note || '',
        ]);
      });
    });

    const csv      = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const filename = `toutes_listes_${_dateStamp()}.csv`;
    _downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
    Notifications.success('Export CSV global réussi !');
  }

  // ─── IMPORT ───────────────────────────────────────────────────────────────

  /**
   * Ouvrir le dialogue d'import
   */
  function openImportDialog() {
    const content = `
      <div class="import-dialog">

        <div class="import-zone" id="import-drop-zone">
          <span class="material-symbols-rounded import-zone__icon">file_upload</span>
          <p class="import-zone__title">Glissez votre fichier ici</p>
          <p class="import-zone__sub">ou</p>
          <label class="btn btn--primary" for="import-file-input">
            <span class="material-symbols-rounded">folder_open</span>
            Parcourir
          </label>
          <input
            type="file"
            id="import-file-input"
            accept=".json"
            class="visually-hidden"
          />
          <p class="import-zone__hint">Format accepté : JSON (.json)</p>
        </div>

        <!-- Prévisualisation -->
        <div class="import-preview" id="import-preview" style="display:none">
          <div class="import-preview__header">
            <span class="material-symbols-rounded">preview</span>
            <h3>Aperçu de l'import</h3>
          </div>
          <div class="import-preview__stats" id="import-preview-stats"></div>
          <div class="import-preview__lists" id="import-preview-lists"></div>
        </div>

        <!-- Mode import -->
        <div class="import-mode" id="import-mode-section" style="display:none">
          <p class="import-mode__label">Mode d'import :</p>
          <div class="import-mode__options">
            <label class="radio-option">
              <input type="radio" name="import-mode" value="merge" checked />
              <div class="radio-option__content">
                <span class="material-symbols-rounded">merge</span>
                <div>
                  <strong>Fusionner</strong>
                  <p>Ajouter sans écraser les données existantes</p>
                </div>
              </div>
            </label>
            <label class="radio-option">
              <input type="radio" name="import-mode" value="replace" />
              <div class="radio-option__content">
                <span class="material-symbols-rounded">sync</span>
                <div>
                  <strong>Remplacer</strong>
                  <p class="text-danger">⚠ Efface toutes les données actuelles</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Erreur -->
        <div class="import-error" id="import-error" style="display:none">
          <span class="material-symbols-rounded">error</span>
          <p id="import-error-msg"></p>
        </div>

      </div>
    `;

    let pendingData = null;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Importer des données',
      icon    : 'file_upload',
      size    : 'lg',
      content,
      closable: true,
      actions : [
        {
          label   : 'Annuler',
          type    : 'ghost',
          onClick : () => Modals.close(modalId),
        },
        {
          id      : 'import-confirm',
          label   : 'Importer',
          type    : 'primary',
          icon    : 'download',
          onClick : () => {
            if (!pendingData) {
              Notifications.warning('Veuillez sélectionner un fichier.');
              return;
            }
            _executeImport(modalId, pendingData);
          },
        },
      ],
    });

    // Init events après DOM
    setTimeout(() => {
      _initImportEvents(modalId, (data) => { pendingData = data; });
    }, 100);

    return modalId;
  }

  function _initImportEvents(modalId, onDataReady) {
    const modal    = document.getElementById(modalId);
    if (!modal) return;

    const dropZone = modal.querySelector('#import-drop-zone');
    const fileInput = modal.querySelector('#import-file-input');

    // ── Input fichier
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) _readFile(file, modal, onDataReady);
    });

    // ── Drag & Drop
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('import-zone--dragover');
    });

    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('import-zone--dragover');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('import-zone--dragover');
      const file = e.dataTransfer.files?.[0];
      if (file) _readFile(file, modal, onDataReady);
    });
  }

  function _readFile(file, modal, onDataReady) {
    const errorEl   = modal.querySelector('#import-error');
    const errorMsg  = modal.querySelector('#import-error-msg');
    const preview   = modal.querySelector('#import-preview');
    const modeSection = modal.querySelector('#import-mode-section');

    if (!file.name.endsWith('.json')) {
      _showImportError(errorEl, errorMsg, 'Format non supporté. Utilisez un fichier .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Validation structure
        const validation = _validateImportData(data);
        if (!validation.isValid) {
          _showImportError(errorEl, errorMsg, validation.error);
          return;
        }

        // Masquer erreur
        if (errorEl) errorEl.style.display = 'none';

        // Afficher prévisualisation
        _showImportPreview(modal, data);
        if (preview)     preview.style.display     = '';
        if (modeSection) modeSection.style.display = '';

        onDataReady(data);
      } catch {
        _showImportError(errorEl, errorMsg, 'Fichier JSON invalide ou corrompu.');
      }
    };
    reader.onerror = () => {
      _showImportError(errorEl, errorMsg, 'Erreur lors de la lecture du fichier.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function _validateImportData(data) {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Format de fichier invalide.' };
    }
    if (!Array.isArray(data.lists)) {
      return { isValid: false, error: 'Aucune liste trouvée dans le fichier.' };
    }
    if (data.lists.length === 0) {
      return { isValid: false, error: 'Le fichier ne contient aucune liste.' };
    }
    // Vérifier structure basique d'une liste
    const firstList = data.lists[0];
    if (!firstList.id || !firstList.name) {
      return { isValid: false, error: 'Structure de liste invalide.' };
    }
    return { isValid: true };
  }

  function _showImportPreview(modal, data) {
    const statsEl = modal.querySelector('#import-preview-stats');
    const listsEl = modal.querySelector('#import-preview-lists');

    const totalProducts = data.lists.reduce(
      (sum, l) => sum + (l.products?.length || 0), 0
    );
    const exportDate = data.exportedAt
      ? Utils.formatDate(data.exportedAt)
      : 'Inconnue';

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="preview-stat">
          <span class="material-symbols-rounded">list_alt</span>
          <strong>${data.lists.length}</strong> liste(s)
        </div>
        <div class="preview-stat">
          <span class="material-symbols-rounded">inventory_2</span>
          <strong>${totalProducts}</strong> produit(s)
        </div>
        <div class="preview-stat">
          <span class="material-symbols-rounded">calendar_today</span>
          Export du <strong>${exportDate}</strong>
        </div>
      `;
    }

    if (listsEl) {
      listsEl.innerHTML = data.lists.slice(0, 5).map(list => `
        <div class="preview-list-item">
          <span class="preview-list-item__emoji">${list.emoji || '🛒'}</span>
          <div class="preview-list-item__info">
            <strong>${list.name}</strong>
            <span>${list.products?.length || 0} produit(s)</span>
          </div>
        </div>
      `).join('') + (data.lists.length > 5
        ? `<p class="preview-more">... et ${data.lists.length - 5} autre(s)</p>`
        : '');
    }
  }

  function _showImportError(errorEl, errorMsg, message) {
    if (errorEl)  errorEl.style.display  = '';
    if (errorMsg) errorMsg.textContent   = message;
  }

  async function _executeImport(modalId, data) {
    const modal    = document.getElementById(modalId);
    const modeEl   = modal?.querySelector('input[name="import-mode"]:checked');
    const mode     = modeEl?.value || 'merge';

    if (mode === 'replace') {
      const confirmed = await Modals.confirm({
        title  : 'Remplacer les données',
        message: 'Cette action supprimera TOUTES vos données actuelles. Continuer ?',
        danger : true,
        confirmLabel: 'Remplacer',
      });
      if (!confirmed) return;
    }

    const loader = Notifications.loading('Import en cours...');

    try {
      const success = Store.importData(data, mode);
      if (success) {
        loader.resolve(
          `${data.lists.length} liste(s) importée(s) avec succès !`
        );
        Modals.close(modalId);
        Router.goHome();
      } else {
        loader.reject('Échec de l\'import.');
      }
    } catch (e) {
      loader.reject('Erreur lors de l\'import.');
      console.error('[ImportExport] Erreur:', e);
    }
  }

  // ─── Partage natif ────────────────────────────────────────────────────────

  /**
   * Partager les données via Web Share API
   * @param {string} [listId] - Si absent, partage tout
   */
  async function shareData(listId = null) {
    if (!navigator.share) {
      Notifications.info('Partage non disponible sur ce navigateur.');
      return;
    }

    const data     = listId
      ? { lists: [Store.getListById(listId)], categories: Store.getCategories() }
      : Store.exportData();

    const json     = JSON.stringify(data, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const filename = listId
      ? `liste_${_sanitizeFilename(Store.getListById(listId)?.name || 'export')}.json`
      : `courses_${_dateStamp()}.json`;

    const file = new File([blob], filename, { type: 'application/json' });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Mes listes de courses',
          files: [file],
        });
      } else {
        await navigator.share({
          title: 'Mes listes de courses',
          text : json,
        });
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        Notifications.error('Erreur lors du partage.');
      }
    }
  }

  // ─── Sauvegarde automatique ───────────────────────────────────────────────

  /**
   * Activer la sauvegarde automatique périodique
   * @param {number} intervalMs
   */
  function enableAutoBackup(intervalMs = 5 * 60 * 1000) {
    return setInterval(() => {
      const settings = Store.getSettings();
      if (settings.autoBackup) {
        const data = Store.exportData();
        Utils.safeSetItem('gc_auto_backup', data);
        console.info('[ImportExport] Sauvegarde auto effectuée');
      }
    }, intervalMs);
  }

  /**
   * Restaurer depuis la sauvegarde automatique
   */
  function restoreFromAutoBackup() {
    const backup = Utils.safeGetItem('gc_auto_backup');
    if (!backup) {
      Notifications.info('Aucune sauvegarde automatique trouvée.');
      return false;
    }
    return Store.importData(backup, 'replace');
  }

  // ─── Menu d'actions import/export ────────────────────────────────────────

  /**
   * Ouvrir le menu complet import/export pour une liste
   * @param {string} listId
   */
  function openListExportMenu(listId) {
    const list = Store.getListById(listId);
    if (!list) return;

    const content = `
      <div class="export-menu">
        <button class="export-menu__item" id="exp-json">
          <div class="export-menu__icon" style="background: oklch(65% 0.2 250)">
            <span class="material-symbols-rounded">data_object</span>
          </div>
          <div class="export-menu__info">
            <strong>JSON complet</strong>
            <span>Sauvegarde complète réimportable</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </button>

        <button class="export-menu__item" id="exp-csv">
          <div class="export-menu__icon" style="background: oklch(65% 0.2 145)">
            <span class="material-symbols-rounded">table_chart</span>
          </div>
          <div class="export-menu__info">
            <strong>CSV (tableur)</strong>
            <span>Ouvrir dans Excel ou Google Sheets</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </button>

        <button class="export-menu__item" id="exp-share">
          <div class="export-menu__icon" style="background: oklch(65% 0.2 290)">
            <span class="material-symbols-rounded">share</span>
          </div>
          <div class="export-menu__info">
            <strong>Partager</strong>
            <span>Via les applications du téléphone</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </button>

        <button class="export-menu__item" id="exp-copy">
          <div class="export-menu__icon" style="background: oklch(65% 0.2 60)">
            <span class="material-symbols-rounded">content_copy</span>
          </div>
          <div class="export-menu__info">
            <strong>Copier le texte</strong>
            <span>Copier la liste en texte formaté</span>
          </div>
          <span class="material-symbols-rounded">chevron_right</span>
        </button>
      </div>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : `Exporter "${list.name}"`,
      icon    : 'ios_share',
      content,
      closable: true,
      actions : [],
    });

    setTimeout(() => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      modal.querySelector('#exp-json')?.addEventListener('click', () => {
        Modals.close(modalId);
        exportList(listId);
      });

      modal.querySelector('#exp-csv')?.addEventListener('click', () => {
        Modals.close(modalId);
        exportListCSV(listId);
      });

      modal.querySelector('#exp-share')?.addEventListener('click', () => {
        Modals.close(modalId);
        shareData(listId);
      });

      modal.querySelector('#exp-copy')?.addEventListener('click', async () => {
        const stats = Store.getListStats(listId);
        const text  = _listToText(list, stats);
        const ok    = await Utils.copyToClipboard(text);
        Modals.close(modalId);
        if (ok) Notifications.success('Liste copiée dans le presse-papiers !');
        else    Notifications.error('Impossible de copier.');
      });
    }, 100);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function _downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1000);
  }

  function _dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function _sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 30);
  }

  function _listToText(list, stats) {
    const settings = Store.getSettings();
    const lines    = [
      `🛒 ${list.name}`,
      list.description ? `📝 ${list.description}` : null,
      '',
    ];

    // Grouper par catégorie
    const categories = Store.getCategories();
    const groups     = Utils.groupByCategory(list.products, categories);

    groups.forEach(({ category, products }) => {
      lines.push(`\n${category.emoji} ${category.name}`);
      products.forEach(p => {
        const checked  = p.checked ? '✅' : '☐';
        const qty      = Utils.formatQuantity(p.quantity, p.unit);
        const price    = p.price
          ? ` — ${Utils.formatCurrency(p.price * p.quantity, settings.currencySymbol)}`
          : '';
        lines.push(`  ${checked} ${p.name} (${qty})${price}`);
        if (p.note) lines.push(`      💬 ${p.note}`);
      });
    });

    lines.push('');
    lines.push(`💰 Total estimé : ${Utils.formatCurrency(stats?.total, settings.currencySymbol)}`);
    lines.push(`📅 ${Utils.formatDate(list.updatedAt)}`);

    return lines.filter(l => l !== null).join('\n');
  }

  // ─── API publique ─────────────────────────────────────────────────────────
  return {
    exportAll,
    exportList,
    exportListCSV,
    exportAllCSV,
    openImportDialog,
    openListExportMenu,
    shareData,
    enableAutoBackup,
    restoreFromAutoBackup,
  };
})();

window.ImportExport = ImportExport;