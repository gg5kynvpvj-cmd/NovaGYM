/* ═══════════════════════════════════════════════════════════
   NovaGYM — Configuration Supabase
   ➜ Remplace SUPABASE_URL et SUPABASE_ANON_KEY par tes valeurs
     Supabase → Settings → API
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://igzhncjbqlszqkewmdwc.supabase.co';
const SUPABASE_ANON = 'sb_publishable_j9Vv00n69z-ptC_0UCAVoQ_ki6yHE3R';

// Utilise un nom différent pour éviter le conflit avec la variable
// globale 'supabase' que le CDN jsdelivr déclare automatiquement
const _isConfigured = !SUPABASE_URL.includes('TON-PROJET') && !SUPABASE_ANON.includes('ton-anon-key');
let _supabaseClient = null;

if (_isConfigured) {
  try {
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  } catch(e) {
    console.warn('Supabase init error:', e.message);
  }
} else {
  console.info('NovaGYM — mode local actif (Supabase non configuré)');
}

// Namespace global de l'application
window.App = {
  supabase: _supabaseClient,

  state: {
    user:         null,
    profile:      null,
    sessions:     [],
    badges:       [],
    todaySession: null,
  },

  local: {
    get:   (key)      => { try { return JSON.parse(localStorage.getItem('ng_' + key)); } catch { return null; } },
    set:   (key, val) => { localStorage.setItem('ng_' + key, JSON.stringify(val)); window.Sync?.scheduleSave(); },
    del:   (key)      => { localStorage.removeItem('ng_' + key); },
    clear: ()         => {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ng_'))
        .forEach(k => localStorage.removeItem(k));
    }
  }
};
