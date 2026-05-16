/* ═══════════════════════════════════════════════════════════
   NovaGYM — Authentification Supabase
   Login, register, logout, session persistante
   ═══════════════════════════════════════════════════════════ */

window.Auth = (() => {

  /* ─── UI helpers ─────────────────────────────────────── */
  function setLoading(btnId, loading) {
    const btn  = document.getElementById(btnId);
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const spin = btn.querySelector('.btn-loader');
    btn.disabled = loading;
    if (text) text.classList.toggle('hidden', loading);
    if (spin) spin.classList.toggle('hidden', !loading);
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearError(id) { showError(id, ''); }

  /* ─── Tab switching ──────────────────────────────────── */
  function initAuthTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const which = tab.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('form-' + which)?.classList.add('active');
        clearError('login-error');
        clearError('register-error');
      });
    });
  }

  /* ─── Forgot password ────────────────────────────────── */
  function initForgotPassword() {
    document.getElementById('btn-forgot')?.addEventListener('click', async () => {
      const email = document.getElementById('login-email')?.value?.trim();
      if (!email) { showError('login-error', "Saisis ton email d'abord."); return; }
      if (App.supabase) {
        await App.supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://www.novagympro.com'
        });
      }
      showError('login-error', '📧 Email de réinitialisation envoyé !');
    });

    document.getElementById('btn-forgot-email')?.addEventListener('click', () => {
      showError('login-error', '📧 Contacte-nous à novagympro@proton.me pour retrouver ton compte.');
    });
  }

  /* ─── LOGIN ──────────────────────────────────────────── */
  function initLogin() {
    document.getElementById('form-login')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('login-error');
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) { showError('login-error', 'Remplis tous les champs.'); return; }
      setLoading('btn-login', true);

      try {
        if (App.supabase) {
          const { data, error } = await App.supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          App.state.user = data.user;
          await afterAuth(data.user);
        } else {
          // Mode local (sans Supabase)
          const stored = App.local.get('user');
          if (stored && stored.email === email) {
            App.state.user = stored;
            await afterAuth(stored);
          } else {
            throw new Error("Compte introuvable. Crée un compte d'abord.");
          }
        }
      } catch (err) {
        showError('login-error', translateError(err.message));
      } finally {
        setLoading('btn-login', false);
      }
    });
  }

  /* ─── REGISTER ───────────────────────────────────────── */
  function initRegister() {
    document.querySelectorAll('.auth-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (window.I18n) I18n.setLang(btn.dataset.lang);
      });
    });

    document.getElementById('form-register')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('register-error');
      const username = document.getElementById('register-username').value.trim();
      const email    = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirm  = document.getElementById('register-password-confirm').value;

      if (!username || !email || !password || !confirm) { showError('register-error', 'Remplis tous les champs.'); return; }
      if (password.length < 6) { showError('register-error', 'Mot de passe trop court (6 caractères min).'); return; }
      if (password !== confirm) { showError('register-error', 'Les mots de passe ne correspondent pas.'); return; }

      setLoading('btn-register', true);

      try {
        if (App.supabase) {
          const { data, error } = await App.supabase.auth.signUp({ email, password });
          if (error) throw error;

          // Sauvegarde le pseudo en attendant la confirmation
          App.local.set('pending_username', username);

          if (!data.session) {
            // Confirmation email requise → ne pas aller à l'onboarding
            showError('register-error', `📧 Un email de confirmation a été envoyé à ${email}. Vérifie ta boîte mail puis connecte-toi.`);
            return;
          }

          App.state.user = data.user;
          await afterAuth(data.user, username);
        } else {
          // Mode local
          const user = { id: 'local_' + Date.now(), email, username };
          App.local.set('user', user);
          App.state.user = user;
          await afterAuth(user, username);
        }
      } catch (err) {
        showError('register-error', translateError(err.message));
      } finally {
        setLoading('btn-register', false);
      }
    });
  }

  /* ─── Après auth réussie ─────────────────────────────── */
  async function afterAuth(user, username) {
    // Charge le profil
    const profile = await loadProfile(user.id);

    if (profile) {
      App.state.profile = profile;
      if (window.Sync) await window.Sync.loginSync();
      window.App.navigate('app');
      window.App.switchTab('today');
      window.App.refreshApp();
    } else {
      // Première connexion → onboarding
      if (username) {
        App.local.set('pending_username', username);
      }
      window.App.navigate('onboarding');
    }
  }

  /* ─── Charge le profil depuis Supabase ou local ──────── */
  async function loadProfile(userId) {
    if (App.supabase && userId && !userId.startsWith('local_')) {
      const { data } = await App.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        if (!data.username) {
          // Trigger created an empty row — check if onboarding data is in localStorage
          const localProfile = App.local.get('profile');
          if (localProfile?.username) {
            const merged = { ...localProfile, id: userId };
            await App.supabase.from('profiles').upsert(merged);
            App.local.set('profile', merged);
            return merged;
          }
          return null; // no username anywhere → send to onboarding
        }
        App.local.set('profile', data); // keep local in sync
        return data;
      }
      return null;
    }
    return App.local.get('profile');
  }

  /* ─── LOGOUT ─────────────────────────────────────────── */
  async function logout() {
    if (App.supabase) await App.supabase.auth.signOut();
    App.state.user    = null;
    App.state.profile = null;
    App.state.sessions = [];
    App.state.badges  = [];
    window.App.navigate('auth');
  }

  /* ─── Session persistante (démarrage app) ────────────── */
  async function checkSession() {
    // Détecte le flux de réinitialisation de mot de passe
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'recovery' && params.get('token_hash') && App.supabase) {
      try {
        const { data } = await App.supabase.auth.verifyOtp({
          token_hash: params.get('token_hash'),
          type: 'recovery',
        });
        if (data?.session) {
          App.state.user = data.session.user;
          // Pré-remplit l'email sur la page reset
          const emailEl = document.getElementById('reset-email');
          if (emailEl) emailEl.value = data.session.user.email;
        }
      } catch(e) {
        console.warn('Recovery token exchange failed:', e.message);
      }
      return 'reset';
    }

    // Vérifie session Supabase
    if (App.supabase) {
      try {
        const { data } = await App.supabase.auth.getSession();
        if (data?.session?.user) {
          App.state.user = data.session.user;
          const profile = await loadProfile(data.session.user.id);
          if (profile) {
            App.state.profile = profile;
            if (window.Sync) await window.Sync.loginSync();
            return 'app';
          }
          return 'onboarding';
        }
      } catch(e) {
        console.warn('Supabase session check failed, fallback local:', e.message);
      }
    }

    // Fallback : session locale (localStorage)
    const user = App.local.get('user');
    if (user) {
      App.state.user = user;
      const profile = App.local.get('profile');
      if (profile) {
        App.state.profile = profile;
        return 'app';
      }
      return 'onboarding';
    }

    return 'auth';
  }

  /* ─── Traduction des erreurs Supabase ────────────────── */
  function translateError(msg) {
    if (!msg) return 'Une erreur est survenue.';
    if (msg.includes('Invalid login credentials'))  return 'Email ou mot de passe incorrect.';
    if (msg.includes('Email not confirmed'))         return 'Confirme ton email avant de te connecter.';
    if (msg.includes('User already registered'))     return 'Cet email est déjà utilisé.';
    if (msg.includes('Password should be'))          return 'Mot de passe trop court (6 caractères min).';
    if (msg.includes('Unable to validate'))          return 'Session expirée, reconnecte-toi.';
    return msg;
  }

  /* ─── Reset password (depuis email) ─────────────────── */
  function initPasswordRecovery() {
    // Écoute l'événement Supabase PASSWORD_RECOVERY
    if (App.supabase) {
      App.supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          window.App.navigate('reset');
        }
      });
    }

    // Formulaire nouveau mot de passe
    document.getElementById('form-reset')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('reset-password').value;
      const confirm  = document.getElementById('reset-password-confirm').value;

      if (password.length < 6) { showError('reset-error', 'Mot de passe trop court (6 caractères min).'); return; }
      if (password !== confirm) { showError('reset-error', 'Les mots de passe ne correspondent pas.'); return; }

      setLoading('btn-reset', true);
      try {
        const { error } = await App.supabase.auth.updateUser({ password });
        if (error) throw error;
        showError('reset-error', '');
        // Retour à la connexion
        window.App.navigate('auth');
        showError('login-error', '✅ Mot de passe mis à jour ! Connecte-toi.');
      } catch (err) {
        showError('reset-error', translateError(err.message));
      } finally {
        setLoading('btn-reset', false);
      }
    });
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    initAuthTabs();
    initLogin();
    initRegister();
    initForgotPassword();
    initPasswordRecovery();

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      logout();
    });
  }

  return { init, checkSession, logout, loadProfile };

})();
