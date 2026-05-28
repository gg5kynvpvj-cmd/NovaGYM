/* ═══════════════════════════════════════════════════════════
   NovaGYM — Système de badges
   Vérifie les conditions et attribue les badges
   ═══════════════════════════════════════════════════════════ */

window.Badges = (() => {

  /* ─── Chemin image selon la langue ──────────────────────── */
  function img(id) {
    const lang = window.I18n ? I18n.lang : 'fr';
    return `/assets/badges/${lang}/${id}.png`;
  }

  const ALL_BADGES = [
    // ── Spéciaux ──────────────────────────────────────────
    {
      id:     'early_bird',
      hidden: false,
      special: true,
    },
    {
      id:     'app_creator',
      hidden: true,
      special: true,
    },
    // ── Ancienneté ────────────────────────────────────────
    {
      id:     '1_month',
      hidden: false,
    },
    {
      id:     '6_months',
      hidden: false,
    },
    {
      id:     '1_year',
      hidden: false,
    },
    // ── Première fois ─────────────────────────────────────
    {
      id:     'first_session',
      hidden: false,
    },
    // ── Streaks ───────────────────────────────────────────
    {
      id:     'streak_4w',
      hidden: false,
    },
    {
      id:     'streak_8w',
      hidden: false,
    },
    // ── Séances ───────────────────────────────────────────
    { id: 'sessions_10',   hidden: false, tier: true },
    { id: 'sessions_50',   hidden: false, tier: true },
    { id: 'sessions_100',  hidden: false, tier: true },
    { id: 'sessions_250',  hidden: true,  tier: true },
    { id: 'sessions_500',  hidden: true,  tier: true },
    { id: 'sessions_1000', hidden: true,  tier: true },
  ];

  const SESSION_TIERS = [
    { id: 'sessions_10',   threshold: 10   },
    { id: 'sessions_50',   threshold: 50   },
    { id: 'sessions_100',  threshold: 100  },
    { id: 'sessions_250',  threshold: 250  },
    { id: 'sessions_500',  threshold: 500  },
    { id: 'sessions_1000', threshold: 1000 },
  ];

  /* ─── Charge les badges de l'utilisateur ────────────── */
  async function loadEarned(userId) {
    if (App.supabase && userId && !userId.startsWith('local_')) {
      const { data } = await App.supabase
        .from('badges')
        .select('*')
        .eq('user_id', userId);
      if (data) {
        App.state.badges = data;
        return data;
      }
    }
    const local = App.local.get('badges') || [];
    App.state.badges = local;
    return local;
  }

  /* ─── Attribue un badge (interne) ───────────────────── */
  async function awardBadge(userId, id) {
    const badgeDef = ALL_BADGES.find(b => b.id === id);
    if (!badgeDef) return null;

    const newBadge = {
      id:        'badge_' + Date.now() + '_' + id,
      user_id:   userId,
      type:      id,
      earned_at: new Date().toISOString(),
    };

    const localBadges = App.local.get('badges') || [];
    localBadges.push(newBadge);
    App.local.set('badges', localBadges);

    if (App.supabase && userId && !userId.startsWith('local_')) {
      await App.supabase.from('badges').insert({
        user_id:   userId,
        type:      id,
        earned_at: newBadge.earned_at,
      }).then(({ error }) => { if (error) console.warn(error.message); });
    }

    App.state.badges = [...(App.state.badges || []), newBadge];
    return { ...badgeDef };
  }

  /* ─── Badge early_bird — distribué à tous jusqu'à désactivation ── */
  const EARLY_BIRD_ENABLED = true; // mettre false pour désactiver

  async function checkEarlyBird(userId, earnedIds) {
    if (!EARLY_BIRD_ENABLED) return null;
    if (earnedIds.includes('early_bird')) return null;
    return await awardBadge(userId, 'early_bird');
  }

  /* ─── Compte les jours de connexion uniques ─────────── */
  function getDailyLoginCount() {
    return (App.local.get('daily_logins') || []).length;
  }

  /* ─── Vérifie et attribue les badges gagnés ──────────── */
  async function check(userId) {
    const sessions = App.state.sessions || App.local.get('sessions') || [];
    const earned   = App.state.badges   || App.local.get('badges')   || [];
    const earnedIds = earned.map(b => b.type || b.id);

    const loginDays = getDailyLoginCount();
    const dateCounts = {};
    sessions.filter(s => s.completed).forEach(s => { dateCounts[s.date] = (dateCounts[s.date] || 0) + 1; });
    const totalDone = Object.values(dateCounts).reduce((sum, n) => sum + Math.min(n, 2), 0);
    const streak    = calculateStreak(sessions);

    const conditions = {
      '1_month':       loginDays >= 30,
      '6_months':      loginDays >= 180,
      '1_year':        loginDays >= 365,
      'first_session': totalDone >= 1,
      'streak_4w':     streak >= 4,
      'streak_8w':     streak >= 8,
      'sessions_10':   totalDone >= 10,
      'sessions_50':   totalDone >= 50,
      'sessions_100':  totalDone >= 100,
      'sessions_250':  totalDone >= 250,
      'sessions_500':  totalDone >= 500,
      'sessions_1000': totalDone >= 1000,
    };

    const newBadges = [];

    // Early bird (distribué automatiquement)
    const eb = await checkEarlyBird(userId, earnedIds);
    if (eb) newBadges.push(eb);

    for (const [id, condition] of Object.entries(conditions)) {
      if (condition && !earnedIds.includes(id)) {
        const b = await awardBadge(userId, id);
        if (b) newBadges.push(b);
      }
    }

    return newBadges;
  }

  /* ─── Calcule les semaines consécutives ──────────────── */
  function calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    const weekSet = new Set();
    sessions.filter(s => s.completed).forEach(s => {
      const d = new Date(s.date || s.created_at);
      weekSet.add(getISOWeek(d));
    });
    let streak = 0;
    let current = getISOWeek(new Date());
    while (weekSet.has(current)) {
      streak++;
      current = prevWeek(current);
    }
    return streak;
  }

  /* ─── Vérifie si la semaine courante est complète ────── */
  async function checkWeekComplete(sessions) {
    const profile = App.state.profile;
    if (!profile) return false;
    const requiredDays = (profile.training_days || []).length;
    if (requiredDays === 0) return false;
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const thisWeekSessions = (sessions || []).filter(s => {
      const d = new Date(s.date || s.created_at);
      return s.completed && d >= monday && d <= sunday;
    });
    const weekComplete = thisWeekSessions.length >= requiredDays;
    const lastCelebrated = App.local.get('last_week_celebration');
    const thisWeekKey    = getISOWeek(new Date());
    if (weekComplete && lastCelebrated !== thisWeekKey) {
      App.local.set('last_week_celebration', thisWeekKey);
      return true;
    }
    return false;
  }

  /* ─── Helpers date ───────────────────────────────────── */
  function getMonday(d) {
    const dt  = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    dt.setDate(diff);
    dt.setHours(0,0,0,0);
    return dt;
  }
  function getISOWeek(d) {
    const dt = new Date(d);
    const jan4 = new Date(dt.getFullYear(), 0, 4);
    const startOfWeek = getMonday(jan4);
    const weekNum = Math.floor((dt - startOfWeek) / (7 * 24 * 3600 * 1000)) + 1;
    return `${dt.getFullYear()}-W${String(weekNum).padStart(2,'0')}`;
  }
  function prevWeek(isoWeek) {
    const [year, weekPart] = isoWeek.split('-W');
    const week = parseInt(weekPart);
    if (week === 1) return `${parseInt(year) - 1}-W52`;
    return `${year}-W${String(week - 1).padStart(2,'0')}`;
  }

  /* ─── Calcule le total de séances (max 2/jour) ──────── */
  function calcTotalDone(sessions) {
    const dateCounts = {};
    (sessions || []).filter(s => s.completed).forEach(s => {
      const key = (s.date || s.created_at || '').slice(0, 10);
      dateCounts[key] = (dateCounts[key] || 0) + 1;
    });
    return Object.values(dateCounts).reduce((sum, n) => sum + Math.min(n, 2), 0);
  }

  /* ─── Render les badges (hors paliers séances) ───────── */
  function renderBadges(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned    = App.state.badges || [];
    const earnedIds = earned.map(b => b.type || b.id);
    const locale    = window.I18n && I18n.lang === 'fr' ? 'fr-FR' : 'en-US';

    // Badges visibles : pas de tier séances, earned + non-hidden non-earned, hidden seulement si earned
    const visible = ALL_BADGES.filter(b => !b.tier)
                              .filter(b => !b.special || earnedIds.includes(b.id))
                              .filter(b => !b.hidden   || earnedIds.includes(b.id));

    const sorted = [...visible].sort((a, b) =>
      (earnedIds.includes(b.id) ? 1 : 0) - (earnedIds.includes(a.id) ? 1 : 0)
    );

    container.innerHTML = sorted.map(badge => {
      const isEarned    = earnedIds.includes(badge.id);
      const earnedEntry = earned.find(b => (b.type || b.id) === badge.id);
      const dateStr     = earnedEntry?.earned_at
        ? new Date(earnedEntry.earned_at).toLocaleDateString(locale)
        : '';
      const name = window.I18n ? I18n.t('badge.' + badge.id + '.name') : badge.id;
      const desc = window.I18n ? I18n.t('badge.' + badge.id + '.desc') : '';
      const earnedLabel = window.I18n
        ? I18n.t('badge.earned_on').replace('%s', dateStr)
        : `Obtenu le ${dateStr}`;

      return `
        <div class="badge-item ${isEarned ? 'earned' : 'locked'}">
          <div class="badge-img-wrap ${isEarned ? '' : 'badge-img-locked'}">
            <img src="${img(badge.id)}" alt="${name}" class="badge-img" onerror="this.style.display='none'">
          </div>
          <div class="badge-info">
            <div class="badge-name">${name}</div>
            <div class="badge-date">${isEarned ? earnedLabel : desc}</div>
          </div>
          ${isEarned ? '' : `<span class="badge-lock">${Icons.s('lock', 14)}</span>`}
        </div>
      `;
    }).join('');
  }

  /* ─── Palier actuel (carte Stats) ───────────────────── */
  function renderSessionsChallenge(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned    = App.state.badges || [];
    const earnedIds = earned.map(b => b.type || b.id);
    const totalDone = calcTotalDone(App.state.sessions || []);
    const currentIdx = SESSION_TIERS.findIndex(t => !earnedIds.includes(t.id));

    if (currentIdx === -1) {
      const last = SESSION_TIERS[SESSION_TIERS.length - 1];
      const name  = window.I18n ? I18n.t('badge.' + last.id + '.name') : last.id;
      container.innerHTML = `
        <div class="sc-card sc-card-done">
          <div class="sc-badge-wrap"><img src="${img(last.id)}" alt="${name}" class="sc-badge-img"></div>
          <div class="sc-info"><div class="sc-name">${window.I18n ? I18n.t('stats.sessions_challenge_done') : 'Tous les défis complétés !'}</div></div>
        </div>`;
      return;
    }

    const tier     = SESSION_TIERS[currentIdx];
    const prevMax  = currentIdx > 0 ? SESSION_TIERS[currentIdx - 1].threshold : 0;
    const range    = tier.threshold - prevMax;
    const done     = Math.max(0, totalDone - prevMax);
    const pct      = Math.min(100, Math.round(done / range * 100));
    const name     = window.I18n ? I18n.t('badge.' + tier.id + '.name') : tier.id;
    const unit     = window.I18n ? I18n.t('stats.sessions_lbl').toLowerCase() : 'séances';

    container.innerHTML = `
      <div class="sc-card" id="btn-open-sessions-detail">
        <div class="sc-badge-wrap"><img src="${img(tier.id)}" alt="${name}" class="sc-badge-img"></div>
        <div class="sc-info">
          <div class="sc-name">${name}</div>
          <div class="sc-progress-text">${totalDone} / ${tier.threshold} ${unit}</div>
          <div class="sc-bar-wrap"><div class="sc-bar" style="width:${pct}%"></div></div>
        </div>
        <span class="sc-arrow">›</span>
      </div>`;
  }

  /* ─── Détail complet des paliers (modal) ─────────────── */
  function buildSessionsDetail(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned     = App.state.badges || [];
    const earnedIds  = earned.map(b => b.type || b.id);
    const totalDone  = calcTotalDone(App.state.sessions || []);
    const currentIdx = SESSION_TIERS.findIndex(t => !earnedIds.includes(t.id));
    const locale     = window.I18n && I18n.lang === 'fr' ? 'fr-FR' : 'en-US';
    const unit       = window.I18n ? I18n.t('stats.sessions_lbl').toLowerCase() : 'séances';

    container.innerHTML = SESSION_TIERS.map((tier, idx) => {
      const isEarned  = earnedIds.includes(tier.id);
      const isCurrent = idx === currentIdx;
      const name      = window.I18n ? I18n.t('badge.' + tier.id + '.name') : tier.id;

      if (isEarned) {
        const entry    = earned.find(b => (b.type || b.id) === tier.id);
        const dateStr  = entry?.earned_at ? new Date(entry.earned_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const earned_lbl = window.I18n ? I18n.t('badge.earned_on').replace('%s', dateStr) : `Obtenu le ${dateStr}`;
        return `
          <div class="scd-tier scd-earned">
            <div class="scd-badge-wrap"><img src="${img(tier.id)}" alt="${name}" class="scd-badge-img"><span class="scd-check">✓</span></div>
            <div class="scd-info"><div class="scd-name">${name}</div><div class="scd-sub">${earned_lbl}</div></div>
          </div>`;
      }

      if (isCurrent) {
        const prevMax = idx > 0 ? SESSION_TIERS[idx - 1].threshold : 0;
        const range   = tier.threshold - prevMax;
        const done    = Math.max(0, totalDone - prevMax);
        const pct     = Math.min(100, Math.round(done / range * 100));
        return `
          <div class="scd-tier scd-current">
            <div class="scd-badge-wrap"><img src="${img(tier.id)}" alt="${name}" class="scd-badge-img"></div>
            <div class="scd-info">
              <div class="scd-name">${name}</div>
              <div class="scd-progress-text">${totalDone} / ${tier.threshold} ${unit}</div>
              <div class="scd-bar-wrap"><div class="scd-bar" style="width:${pct}%"></div></div>
            </div>
          </div>`;
      }

      return `
        <div class="scd-tier scd-future">
          <div class="scd-badge-wrap scd-badge-locked"><img src="${img(tier.id)}" alt="${name}" class="scd-badge-img"><span class="scd-lock">${Icons.s('lock', 14)}</span></div>
          <div class="scd-info"><div class="scd-name">${name}</div><div class="scd-sub">${tier.threshold} ${unit}</div></div>
        </div>`;
    }).join('');
  }

  return { check, loadEarned, checkWeekComplete, renderBadges, renderSessionsChallenge, buildSessionsDetail, calculateStreak, ALL_BADGES, img };

})();
