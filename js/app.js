/* ═══════════════════════════════════════════════════════════
   NovaGYM — Contrôleur principal
   Navigation, initialisation, orchestration des modules
   ═══════════════════════════════════════════════════════════ */

(async () => {

  /* ─── Navigation entre pages ─────────────────────────── */
  App.navigate = function(pageName) {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active', 'page-enter');
    });
    const target = document.getElementById('page-' + pageName);
    if (target) {
      target.classList.add('active', 'page-enter');
    }

    // Affiche la nav uniquement sur l'app principale
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.classList.toggle('hidden', pageName !== 'app');
  };

  /* ─── Navigation onglets (bottom nav) ────────────────── */
  function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabName);
    if (tab) {
      tab.classList.add('active');
      tab.style.animation = 'none';
      tab.offsetHeight;
      tab.style.animation = 'fadeSlideUp 0.3s var(--ease)';
    }

    if (tabName === 'today')     Today.render();
    if (tabName === 'stats')     Stats.refresh();
    if (tabName === 'history')   History.load();
    if (tabName === 'nutrition') Nutrition.render();
    if (tabName === 'settings')  Settings.refreshHeader();
  }

  function initBottomNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    // Boutons icône profil → navigue vers settings
    document.querySelectorAll('.profile-icon-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab('settings'));
    });
  }

  App.switchTab = switchTab;

  /* ─── Refresh général de l'app ───────────────────────── */
  App.refreshApp = async function() {
    const profile = App.state.profile;
    if (!profile) return;

    // Met à jour les icônes profil (lettre ou avatar)
    const letter = (profile.username || 'N').charAt(0).toUpperCase();
    ['today', 'stats', 'history', 'nutrition'].forEach(tab => {
      const el = document.getElementById(`profile-icon-letter-${tab}`);
      if (el) el.textContent = letter;
    });
    const savedAvatar = App.local.get('avatar_url') || App.local.get('avatar');
    if (savedAvatar && window.Settings) Settings.applyAvatar(savedAvatar);

    // Today
    Today.render();

    // Sessions en arrière-plan
    await Stats.loadSessions();

    // Badges
    if (App.state.user) {
      await Badges.loadEarned(App.state.user.id);
    }

    // Settings header
    Settings.refreshHeader();
  };

  /* ─── Splash screen → vérif session → page cible ────── */
  async function boot() {
    // Applique le thème sauvegardé
    const savedTheme = App.local.get('theme');
    if (savedTheme === 'light') document.documentElement.classList.add('light');

    // Initialise la langue
    if (window.I18n) I18n.init();

    App.navigate('splash');

    let destination = 'auth';
    try {
      const timeout = new Promise(r => setTimeout(() => r('auth'), 5000));
      const [dest] = await Promise.all([
        Promise.race([Auth.checkSession(), timeout]),
        new Promise(r => setTimeout(r, 1800)),
      ]);
      destination = dest || 'auth';
    } catch(e) {
      console.error('Boot error:', e);
    }

    App.navigate(destination);

    if (destination === 'app') {
      try { await App.refreshApp(); } catch(e) { console.warn(e); }
    }
  }

  /* ─── Initialisation de tous les modules ─────────────── */
  function initModules() {
    Auth.init();
    Onboarding.init();
    Timer.init();
    Today.init();
    Stats.init();
    Nutrition.init();
    Settings.init();
  }

  /* ─── CSS animation helper (tab content) ─────────────── */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);

  /* ─── Lancement ──────────────────────────────────────── */
  initModules();
  initBottomNav();
  await boot();

})();
