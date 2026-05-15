/* ═══════════════════════════════════════════════════════════
   NovaGYM — Onboarding 4 étapes
   Collecte les données utilisateur et les sauvegarde
   ═══════════════════════════════════════════════════════════ */

window.Onboarding = (() => {

  // Données collectées pendant l'onboarding
  const data = {
    weight:       null,
    height:       null,
    age:          null,
    body_fat_pct: null,
    gender:       'male',
    goal:         null,
    diet_type:    'standard',
    program_type: 'ppl',
    level:        'beginner',
    series_type:  'fixed',
    training_days: [],
  };

  /* ─── Navigation entre étapes ────────────────────────── */
  function goToStep(n) {
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
    document.getElementById('ob-step-' + n)?.classList.add('active');

    // Progress dots
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
    for (let i = 1; i <= n; i++) {
      document.querySelector(`.dot[data-step="${i}"]`)?.classList.add('active');
    }
    document.getElementById('current-step-num').textContent = n;

    // Scroll en haut
    document.getElementById('page-onboarding').scrollTop = 0;
  }

  /* ─── Sélecteur type "pill" générique ───────────────── */
  function initSingleSelect(containerId, field) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', (e) => {
      const el = e.target.closest('[data-value]');
      if (!el) return;
      container.querySelectorAll('[data-value]').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      data[field] = el.dataset.value;
    });
  }

  /* ─── Étape 4 — Jours d'entraînement ────────────────── */
  function initDaysSelector() {
    document.querySelectorAll('#ob-days .day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const day = btn.dataset.day;
        if (btn.classList.contains('active')) {
          if (!data.training_days.includes(day)) data.training_days.push(day);
        } else {
          data.training_days = data.training_days.filter(d => d !== day);
        }
        updateDaysInfo();
      });
    });
  }

  function updateDaysInfo() {
    const info = document.getElementById('days-info');
    if (!info) return;
    const count = data.training_days.length;
    if (count === 0) {
      info.textContent = 'Sélectionne tes jours d\'entraînement';
    } else {
      const short = data.training_days.map(d => Programs.DAYS_SHORT[d]).join(', ');
      info.textContent = `${count} jour${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''} : ${short}`;
    }
  }

  /* ─── Validation étape 1 ─────────────────────────────── */
  function validateStep1() {
    const weight = parseFloat(document.getElementById('ob-weight').value);
    const height = parseFloat(document.getElementById('ob-height').value);
    const age    = parseFloat(document.getElementById('ob-age').value);
    const bf     = parseFloat(document.getElementById('ob-bodyfat').value);

    if (!weight || weight < 30 || weight > 300) {
      alert('Saisis un poids valide (entre 30 et 300 kg).');
      return false;
    }
    if (!height || height < 100 || height > 250) {
      alert('Saisis une taille valide (entre 100 et 250 cm).');
      return false;
    }
    if (!age || age < 13 || age > 100) {
      alert('Saisis un âge valide (entre 13 et 100 ans).');
      return false;
    }

    data.weight       = weight;
    data.height       = height;
    data.age          = age;
    data.body_fat_pct = bf || null;

    return true;
  }

  /* ─── Validation étape 2 ─────────────────────────────── */
  function validateStep2() {
    if (!data.goal) {
      alert('Choisis ton objectif.');
      return false;
    }
    return true;
  }

  /* ─── Validation étape 4 ─────────────────────────────── */
  function validateStep4() {
    if (data.training_days.length === 0) {
      alert('Sélectionne au moins un jour d\'entraînement.');
      return false;
    }
    return true;
  }

  /* ─── Sauvegarde du profil ───────────────────────────── */
  async function saveProfile() {
    const user = App.state.user;
    if (!user) return;

    const username = App.local.get('pending_username') || user.email?.split('@')[0] || 'Champion';

    const profile = {
      id:            user.id,
      username,
      age:           data.age,
      weight:        data.weight,
      height:        data.height,
      body_fat_pct:  data.body_fat_pct,
      gender:        data.gender,
      goal:          data.goal,
      diet_type:     data.diet_type,
      program_type:  data.program_type,
      level:         data.level,
      series_type:   data.series_type,
      training_days: data.training_days,
      created_at:    new Date().toISOString(),
    };

    // Sauvegarde locale toujours
    App.local.set('profile', profile);
    App.local.del('pending_username');

    // Sauvegarde Supabase si disponible
    if (App.supabase && !user.id.startsWith('local_')) {
      const { error } = await App.supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });
      if (error) console.warn('Supabase save error:', error.message);
    }

    App.state.profile = profile;
    return profile;
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    // Sélecteurs simples
    initSingleSelect('ob-gender',  'gender');
    initSingleSelect('ob-goal',    'goal');
    initSingleSelect('ob-diet',    'diet_type');
    initSingleSelect('ob-program', 'program_type');
    initSingleSelect('ob-level',   'level');
    initSingleSelect('ob-series',  'series_type');
    initDaysSelector();

    // Boutons "Continuer"
    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = parseInt(btn.dataset.next);
        const curr = next - 1;

        // Validation avant de continuer
        let valid = true;
        if (curr === 1) valid = validateStep1();
        if (curr === 2) valid = validateStep2();

        if (valid) goToStep(next);
      });
    });

    // Boutons "Retour"
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        goToStep(parseInt(btn.dataset.back));
      });
    });

    // Bouton final
    document.getElementById('btn-finish-onboarding')?.addEventListener('click', async () => {
      if (!validateStep4()) return;

      const btn = document.getElementById('btn-finish-onboarding');
      btn.textContent = '...';
      btn.disabled = true;

      try {
        await saveProfile();
        window.App.navigate('app');
        window.App.refreshApp();
      } catch (e) {
        console.error(e);
        btn.textContent = 'Voir mon programme →';
        btn.disabled = false;
        alert('Erreur lors de la sauvegarde. Réessaie.');
      }
    });
  }

  /* Pré-remplissage si profil existant (édition) */
  function prefill(profile) {
    if (!profile) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('ob-weight',  profile.weight);
    set('ob-height',  profile.height);
    set('ob-age',     profile.age);
    set('ob-bodyfat', profile.body_fat_pct);

    const activate = (containerId, value) => {
      const c = document.getElementById(containerId);
      if (!c || !value) return;
      c.querySelectorAll('[data-value]').forEach(el => el.classList.toggle('active', el.dataset.value === value));
    };
    activate('ob-gender',  profile.gender);
    activate('ob-goal',    profile.goal);
    activate('ob-diet',    profile.diet_type);
    activate('ob-program', profile.program_type);
    activate('ob-level',   profile.level);
    activate('ob-series',  profile.series_type);

    // Jours
    if (profile.training_days) {
      data.training_days = [...profile.training_days];
      document.querySelectorAll('#ob-days .day-btn').forEach(btn => {
        btn.classList.toggle('active', profile.training_days.includes(btn.dataset.day));
      });
      updateDaysInfo();
    }

    // Sync data object
    Object.assign(data, {
      weight: profile.weight, height: profile.height, age: profile.age,
      body_fat_pct: profile.body_fat_pct, gender: profile.gender,
      goal: profile.goal, diet_type: profile.diet_type,
      program_type: profile.program_type, level: profile.level,
      series_type: profile.series_type,
    });
  }

  return { init, prefill, saveProfile, data };

})();
