/* ═══════════════════════════════════════════════════════════
   NovaGYM — Sync cross-device via Supabase
   Sauvegarde / restaure préférences + données utilisateur
   ═══════════════════════════════════════════════════════════ */

window.Sync = (() => {

  const PREF_KEYS = ['theme', 'lang', 'timer_sound', 'steps_goal', 'water_goal', 'avatar_url'];
  const DATA_KEYS = ['sessions', 'meal_library', 'custom_exercises',
                     'workout_library', 'custom_challenges', 'custom_schedule'];
  const DAILY_PREFIXES = ['nutrition_', 'daily_'];

  let _saveTimer    = null;
  let _isLoading    = false;
  let _dirty        = false; // indique si des données locales ont changé depuis le dernier save

  /* ─── Calcule les clés daily des 90 derniers jours ───── */
  function getDailyKeys() {
    const keys = [];
    const now = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      DAILY_PREFIXES.forEach(p => keys.push(p + dateStr));
    }
    return keys;
  }

  /* ─── Vérifie si l'appareil a des données locales utiles ─ */
  function hasLocalData() {
    if ((App.local.get('sessions')          || []).length > 0) return true;
    if ((App.local.get('custom_exercises')  || []).length > 0) return true;
    if ((App.local.get('workout_library')   || []).length > 0) return true;
    if ((App.local.get('meal_library')      || []).length > 0) return true;
    if ((App.local.get('custom_challenges') || []).length > 0) return true;
    if (App.local.get('water_goal')  != null) return true;
    if (App.local.get('steps_goal')  != null) return true;
    if (App.local.get('theme')       != null) return true;
    // Vérifie les 7 derniers jours de nutrition
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = 'nutrition_' + d.toISOString().slice(0, 10);
      const nutr = App.local.get(key);
      if (nutr && (nutr.meals?.length > 0 || nutr.water > 0)) return true;
    }
    return false;
  }

  /* ─── Collecte toutes les données à sauvegarder ──────── */
  function collectData() {
    const preferences = {};
    PREF_KEYS.forEach(key => {
      const val = App.local.get(key);
      if (val !== null) preferences[key] = val;
    });

    const userData = {};
    DATA_KEYS.forEach(key => {
      const val = App.local.get(key);
      if (val !== null) userData[key] = val;
    });

    const daily = {};
    getDailyKeys().forEach(key => {
      const val = App.local.get(key);
      if (val !== null) daily[key] = val;
    });
    userData.daily = daily;

    return { preferences, user_data: userData };
  }

  /* ─── Sauvegarde vers Supabase ────────────────────────── */
  async function saveToSupabase() {
    if (!App.supabase || !App.state.user) return;
    try {
      const payload = collectData();
      const { error } = await App.supabase
        .from('profiles')
        .upsert({ id: App.state.user.id, ...payload }, { onConflict: 'id' });
      if (error) console.warn('Sync.save error:', error.message);
      else _dirty = false;
    } catch (e) {
      console.warn('Sync.save error:', e.message);
    }
  }

  /* ─── Restaure depuis Supabase ────────────────────────── */
  async function loadFromSupabase() {
    if (!App.supabase || !App.state.user) return;
    _isLoading = true;
    try {
      // Charge TOUT : profil complet + préférences + données utilisateur
      const { data } = await App.supabase
        .from('profiles')
        .select('*')
        .eq('id', App.state.user.id)
        .single();

      if (!data) return;

      // Profil complet (programme, jours, lieu, poids, objectif, pseudo...)
      App.state.profile = data;
      App.local.set('profile', data);

      // Préférences (thème, langue, objectifs eau/pas, avatar...)
      if (data.preferences && typeof data.preferences === 'object') {
        Object.entries(data.preferences).forEach(([k, v]) => App.local.set(k, v));
      }

      // Données utilisateur (séances, nutrition, exercices perso...)
      if (data.user_data && typeof data.user_data === 'object') {
        const { daily, ...mainData } = data.user_data;
        Object.entries(mainData).forEach(([k, v]) => App.local.set(k, v));
        if (daily && typeof daily === 'object') {
          Object.entries(daily).forEach(([k, v]) => { if (v !== null) App.local.set(k, v); });
        }
      }
    } catch (e) {
      console.warn('Sync.load error:', e.message);
    } finally {
      _isLoading = false;
    }
  }

  /* ─── Login sync : pousse si données locales, puis charge ─ */
  async function loginSync() {
    if (!App.supabase || !App.state.user) return;

    // Si l'appareil a des données locales, on les pousse d'abord
    if (hasLocalData()) {
      await saveToSupabase();
    }

    // Puis on charge le cloud
    await loadFromSupabase();
  }

  /* ─── Planifie une sauvegarde différée (2 s) ──────────── */
  function scheduleSave() {
    if (_isLoading) return;
    _dirty = true;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(saveToSupabase, 2000);
  }

  /* ─── Sauvegarde immédiate si des données ont changé ─────
     Utilisé quand l'app passe en arrière-plan (mobile)    ── */
  function flushIfDirty() {
    if (_dirty && App.supabase && App.state.user) {
      clearTimeout(_saveTimer);
      saveToSupabase();
    }
  }

  let _lastLoad = 0;

  /* ─── Sauvegarde / recharge selon visibilité ──────────── */
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      // App mise en arrière-plan → sauvegarde immédiate
      flushIfDirty();
    } else {
      // App revenue au premier plan → recharge si > 30s depuis le dernier load
      const now = Date.now();
      if (App.supabase && App.state.user && now - _lastLoad > 30_000) {
        _lastLoad = now;
        await loadFromSupabase();
        if (window.App?.refreshApp) await App.refreshApp();
        // Rafraîchit l'onglet actif
        const activeTab = document.querySelector('.tab-content.active')?.id?.replace('tab-', '');
        if (activeTab === 'nutrition' && window.Nutrition) Nutrition.render();
        else if (activeTab === 'history' && window.History) History.load();
        else if (activeTab === 'stats' && window.Stats) Stats.refresh();
      }
    }
  });

  /* ─── Sauvegarde périodique toutes les 60 secondes ────── */
  setInterval(() => {
    if (_dirty) saveToSupabase();
  }, 60_000);

  return { saveToSupabase, loadFromSupabase, scheduleSave, loginSync };

})();
