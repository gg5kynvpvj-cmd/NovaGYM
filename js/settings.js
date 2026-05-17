/* ═══════════════════════════════════════════════════════════
   NovaGYM — Réglages, aide, support, profil
   ═══════════════════════════════════════════════════════════ */

window.Settings = (() => {

  /* ─── Refresh header réglages ─────────────────────────── */
  function refreshHeader() {
    const profile = App.state.profile;
    const user    = App.state.user;
    if (!profile && !user) return;

    const name   = profile?.username || user?.email?.split('@')[0] || 'NovaGYM';
    const email  = user?.email || '';
    const letter = name.charAt(0).toUpperCase();

    document.getElementById('settings-username').textContent = name;
    document.getElementById('settings-email').textContent    = email;
    document.getElementById('settings-avatar-letter').textContent = letter;

    // Photo de profil
    const savedAvatar = App.local.get('avatar');
    if (savedAvatar) {
      const img  = document.getElementById('settings-avatar-img');
      const span = document.getElementById('settings-avatar-letter');
      if (img && span) {
        img.src = savedAvatar;
        img.classList.remove('hidden');
        span.classList.add('hidden');
      }
    }

    // Programme actuel
    const programLabelEl = document.getElementById('current-program-label');
    if (programLabelEl && profile?.program_type) {
      programLabelEl.textContent = getProgramLabel(profile.program_type);
    }

    // Lieu d'entraînement
    const location = profile?.location || 'gym';
    document.querySelectorAll('.location-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.location === location);
    });

    // Type de séries
    const series = profile?.series_type || 'fixed';
    const seriesEl = document.getElementById('series-check-' + series);
    document.querySelectorAll('.series-option-check').forEach(el => { el.textContent = ''; });
    if (seriesEl) seriesEl.textContent = '✓';

    // Thème
    const theme = App.local.get('theme') || 'dark';
    document.querySelectorAll('.theme-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    // Langue
    const langLabels = { fr: 'Français', en: 'English' };
    const lang = App.local.get('lang') || 'fr';
    const langEl = document.getElementById('current-lang-label');
    if (langEl) langEl.textContent = langLabels[lang] || 'Français';
    document.querySelectorAll('.lang-check').forEach(el => { el.textContent = ''; });
    const langCheck = document.getElementById('lang-check-' + lang);
    if (langCheck) langCheck.textContent = '✓';
  }

  /* ─── Modal helper ────────────────────────────────────── */
  function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

  /* ─── Photo de profil ────────────────────────────────── */
  function applyAvatarEverywhere(dataUrl) {
    // Settings avatar
    const img  = document.getElementById('settings-avatar-img');
    const span = document.getElementById('settings-avatar-letter');
    if (img && span) {
      img.src = dataUrl;
      img.classList.remove('hidden');
      span.classList.add('hidden');
    }
    // Boutons profil dans les autres onglets
    document.querySelectorAll('.profile-icon-btn').forEach(btn => {
      let avatarImg = btn.querySelector('.profile-avatar-img');
      if (!avatarImg) {
        btn.innerHTML = '';
        avatarImg = document.createElement('img');
        avatarImg.className = 'profile-avatar-img';
        btn.appendChild(avatarImg);
      }
      avatarImg.src = dataUrl;
    });
  }

  function showDeleteAvatarBtn(show) {
    document.getElementById('btn-delete-avatar')?.classList.toggle('hidden', !show);
  }

  async function deleteAvatar() {
    if (!confirm(I18n.t('settings.delete_avatar'))) return;
    // Supprime depuis Supabase Storage
    if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
      const { data: existing } = await App.supabase.storage
        .from('avatars').list(App.state.user.id);
      if (existing?.length > 0) {
        const paths = existing.map(f => `${App.state.user.id}/${f.name}`);
        await App.supabase.storage.from('avatars').remove(paths);
      }
      // Supprime l'URL du profil
      const profile = App.state.profile;
      if (profile) {
        const updated = { ...profile, avatar_url: null };
        App.state.profile = updated;
        App.local.set('profile', updated);
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }
    }
    App.local.del('avatar_url');
    App.local.del('avatar');
    // Réinitialise l'affichage
    const img  = document.getElementById('settings-avatar-img');
    const span = document.getElementById('settings-avatar-letter');
    if (img)  { img.src = ''; img.classList.add('hidden'); }
    if (span) span.classList.remove('hidden');
    document.querySelectorAll('.profile-icon-btn').forEach(btn => {
      btn.innerHTML = `<span class="profile-icon-letter" id="profile-icon-letter-${btn.closest('.tab-content')?.id?.replace('tab-','')}"></span>`;
    });
    showDeleteAvatarBtn(false);
    if (window.Sync) Sync.scheduleSave();
  }

  function initAvatarUpload() {
    // Applique l'avatar sauvegardé au chargement
    const savedUrl = App.local.get('avatar_url') || App.local.get('avatar');
    if (savedUrl) { applyAvatarEverywhere(savedUrl); showDeleteAvatarBtn(true); }

    document.getElementById('btn-delete-avatar')?.addEventListener('click', deleteAvatar);

    document.getElementById('avatar-upload')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Upload vers Supabase Storage si disponible
      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        try {
          // Toujours le même nom → écrase l'ancienne photo automatiquement
          const filePath = `${App.state.user.id}/avatar.jpg`;

          // Supprime l'ancienne version si elle existe (autre extension)
          const { data: existing } = await App.supabase.storage
            .from('avatars').list(App.state.user.id);
          if (existing?.length > 0) {
            const oldPaths = existing.map(f => `${App.state.user.id}/${f.name}`);
            await App.supabase.storage.from('avatars').remove(oldPaths);
          }

          await App.supabase.storage.from('avatars').upload(filePath, file, {
            upsert: true, contentType: file.type
          });
          const { data: urlData } = App.supabase.storage.from('avatars').getPublicUrl(filePath);
          // Cache-buster pour forcer le rechargement de l'image
          const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
          App.local.set('avatar_url', avatarUrl);
          App.local.del('avatar');
          // Sauvegarde l'URL dans le profil
          const profile = App.state.profile;
          if (profile) {
            const updated = { ...profile, avatar_url: avatarUrl };
            App.state.profile = updated;
            App.local.set('profile', updated);
            await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
          }
          applyAvatarEverywhere(avatarUrl);
          showDeleteAvatarBtn(true);
          return;
        } catch (err) {
          console.warn('Avatar upload error:', err.message);
        }
      }

      // Fallback : base64 en local
      const reader = new FileReader();
      reader.onload = (ev) => {
        App.local.set('avatar', ev.target.result);
        applyAvatarEverywhere(ev.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

  /* ─── Lieu d'entraînement ────────────────────────────── */
  function initLocation() {
    document.querySelectorAll('.location-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const location = btn.dataset.location;
        document.querySelectorAll('.location-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const profile = App.state.profile;
        if (!profile) return;
        const updated = { ...profile, location };
        App.state.profile = updated;
        App.local.set('profile', updated);

        if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
          await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
        }
      });
    });
  }

  /* ─── Type de programme ─────────────────────────────── */
  const PROGRAM_LABELS = {
    ppl: 'PPL', upper_lower: 'Upper/Lower', full_body: 'Full Body',
    bro_split: 'Bro Split', gym: 'PPL',
  };

  function getProgramLabel(type) {
    if (type === 'home')   return I18n.t('settings.program_label.home');
    if (type === 'custom') return I18n.t('settings.program_label.custom');
    return PROGRAM_LABELS[type] || type;
  }

  function initProgramModal() {
    document.getElementById('btn-change-program')?.addEventListener('click', () => {
      const profile = App.state.profile;
      const current = profile?.program_type || 'ppl';

      // Marque la carte active
      document.querySelectorAll('#modal-program-list .program-card').forEach(card => {
        const isActive = card.dataset.value === current;
        card.classList.toggle('active', isActive);
      });

      openModal('modal-program');
    });

    document.getElementById('btn-close-program')?.addEventListener('click', () => {
      closeModal('modal-program');
    });

    document.getElementById('modal-program')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-program');
    });

    // Event delegation sur la liste
    document.getElementById('modal-program-list')?.addEventListener('click', async (e) => {
      const card = e.target.closest('.program-card');
      if (!card) return;

      const newProgram = card.dataset.value;
      document.querySelectorAll('#modal-program-list .program-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const profile = App.state.profile;
      if (!profile) return;
      const updated = { ...profile, program_type: newProgram };
      App.state.profile = updated;
      App.local.set('profile', updated);

      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }

      // Met à jour le label dans les réglages
      const labelEl = document.getElementById('current-program-label');
      if (labelEl) labelEl.textContent = getProgramLabel(newProgram);

      closeModal('modal-program');
      Today.render();
    });
  }

  /* ─── Type de séries ─────────────────────────────────── */
  function initSeriesModal() {
    document.getElementById('btn-change-series')?.addEventListener('click', () => {
      openModal('modal-series');
    });

    document.getElementById('btn-close-series')?.addEventListener('click', () => {
      closeModal('modal-series');
    });

    document.getElementById('modal-series')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-series');
    });

    document.querySelectorAll('.series-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const series = btn.dataset.series;
        document.querySelectorAll('.series-option-check').forEach(el => { el.textContent = ''; });
        const checkEl = document.getElementById('series-check-' + series);
        if (checkEl) checkEl.textContent = '✓';

        const profile = App.state.profile;
        if (!profile) return;
        const updated = { ...profile, series_type: series };
        App.state.profile = updated;
        App.local.set('profile', updated);

        if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
          await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
        }

        closeModal('modal-series');
      });
    });
  }

  /* ─── Jours d'entraînement ───────────────────────────── */
  function initDaysModal() {
    document.getElementById('btn-change-days')?.addEventListener('click', () => {
      const profile = App.state.profile;
      const currentDays = profile?.training_days || [];

      // Pré-sélectionne les jours actuels
      document.querySelectorAll('#modal-days-grid .day-btn').forEach(btn => {
        const isActive = currentDays.includes(btn.dataset.day);
        btn.classList.toggle('active', isActive);
      });

      openModal('modal-days');
    });

    document.getElementById('btn-close-days')?.addEventListener('click', () => {
      closeModal('modal-days');
    });

    // Event delegation sur le grid (plus fiable que par bouton)
    document.getElementById('modal-days-grid')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.day-btn');
      if (!btn) return;
      btn.classList.toggle('active');
    });

    document.getElementById('btn-save-days')?.addEventListener('click', async () => {
      const selectedDays = [];
      document.querySelectorAll('#modal-days-grid .day-btn.active').forEach(btn => {
        selectedDays.push(btn.dataset.day);
      });

      if (selectedDays.length === 0) return;

      const profile = App.state.profile;
      if (!profile) return;
      const updated = { ...profile, training_days: selectedDays };
      App.state.profile = updated;
      App.local.set('profile', updated);

      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }

      closeModal('modal-days');
      Today.render();
    });
  }

  /* ─── Thème sombre / clair ───────────────────────────── */
  function initTheme() {
    document.querySelectorAll('.theme-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.querySelectorAll('.theme-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (theme === 'light') {
          document.documentElement.classList.add('light');
        } else {
          document.documentElement.classList.remove('light');
        }
        App.local.set('theme', theme);
      });
    });
  }

  /* ─── Langue ─────────────────────────────────────────── */
  function initLanguage() {
    document.getElementById('btn-change-lang')?.addEventListener('click', () => {
      openModal('modal-language');
    });

    document.getElementById('btn-close-language')?.addEventListener('click', () => {
      closeModal('modal-language');
    });

    document.getElementById('modal-language')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-language');
    });

    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        const langLabels = { fr: 'Français', en: 'English' };

        document.querySelectorAll('.lang-check').forEach(el => { el.textContent = ''; });
        const checkEl = document.getElementById('lang-check-' + lang);
        if (checkEl) checkEl.textContent = '✓';

        const langEl = document.getElementById('current-lang-label');
        if (langEl) langEl.textContent = langLabels[lang] || lang;

        if (window.I18n) I18n.setLang(lang);

        closeModal('modal-language');
      });
    });
  }

  /* ─── Modifier le profil ─────────────────────────────── */
  function initEditProfile() {
    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
      const profile = App.state.profile;
      if (!profile) return;

      const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
      set('edit-weight',  profile.weight);
      set('edit-height',  profile.height);
      set('edit-age',     profile.age);
      set('edit-bodyfat', profile.body_fat_pct);

      const goalContainer = document.getElementById('edit-goal');
      goalContainer?.querySelectorAll('[data-value]').forEach(el => {
        el.classList.toggle('active', el.dataset.value === profile.goal);
      });

      goalContainer?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-value]');
        if (!target) return;
        goalContainer.querySelectorAll('[data-value]').forEach(el => el.classList.remove('active'));
        target.classList.add('active');
      });

      openModal('modal-edit-profile');
    });

    document.getElementById('btn-close-edit-profile')?.addEventListener('click', () => {
      closeModal('modal-edit-profile');
    });

    document.getElementById('form-edit-profile')?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const profile   = App.state.profile;
      const goalEl    = document.getElementById('edit-goal')?.querySelector('.pill.active');
      const newWeight = parseFloat(document.getElementById('edit-weight')?.value);
      const newHeight = parseFloat(document.getElementById('edit-height')?.value);
      const newAge    = parseFloat(document.getElementById('edit-age')?.value);
      const newBf     = parseFloat(document.getElementById('edit-bodyfat')?.value);
      const newGoal   = goalEl?.dataset.value || profile.goal;

      const updated = {
        ...profile,
        weight:       newWeight || profile.weight,
        height:       newHeight || profile.height,
        age:          newAge    || profile.age,
        body_fat_pct: newBf     || profile.body_fat_pct,
        goal:         newGoal,
      };

      App.state.profile = updated;
      App.local.set('profile', updated);

      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }

      closeModal('modal-edit-profile');
      refreshHeader();
      await Stats.refresh();
    });

    document.getElementById('modal-edit-profile')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-edit-profile');
    });
  }

  /* ─── Modifier le pseudonyme ─────────────────────────── */
  function initChangeUsername() {
    document.getElementById('btn-change-username')?.addEventListener('click', () => {
      const profile = App.state.profile;
      const input   = document.getElementById('edit-username-input');
      if (input && profile) input.value = profile.username || '';
      openModal('modal-username');
    });

    document.getElementById('btn-close-username')?.addEventListener('click', () => {
      closeModal('modal-username');
    });

    document.getElementById('btn-save-username')?.addEventListener('click', async () => {
      const newName = document.getElementById('edit-username-input')?.value?.trim();
      if (!newName) return;

      const profile = App.state.profile;
      const updated = { ...profile, username: newName };

      App.state.profile = updated;
      App.local.set('profile', updated);

      if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
        await App.supabase.from('profiles').upsert(updated, { onConflict: 'id' });
      }

      closeModal('modal-username');
      refreshHeader();
      document.getElementById('greeting-name').textContent = newName;
    });

    document.getElementById('modal-username')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-username');
    });
  }

  /* ─── Sync manuel ───────────────────────────────────────── */
  function initSyncButton() {
    document.getElementById('btn-sync-now')?.addEventListener('click', async () => {
      if (!App.supabase || !App.state.user) return;
      const status = document.getElementById('sync-status');
      if (status) status.textContent = '⏳';
      try {
        await window.Sync.saveToSupabase();
        await window.Sync.loadFromSupabase();
        await App.refreshApp();
        // Rafraîchit aussi l'onglet actif
        const activeTab = document.querySelector('.tab-content.active')?.id?.replace('tab-', '');
        if (activeTab === 'nutrition') Nutrition.render();
        else if (activeTab === 'history') History.load();
        else if (activeTab === 'stats') Stats.refresh();
        if (status) { status.textContent = '✅ OK'; setTimeout(() => { status.textContent = ''; }, 3000); }
      } catch(e) {
        if (status) { status.textContent = '❌ Erreur'; setTimeout(() => { status.textContent = ''; }, 3000); }
      }
    });
  }

  /* ─── Export JSON ─────────────────────────────────────── */
  function initExport() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
      const data = {
        profile:     App.state.profile,
        sessions:    App.state.sessions,
        badges:      App.state.badges,
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `novagym-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /* ─── Réinitialisation ────────────────────────────────── */
  function initReset() {
    document.getElementById('btn-reset-app')?.addEventListener('click', () => {
      openModal('modal-reset');
    });

    document.getElementById('btn-cancel-reset')?.addEventListener('click', () => {
      closeModal('modal-reset');
    });

    document.getElementById('btn-confirm-reset')?.addEventListener('click', async () => {
      App.local.clear();
      App.state.sessions = [];
      App.state.badges   = [];

      const userId = App.state.user?.id;
      if (App.supabase && userId && !userId.startsWith('local_')) {
        await Promise.all([
          App.supabase.from('sessions').delete().eq('user_id', userId),
          App.supabase.from('badges').delete().eq('user_id', userId),
        ]);
      }

      closeModal('modal-reset');
      App.navigate('onboarding');
    });

    document.getElementById('modal-reset')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-reset');
    });
  }

  /* ─── Page Aide ───────────────────────────────────────── */
  function initHelp() {
    document.getElementById('btn-help')?.addEventListener('click', () => {
      openModal('modal-help');
    });

    document.getElementById('btn-close-help')?.addEventListener('click', () => {
      closeModal('modal-help');
    });

    document.getElementById('modal-help')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-help');
    });

    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item   = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    initAvatarUpload();
    initSyncButton();
    initProgramModal();
    initLocation();
    initSeriesModal();
    initDaysModal();
    initTheme();
    initLanguage();
    initEditProfile();
    initChangeUsername();
    initExport();
    initReset();
    initHelp();
  }

  return { init, refreshHeader, applyAvatar: applyAvatarEverywhere };

})();
