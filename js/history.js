/* ═══════════════════════════════════════════════════════════
   NovaGYM — Historique des séances
   Affiche toutes les séances groupées par période
   ═══════════════════════════════════════════════════════════ */

window.History = (() => {

  /* ─── Groupage par période ───────────────────────────── */
  function groupByPeriod(sessions) {
    const now     = new Date();
    const monday  = getMonday(now);
    const lastMon = new Date(monday);
    lastMon.setDate(lastMon.getDate() - 7);

    const groups = {
      'Cette semaine':    [],
      'Semaine dernière': [],
      'Ce mois':          [],
      'Plus ancien':      [],
    };

    sessions.forEach(session => {
      const d = new Date(session.date || session.created_at);
      if (d >= monday) {
        groups['Cette semaine'].push(session);
      } else if (d >= lastMon) {
        groups['Semaine dernière'].push(session);
      } else if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        groups['Ce mois'].push(session);
      } else {
        groups['Plus ancien'].push(session);
      }
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
  function deleteSession(sessionId) {
    App.state.sessions = App.state.sessions.filter(s => s.id !== sessionId);
    App.local.set('sessions', App.state.sessions);
    render(App.state.sessions);
  }

  /* ─── Render une carte de séance ─────────────────────── */
  function renderSessionCard(session) {
    const typeName = Programs.SESSION_NAMES[session.type] || session.type || 'Séance';
    const dateStr  = new Date(session.date || session.created_at)
      .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const duration = session.duration ? `${Math.floor(session.duration / 60)} min` : '';
    const volume   = session.volume   ? `${session.volume} kg` : '';
    const statsStr = [duration, volume].filter(Boolean).join(' · ');

    // Exercices avec poids par série
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

    const expandIcon = hasExercises
      ? `<span class="history-expand-icon">›</span>`
      : '';

    const sessionId = session.id || (session.date + '_' + session.type);

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

  /* ─── Render l'historique complet ────────────────────── */
  function render(sessions) {
    const list = document.getElementById('history-list');
    if (!list) return;

    const completed = (sessions || []).filter(s => s.completed);

    if (completed.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📜</span>
          <p>Tes séances terminées apparaîtront ici</p>
        </div>
      `;
      return;
    }

    const groups = groupByPeriod(completed);
    let html = '';

    Object.entries(groups).forEach(([label, items]) => {
      if (items.length === 0) return;
      html += `<div class="history-group-label">${label}</div>`;
      items.forEach(s => { html += renderSessionCard(s); });
    });

    list.innerHTML = html;

    // Event delegation — suppression + expand/collapse
    list.onclick = (e) => {
      // Bouton supprimer
      if (e.target.closest('[data-action="delete"]')) {
        const card      = e.target.closest('.history-card');
        const sessionId = card?.dataset.sessionId;
        if (sessionId && confirm('Supprimer cette séance ?')) deleteSession(sessionId);
        return;
      }

      // Expand/collapse exercices
      const card = e.target.closest('.history-card-expandable');
      if (!card) return;
      const exDiv = card.querySelector('.history-exercises');
      if (!exDiv) return;
      const isOpen = exDiv.classList.toggle('open');
      const icon   = card.querySelector('.history-expand-icon');
      if (icon) icon.style.transform = isOpen ? 'rotate(90deg)' : '';
    };
  }

  /* ─── Charge depuis Supabase ou local ────────────────── */
  async function load() {
    await Stats.loadSessions();
    render(App.state.sessions);
  }

  return { load, render };

})();
