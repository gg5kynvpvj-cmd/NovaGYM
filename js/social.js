/* ═══════════════════════════════════════════════════════════
   NovaGYM — Social / Communauté
   Recherche, demandes d'amis, liste d'amis, profil public
   ═══════════════════════════════════════════════════════════ */

window.Social = (() => {

  const CREATOR_USERNAMES = ['Julien_c2', 'LeGuinon', 'N0 C4P'];

  let friends         = [];
  let pendingReceived = [];
  let pendingSent     = [];
  let searchDebounce  = null;
  let _anonClient     = null;

  /* ─── Helpers ─────────────────────────────────────── */
  const uid = () => App.state.user?.id;

  function getAnonClient() {
    if (!_anonClient && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON !== 'undefined') {
      _anonClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return _anonClient;
  }

  function avatarEl(url, username) {
    const l = (username || '?').charAt(0).toUpperCase();
    if (url) return `<img src="${url}" class="social-avatar" alt="${l}">`;
    return `<div class="social-avatar social-avatar-letter">${l}</div>`;
  }

  function friendProfile(f) {
    return f.requester_id === uid() ? f.addressee : f.requester;
  }

  /* ─── Chargement des amitiés ──────────────────────── */
  async function loadFriendships() {
    if (!App.supabase || !uid()) return;

    const { data } = await App.supabase
      .from('friendships')
      .select('id, status, requester_id, addressee_id, created_at')
      .or(`requester_id.eq.${uid()},addressee_id.eq.${uid()}`);

    if (!data || data.length === 0) {
      friends = pendingReceived = pendingSent = [];
      return;
    }

    // Charge les profils des autres via le client authentifié
    const otherIds = [...new Set(
      data.flatMap(f => [f.requester_id, f.addressee_id]).filter(id => id !== uid())
    )];

    let profileMap = {};
    if (otherIds.length > 0) {
      try {
        const { data: profiles } = await App.supabase
          .from('profiles')
          .select('id, username, avatar_url, goal, program_type, level, visibility, displayed_badges, best_performance, bio')
          .in('id', otherIds);
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      } catch { }
    }

    const enriched = data.map(f => ({
      ...f,
      requester: profileMap[f.requester_id] || { id: f.requester_id, username: '?' },
      addressee: profileMap[f.addressee_id] || { id: f.addressee_id, username: '?' },
    }));

    friends         = enriched.filter(f => f.status === 'accepted');
    pendingReceived = enriched.filter(f => f.status === 'pending' && f.addressee_id === uid());
    pendingSent     = enriched.filter(f => f.status === 'pending' && f.requester_id === uid());
  }

  /* ─── Actions Supabase ────────────────────────────── */
  async function sendRequest(addresseeId) {
    if (!App.supabase) return;
    const { error } = await App.supabase.from('friendships').insert({
      requester_id: uid(),
      addressee_id: addresseeId,
    });
    if (error) console.warn('sendRequest:', error.message);
    await loadFriendships();
    renderAll();
  }

  async function acceptRequest(friendshipId) {
    if (!App.supabase) return;
    await App.supabase.from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    await loadFriendships();
    renderAll();
  }

  async function deleteRelation(friendshipId) {
    if (!App.supabase) return;
    await App.supabase.from('friendships').delete().eq('id', friendshipId);
    await loadFriendships();
    renderAll();
  }

  /* ─── Rendu ───────────────────────────────────────── */
  function renderPending() {
    const section = document.getElementById('social-pending-section');
    const list    = document.getElementById('social-pending-list');
    if (!section || !list) return;
    section.classList.toggle('hidden', pendingReceived.length === 0);
    list.innerHTML = pendingReceived.map(f => `
      <div class="social-request-card">
        ${avatarEl(f.requester.avatar_url, f.requester.username)}
        <span class="social-card-name">${f.requester.username}</span>
        <div class="social-card-actions">
          <button class="btn-soc btn-soc-accept" data-id="${f.id}">${I18n.t('social.accept')}</button>
          <button class="btn-soc btn-soc-decline" data-id="${f.id}">${I18n.t('social.decline')}</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.btn-soc-accept').forEach(b =>
      b.addEventListener('click', () => acceptRequest(b.dataset.id)));
    list.querySelectorAll('.btn-soc-decline').forEach(b =>
      b.addEventListener('click', () => deleteRelation(b.dataset.id)));
  }

  function renderSent() {
    const section = document.getElementById('social-sent-section');
    const list    = document.getElementById('social-sent-list');
    if (!section || !list) return;
    section.classList.toggle('hidden', pendingSent.length === 0);
    list.innerHTML = pendingSent.map(f => `
      <div class="social-request-card">
        ${avatarEl(f.addressee.avatar_url, f.addressee.username)}
        <span class="social-card-name">${f.addressee.username}</span>
        <span class="social-badge-pending">${I18n.t('social.pending_sent')}</span>
        <button class="btn-soc btn-soc-cancel" data-id="${f.id}">${I18n.t('social.cancel_request')}</button>
      </div>
    `).join('');
    list.querySelectorAll('.btn-soc-cancel').forEach(b =>
      b.addEventListener('click', async () => {
        if (confirm(I18n.t('social.confirm_cancel'))) await deleteRelation(b.dataset.id);
      }));
  }

  function renderFriends() {
    const list = document.getElementById('social-friends-list');
    if (!list) return;
    if (friends.length === 0) {
      list.innerHTML = `<p class="social-empty">${I18n.t('social.friends_empty')}</p>`;
      return;
    }
    list.innerHTML = friends.map(f => {
      const p = friendProfile(f);
      return `
        <div class="social-friend-card">
          ${avatarEl(p.avatar_url, p.username)}
          <div class="social-friend-info">
            <span class="social-card-name">${p.username}</span>
          </div>
          <button class="btn-soc btn-soc-view" data-id="${f.id}" data-name="${p.username}">
            ${I18n.t('social.view_profile')}
          </button>
        </div>
      `;
    }).join('');
    list.querySelectorAll('.btn-soc-view').forEach(b =>
      b.addEventListener('click', () => openProfile(b.dataset.id, b.dataset.name)));
  }

  function renderAll() {
    renderPending();
    renderSent();
    renderFriends();
  }

  /* ─── Créateurs NovaGYM ──────────────────────────── */
  async function loadCreators() {
    const section = document.getElementById('social-creators-section');
    if (!section) return;
    if (!App.supabase) return;

    try {
      const { data } = await App.supabase
        .from('profiles')
        .select('id, username, avatar_url, bio, visibility, displayed_badges, best_performance')
        .in('username', CREATOR_USERNAMES);
      if (!data || data.length === 0) return;

      // Sort by CREATOR_USERNAMES order
      const sorted = CREATOR_USERNAMES
        .map(u => data.find(p => p.username === u))
        .filter(Boolean);

      renderCreators(sorted);
      section.classList.remove('hidden');
    } catch { /* silently ignore */ }
  }

  function renderCreators(profiles) {
    const list = document.getElementById('social-creators-list');
    if (!list) return;
    list.innerHTML = profiles.map(p => {
      const av = p.avatar_url
        ? `<img src="${p.avatar_url}" class="social-creator-avatar" alt="${p.username}">`
        : `<div class="social-creator-avatar-letter">${(p.username || '?').charAt(0).toUpperCase()}</div>`;
      return `
        <div class="social-creator-card" data-creator-id="${p.id}">
          ${av}
          <span class="social-creator-name">${p.username || ''}</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.social-creator-card').forEach(card => {
      const profile = profiles.find(p => p.id === card.dataset.creatorId);
      if (profile) card.addEventListener('click', () => openPublicProfile(profile));
    });
  }

  async function openPublicProfile(profile) {
    const content = document.getElementById('friend-profile-content');
    if (!content) return;

    const avatarHtml = profile.avatar_url
      ? `<div class="fp-avatar"><img src="${profile.avatar_url}" alt="${profile.username}"></div>`
      : `<div class="fp-avatar">${(profile.username || '?').charAt(0).toUpperCase()}</div>`;

    let html = `
      <div class="fp-header">
        ${avatarHtml}
        <p class="fp-username">${profile.username || ''}</p>
      </div>
    `;

    const vis = profile.visibility || 'private';
    if (vis === 'private') {
      html += `<p class="fp-private">${I18n.t('profile.private_msg')}</p>`;
    } else {
      const displayedIds = Array.isArray(profile.displayed_badges) ? profile.displayed_badges : [];
      const badgeDefs    = displayedIds.filter(Boolean).map(id => (Badges.ALL_BADGES || []).find(b => b.id === id)).filter(Boolean);
      const bestPerf     = profile.best_performance || null;
      const bio          = profile.bio || '';

      if (badgeDefs.length > 0) {
        html += `
          <div class="fp-section">
            <p class="fp-section-title">${I18n.t('profile.badges_section')}</p>
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
      if (bio) {
        html += `
          <div class="fp-section">
            <p class="fp-bio">${bio.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
        `;
      }
      if (bestPerf && bestPerf.value) {
        const locale = window.I18n && I18n.lang === 'fr' ? 'fr-FR' : 'en-US';
        const lang   = window.I18n ? I18n.lang : 'fr';
        const label  = lang === 'fr' ? (bestPerf.label_fr || bestPerf.type) : (bestPerf.label_en || bestPerf.type);
        const dateStr = bestPerf.date ? new Date(bestPerf.date).toLocaleDateString(locale) : '';
        html += `
          <div class="fp-section">
            <p class="fp-section-title">${I18n.t('profile.perf_section')}</p>
            <div class="friend-perf-card">
              <span class="friend-perf-icon">${bestPerf.icon || '🏆'}</span>
              <div class="friend-perf-info">
                <span class="friend-perf-label">${label}</span>
                <span class="friend-perf-value">${bestPerf.value}${dateStr ? ' · ' + dateStr : ''}</span>
              </div>
            </div>
          </div>
        `;
      }
      if (badgeDefs.length === 0 && !bestPerf && !bio) {
        html += `<p class="social-empty" style="margin-top:16px">${I18n.t('profile.nothing_shared')}</p>`;
      }
      html += `<div id="fp-shared-workouts-section"></div>`;
    }

    content.innerHTML = html;

    content.querySelectorAll('.fp-badge-item').forEach(el => {
      el.addEventListener('click', () => showBadgeZoom(el.dataset.badgeId));
    });

    // Remove friend button: show only if already friends
    const isFriend      = friends.some(f => friendProfile(f).id === profile.id);
    const removeFriendBtn = document.getElementById('btn-remove-friend');
    if (removeFriendBtn) {
      if (isFriend) {
        const f = friends.find(f => friendProfile(f).id === profile.id);
        removeFriendBtn.dataset.id = f?.id || '';
        removeFriendBtn.classList.remove('hidden');
      } else {
        removeFriendBtn.classList.add('hidden');
      }
    }

    const dmBtn = document.getElementById('btn-send-dm');
    if (dmBtn) {
      dmBtn.dataset.uid      = profile.id;
      dmBtn.dataset.username = profile.username || '?';
      dmBtn.dataset.avatar   = profile.avatar_url || '';
    }

    document.getElementById('modal-friend-profile')?.classList.remove('hidden');

    // Load shared workouts async
    if (vis !== 'private' && App.supabase && profile.id) {
      const section = document.getElementById('fp-shared-workouts-section');
      if (section) {
        const tStr = k => (window.I18n ? I18n.t(k) : k);
        const { data: sharedWorkouts } = await App.supabase
          .from('shared_workouts')
          .select('id, name, exercises')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(8);
        if (sharedWorkouts?.length > 0) {
          section.innerHTML = `
            <div class="fp-section">
              <p class="fp-section-title">${tStr('profile.shared_workouts')}</p>
              ${sharedWorkouts.map(w => `
                <div class="fp-workout-card" data-wid="${w.id}">
                  <div class="fp-workout-info">
                    <span class="fp-workout-name">${w.name}</span>
                    <span class="fp-workout-meta">${(w.exercises || []).length} ex.</span>
                  </div>
                  <button class="fp-workout-copy" data-wid="${w.id}" data-wname="${(w.name || '').replace(/"/g, '&quot;')}">${tStr('profile.copy_workout')}</button>
                </div>
              `).join('')}
            </div>`;
          section.querySelectorAll('.fp-workout-copy').forEach(btn => {
            btn.addEventListener('click', async () => {
              const wname = btn.dataset.wname || 'Séance';
              const wid   = btn.dataset.wid;
              const { data: w } = await App.supabase
                .from('shared_workouts').select('exercises').eq('id', wid).single();
              if (!w) return;
              const newName = prompt(tStr('profile.copy_name_prompt'), wname);
              if (!newName?.trim()) return;
              const lib = App.local.get('workout_library') || [];
              lib.unshift({ id: Date.now(), name: newName.trim(), exercises: w.exercises || [] });
              App.local.set('workout_library', lib);
              alert(tStr('profile.workout_copied'));
            });
          });
        }
      }
    }
  }

  /* ─── Recherche ───────────────────────────────────── */
  function initSearch() {
    const input   = document.getElementById('social-search-input');
    const results = document.getElementById('social-search-results');
    if (!input || !results) return;

    input.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      const q = input.value.trim();
      if (q.length < 2) { results.classList.add('hidden'); results.innerHTML = ''; return; }

      searchDebounce = setTimeout(async () => {
        try {
          if (!App.supabase) {
            results.innerHTML = `<div class="social-search-empty">Client non initialisé</div>`;
            results.classList.remove('hidden');
            return;
          }
          const { data, error } = await App.supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .ilike('username', `%${q}%`)
            .limit(8);
          if (error) {
            console.warn('Search error:', error.message);
            results.innerHTML = `<div class="social-search-empty">Erreur : ${error.message}</div>`;
            results.classList.remove('hidden');
            return;
          }
          const users = data || [];
          const filtered = users.filter(u => u.id !== uid());

          if (filtered.length === 0) {
            results.innerHTML = `<div class="social-search-empty">${I18n.t('social.no_results')}</div>`;
            results.classList.remove('hidden');
            return;
          }

          results.innerHTML = filtered.map(u => {
            const isFriend   = friends.some(f => friendProfile(f).id === u.id);
            const isSent     = pendingSent.some(f => f.addressee_id === u.id);
            const recvF      = pendingReceived.find(f => f.requester_id === u.id);

            let btn = '';
            if (isFriend)    btn = `<span class="social-badge-friends">${I18n.t('social.already_friends')}</span>`;
            else if (isSent) btn = `<span class="social-badge-pending">${I18n.t('social.pending_sent')}</span>`;
            else if (recvF)  btn = `<button class="btn-soc btn-soc-accept" data-id="${recvF.id}">${I18n.t('social.accept')}</button>`;
            else             btn = `<button class="btn-soc btn-soc-add" data-user-id="${u.id}">${I18n.t('social.add_friend')}</button>`;

            return `
              <div class="social-search-item">
                ${avatarEl(u.avatar_url, u.username)}
                <span class="social-card-name">${u.username}</span>
                <div class="social-search-action">${btn}</div>
              </div>
            `;
          }).join('');

          results.classList.remove('hidden');

          results.querySelectorAll('.btn-soc-add').forEach(b =>
            b.addEventListener('click', async () => {
              b.textContent = '...'; b.disabled = true;
              await sendRequest(b.dataset.userId);
              input.dispatchEvent(new Event('input'));
            }));
          results.querySelectorAll('.btn-soc-accept').forEach(b =>
            b.addEventListener('click', async () => {
              await acceptRequest(b.dataset.id);
              input.dispatchEvent(new Event('input'));
            }));

        } catch { results.classList.add('hidden'); }
      }, 380);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.add('hidden');
      }
    }, true);
  }

  /* ─── Modal profil ami ────────────────────────────── */
  async function openProfile(friendshipId) {
    const removeFriendBtn = document.getElementById('btn-remove-friend');
    if (removeFriendBtn) {
      removeFriendBtn.dataset.id = friendshipId;
      removeFriendBtn.classList.remove('hidden');
    }

    const f = friends.find(f => f.id === friendshipId);
    const p = f ? friendProfile(f) : null;
    const content = document.getElementById('friend-profile-content');
    if (!content) return;
    if (!p) { content.innerHTML = ''; document.getElementById('modal-friend-profile')?.classList.remove('hidden'); return; }

    const avatarHtml = p.avatar_url
      ? `<div class="fp-avatar"><img src="${p.avatar_url}" alt="${p.username}"></div>`
      : `<div class="fp-avatar">${(p.username || '?').charAt(0).toUpperCase()}</div>`;

    let html = `
      <div class="fp-header">
        ${avatarHtml}
        <p class="fp-username">${p.username || ''}</p>
      </div>
    `;

    const vis = p.visibility || 'private';

    if (vis === 'private') {
      html += `<p class="fp-private">${I18n.t('profile.private_msg')}</p>`;
    } else {
      const displayedIds = Array.isArray(p.displayed_badges) ? p.displayed_badges : [];
      const badgeDefs    = displayedIds.filter(Boolean).map(id => (Badges.ALL_BADGES || []).find(b => b.id === id)).filter(Boolean);
      const bestPerf     = p.best_performance || null;
      const bio          = p.bio || '';

      if (badgeDefs.length > 0) {
        html += `
          <div class="fp-section">
            <p class="fp-section-title">${I18n.t('profile.badges_section')}</p>
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

      if (bio) {
        html += `
          <div class="fp-section">
            <p class="fp-bio">${bio.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
        `;
      }

      if (bestPerf && bestPerf.value) {
        const locale  = window.I18n && I18n.lang === 'fr' ? 'fr-FR' : 'en-US';
        const lang    = window.I18n ? I18n.lang : 'fr';
        const label   = lang === 'fr' ? (bestPerf.label_fr || bestPerf.type) : (bestPerf.label_en || bestPerf.type);
        const dateStr = bestPerf.date ? new Date(bestPerf.date).toLocaleDateString(locale) : '';
        html += `
          <div class="fp-section">
            <p class="fp-section-title">${I18n.t('profile.perf_section')}</p>
            <div class="friend-perf-card">
              <span class="friend-perf-icon">${bestPerf.icon || '🏆'}</span>
              <div class="friend-perf-info">
                <span class="friend-perf-label">${label}</span>
                <span class="friend-perf-value">${bestPerf.value}${dateStr ? ' · ' + dateStr : ''}</span>
              </div>
            </div>
          </div>
        `;
      }

      if (badgeDefs.length === 0 && !bestPerf && !bio) {
        html += `<p class="social-empty" style="margin-top:16px">${I18n.t('profile.nothing_shared')}</p>`;
      }
      // Placeholder for shared workouts (loaded async below)
      html += `<div id="fp-shared-workouts-section"></div>`;
    }

    content.innerHTML = html;

    // Clic badge → zoom
    content.querySelectorAll('.fp-badge-item').forEach(el => {
      el.addEventListener('click', () => showBadgeZoom(el.dataset.badgeId));
    });

    // Charge les séances partagées en asynchrone
    if (vis !== 'private' && App.supabase && p.id) {
      const section = document.getElementById('fp-shared-workouts-section');
      if (section) {
        const tStr = k => (window.I18n ? I18n.t(k) : k);
        const { data: sharedWorkouts } = await App.supabase
          .from('shared_workouts')
          .select('id, name, exercises')
          .eq('user_id', p.id)
          .order('created_at', { ascending: false })
          .limit(8);
        if (sharedWorkouts?.length > 0) {
          section.innerHTML = `
            <div class="fp-section">
              <p class="fp-section-title">${tStr('profile.shared_workouts')}</p>
              ${sharedWorkouts.map(w => `
                <div class="fp-workout-card" data-wid="${w.id}">
                  <div class="fp-workout-info">
                    <span class="fp-workout-name">${w.name}</span>
                    <span class="fp-workout-meta">${(w.exercises || []).length} ex.</span>
                  </div>
                  <button class="fp-workout-copy" data-wid="${w.id}" data-wname="${(w.name || '').replace(/"/g, '&quot;')}">${tStr('profile.copy_workout')}</button>
                </div>
              `).join('')}
            </div>`;
          section.querySelectorAll('.fp-workout-copy').forEach(btn => {
            btn.addEventListener('click', async () => {
              const wname = btn.dataset.wname || 'Séance';
              const wid   = btn.dataset.wid;
              const { data: w } = await App.supabase
                .from('shared_workouts').select('exercises').eq('id', wid).single();
              if (!w) return;
              const newName = prompt(tStr('profile.copy_name_prompt'), wname);
              if (!newName?.trim()) return;
              const lib = App.local.get('workout_library') || [];
              lib.unshift({ id: Date.now(), name: newName.trim(), exercises: w.exercises || [] });
              App.local.set('workout_library', lib);
              alert(tStr('profile.workout_copied'));
            });
          });
        }
      }
    }

    // Bouton "Envoyer un message"
    const dmBtn = document.getElementById('btn-send-dm');
    if (dmBtn) {
      dmBtn.dataset.uid      = p.id;
      dmBtn.dataset.username = p.username || '?';
      dmBtn.dataset.avatar   = p.avatar_url || '';
    }

    document.getElementById('modal-friend-profile')?.classList.remove('hidden');
  }

  function showBadgeZoom(badgeId) {
    const overlay = document.getElementById('badge-zoom-overlay');
    if (!overlay) return;
    const name = window.I18n ? I18n.t('badge.' + badgeId + '.name') : badgeId;
    const desc = window.I18n ? I18n.t('badge.' + badgeId + '.desc') : '';
    document.getElementById('badge-zoom-img').src = Badges.img(badgeId);
    document.getElementById('badge-zoom-name').textContent = name;
    document.getElementById('badge-zoom-desc').textContent = desc;
    overlay.classList.remove('hidden');
  }

  /* ─── Init ───────────────────────────────────────── */
  function init() {
    document.getElementById('btn-close-friend-profile')?.addEventListener('click', () => {
      document.getElementById('modal-friend-profile')?.classList.add('hidden');
    });
    document.getElementById('modal-friend-profile')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('badge-zoom-overlay')?.addEventListener('click', () => {
      document.getElementById('badge-zoom-overlay').classList.add('hidden');
    });
    document.getElementById('btn-remove-friend')?.addEventListener('click', async function() {
      if (!confirm(I18n.t('social.confirm_remove'))) return;
      await deleteRelation(this.dataset.id);
      document.getElementById('modal-friend-profile')?.classList.add('hidden');
    });

    document.getElementById('btn-send-dm')?.addEventListener('click', function() {
      const { uid, username, avatar } = this.dataset;
      if (!uid || !window.DM) return;
      document.getElementById('modal-friend-profile')?.classList.add('hidden');
      DM.openDM(uid, { id: uid, username: username || '?', avatar_url: avatar || null });
    });

    initSearch();
  }

  function showOfflineBanner(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;
    if (page.querySelector('.offline-banner')) return;
    const el = document.createElement('div');
    el.className = 'offline-banner';
    el.innerHTML = `<span class="offline-banner-icon">📶</span>
      <span data-i18n="offline.social">${I18n?.t?.('offline.social') || 'Connexion requise pour le social'}</span>`;
    page.prepend(el);
  }

  function removeOfflineBanner(pageId) {
    document.getElementById(pageId)?.querySelector('.offline-banner')?.remove();
  }

  async function render() {
    if (!App.state.user) return;
    if (!navigator.onLine) { showOfflineBanner('page-social'); return; }
    removeOfflineBanner('page-social');
    await loadFriendships();
    renderAll();
    loadCreators();
  }

  return { init, render };

})();
