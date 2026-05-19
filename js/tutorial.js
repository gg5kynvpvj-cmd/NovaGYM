/* ═══════════════════════════════════════════════════════════
   NovaGYM — Tutoriel de première utilisation
   Affiché une seule fois après inscription/connexion
   ═══════════════════════════════════════════════════════════ */

window.Tutorial = (() => {

  const SEEN_KEY = 'tutorial_seen';
  let currentStep = 0;

  const t = k => (window.I18n ? I18n.t(k) : k);

  const STEPS = [
    { icon: 'dumbbell',  tab: null,        titleKey: 'tut.welcome_title', descKey: 'tut.welcome_desc' },
    { icon: 'dumbbell',  tab: 'today',     titleKey: 'tut.today_title',   descKey: 'tut.today_desc'   },
    { icon: 'activity',  tab: 'stats',     titleKey: 'tut.stats_title',   descKey: 'tut.stats_desc'   },
    { icon: 'calendar',  tab: 'history',   titleKey: 'tut.history_title', descKey: 'tut.history_desc' },
    { icon: 'droplet',   tab: 'nutrition', titleKey: 'tut.nutri_title',   descKey: 'tut.nutri_desc'   },
    { icon: 'users',     tab: 'social',    titleKey: 'tut.social_title',  descKey: 'tut.social_desc'  },
    { icon: 'zap',       tab: 'settings',  titleKey: 'tut.settings_title',descKey: 'tut.settings_desc'},
    { icon: 'trophy',    tab: null,        titleKey: 'tut.final_title',   descKey: 'tut.final_desc'   },
  ];

  /* ─── Affichage ─────────────────────────────────────────── */
  function renderStep() {
    const step   = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;

    document.getElementById('tut-icon').innerHTML  = Icons.s(step.icon, 52);
    document.getElementById('tut-title').textContent = t(step.titleKey);
    document.getElementById('tut-desc').textContent  = t(step.descKey);

    // Dots
    document.getElementById('tut-dots').innerHTML = STEPS
      .map((_, i) => `<span class="tut-dot${i === currentStep ? ' active' : ''}"></span>`)
      .join('');

    // Boutons
    const nextBtn = document.getElementById('btn-tut-next');
    const skipBtn = document.getElementById('btn-tut-skip');
    if (nextBtn) nextBtn.textContent = isLast ? t('tut.finish') : t('tut.next');
    if (skipBtn) skipBtn.classList.toggle('hidden', isLast);

    // Highlight tab dans la nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('tut-highlight'));
    if (step.tab) {
      document.querySelector(`.nav-item[data-tab="${step.tab}"]`)?.classList.add('tut-highlight');
    }
  }

  function next() {
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      renderStep();
    } else {
      hide();
    }
  }

  function show() {
    currentStep = 0;
    renderStep();
    document.getElementById('tutorial-overlay')?.classList.remove('hidden');
  }

  function hide() {
    document.getElementById('tutorial-overlay')?.classList.add('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('tut-highlight'));
    App.local.set(SEEN_KEY, '1');
  }

  function maybeShow() {
    if (!App.local.get(SEEN_KEY)) setTimeout(show, 900);
  }

  /* ─── Init ──────────────────────────────────────────────── */
  function init() {
    document.getElementById('btn-tut-next')?.addEventListener('click', next);
    document.getElementById('btn-tut-skip')?.addEventListener('click', hide);
    document.getElementById('btn-replay-tutorial')?.addEventListener('click', () => {
      App.local.del(SEEN_KEY);
      show();
    });
  }

  return { init, show, maybeShow };

})();
