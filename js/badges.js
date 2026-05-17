/* ═══════════════════════════════════════════════════════════
   NovaGYM — Système de badges
   Vérifie les conditions et attribue les badges
   ═══════════════════════════════════════════════════════════ */

window.Badges = (() => {

  const ALL_BADGES = [
    {
      id:    '1_month',
      name:  '1 mois de NovaGYM',
      emoji: '🏅',
      desc:  'Tu utilises NovaGYM depuis 1 mois',
    },
    {
      id:    '6_months',
      name:  '6 mois de NovaGYM',
      emoji: '🥈',
      desc:  'Tu utilises NovaGYM depuis 6 mois',
    },
    {
      id:    '1_year',
      name:  '1 an de NovaGYM',
      emoji: '🥇',
      desc:  'Tu utilises NovaGYM depuis 1 an — Legend !',
    },
    {
      id:    'first_session',
      name:  'Première séance',
      emoji: '⚡',
      desc:  'Tu as complété ta toute première séance',
    },
    {
      id:    'streak_4w',
      name:  '4 semaines consécutives',
      emoji: '🔥',
      desc:  'Tu as complété 4 semaines d\'entraînement de suite',
    },
    {
      id:    'streak_8w',
      name:  '8 semaines consécutives',
      emoji: '💪',
      desc:  'Tu as complété 8 semaines d\'entraînement de suite',
    },
    {
      id:    'sessions_10',
      name:  '10 séances complétées',
      emoji: '🌟',
      desc:  'Tu as terminé 10 séances d\'entraînement',
    },
    {
      id:    'sessions_50',
      name:  '50 séances complétées',
      emoji: '👑',
      desc:  'Tu as terminé 50 séances — Champion absolu !',
    },
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

  /* ─── Vérifie et attribue les badges gagnés ──────────── */
  async function check(userId) {
    const profile  = App.state.profile;
    const sessions = App.state.sessions || App.local.get('sessions') || [];
    const earned   = App.state.badges   || App.local.get('badges')   || [];
    const earnedIds = earned.map(b => b.type || b.id);

    const created    = profile?.created_at ? new Date(profile.created_at) : new Date();
    const daysSince  = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    // Max 2 séances par date calendaire comptent (évite le farming)
    const dateCounts = {};
    sessions.filter(s => s.completed).forEach(s => { dateCounts[s.date] = (dateCounts[s.date] || 0) + 1; });
    const totalDone = Object.values(dateCounts).reduce((sum, n) => sum + Math.min(n, 2), 0);
    const streak     = calculateStreak(sessions);

    const conditions = {
      '1_month':      daysSince >= 30,
      '6_months':     daysSince >= 180,
      '1_year':       daysSince >= 365,
      'first_session': totalDone >= 1,
      'streak_4w':    streak >= 4,
      'streak_8w':    streak >= 8,
      'sessions_10':  totalDone >= 10,
      'sessions_50':  totalDone >= 50,
    };

    const newBadges = [];

    for (const [id, condition] of Object.entries(conditions)) {
      if (condition && !earnedIds.includes(id)) {
        const badgeDef = ALL_BADGES.find(b => b.id === id);
        if (!badgeDef) continue;

        const newBadge = {
          id:       'badge_' + Date.now() + '_' + id,
          user_id:  userId,
          type:     id,
          earned_at: new Date().toISOString(),
          ...badgeDef,
        };

        // Sauvegarde locale
        const localBadges = App.local.get('badges') || [];
        localBadges.push(newBadge);
        App.local.set('badges', localBadges);

        // Supabase
        if (App.supabase && userId && !userId.startsWith('local_')) {
          await App.supabase.from('badges').insert({
            user_id:   userId,
            type:      id,
            earned_at: newBadge.earned_at,
          }).then(({ error }) => { if (error) console.warn(error.message); });
        }

        App.state.badges = [...(App.state.badges || []), newBadge];
        newBadges.push({ ...badgeDef });
      }
    }

    return newBadges;
  }

  /* ─── Calcule les semaines consécutives ──────────────── */
  function calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    // Groupe les séances par semaine ISO (lundi → dimanche)
    const weekSet = new Set();
    sessions.filter(s => s.completed).forEach(s => {
      const d = new Date(s.date || s.created_at);
      const week = getISOWeek(d);
      weekSet.add(week);
    });

    // Compte les semaines consécutives en partant de la semaine actuelle
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

    // Séances de cette semaine
    const monday = getMonday(new Date());
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const thisWeekSessions = (sessions || []).filter(s => {
      const d = new Date(s.date || s.created_at);
      return s.completed && d >= monday && d <= sunday;
    });

    const weekComplete = thisWeekSessions.length >= requiredDays;

    // Évite de féliciter plusieurs fois la même semaine
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
    const dt = new Date(d);
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

  /* ─── Render les badges ──────────────────────────────── */
  function renderBadges(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned    = App.state.badges || [];
    const earnedIds = earned.map(b => b.type || b.id);

    // Earned badges first, then locked
    const sorted = [...ALL_BADGES].sort((a, b) => {
      return (earnedIds.includes(b.id) ? 1 : 0) - (earnedIds.includes(a.id) ? 1 : 0);
    });

    const locale = window.I18n && I18n.lang === 'fr' ? 'fr-FR' : 'en-US';

    container.innerHTML = sorted.map(badge => {
      const isEarned    = earnedIds.includes(badge.id);
      const earnedEntry = earned.find(b => (b.type || b.id) === badge.id);
      const dateStr     = earnedEntry?.earned_at
        ? new Date(earnedEntry.earned_at).toLocaleDateString(locale)
        : '';
      const name = window.I18n ? I18n.t('badge.' + badge.id + '.name') : badge.name;
      const desc = window.I18n ? I18n.t('badge.' + badge.id + '.desc') : badge.desc;
      const earnedLabel = window.I18n
        ? I18n.t('badge.earned_on').replace('%s', dateStr)
        : `Obtenu le ${dateStr}`;

      return `
        <div class="badge-item ${isEarned ? 'earned' : 'locked'}">
          <span class="badge-emoji">${badge.emoji}</span>
          <div class="badge-info">
            <div class="badge-name">${name}</div>
            <div class="badge-date">${isEarned ? earnedLabel : desc}</div>
          </div>
          ${isEarned ? '' : '<span class="badge-lock">🔒</span>'}
        </div>
      `;
    }).join('');
  }

  return { check, loadEarned, checkWeekComplete, renderBadges, calculateStreak, ALL_BADGES };

})();
