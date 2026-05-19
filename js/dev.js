/* ═══════════════════════════════════════════════════════════
   NovaGYM — Dev Tools : sélecteur de police (mode DEV)
   Activation : appui long (2 s) sur le numéro de version
   ═══════════════════════════════════════════════════════════ */

window.DevTools = (() => {

  const DEV_KEY  = 'dev_mode';
  const FONT_KEY = 'dev_font';

  /* ─── Catalogue de polices ─────────────────────────────── */
  const FONTS = [
    {
      id:    'system',
      name:  'Système',
      stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      gfont: null,
      tag:   'Actuelle',
      desc:  'SF Pro / Roboto selon appareil',
    },
    {
      id:    'inter',
      name:  'Inter',
      stack: `'Inter', sans-serif`,
      gfont: 'Inter:wght@400;500;600;700',
      tag:   'Neutre',
      desc:  'Standard premium, très lisible',
    },
    {
      id:    'dm-sans',
      name:  'DM Sans',
      stack: `'DM Sans', sans-serif`,
      gfont: 'DM+Sans:wght@400;500;600;700',
      tag:   'Premium',
      desc:  'Élégant, style Apple / Notion',
    },
    {
      id:    'outfit',
      name:  'Outfit',
      stack: `'Outfit', sans-serif`,
      gfont: 'Outfit:wght@400;500;600;700',
      tag:   'Sport',
      desc:  'Géométrique, énergie fitness',
    },
    {
      id:    'jakarta',
      name:  'Plus Jakarta',
      stack: `'Plus Jakarta Sans', sans-serif`,
      gfont: 'Plus+Jakarta+Sans:wght@400;500;600;700',
      tag:   'Moderne',
      desc:  'Tech / startup premium',
    },
    {
      id:    'grotesk',
      name:  'Space Grotesk',
      stack: `'Space Grotesk', sans-serif`,
      gfont: 'Space+Grotesk:wght@400;500;600;700',
      tag:   'Distinctif',
      desc:  'Caractère fort, style editorial',
    },
    {
      id:    'figtree',
      name:  'Figtree',
      stack: `'Figtree', sans-serif`,
      gfont: 'Figtree:wght@400;500;600;700',
      tag:   'Lisible',
      desc:  'Arrondi, agréable sur mobile',
    },
  ];

  let pressTimer = null;

  /* ─── Application de la police ──────────────────────────── */
  function applyFont(fontId) {
    const font = FONTS.find(f => f.id === fontId) || FONTS[0];
    document.documentElement.style.setProperty('--font', font.stack);
    App.local.set(FONT_KEY, font.id);
  }

  function selectFont(fontId) {
    applyFont(fontId);
    renderPicker(fontId);
    updatePreviewLabel(fontId);
  }

  /* ─── Chargement Google Fonts ───────────────────────────── */
  function loadGoogleFonts() {
    if (document.getElementById('dev-gfonts')) return;
    const params = FONTS
      .filter(f => f.gfont)
      .map(f => `family=${f.gfont}`)
      .join('&');
    const link  = document.createElement('link');
    link.id     = 'dev-gfonts';
    link.rel    = 'stylesheet';
    link.href   = `https://fonts.googleapis.com/css2?${params}&display=swap`;
    document.head.appendChild(link);
  }

  /* ─── Rendu du picker ───────────────────────────────────── */
  function renderPicker(activeId) {
    const grid = document.getElementById('dev-font-picker');
    if (!grid) return;

    grid.innerHTML = FONTS.map(f => `
      <div class="dev-font-card${f.id === activeId ? ' active' : ''}" data-fid="${f.id}" title="${f.desc}">
        <div class="dev-font-card-name" style="font-family:${f.stack}">${f.name}</div>
        <div class="dev-font-card-tag">${f.tag}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.dev-font-card').forEach(card => {
      card.addEventListener('click', () => selectFont(card.dataset.fid));
    });
  }

  /* ─── Mise à jour du label courant ──────────────────────── */
  function updatePreviewLabel(activeId) {
    const font = FONTS.find(f => f.id === activeId) || FONTS[0];
    const el = document.getElementById('dev-font-active-name');
    if (el) el.textContent = font.name;
    const desc = document.getElementById('dev-font-active-desc');
    if (desc) desc.textContent = font.desc;
  }

  /* ─── Affiche / cache la section dev ────────────────────── */
  function showDevSection() {
    const el = document.getElementById('dev-section');
    if (!el) return;
    el.classList.remove('hidden');
    loadGoogleFonts();
    const saved = App.local.get(FONT_KEY) || 'system';
    renderPicker(saved);
    updatePreviewLabel(saved);
  }

  function hideDevSection() {
    document.getElementById('dev-section')?.classList.add('hidden');
  }

  /* ─── Active / désactive le mode dev ────────────────────── */
  function enableDev() {
    App.local.set(DEV_KEY, '1');
    const ver = document.querySelector('.app-version');
    if (ver) { ver.textContent = 'NovaGYM v1.0 ⚙'; ver.classList.add('dev-active'); }
    showDevSection();
  }

  function disableDev() {
    App.local.del(DEV_KEY);
    // Remet la police système
    selectFont('system');
    App.local.del(FONT_KEY);
    hideDevSection();
    const ver = document.querySelector('.app-version');
    if (ver) { ver.textContent = 'NovaGYM v1.0'; ver.classList.remove('dev-active'); }
  }

  /* ─── Init ──────────────────────────────────────────────── */
  function init() {
    // Restaure uniquement la police choisie — pas d'activation dev en production
    const savedFont = App.local.get(FONT_KEY);
    if (savedFont) applyFont(savedFont);
  }

  return { init, selectFont };

})();
