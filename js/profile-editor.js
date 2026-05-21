/* ═══════════════════════════════════════════════════════════
   NovaGYM — Éditeur de profil public
   Aperçu en temps réel, badges (3 slots), meilleure performance
   ═══════════════════════════════════════════════════════════ */

window.ProfileEditor = (() => {

  let selectedSlot   = null;
  let tempBadges     = [null, null, null];
  let tempPerf       = null;
  let tempVisibility = 'private';
  let tempBio        = '';
  let tempSharedWorkoutIds = new Set();
  let _loadedSharedNames   = new Set();
  let _sharedWorkoutsMap   = new Map();   // localId → supabase row id

  // Fingerprint d'une liste d'exercices (pour matcher malgré un renommage)
  function _fp(exercises) {
    const items = (exercises || []).map(e => e.id || e.name).filter(Boolean).sort();
    return items.length ? items.join('|') : '';
  }

  /* ─── Types de performance ──────────────────────────── */
  const PERF_TYPES = [
    { id: 'volume', icon: Icons.s('layers',   16), fr: 'Plus gros volume',    en: 'Highest volume' },
    { id: 'weight', icon: Icons.s('dumbbell', 16), fr: 'Plus lourd soulevé',  en: 'Heaviest lift' },
    { id: 'reps',   icon: Icons.s('flame',    16), fr: 'Plus de répétitions', en: 'Most reps' },
    { id: 'streak', icon: Icons.s('calendar', 16), fr: 'Meilleur streak',     en: 'Best streak' },
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
        slot.innerHTML = `<img src="${Badges.img(badgeId)}" style="width:68px;height:68px;object-fit:contain;display:block;" alt="" onerror="this.style.display='none'">`;
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

  /* ─── Aperçu complet (vue ami) ──────────────────────── */
  async function showFullPreview() {
    const profile = App.state.profile;
    if (!profile) return;
    const content = document.getElementById('profile-preview-content');
    if (!content) return;

    const avatarUrl = App.state.profile?.avatar_url || App.local.get('avatar_url');
    const avatarHtml = avatarUrl
      ? `<div class="fp-avatar"><img src="${avatarUrl}" alt="${profile.username}"></div>`
      : `<div class="fp-avatar">${(profile.username || 'N').charAt(0).toUpperCase()}</div>`;

    let html = `
      <div class="fp-header">
        ${avatarHtml}
        <p class="fp-username">${profile.username || ''}</p>
      </div>
    `;

    const badgeDefs = tempBadges.filter(Boolean).map(id => (Badges.ALL_BADGES || []).find(b => b.id === id)).filter(Boolean);
    if (badgeDefs.length > 0) {
      html += `
        <div class="fp-section">
          <p class="fp-section-title">${window.I18n ? I18n.t('profile.badges_section') : 'Badges'}</p>
          <div class="fp-badges-row">
            ${badgeDefs.map(b => {
              const bName = window.I18n ? I18n.t('badge.' + b.id + '.name') : b.id;
              return `<div class="fp-badge-item" data-badge-id="${b.id}" title="${bName}">
                <img class="fp-badge-img" src="${Badges.img(b.id)}" alt="${bName}" onerror="this.style.display='none'">
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (tempBio) {
      html += `
        <div class="fp-section">
          <p class="fp-bio">${tempBio.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      `;
    }

    const perfs = computePerformances();
    const perfData = tempPerf && perfs[tempPerf] ? perfs[tempPerf] : null;
    if (perfData) {
      const lang   = window.I18n ? I18n.lang : 'fr';
      const pt     = PERF_TYPES.find(p => p.id === tempPerf);
      const label  = pt ? (lang === 'fr' ? pt.fr : pt.en) : tempPerf;
      const icon   = pt?.icon || Icons.s('trophy', 16);
      html += `
        <div class="fp-section">
          <p class="fp-section-title">${window.I18n ? I18n.t('profile.perf_section') : 'Meilleure performance'}</p>
          <div class="friend-perf-card">
            <span class="friend-perf-icon">${icon}</span>
            <div class="friend-perf-info">
              <span class="friend-perf-label">${label}</span>
              <span class="friend-perf-value">${perfData.value}${perfData.date ? ' · ' + perfData.date : ''}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (badgeDefs.length === 0 && !tempBio && !perfData) {
      html += `<p class="social-empty" style="margin-top:16px">${window.I18n ? I18n.t('profile.nothing_shared') : 'Rien à afficher'}</p>`;
    }

    html += `<div id="fp-shared-workouts-section"></div>`;

    content.innerHTML = html;

    // Charge les séances partagées de l'utilisateur
    if (App.supabase && App.state.user?.id && !App.state.user.id.startsWith('local_')) {
      const tStr = k => (window.I18n ? I18n.t(k) : k);
      const { data: sharedWorkouts } = await App.supabase
        .from('shared_workouts').select('id, name, exercises')
        .eq('user_id', App.state.user.id).order('created_at', { ascending: false }).limit(8);
      const section = document.getElementById('fp-shared-workouts-section');
      if (section && sharedWorkouts?.length > 0) {
        section.innerHTML = `
          <div class="fp-section">
            <p class="fp-section-title">${tStr('profile.shared_workouts')}</p>
            ${sharedWorkouts.map(w => `
              <div class="fp-workout-card">
                <div class="fp-workout-info">
                  <span class="fp-workout-name">${w.name}</span>
                  <span class="fp-workout-meta">${(w.exercises || []).length} ex.</span>
                </div>
              </div>
            `).join('')}
          </div>`;
      }
    }

    content.querySelectorAll('.fp-badge-item').forEach(el => {
      el.addEventListener('click', () => {
        const badgeId = el.dataset.badgeId;
        const overlay = document.getElementById('badge-zoom-overlay');
        if (!overlay) return;
        const name = window.I18n ? I18n.t('badge.' + badgeId + '.name') : badgeId;
        const desc = window.I18n ? I18n.t('badge.' + badgeId + '.desc') : '';
        document.getElementById('badge-zoom-img').src = Badges.img(badgeId);
        document.getElementById('badge-zoom-name').textContent = name;
        document.getElementById('badge-zoom-desc').textContent = desc;
        overlay.classList.remove('hidden');
      });
    });

    document.getElementById('modal-profile-preview')?.classList.remove('hidden');
  }

  /* ─── Mise à jour bio aperçu ────────────────────────── */
  function updatePreviewBio() {
    const el = document.getElementById('pe-preview-bio');
    const section = document.getElementById('pe-bio-preview-section');
    if (!el) return;
    el.textContent = tempBio;
    if (section) section.style.display = tempBio ? '' : 'none';
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
        private: { icon: Icons.s('lock',  14), fr: 'Privé',           en: 'Private' },
        friends: { icon: Icons.s('users', 14), fr: 'Amis seulement',  en: 'Friends only' },
        public:  { icon: Icons.s('globe', 14), fr: 'Public',           en: 'Public' },
      };
      const v    = MAP[tempVisibility] || MAP.private;
      const lang = window.I18n ? I18n.lang : 'fr';
      visEl.innerHTML = v.icon + ' ' + (lang === 'fr' ? v.fr : v.en);
      visEl.className   = 'pe-preview-vis vis-' + tempVisibility;
    }
  }

  /* ─── Liste séances à partager ──────────────────────── */
  function renderWorkoutsList() {
    const container = document.getElementById('pe-workouts-list');
    if (!container) return;
    const lib = App.local.get('workout_library') || [];
    const tl = window.I18n ? I18n.t.bind(I18n) : k => k;
    if (!lib.length) {
      container.innerHTML = `<p class="social-empty" style="font-size:13px;padding:8px 0">${tl('profile.no_workouts')}</p>`;
      return;
    }
    container.innerHTML = lib.map(w => `
      <div class="pe-workout-toggle-row">
        <div class="pe-workout-toggle-info">
          <span class="pe-workout-toggle-name">${w.name}</span>
          <span class="pe-workout-toggle-meta">${(w.exercises||[]).length} ex.</span>
        </div>
        <button class="pe-workout-share-btn${tempSharedWorkoutIds.has(w.id) ? ' active' : ''}" data-wid="${w.id}">${tempSharedWorkoutIds.has(w.id) ? Icons.s('check', 14) : Icons.s('share', 14)}</button>
      </div>
    `).join('');
    container.querySelectorAll('.pe-workout-share-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.wid) || btn.dataset.wid;
        const w  = lib.find(lw => lw.id === id || String(lw.id) === btn.dataset.wid);
        if (!w) return;
        btn.disabled = true;
        const canSync = App.supabase && App.state.user?.id && !App.state.user.id.startsWith('local_');

        if (tempSharedWorkoutIds.has(id)) {
          // ── Retirer du partage ──
          if (canSync) {
            const rowId = _sharedWorkoutsMap.get(id);
            if (rowId) {
              await App.supabase.from('shared_workouts').delete().eq('id', rowId);
            } else {
              await App.supabase.from('shared_workouts')
                .delete().eq('user_id', App.state.user.id).eq('name', w.name);
            }
          }
          tempSharedWorkoutIds.delete(id);
          _sharedWorkoutsMap.delete(id);
          btn.classList.remove('active');
          btn.innerHTML = Icons.s('share', 14);
        } else {
          // ── Ajouter au partage ──
          if (canSync) {
            const { data: existing } = await App.supabase.from('shared_workouts')
              .select('id').eq('user_id', App.state.user.id).eq('name', w.name).maybeSingle();
            if (existing) {
              await App.supabase.from('shared_workouts')
                .update({ name: w.name, exercises: w.exercises || [] }).eq('id', existing.id);
              _sharedWorkoutsMap.set(id, existing.id);
            } else {
              const { data: ins } = await App.supabase.from('shared_workouts')
                .insert({ user_id: App.state.user.id, name: w.name, exercises: w.exercises || [] })
                .select('id').single();
              if (ins?.id) _sharedWorkoutsMap.set(id, ins.id);
            }
          }
          tempSharedWorkoutIds.add(id);
          btn.classList.add('active');
          btn.innerHTML = Icons.s('check', 14);
        }
        btn.disabled = false;
      });
    });
  }

  /* ─── Badge picker ──────────────────────────────────── */
  function openBadgePicker(slotIndex) {
    selectedSlot = slotIndex;

    const earned    = App.state.badges || [];
    const earnedIds = earned.map(b => b.type || b.id);
    const current   = tempBadges[slotIndex];
    const list      = document.getElementById('badge-picker-list');
    if (!list) return;

    const items = (Badges.ALL_BADGES || []).filter(b => earnedIds.includes(b.id)).map(b => {
      const bName = window.I18n ? I18n.t('badge.' + b.id + '.name') : b.id;
      return `
      <div class="badge-picker-item${current === b.id ? ' active' : ''}" data-badge="${b.id}">
        <img class="badge-picker-img" src="${Badges.img(b.id)}" alt="${bName}" onerror="this.style.display='none'">
        <span class="badge-picker-name">${bName}</span>
        ${current === b.id ? '<span class="badge-picker-check">✓</span>' : ''}
      </div>
    `;
    }).join('');

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

    document.getElementById('btn-pe-preview')?.addEventListener('click', showFullPreview);
    document.getElementById('btn-close-profile-preview')?.addEventListener('click', () => {
      document.getElementById('modal-profile-preview')?.classList.add('hidden');
    });
    document.getElementById('modal-profile-preview')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });

    const bioInput = document.getElementById('pe-bio-input');
    const bioCount = document.getElementById('pe-bio-count');
    if (bioInput) {
      bioInput.addEventListener('input', () => {
        tempBio = bioInput.value;
        if (bioCount) bioCount.textContent = tempBio.length;
        updatePreviewBio();
      });
    }

    document.querySelectorAll('input[name="pe-vis"]').forEach(radio => {
      radio.addEventListener('change', () => {
        tempVisibility = radio.value;
        updatePreviewHeader();
      });
    });

    async function doSave() {
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

      const updated = { ...profile, visibility: tempVisibility, displayed_badges, best_performance, bio: tempBio };
      App.state.profile = updated;
      App.local.set('profile', updated);

      const btns = [document.getElementById('btn-pe-save'), document.getElementById('btn-pe-save-bottom')];
      btns.forEach(b => { if (b) { b.textContent = '✓'; b.disabled = true; } });

      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }

      const label = window.I18n ? I18n.t('profile.save') : 'Sauvegarder';
      btns.forEach(b => { if (b) { b.textContent = label; b.disabled = false; } });
      App.navigate('app');
      App.switchTab('settings');
    }

    document.getElementById('btn-pe-save-bottom')?.addEventListener('click', doSave);
  }

  /* ─── Ouverture de la page ───────────────────────────── */
  function open() {
    const profile  = App.state.profile;
    const saved    = profile?.displayed_badges || [];
    tempBadges     = [saved[0] || null, saved[1] || null, saved[2] || null];
    tempPerf       = profile?.best_performance?.type || null;
    tempVisibility = profile?.visibility || 'private';
    tempBio        = profile?.bio || '';

    const bioInput = document.getElementById('pe-bio-input');
    const bioCount = document.getElementById('pe-bio-count');
    if (bioInput) { bioInput.value = tempBio; }
    if (bioCount) { bioCount.textContent = tempBio.length; }

    // Visibility radio
    const radio = document.querySelector(`input[name="pe-vis"][value="${tempVisibility}"]`);
    if (radio) radio.checked = true;

    updatePreviewHeader();
    renderBadgeSlots();
    updatePreviewBio();
    renderPerfOptions();
    updatePerfCard();
    tempSharedWorkoutIds = new Set();
    _loadedSharedNames   = new Set();
    _sharedWorkoutsMap   = new Map();
    renderWorkoutsList();
    if (App.supabase && App.state.user?.id && !App.state.user.id.startsWith('local_')) {
      App.supabase.from('shared_workouts').select('id, name, exercises').eq('user_id', App.state.user.id)
        .then(({ data }) => {
          if (!data) return;
          const lib = App.local.get('workout_library') || [];
          data.forEach(sw => {
            // Match par nom exact d'abord, puis par fingerprint (séance renommée)
            let match = lib.find(w => w.name === sw.name);
            if (!match) {
              const swFp = _fp(sw.exercises);
              if (swFp) match = lib.find(w => _fp(w.exercises) === swFp);
            }
            if (!match) return;
            _sharedWorkoutsMap.set(match.id, sw.id);
            tempSharedWorkoutIds.add(match.id);
            // Sync automatique si le nom a changé localement
            if (sw.name !== match.name) {
              App.supabase.from('shared_workouts')
                .update({ name: match.name, exercises: match.exercises || [] })
                .eq('id', sw.id).then(() => {});
            }
          });
          renderWorkoutsList();
        });
    }

    // Scroll to top
    const body = document.querySelector('.pe-body');
    if (body) body.scrollTop = 0;

    App.navigate('profile-editor');
  }

  return { init, open };

})();
