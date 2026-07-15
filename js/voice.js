/**
 * VOICE.JS - Reconnaissance vocale
 * Web Speech API — ajout de produits par la voix
 * Features : détection nom, quantité, unité, catégorie auto
 *            feedback visuel animé, historique vocal
 */

const Voice = (() => {

  // ─── État ────────────────────────────────────────────────────
  let recognition     = null;
  let isListening     = false;
  let currentListId   = null;
  let onResultCb      = null;
  let silenceTimer    = null;
  let interimResult   = '';
  let isSupported     = false;
  let _floatingUI     = null;

  // ─── Patterns de parsing vocal ───────────────────────────────

  const QTY_WORDS = {
    'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
    'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9,
    'dix': 10, 'douze': 12, 'quinze': 15, 'vingt': 20,
    'trente': 30, 'cinquante': 50, 'cent': 100,
  };

  const UNIT_PATTERNS = {
    kg      : /\b(kilo(?:gramme)?s?|kg)\b/i,
    g       : /\b(grammes?|g)\b/i,
    l       : /\b(litres?|l)\b/i,
    ml      : /\b(millilitres?|ml)\b/i,
    pack    : /\b(packs?|lots?)\b/i,
    boite   : /\b(bo[iî]tes?)\b/i,
    bouteille:/\b(bouteilles?)\b/i,
    sachet  : /\b(sachets?)\b/i,
    pcs     : /\b(pi[eè]ces?|pcs?|unit[eé]s?)\b/i,
  };

  // Mots à ignorer dans le nom du produit
  const STOP_WORDS = [
    'ajoute', 'ajouter', 'met', 'mets', 'mettre', 'rajoute',
    'rajouter', 'achète', 'acheter', 'prend', 'prendre',
    'de', 'du', 'des', 'de la', 'le', 'la', 'les',
    'à', 'au', 'aux', 'et', 'avec', 'pour', 'dans',
    'il', 'faut', 'me', 'nous', 's\'il', 'vous', 'plaît',
  ];

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[Voice] Web Speech API non supportée');
      isSupported = false;
      return;
    }

    isSupported = true;

    recognition = new SpeechRecognition();
    recognition.lang           = 'fr-FR';
    recognition.continuous     = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    _bindRecognitionEvents();
    console.info('[Voice] Reconnaissance vocale initialisée');
  }

  function _bindRecognitionEvents() {

    recognition.onstart = () => {
      isListening = true;
      _updateFloatingUI('listening');
      Store.emit('voice:started');
    };

    recognition.onend = () => {
      isListening = false;
      clearTimeout(silenceTimer);

      if (!interimResult) {
        _updateFloatingUI('idle');
      }
      Store.emit('voice:ended');
    };

    recognition.onerror = (e) => {
      isListening = false;
      interimResult = '';
      _updateFloatingUI('error');

      const messages = {
        'not-allowed'     : 'Microphone non autorisé. Vérifiez les permissions.',
        'no-speech'       : 'Aucune parole détectée. Réessayez.',
        'network'         : 'Erreur réseau. Vérifiez votre connexion.',
        'audio-capture'   : 'Microphone introuvable.',
        'service-not-allowed': 'Service vocal non autorisé.',
      };

      Notifications.error(messages[e.error] || `Erreur vocale : ${e.error}`);
      setTimeout(() => _updateFloatingUI('idle'), 2000);
    };

    recognition.onresult = (e) => {
      clearTimeout(silenceTimer);
      let interim = '';
      let final   = '';

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      // Afficher résultat intermédiaire
      if (interim) {
        interimResult = interim;
        _updateFloatingUI('processing', interim);
      }

      // Traiter résultat final
      if (final) {
        interimResult = '';
        _updateFloatingUI('processing', final);
        _processFinalResult(final, e.results);
      } else {
        // Silence détecté → arrêt automatique
        silenceTimer = setTimeout(() => {
          if (isListening) stop();
        }, 1500);
      }
    };

    recognition.onspeechstart = () => {
      _updateFloatingUI('listening');
    };

    recognition.onspeechend = () => {
      _updateFloatingUI('processing', interimResult);
    };
  }

  // ─── Start / Stop ─────────────────────────────────────────────

  function start(listId, callback) {
    if (!isSupported) {
      Notifications.error('Reconnaissance vocale non disponible sur ce navigateur.');
      return false;
    }
    if (isListening) { stop(); return false; }

    currentListId = listId;
    onResultCb    = callback;

    try {
      recognition.start();
      return true;
    } catch (e) {
      console.error('[Voice] Erreur start:', e);
      Notifications.error('Impossible de démarrer le microphone.');
      return false;
    }
  }

  function stop() {
    if (!isListening) return;
    try {
      recognition.stop();
    } catch (e) {
      console.warn('[Voice] Erreur stop:', e);
    }
  }

  function toggle(listId, callback) {
    return isListening ? (stop(), false) : start(listId, callback);
  }

  // ─── Parsing du résultat vocal ────────────────────────────────

  function _processFinalResult(transcript, allResults) {
    const text = transcript.toLowerCase().trim();
    console.info('[Voice] Transcript:', text);

    // Essayer les alternatives si disponibles
    const alternatives = [];
    if (allResults?.[allResults.length - 1]) {
      const result = allResults[allResults.length - 1];
      for (let i = 0; i < result.length; i++) {
        alternatives.push(result[i].transcript.toLowerCase().trim());
      }
    }

    const parsed = _parseVoiceInput(text) ||
      alternatives.slice(1).map(_parseVoiceInput).find(Boolean);

    if (!parsed || !parsed.name) {
      _updateFloatingUI('error');
      Notifications.warning(
        `Je n'ai pas compris "${transcript}". Dites par exemple : "2 kg de tomates"`
      );
      setTimeout(() => _updateFloatingUI('idle'), 2000);
      return;
    }

    // Auto-détecter catégorie
    parsed.category = Categories.detectCategory(parsed.name);

    _updateFloatingUI('success', parsed.name);
    _showVoiceConfirm(parsed, transcript);

    setTimeout(() => _updateFloatingUI('idle'), 3000);
  }

  /**
   * Parser une commande vocale en objet produit
   * Ex : "deux kilos de tomates bio" → { name: 'tomates bio', quantity: 2, unit: 'kg' }
   */
  function _parseVoiceInput(text) {
    if (!text) return null;

    let remaining = text.trim();
    let quantity  = 1;
    let unit      = 'pcs';
    let name      = '';

    // 1. Supprimer mots déclencheurs au début
    const triggerWords = [
      'ajoute ', 'ajouter ', 'rajoute ', 'met ', 'mets ',
      'achète ', 'prend ', 'prendre ', "j'ai besoin de ",
      "il faut ", "il me faut ", "mets moi ", "ajoute moi ",
    ];
    for (const trigger of triggerWords) {
      if (remaining.startsWith(trigger)) {
        remaining = remaining.slice(trigger.length);
        break;
      }
    }

    // 2. Extraire quantité numérique
    const numMatch = remaining.match(/^(\d+(?:[.,]\d+)?)\s*/);
    if (numMatch) {
      quantity  = parseFloat(numMatch[1].replace(',', '.'));
      remaining = remaining.slice(numMatch[0].length);
    } else {
      // Quantité en lettres
      for (const [word, val] of Object.entries(QTY_WORDS)) {
        const regex = new RegExp(`^${word}\\s+`, 'i');
        if (regex.test(remaining)) {
          quantity  = val;
          remaining = remaining.replace(regex, '');
          break;
        }
      }
    }

    // 3. Extraire unité
    for (const [unitKey, pattern] of Object.entries(UNIT_PATTERNS)) {
      const match = remaining.match(pattern);
      if (match) {
        unit      = unitKey;
        remaining = remaining.replace(match[0], '').trim();
        break;
      }
    }

    // 4. Nettoyer prépositions avant le nom
    remaining = remaining
      .replace(/^(de la?|du|des|d'|de)\s+/i, '')
      .trim();

    // 5. Supprimer stop words isolés
    STOP_WORDS.forEach(sw => {
      const swRegex = new RegExp(`\\b${sw}\\b`, 'gi');
      remaining = remaining.replace(swRegex, '').trim();
    });

    // 6. Nettoyer espaces multiples
    name = remaining
      .replace(/\s+/g, ' ')
      .trim();

    // Capitaliser première lettre
    if (name) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    if (!name || name.length < 2) return null;

    return { name, quantity, unit };
  }

  // ─── UI flottante ─────────────────────────────────────────────

  function mountFloatingUI(listId) {
    if (!isSupported) return;

    // Supprimer existant
    _floatingUI?.remove();

    const btn = document.createElement('button');
    btn.id        = 'voice-fab';
    btn.className = 'voice-fab';
    btn.setAttribute('aria-label', 'Reconnaissance vocale');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `
      <div class="voice-fab__rings">
        <div class="voice-fab__ring voice-fab__ring--1"></div>
        <div class="voice-fab__ring voice-fab__ring--2"></div>
        <div class="voice-fab__ring voice-fab__ring--3"></div>
      </div>
      <span class="material-symbols-rounded voice-fab__icon">mic</span>
      <span class="voice-fab__label">Vocal</span>
    `;

    btn.addEventListener('click', () => {
      toggle(listId, (product) => {
        if (product && currentListId) {
          Store.addProduct(currentListId, product);
          Notifications.success(`🎤 "${product.name}" ajouté !`);
        }
      });
    });

    document.getElementById('app-root')?.appendChild(btn);
    _floatingUI = btn;
  }

  function unmountFloatingUI() {
    _floatingUI?.remove();
    _floatingUI = null;
    if (isListening) stop();
  }

  function _updateFloatingUI(state, text = '') {
    const btn   = document.getElementById('voice-fab');
    if (!btn) return;

    const icon  = btn.querySelector('.voice-fab__icon');
    const label = btn.querySelector('.voice-fab__label');

    // Reset classes
    btn.className = 'voice-fab';
    btn.setAttribute('aria-pressed', state === 'listening' ? 'true' : 'false');

    switch (state) {
      case 'listening':
        btn.classList.add('voice-fab--listening');
        if (icon)  icon.textContent  = 'mic';
        if (label) label.textContent = 'Écoute...';
        break;

      case 'processing':
        btn.classList.add('voice-fab--processing');
        if (icon)  icon.textContent  = 'hearing';
        if (label) label.textContent = text
          ? _truncate(text, 18)
          : 'Traitement...';
        break;

      case 'success':
        btn.classList.add('voice-fab--success');
        if (icon)  icon.textContent  = 'check_circle';
        if (label) label.textContent = _truncate(text, 18);
        break;

      case 'error':
        btn.classList.add('voice-fab--error');
        if (icon)  icon.textContent  = 'mic_off';
        if (label) label.textContent = 'Erreur';
        break;

      default: // idle
        if (icon)  icon.textContent  = 'mic';
        if (label) label.textContent = 'Vocal';
    }
  }

  // ─── Dialogue de confirmation vocale ─────────────────────────

  function _showVoiceConfirm(parsed, originalText) {
    const settings   = Store.getSettings();
    const categories = Store.getCategories();
    const cat = categories.find(c => c.id === parsed.category) || {
      emoji: '📦', name: 'Autre',
    };

    const suggestions = Categories.suggestCategories(parsed.name).slice(0, 3);

    const content = `
      <div class="voice-confirm">

        <!-- Transcript original -->
        <div class="voice-confirm__transcript">
          <span class="material-symbols-rounded">record_voice_over</span>
          <span class="voice-confirm__text">"${originalText}"</span>
        </div>

        <!-- Visualisation onde -->
        <div class="voice-waveform" aria-hidden="true">
          ${Array(12).fill(0).map((_, i) => `
            <div class="voice-waveform__bar"
              style="animation-delay:${i * 80}ms;
                     height:${8 + Math.random() * 24}px">
            </div>
          `).join('')}
        </div>

        <!-- Résultat parsé -->
        <form id="voice-product-form" class="modal-form">

          <div class="voice-confirm__result">
            <div class="voice-confirm__field">
              <label class="form-label" for="vp-name">
                <span class="material-symbols-rounded">inventory_2</span>
                Produit détecté
              </label>
              <input type="text" id="vp-name" name="name"
                class="form-input voice-confirm__name-input"
                value="${parsed.name}" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="vp-qty">
                <span class="material-symbols-rounded">numbers</span>
                Quantité
              </label>
              <div class="qty-input-wrap">
                <button type="button" class="qty-btn" id="vp-qty-minus">
                  <span class="material-symbols-rounded">remove</span>
                </button>
                <input type="number" id="vp-qty" name="quantity"
                  class="form-input form-input--qty"
                  value="${parsed.quantity}" min="0.1" step="0.1" />
                <button type="button" class="qty-btn" id="vp-qty-plus">
                  <span class="material-symbols-rounded">add</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="vp-unit">
                <span class="material-symbols-rounded">straighten</span>
                Unité
              </label>
              <select id="vp-unit" name="unit" class="form-select">
                ${Utils.UNITS.map(u => `
                  <option value="${u.value}"
                    ${parsed.unit === u.value ? 'selected' : ''}>
                    ${u.label}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Catégorie -->
          <div class="form-group">
            <label class="form-label" for="vp-category">
              <span class="material-symbols-rounded">category</span>
              Catégorie
            </label>
            <select id="vp-category" name="category" class="form-select">
              ${categories.map(c => `
                <option value="${c.id}"
                  ${c.id === parsed.category ? 'selected' : ''}>
                  ${c.emoji} ${c.name}
                </option>
              `).join('')}
            </select>

            <!-- Suggestions catégorie -->
            ${suggestions.length > 0 ? `
              <div class="cat-suggestions" style="margin-top:var(--space-2)">
                <span class="cat-suggestions__label">Suggestions :</span>
                ${suggestions.map(s => `
                  <button type="button" class="cat-suggestion-btn"
                    data-cat-id="${s.id}">
                    ${s.emoji} ${s.name}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Prix rapide -->
          <div class="form-group">
            <label class="form-label" for="vp-price">
              <span class="material-symbols-rounded">euro</span>
              Prix (optionnel)
            </label>
            <input type="number" id="vp-price" name="price"
              class="form-input" placeholder="0.00"
              min="0" step="0.01" />
          </div>

        </form>

        <!-- Micro à nouveau -->
        <button class="voice-confirm__retry" id="voice-retry-btn">
          <span class="material-symbols-rounded">refresh</span>
          Réessayer
        </button>
      </div>
    `;

    const modalId = Modals.open({
      type    : 'bottomSheet',
      title   : 'Produit détecté 🎤',
      icon    : 'mic',
      content,
      closable: true,
      actions : [
        {
          label  : 'Annuler',
          type   : 'ghost',
          onClick: () => Modals.close(modalId),
        },
        {
          label  : 'Ajouter',
          type   : 'primary',
          icon   : 'add',
          onClick: () => _submitVoiceForm(modalId),
        },
      ],
    });

    // Events après DOM
    setTimeout(() => {
      const modal = document.getElementById(modalId);
      if (!modal) return;

      // Qty ± buttons
      modal.querySelector('#vp-qty-minus')
        ?.addEventListener('click', () => {
          const input = modal.querySelector('#vp-qty');
          if (input) input.value = Math.max(0.1,
            parseFloat(input.value) - 1).toString();
        });

      modal.querySelector('#vp-qty-plus')
        ?.addEventListener('click', () => {
          const input = modal.querySelector('#vp-qty');
          if (input) input.value = (parseFloat(input.value) + 1).toString();
        });

      // Suggestions catégorie
      modal.querySelectorAll('.cat-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const select = modal.querySelector('#vp-category');
          if (select) select.value = btn.dataset.catId;
          modal.querySelectorAll('.cat-suggestion-btn')
            .forEach(b => b.classList.remove('cat-suggestion-btn--selected'));
          btn.classList.add('cat-suggestion-btn--selected');
        });
      });

      // Retry
      modal.querySelector('#voice-retry-btn')
        ?.addEventListener('click', () => {
          Modals.close(modalId);
          setTimeout(() => start(currentListId, onResultCb), 300);
        });

      // Focus nom
      modal.querySelector('#vp-name')?.select();
    }, 150);
  }

  function _submitVoiceForm(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const form = modal.querySelector('#voice-product-form');
    const data = {};
    new FormData(form).forEach((v, k) => { data[k] = v; });

    if (!data.name?.trim()) {
      const input = form.querySelector('#vp-name');
      Utils.shake(input);
      return;
    }

    if (currentListId) {
      const product = Store.addProduct(currentListId, data);
      if (product) {
        onResultCb?.(product);
        Notifications.success(`🎤 "${data.name}" ajouté !`);
      }
    }

    Modals.close(modalId);
  }

  // ─── Panneau d'aide vocal ─────────────────────────────────────

  function showHelp() {
    const examples = [
      { cmd: '"Ajoute 2 kg de tomates"',     result: 'Tomates × 2 kg' },
      { cmd: '"Trois bouteilles de lait"',    result: 'Lait × 3 bouteilles' },
      { cmd: '"Un pack de bières"',           result: 'Bières × 1 pack' },
      { cmd: '"500 grammes de farine"',       result: 'Farine × 500 g' },
      { cmd: '"Achète des pâtes"',            result: 'Pâtes × 1 pcs' },
      { cmd: '"Il me faut du beurre"',        result: 'Beurre × 1 pcs' },
      { cmd: '"Quatre yaourts nature"',       result: 'Yaourts nature × 4' },
    ];

    const content = `
      <div class="voice-help">
        <div class="voice-help__intro">
          <span class="material-symbols-rounded voice-help__icon">mic</span>
          <p>Parlez naturellement pour ajouter des produits à votre liste.</p>
        </div>

        <h3 class="voice-help__section">Exemples de commandes</h3>
        <div class="voice-help__examples">
          ${examples.map(ex => `
            <div class="voice-help__example">
              <div class="voice-help__cmd">
                <span class="material-symbols-rounded">record_voice_over</span>
                ${ex.cmd}
              </div>
              <div class="voice-help__result">
                <span class="material-symbols-rounded">arrow_forward</span>
                ${ex.result}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="voice-help__tips">
          <h3>💡 Astuces</h3>
          <ul>
            <li>Précisez la <strong>quantité</strong> et <strong>l'unité</strong></li>
            <li>Utilisez <strong>"de"</strong> avant le produit</li>
            <li>Parlez clairement et sans bruit de fond</li>
            <li>La catégorie est <strong>détectée automatiquement</strong></li>
          </ul>
        </div>
      </div>
    `;

    Modals.open({
      type    : 'bottomSheet',
      title   : 'Aide — Reconnaissance vocale',
      icon    : 'help',
      content,
      closable: true,
      actions : [],
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────

  function _truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  // ─── API publique ─────────────────────────────────────────────
  return {
    init,
    start,
    stop,
    toggle,
    mountFloatingUI,
    unmountFloatingUI,
    showHelp,
    get isSupported()  { return isSupported; },
    get isListening()  { return isListening; },
  };
})();

window.Voice = Voice;