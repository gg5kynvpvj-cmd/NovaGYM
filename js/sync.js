/* ═══════════════════════════════════════════════════════════
   NovaGYM — Sync cross-device via Supabase
   Sauvegarde / restaure préférences + données utilisateur
   ═══════════════════════════════════════════════════════════ */

window.Sync = (() => {

  const PREF_KEYS = ['theme', 'lang', 'timer_sound', 'steps_goal', 'water_goal'];
  const DATA_KEYS = ['sessions', 'meal_library', 'custom_exercises',
                     'workout_library', 'custom_challenges', 'custom_schedule'];
  const DAILY_PREFIXES = ['nutrition_', 'daily_'];

  let _saveTimer = null;
  let _isLoading = false; // évite la boucle infinie lors du restore

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
      await App.supabase
        .from('profiles')
        .update(payload)
        .eq('id', App.state.user.id);
    } catch (e) {
      console.warn('Sync.save error:', e.message);
    }
  }

  /* ─── Restaure depuis Supabase ────────────────────────── */
  async function loadFromSupabase() {
    if (!App.supabase || !App.state.user) return;
    _isLoading = true;
    try {
      const { data } = await App.supabase
        .from('profiles')
        .select('preferences, user_data')
        .eq('id', App.state.user.id)
        .single();

      if (!data) return;

      if (data.preferences && typeof data.preferences === 'object') {
        Object.entries(data.preferences).forEach(([k, v]) => App.local.set(k, v));
      }

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

  /* ─── Login sync : pousse les données locales si elles
       existent, puis charge le cloud (merge simple) ────── */
  async function loginSync() {
    if (!App.supabase || !App.state.user) return;

    // Si l'appareil a des données locales, on les pousse d'abord
    const localSessions = App.local.get('sessions') || [];
    const today = new Date().toISOString().slice(0, 10);
    const localNutr = App.local.get('nutrition_' + today);

    if (localSessions.length > 0 || localNutr) {
      await saveToSupabase();
    }

    // Puis on charge le cloud (pour récupérer les données d'un autre appareil)
    await loadFromSupabase();
  }

  /* ─── Planifie une sauvegarde différée (2 s) ──────────── */
  function scheduleSave() {
    if (_isLoading) return; // pas de save pendant le restore
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(saveToSupabase, 2000);
  }

  return { saveToSupabase, loadFromSupabase, scheduleSave, loginSync };

})();
