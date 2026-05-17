/* ═══════════════════════════════════════════════════════════
   NovaGYM — Historique des séances & repas
   ═══════════════════════════════════════════════════════════ */

window.History = (() => {

  let currentView = 'sessions'; // 'sessions' | 'nutrition'

  /* ─── Groupage par période ───────────────────────────── */
  function groupByPeriod(items, getDate) {
    const now     = new Date();
    const monday  = getMonday(now);
    const lastMon = new Date(monday);
    lastMon.setDate(lastMon.getDate() - 7);

    const groups = [
      { key: 'thisweek',  label: I18n.t('history.thisweek'),  items: [] },
      { key: 'lastweek',  label: I18n.t('history.lastweek'),  items: [] },
      { key: 'thismonth', label: I18n.t('history.thismonth'), items: [] },
      { key: 'older',     label: I18n.t('history.older'),     items: [] },
    ];

    items.forEach(item => {
      const d = getDate(item);
      if (d >= monday)       groups[0].items.push(item);
      else if (d >= lastMon) groups[1].items.push(item);
      else if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
        groups[2].items.push(item);
      else groups[3].items.push(item);
    });

    return groups;
  }

  function getMonday(d) {
    const dt  = new Date(d);
    const day = dt.getDay();
    dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  /* ─── Suppression d'une séance ──────────────────────── */
  async function deleteSession(sessionId) {
    App.state.sessions = App.state.sessions.filter(s => s.id !== sessionId);
    App.local.set('sessions', App.state.sessions);

    if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
      await App.supabase.from('sessions').delete().eq('id', sessionId)
        .then(({ error }) => { if (error) console.warn(error.message); });
    }

    render(App.state.sessions);
  }

  /* ─── Render une carte de séance ─────────────────────── */
  function renderSessionCard(session) {
    const typeName = I18n.t('session.' + session.type) || session.type || I18n.t('history.session_fallback');
    const locale   = I18n.lang === 'fr' ? 'fr-FR' : 'en-US';
    const dateStr  = new Date(session.date || session.created_at)
      .toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const duration = session.duration ? `${Math.floor(session.duration / 60)} min` : '';
    const volume   = session.volume   ? `${session.volume} kg` : '';
    const statsStr = [duration, volume].filter(Boolean).join(' · ');

    const hasExercises = Array.isArray(session.exercises) && session.exercises.length > 0;
    let exercisesHtml = '';
    if (hasExercises) {
      const items = session.exercises.map(ex => {
        if (typeof ex === 'string') {
          return `<div class="history-ex-row"><span>${ex}</span><span class="history-ex-weights">—</span></div>`;
        }
        const setsStr = (() => {
          const count = Math.max(ex.weights?.length || 0, ex.reps?.length || 0);
          if (!count) return '—';
          return Array.from({ length: count }, (_, i) => {
            const w = ex.weights?.[i];
            const r = ex.reps?.[i];
            const wStr = w != null ? `${w}kg` : null;
            const rStr = r != null && r > 0 ? `${r}×` : null;
            const detail = [rStr, wStr].filter(Boolean).join(' / ');
            return `${i === 0 ? 'W' : 'S' + i}: ${detail || '—'}`;
          }).join(' · ');
        })();
        return `
          <div class="history-ex-row">
            <span class="history-ex-name">${ex.name}</span>
            <span class="history-ex-weights">${setsStr}</span>
          </div>`;
      }).join('');
      exercisesHtml = `<div class="history-exercises">${items}</div>`;
    }

    const expandIcon = hasExercises ? `<span class="history-expand-icon">›</span>` : '';
    const sessionId  = session.id || (session.date + '_' + session.type);

    return `
      <div class="history-card${hasExercises ? ' history-card-expandable' : ''}" data-session-id="${sessionId}">
        <div class="history-card-main">
          <div class="history-card-left">
            <span class="history-date">${dateCapitalized}</span>
            <span class="history-type">${typeName}</span>
            ${statsStr ? `<span class="history-stats">${statsStr}</span>` : ''}
          </div>
          <div class="history-card-right">
            <div class="history-badge-col">✓</div>
            <button class="history-del-btn" data-action="delete" title="Supprimer">✕</button>
            ${expandIcon}
          </div>
        </div>
        ${exercisesHtml}
      </div>
    `;
  }

  /* ─── Render l'historique séances ────────────────────── */
  function render(sessions) {
    const list = document.getElementById('history-list');
    if (!list) return;

    const completed = (sessions || []).filter(s => s.completed);

    if (completed.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📜</span>
          <p>${I18n.t('history.empty')}</p>
        </div>
      `;
      return;
    }

    const groups = groupByPeriod(completed, s => new Date(s.date || s.created_at));
    let html = '';

    groups.forEach(group => {
      if (group.items.length === 0) return;
      html += `<div class="history-group-label">${group.label}</div>`;
      group.items.forEach(s => { html += renderSessionCard(s); });
    });

    list.innerHTML = html;

    list.onclick = (e) => {
      if (e.target.closest('[data-action="delete"]')) {
        const card      = e.target.closest('.history-card');
        const sessionId = card?.dataset.sessionId;
        if (sessionId && confirm(I18n.t('history.delete_confirm'))) deleteSession(sessionId);
        return;
      }
      const card = e.target.closest('.history-card-expandable');
      if (!card) return;
      const exDiv = card.querySelector('.history-exercises');
      if (!exDiv) return;
      const isOpen = exDiv.classList.toggle('open');
      const icon   = card.querySelector('.history-expand-icon');
      if (icon) icon.style.transform = isOpen ? 'rotate(90deg)' : '';
    };
  }

  /* ─── Nutrition history ──────────────────────────────── */

  function loadNutritionDays() {
    const days = [];
    for (let i = 0; i < localStorage.length; i++) {
      const rawKey = localStorage.key(i);
      if (!rawKey || !rawKey.startsWith('ng_nutrition_')) continue;
      const dateStr = rawKey.replace('ng_nutrition_', '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      try {
        const raw = JSON.parse(localStorage.getItem(rawKey));
        if (raw && Array.isArray(raw.meals) && raw.meals.length > 0) {
          days.push({ date: dateStr, meals: raw.meals, water: raw.water || 0 });
        }
      } catch { /* skip malformed */ }
    }
    days.sort((a, b) => new Date(b.date) - new Date(a.date));
    return days;
  }

  function getCalGoal() {
    const profile = App.state.profile;
    if (!profile || !window.Programs) return 0;
    return Programs.calculateCalories(profile)?.calories || 0;
  }

  function renderNutritionCard(day) {
    const locale = I18n.lang === 'fr' ? 'fr-FR' : 'en-US';
    const dateStr = new Date(day.date + 'T12:00:00')
      .toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const totals = day.meals.reduce((acc, m) => {
      acc.cal  += m.calories || 0;
      acc.prot += m.protein  || 0;
      acc.carb += m.carbs    || 0;
      acc.fat  += m.fat      || 0;
      return acc;
    }, { cal: 0, prot: 0, carb: 0, fat: 0 });

    const goalCal = getCalGoal();
    const calStr  = goalCal
      ? `${Math.round(totals.cal)} / ${goalCal} kcal`
      : `${Math.round(totals.cal)} kcal`;

    const mealTypes = [
      { key: 'breakfast', label: I18n.t('meal.type.breakfast'), icon: '🌅' },
      { key: 'lunch',     label: I18n.t('meal.type.lunch'),     icon: '☀️' },
      { key: 'dinner',    label: I18n.t('meal.type.dinner'),    icon: '🌙' },
      { key: 'snacks',    label: I18n.t('meal.type.snacks'),    icon: '🍎' },
    ];

    const mealsByType = {};
    day.meals.forEach(m => {
      const type = m.type || 'snacks';
      if (!mealsByType[type]) mealsByType[type] = [];
      mealsByType[type].push(m);
    });

    const mealsHtml = mealTypes.map(mt => {
      const items = mealsByType[mt.key] || [];
      if (!items.length) return '';
      const typeCal  = Math.round(items.reduce((s, m) => s + (m.calories || 0), 0));
      const itemsHtml = items.map(m => {
        const name = m.name || '—';
        const qty  = m.qty  ? `${m.qty}g` : '';
        const cal  = Math.round(m.calories || 0);
        return `<div class="hn-food-row">
          <span class="hn-food-name">${name}${qty ? ' · ' + qty : ''}</span>
          <span class="hn-food-cal">${cal} kcal</span>
        </div>`;
      }).join('');
      return `
        <div class="hn-meal-group">
          <div class="hn-meal-header">
            <span>${mt.icon} ${mt.label}</span>
            <span class="hn-meal-cal">${typeCal} kcal</span>
          </div>
          ${itemsHtml}
        </div>`;
    }).filter(Boolean).join('');

    const macroStr = `P ${Math.round(totals.prot)}g · G ${Math.round(totals.carb)}g · L ${Math.round(totals.fat)}g`;

    return `
      <div class="history-card history-card-expandable" data-nutr-date="${day.date}">
        <div class="history-card-main">
          <div class="history-card-left">
            <span class="history-date">${dateCapitalized}</span>
            <span class="history-type">${calStr}</span>
            <span class="hn-macros">${macroStr}</span>
          </div>
          <div class="history-card-right">
            <div class="history-badge-col">🍽</div>
            <span class="history-expand-icon">›</span>
          </div>
        </div>
        <div class="history-exercises hn-meals-detail">
          ${mealsHtml || '<div class="hn-no-meals">—</div>'}
        </div>
      </div>
    `;
  }

  function renderNutrition() {
    const list = document.getElementById('history-nutrition-list');
    if (!list) return;

    const days = loadNutritionDays();

    if (days.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🥗</span>
          <p>${I18n.t('history.nutr_empty')}</p>
        </div>
      `;
      return;
    }

    const groups = groupByPeriod(days, d => new Date(d.date + 'T12:00:00'));
    let html = '';

    groups.forEach(group => {
      if (group.items.length === 0) return;
      html += `<div class="history-group-label">${group.label}</div>`;
      group.items.forEach(day => { html += renderNutritionCard(day); });
    });

    list.innerHTML = html;

    list.onclick = (e) => {
      const card = e.target.closest('.history-card-expandable');
      if (!card) return;
      const exDiv = card.querySelector('.history-exercises');
      if (!exDiv) return;
      const isOpen = exDiv.classList.toggle('open');
      const icon   = card.querySelector('.history-expand-icon');
      if (icon) icon.style.transform = isOpen ? 'rotate(90deg)' : '';
    };
  }

  /* ─── Toggle séances / repas ─────────────────────────── */
  function initToggle() {
    document.querySelectorAll('.history-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentView = btn.dataset.view;
        document.querySelectorAll('.history-toggle-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.view === currentView));
        const sessionsList   = document.getElementById('history-list');
        const nutritionList  = document.getElementById('history-nutrition-list');
        if (sessionsList)  sessionsList.classList.toggle('hidden', currentView !== 'sessions');
        if (nutritionList) nutritionList.classList.toggle('hidden', currentView !== 'nutrition');
        if (currentView === 'nutrition') renderNutrition();
      });
    });
  }

  /* ─── Charge depuis Supabase ou local ────────────────── */
  async function load() {
    await Stats.loadSessions();
    if (currentView === 'sessions') {
      render(App.state.sessions);
    } else {
      renderNutrition();
    }
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    initToggle();
  }

  return { load, render, renderNutrition, init };

})();
