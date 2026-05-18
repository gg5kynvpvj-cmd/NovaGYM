/* ═══════════════════════════════════════════════════════════
   NovaGYM — Éditeur de profil public
   Aperçu en temps réel, badges (3 slots), meilleure performance
   ═══════════════════════════════════════════════════════════ */

window.ProfileEditor = (() => {

  let selectedSlot   = null;
  let tempBadges     = [null, null, null];
  let tempPerf       = null;
  let tempVisibility = 'private';

  /* ─── Types de performance ──────────────────────────── */
  const PERF_TYPES = [
    { id: 'volume', icon: '📦', fr: 'Plus gros volume',    en: 'Highest volume' },
    { id: 'weight', icon: '🏋️', fr: 'Plus lourd soulevé',  en: 'Heaviest lift' },
    { id: 'reps',   icon: '🔥', fr: 'Plus de répétitions', en: 'Most reps' },
    { id: 'streak', icon: '📅', fr: 'Meilleur streak',     en: 'Best streak' },
  ];

  function perfLabel(typeId) {
    const lang = window.I18n ? I18n.lang : 'fr';
    const t = PERF_TYPES.find(p => p.id === typeId);
    return t ? (t.icon + ' ' + (lang === 'fr' ? t.fr : t.en)) : '';
  }

  /* ─── Calcul des performances depuis les séances ────── */
  function computePerformances() {
    const sessions = (App.state.sessions || []).filter(s => s.completed);
    const locale   = window.I18n && I18n.lang === 'fr' ? 'fr-FR' : 'en-US';
    const results  = {};

    // Volume : total poids × reps par séance
    let maxVol = 0, maxVolDate = '';
    sessions.forEach(s => {
      let vol = 0;
      (s.exercises || []).forEach(ex =>
        (ex.sets_config || []).forEach(set => {
          if (set.validated) vol += (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0);
        })
      );
      if (vol > maxVol) { maxVol = vol; maxVolDate = (s.date || s.created_at || '').slice(0, 10); }
    });
    if (maxVol > 0) {
      const dateStr = maxVolDate ? new Date(maxVolDate).toLocaleDateString(locale) : '';
      results.volume = { value: maxVol.toLocaleString() + ' kg', date: dateStr, raw: maxVol, rawDate: maxVolDate };
    }

    // Poids maximum sur une série
    let maxW = 0, maxWDate = '';
    sessions.forEach(s =>
      (s.exercises || []).forEach(ex =>
        (ex.sets_config || []).forEach(set => {
          const w = parseFloat(set.weight) || 0;
          if (set.validated && w > maxW) { maxW = w; maxWDate = (s.date || s.created_at || '').slice(0, 10); }
        })
      )
    );
    if (maxW > 0) {
      const dateStr = maxWDate ? new Date(maxWDate).toLocaleDateString(locale) : '';
      results.weight = { value: maxW + ' kg', date: dateStr, raw: maxW, rawDate: maxWDate };
    }

    // Répétitions totales sur une séance
    let maxReps = 0, maxRepsDate = '';
    sessions.forEach(s => {
      let reps = 0;
      (s.exercises || []).forEach(ex =>
        (ex.sets_config || []).forEach(set => { if (set.validated) reps += parseInt(set.reps) || 0; })
      );
      if (reps > maxReps) { maxReps = reps; maxRepsDate = (s.date || s.created_at || '').slice(0, 10); }
    });
    if (maxReps > 0) {
      const dateStr = maxRepsDate ? new Date(maxRepsDate).toLocaleDateString(locale) : '';
      results.reps = { value: maxReps + ' reps', date: dateStr, raw: maxReps, rawDate: maxRepsDate };
    }

    // Streak (semaines consécutives)
    const streak = window.Badges ? Badges.calculateStreak(sessions) : 0;
    if (streak > 0) {
      const lang = window.I18n ? I18n.lang : 'fr';
      results.streak = { value: streak + (lang === 'fr' ? ' sem.' : ' wks'), date: '', raw: streak, rawDate: '' };
    }

    return results;
  }

  /* ─── Rendu slots badges ────────────────────────────── */
  function renderBadgeSlots() {
    for (let i = 0; i < 3; i++) {
      const slot = document.querySelector(`.pe-badge-slot[data-slot="${i}"]`);
      if (!slot) continue;
      const badgeId = tempBadges[i];
      if (badgeId) {
        const def = (Badges.ALL_BADGES || []).find(b => b.id === badgeId);
        slot.innerHTML = `<span style="font-size:30px">${def ? def.emoji : '?'}</span>`;
        slot.classList.add('filled');
      } else {
        slot.innerHTML = `<span class="pe-slot-placeholder">+</span>`;
        slot.classList.remove('filled');
      }
    }
    updatePreviewBadges();
  }

  /* ─── Rendu options performance ─────────────────────── */
  function renderPerfOptions() {
    const container = document.getElementById('pe-perf-options');
    if (!container) return;
    const perfs = computePerformances();
    const lang  = window.I18n ? I18n.lang : 'fr';

    const items = PERF_TYPES.map(pt => {
      const data = perfs[pt.id];
      if (!data) return '';
      const isActive = tempPerf === pt.id;
      return `
        <div class="pe-perf-option${isActive ? ' active' : ''}" data-perf="${pt.id}">
          <span class="pe-po-icon">${pt.icon}</span>
          <div class="pe-po-info">
            <span class="pe-po-label">${lang === 'fr' ? pt.fr : pt.en}</span>
            <span class="pe-po-value">${data.value}${data.date ? ' · ' + data.date : ''}</span>
          </div>
          <span class="pe-po-check">${isActive ? '✓' : ''}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = items || `<p class="social-empty">${window.I18n ? I18n.t('profile.no_sessions') : 'Aucune séance'}</p>`;

    container.querySelectorAll('.pe-perf-option').forEach(el => {
      el.addEventListener('click', () => {
        tempPerf = el.dataset.perf;
        renderPerfOptions();
        updatePerfCard();
      });
    });
  }

  /* ─── Carte performance (dans l'aperçu) ─────────────── */
  function updatePerfCard() {
    const card = document.getElementById('pe-perf-card');
    const section = document.getElementById('pe-perf-preview-section');
    if (!card) return;

    if (!tempPerf) {
      card.innerHTML = `<p class="pe-perf-empty">${window.I18n ? I18n.t('profile.perf_empty') : 'Aucune performance sélectionnée'}</p>`;
      if (section) section.classList.add('pe-section-empty');
      return;
    }

    const perfs = computePerformances();
    const data  = perfs[tempPerf];
    const pt    = PERF_TYPES.find(p => p.id === tempPerf);
    if (!data || !pt) return;

    const lang  = window.I18n ? I18n.lang : 'fr';
    const label = lang === 'fr' ? pt.fr : pt.en;

    if (section) section.classList.remove('pe-section-empty');

    card.innerHTML = `
      <div class="pe-perf-card-inner">
        <span class="pe-perf-card-icon">${pt.icon}</span>
        <div class="pe-perf-card-info">
          <span class="pe-perf-card-label">${label}</span>
          <span class="pe-perf-card-value">${data.value}${data.date ? ' · ' + data.date : ''}</span>
        </div>
      </div>
    `;
  }

  /* ─── Mise à jour aperçu ─────────────────────────────── */
  function updatePreviewBadges() {
    const filled = tempBadges.filter(Boolean);
    // also refresh the perf card since we share the preview update cycle
    updatePerfCard();
    // Nothing extra needed — badge slots ARE the preview
  }

  function updatePreviewHeader() {
    const profile = App.state.profile;

    // Avatar
    const avatarEl = document.getElementById('pe-preview-avatar');
    if (avatarEl) {
      const url = App.local.get('avatar_url') || App.local.get('avatar');
      if (url) {
        avatarEl.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
      } else {
        const letter = (profile?.username || 'N').charAt(0).toUpperCase();
        avatarEl.textContent = letter;
      }
    }

    // Username
    const nameEl = document.getElementById('pe-preview-name');
    if (nameEl) nameEl.textContent = profile?.username || '';

    // Visibility
    const visEl = document.getElementById('pe-preview-vis');
    if (visEl) {
      const MAP = {
        private: { icon: '🔒', fr: 'Privé',           en: 'Private' },
        friends: { icon: '👥', fr: 'Amis seulement',  en: 'Friends only' },
        public:  { icon: '🌍', fr: 'Public',           en: 'Public' },
      };
      const v    = MAP[tempVisibility] || MAP.private;
      const lang = window.I18n ? I18n.lang : 'fr';
      visEl.textContent = v.icon + ' ' + (lang === 'fr' ? v.fr : v.en);
      visEl.className   = 'pe-preview-vis vis-' + tempVisibility;
    }
  }

  /* ─── Badge picker ──────────────────────────────────── */
  function openBadgePicker(slotIndex) {
    selectedSlot = slotIndex;

    const earned    = App.state.badges || [];
    const earnedIds = earned.map(b => b.type || b.id);
    const current   = tempBadges[slotIndex];
    const list      = document.getElementById('badge-picker-list');
    if (!list) return;

    const items = (Badges.ALL_BADGES || []).filter(b => earnedIds.includes(b.id)).map(b => `
      <div class="badge-picker-item${current === b.id ? ' active' : ''}" data-badge="${b.id}">
        <span class="badge-picker-emoji">${b.emoji}</span>
        <span class="badge-picker-name">${b.name}</span>
        ${current === b.id ? '<span class="badge-picker-check">✓</span>' : ''}
      </div>
    `).join('');

    const removeBtn = current ? `<div class="badge-picker-item badge-picker-remove" data-badge=""><span>✕</span><span class="badge-picker-name">${window.I18n ? I18n.t('profile.remove_badge') : 'Retirer'}</span></div>` : '';

    list.innerHTML = earnedIds.length === 0
      ? `<p class="social-empty">${window.I18n ? I18n.t('profile.no_badges') : 'Aucun badge'}</p>`
      : removeBtn + items;

    list.querySelectorAll('.badge-picker-item').forEach(el => {
      el.addEventListener('click', () => {
        const badgeId = el.dataset.badge || null;
        if (badgeId) {
          const otherIdx = tempBadges.findIndex((b, i) => i !== selectedSlot && b === badgeId);
          if (otherIdx !== -1) tempBadges[otherIdx] = null;
        }
        tempBadges[selectedSlot] = badgeId;
        renderBadgeSlots();
        document.getElementById('modal-badge-picker')?.classList.add('hidden');
      });
    });

    document.getElementById('modal-badge-picker')?.classList.remove('hidden');
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    document.getElementById('btn-pe-back')?.addEventListener('click', () => {
      App.navigate('app');
      App.switchTab('settings');
    });

    document.querySelectorAll('.pe-badge-slot').forEach(slot => {
      slot.addEventListener('click', () => openBadgePicker(parseInt(slot.dataset.slot)));
    });

    document.getElementById('btn-close-badge-picker')?.addEventListener('click', () => {
      document.getElementById('modal-badge-picker')?.classList.add('hidden');
    });
    document.getElementById('modal-badge-picker')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });

    document.querySelectorAll('input[name="pe-vis"]').forEach(radio => {
      radio.addEventListener('change', () => {
        tempVisibility = radio.value;
        updatePreviewHeader();
      });
    });

    document.getElementById('btn-pe-save')?.addEventListener('click', async () => {
      const profile = App.state.profile;
      if (!profile) return;

      const displayed_badges = tempBadges.filter(Boolean);
      const perfs = computePerformances();
      const perfData = tempPerf && perfs[tempPerf] ? perfs[tempPerf] : null;
      const best_performance = perfData ? {
        type:    tempPerf,
        value:   perfData.value,
        date:    perfData.rawDate,
        icon:    PERF_TYPES.find(p => p.id === tempPerf)?.icon || '',
        label_fr: PERF_TYPES.find(p => p.id === tempPerf)?.fr || '',
        label_en: PERF_TYPES.find(p => p.id === tempPerf)?.en || '',
      } : null;

      const updated = { ...profile, visibility: tempVisibility, displayed_badges, best_performance };
      App.state.profile = updated;
      App.local.set('profile', updated);

      const btn = document.getElementById('btn-pe-save');
      if (btn) { btn.textContent = '✓'; btn.disabled = true; }

      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }

      if (btn) { btn.textContent = window.I18n ? I18n.t('profile.save') : 'Sauvegarder'; btn.disabled = false; }
      App.navigate('app');
      App.switchTab('settings');
    });
  }

  /* ─── Ouverture de la page ───────────────────────────── */
  function open() {
    const profile  = App.state.profile;
    const saved    = profile?.displayed_badges || [];
    tempBadges     = [saved[0] || null, saved[1] || null, saved[2] || null];
    tempPerf       = profile?.best_performance?.type || null;
    tempVisibility = profile?.visibility || 'private';

    // Visibility radio
    const radio = document.querySelector(`input[name="pe-vis"][value="${tempVisibility}"]`);
    if (radio) radio.checked = true;

    updatePreviewHeader();
    renderBadgeSlots();
    renderPerfOptions();
    updatePerfCard();

    // Scroll to top
    const body = document.querySelector('.pe-body');
    if (body) body.scrollTop = 0;

    App.navigate('profile-editor');
  }

  return { init, open };

})();
