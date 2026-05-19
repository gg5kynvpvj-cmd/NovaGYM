/* ═══════════════════════════════════════════════════════════
   NovaGYM — Groupes & Défis
   Création, gestion membres, classement, défis de groupe
   ═══════════════════════════════════════════════════════════ */

window.Groups = (() => {

  let myGroups        = [];
  let pendingInvites  = [];
  let currentGroup    = null;
  let currentMembers  = [];
  let currentChallenges = [];
  let currentProgress = {};   // { challengeId: { userId: value } }
  let _anonClient     = null;

  // Chat state
  let chatMessages    = [];
  let chatChannel     = null;
  let chatGroupId     = null;
  let _pendingSession = null;

  /* ─── Types de défis ─────────────────────────────────── */
  const CHALLENGE_TYPES = [
    { id: 'sessions',  icon: Icons.s('dumbbell', 20), fr: 'Séances',      en: 'Sessions',    ufr: 'séances', uen: 'sessions' },
    { id: 'volume',    icon: Icons.s('layers',   20), fr: 'Volume total',  en: 'Total volume', ufr: 'kg',     uen: 'kg' },
    { id: 'hydration', icon: Icons.s('droplet',  20), fr: 'Hydratation',  en: 'Hydration',   ufr: 'L',       uen: 'L' },
    { id: 'cardio',    icon: Icons.s('activity', 20), fr: 'Cardio',       en: 'Cardio',      ufr: 'km',      uen: 'km' },
    { id: 'calories',  icon: Icons.s('flame',    20), fr: 'Calories',     en: 'Calories',    ufr: 'cal',     uen: 'cal' },
  ];

  /* ─── Helpers ────────────────────────────────────────── */
  const uid  = () => App.state.user?.id;
  const lang = () => (window.I18n ? I18n.lang : 'fr');
  const t    = k  => (window.I18n ? I18n.t(k) : k);

  function getAnonClient() {
    if (!_anonClient && window.supabase && typeof SUPABASE_URL !== 'undefined') {
      _anonClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return _anonClient;
  }

  function ctInfo(typeId) { return CHALLENGE_TYPES.find(c => c.id === typeId) || CHALLENGE_TYPES[0]; }
  function unit(typeId)   { const c = ctInfo(typeId); return lang() === 'fr' ? c.ufr : c.uen; }
  function today()        { return new Date().toISOString().slice(0, 10); }

  function avatarDiv(avatarUrl, name, cls = 'grp-avatar') {
    const letter = (name || '?').charAt(0).toUpperCase();
    if (avatarUrl) return `<img src="${avatarUrl}" class="${cls}" alt="${letter}">`;
    return `<div class="${cls}">${letter}</div>`;
  }

  /* ─── Chargement groupes & invitations ──────────────── */
  async function loadGroups() {
    if (!App.supabase || !uid()) return;

    const { data: memberships } = await App.supabase
      .from('group_members')
      .select('id, group_id, role, status, invited_by')
      .eq('user_id', uid());

    if (!memberships) return;

    const activeIds = memberships.filter(m => m.status === 'active').map(m => m.group_id);
    const inviteIds = memberships.filter(m => m.status === 'invited').map(m => m.group_id);

    // Groupes actifs
    if (activeIds.length > 0) {
      const { data: groups } = await App.supabase
        .from('groups')
        .select('*')
        .in('id', activeIds);

      myGroups = await Promise.all((groups || []).map(async g => {
        const mb = memberships.find(m => m.group_id === g.id);
        const { count } = await App.supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
          .eq('status', 'active');
        return { ...g, role: mb?.role || 'member', member_count: count || 0 };
      }));
    } else {
      myGroups = [];
    }

    // Invitations
    if (inviteIds.length > 0) {
      const { data: invGroups } = await App.supabase
        .from('groups')
        .select('*')
        .in('id', inviteIds);

      const inviterIds = [...new Set(
        memberships.filter(m => m.status === 'invited' && m.invited_by).map(m => m.invited_by)
      )];
      let inviterMap = {};
      if (inviterIds.length > 0) {
        const { data: profiles } = await App.supabase
          .from('profiles').select('id, username, avatar_url').in('id', inviterIds);
        if (profiles) inviterMap = Object.fromEntries(profiles.map(p => [p.id, p]));
      }

      pendingInvites = (invGroups || []).map(g => {
        const mb = memberships.find(m => m.group_id === g.id && m.status === 'invited');
        return { ...g, inviter: inviterMap[mb?.invited_by] || null, membership_id: mb?.id };
      });
    } else {
      pendingInvites = [];
    }
  }

  /* ─── Chargement détails groupe ─────────────────────── */
  async function loadGroupDetails(groupId) {
    if (!App.supabase) return;

    // Membres actifs
    const { data: members } = await App.supabase
      .from('group_members')
      .select('id, user_id, role, status, joined_at')
      .eq('group_id', groupId)
      .eq('status', 'active');

    const memberIds = (members || []).map(m => m.user_id);
    let profileMap = {};
    if (memberIds.length > 0 && App.supabase) {
      const { data: profiles } = await App.supabase
        .from('profiles')
        .select('id, username, avatar_url, best_performance, displayed_badges')
        .in('id', memberIds);
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    }

    currentMembers = (members || []).map(m => ({
      ...m, profile: profileMap[m.user_id] || { id: m.user_id, username: '?' },
    }));

    // Défis
    const { data: challenges } = await App.supabase
      .from('group_challenges')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    currentChallenges = challenges || [];

    // Progression des défis actifs
    const activeChallengeIds = currentChallenges.filter(c => c.end_date >= today()).map(c => c.id);
    currentProgress = {};
    if (activeChallengeIds.length > 0) {
      const { data: progress } = await App.supabase
        .from('group_challenge_progress')
        .select('*')
        .in('challenge_id', activeChallengeIds);

      (progress || []).forEach(p => {
        if (!currentProgress[p.challenge_id]) currentProgress[p.challenge_id] = {};
        currentProgress[p.challenge_id][p.user_id] = Number(p.value);
      });
    }
  }

  /* ─── Photo de groupe ───────────────────────────────── */
  function renderBannerAvatar(group, isOwner) {
    const el = document.getElementById('grp-banner-avatar');
    if (!el) return;
    if (group.cover_url) {
      el.innerHTML = `<img src="${group.cover_url}" alt="${group.name}" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`;
    } else {
      el.textContent = group.name.charAt(0).toUpperCase();
    }
    el.classList.toggle('grp-banner-avatar-owner', isOwner);
  }

  async function uploadGroupCover(file) {
    if (!App.supabase || !currentGroup) return;
    const el = document.getElementById('grp-banner-avatar');
    if (el) { el.style.opacity = '0.5'; }
    const path = `${currentGroup.id}/cover.jpg`;
    const { error: upErr } = await App.supabase.storage
      .from('groups').upload(path, file, { upsert: true, contentType: file.type });
    if (el) { el.style.opacity = ''; }
    if (upErr) {
      alert('Erreur upload : ' + upErr.message);
      return;
    }
    const { data: urlData } = App.supabase.storage.from('groups').getPublicUrl(path);
    const coverUrl = urlData.publicUrl + '?t=' + Date.now();
    await App.supabase.from('groups').update({ cover_url: coverUrl }).eq('id', currentGroup.id);
    currentGroup.cover_url = coverUrl;
    const grpInList = myGroups.find(g => g.id === currentGroup.id);
    if (grpInList) grpInList.cover_url = coverUrl;
    renderBannerAvatar(currentGroup, true);
  }

  /* ─── Ouvrir page groupe ─────────────────────────────── */
  async function openGroup(groupId) {
    currentGroup = myGroups.find(g => g.id === groupId);
    if (!currentGroup) return;
    currentMembers = [];
    currentChallenges = [];
    currentProgress = {};
    if (chatGroupId && chatGroupId !== groupId) unsubscribeFromChat();

    // Reset tab to ranking
    document.querySelectorAll('.grp-tab').forEach(tb => tb.classList.toggle('active', tb.dataset.tab === 'ranking'));

    App.navigate('group');
    renderGroupPage();               // Show skeleton immediately

    await loadGroupDetails(groupId);
    renderGroupPage();               // Re-render with data
  }

  /* ─── Rendu page groupe ──────────────────────────────── */
  function renderGroupPage() {
    if (!currentGroup) return;

    // Header
    document.getElementById('grp-header-name').textContent = currentGroup.name;
    const cnt = currentMembers.length || currentGroup.member_count || 0;
    document.getElementById('grp-header-count').textContent = cnt + ' membre' + (cnt !== 1 ? 's' : '');

    // Banner avatar / cover
    const isOwner = currentGroup.created_by === uid() || currentGroup.role === 'owner';
    renderBannerAvatar(currentGroup, isOwner);
    document.getElementById('grp-banner-name').textContent = currentGroup.name;
    const descEl = document.getElementById('grp-banner-desc');
    if (descEl) descEl.textContent = currentGroup.description || '';

    // Bouton paramètres : visible uniquement pour le propriétaire
    document.getElementById('btn-grp-settings')?.classList.toggle('hidden', !isOwner);

    // Render onglet actif
    const activeTab = document.querySelector('.grp-tab.active')?.dataset.tab || 'ranking';
    renderGroupTab(activeTab);
  }

  function renderGroupTab(tab) {
    ['ranking', 'challenges', 'members', 'chat'].forEach(name => {
      document.getElementById('grp-tab-' + name)?.classList.toggle('hidden', name !== tab);
    });
    document.getElementById('grp-chat-bar')?.classList.toggle('hidden', tab !== 'chat');

    if (tab === 'ranking')    renderRankingTab();
    if (tab === 'challenges') renderChallengesTab();
    if (tab === 'members')    renderMembersTab();
    if (tab === 'chat') {
      if (chatGroupId !== currentGroup?.id) {
        loadMessages(currentGroup.id);
        subscribeToChat(currentGroup.id);
      } else {
        scrollChatToBottom();
      }
    }
  }

  /* ─── Onglet Classement ──────────────────────────────── */
  function renderRankingTab() {
    const container = document.getElementById('grp-tab-ranking');
    if (!container) return;

    const activeChallenge = currentChallenges.find(c => c.end_date >= today());

    if (!activeChallenge) {
      const isOwner = currentGroup.created_by === uid() || currentGroup.role === 'owner';
      container.innerHTML = `
        <div class="grp-empty-state">
          <p class="grp-empty-icon">${Icons.s('trophy', 40)}</p>
          <p class="grp-empty-text">${t('group.no_active_challenge')}</p>
          ${isOwner ? `<button class="btn-soc btn-soc-add" id="btn-ranking-new-challenge">${t('group.create_challenge')}</button>` : ''}
        </div>`;
      document.getElementById('btn-ranking-new-challenge')?.addEventListener('click', openCreateChallenge);
      return;
    }

    const ct       = ctInfo(activeChallenge.type);
    const unitStr  = unit(activeChallenge.type);
    const progress = currentProgress[activeChallenge.id] || {};
    const locale   = lang() === 'fr' ? 'fr-FR' : 'en-US';
    const endStr   = new Date(activeChallenge.end_date + 'T00:00:00').toLocaleDateString(locale);
    const medals   = ['<span class="grp-medal grp-medal-1">1</span>', '<span class="grp-medal grp-medal-2">2</span>', '<span class="grp-medal grp-medal-3">3</span>'];

    const ranked = [...currentMembers].sort((a, b) =>
      (progress[b.user_id] || 0) - (progress[a.user_id] || 0)
    );

    container.innerHTML = `
      <div class="grp-ranking-challenge-header">
        <span class="grp-ch-icon">${ct.icon}</span>
        <div class="grp-ch-header-info">
          <span class="grp-ch-title">${activeChallenge.title}</span>
          <span class="grp-ch-meta">${t('group.target')} ${activeChallenge.target_value} ${unitStr} · ${t('group.ends')} ${endStr}</span>
        </div>
      </div>
      <div class="grp-ranking-list">
        ${ranked.map((m, i) => {
          const val  = progress[m.user_id] || 0;
          const pct  = Math.min(100, Math.round((val / activeChallenge.target_value) * 100));
          const isMe = m.user_id === uid();
          const p    = m.profile;
          return `
            <div class="grp-rank-item${isMe ? ' grp-rank-me' : ''}">
              <span class="grp-rank-medal">${medals[i] || (i + 1) + '.'}</span>
              ${avatarDiv(p.avatar_url, p.username, 'grp-rank-avatar')}
              <div class="grp-rank-info">
                <span class="grp-rank-name">${p.username}${isMe ? ' <span class="grp-rank-me-label">toi</span>' : ''}</span>
                <div class="grp-rank-bar-wrap">
                  <div class="grp-rank-bar" style="width:${pct}%"></div>
                </div>
                <span class="grp-rank-value">${val} / ${activeChallenge.target_value} ${unitStr} (${pct}%)</span>
              </div>
              ${isMe ? `<button class="grp-rank-add-btn" data-cid="${activeChallenge.id}">+</button>` : ''}
            </div>`;
        }).join('')}
      </div>`;

    container.querySelectorAll('.grp-rank-add-btn').forEach(btn =>
      btn.addEventListener('click', () => openProgressModal(btn.dataset.cid)));
  }

  /* ─── Onglet Défis ───────────────────────────────────── */
  function renderChallengesTab() {
    const container = document.getElementById('grp-tab-challenges');
    if (!container) return;

    const isOwner = currentGroup.created_by === uid() || currentGroup.role === 'owner';
    const active  = currentChallenges.filter(c => c.end_date >= today());
    const past    = currentChallenges.filter(c => c.end_date <  today());
    const locale  = lang() === 'fr' ? 'fr-FR' : 'en-US';

    let html = '';
    if (isOwner) html += `<button id="btn-challenges-create" class="btn-full btn-primary" style="margin-bottom:16px">${t('group.create_challenge')}</button>`;

    const renderCard = (c, isActive) => {
      const ct   = ctInfo(c.type);
      const u    = unit(c.type);
      const val  = currentProgress[c.id]?.[uid()] || 0;
      const pct  = Math.min(100, Math.round((val / c.target_value) * 100));
      const end  = new Date(c.end_date + 'T00:00:00').toLocaleDateString(locale);
      return `
        <div class="grp-challenge-card${!isActive ? ' grp-challenge-past' : ''}">
          <div class="grp-ch-card-top">
            <span class="grp-ch-icon">${ct.icon}</span>
            <div class="grp-ch-card-info">
              <span class="grp-ch-title">${c.title}</span>
              <span class="grp-ch-meta">${isActive ? t('group.ends') : t('group.ended')} ${end} · ${c.target_value} ${u}</span>
            </div>
          </div>
          <div class="grp-ch-bar-wrap"><div class="grp-ch-bar" style="width:${pct}%"></div></div>
          <div class="grp-ch-progress-row">
            <span class="grp-ch-progress-val">${t('group.my_progress')} : ${val} / ${c.target_value} ${u}</span>
            ${isActive ? `<button class="grp-ch-add-btn" data-cid="${c.id}">+ ${t('group.add_progress')}</button>` : ''}
          </div>
        </div>`;
    };

    if (active.length)  html += `<p class="grp-section-label">${t('group.active_challenges')}</p>${active.map(c => renderCard(c, true)).join('')}`;
    if (past.length)    html += `<p class="grp-section-label" style="margin-top:16px">${t('group.past_challenges')}</p>${past.map(c => renderCard(c, false)).join('')}`;
    if (!active.length && !past.length) html += `<p class="social-empty">${t('group.no_challenges')}</p>`;

    container.innerHTML = html;
    document.getElementById('btn-challenges-create')?.addEventListener('click', openCreateChallenge);
    container.querySelectorAll('.grp-ch-add-btn').forEach(btn =>
      btn.addEventListener('click', () => openProgressModal(btn.dataset.cid)));
  }

  /* ─── Onglet Membres ─────────────────────────────────── */
  function renderMembersTab() {
    const container = document.getElementById('grp-tab-members');
    if (!container) return;

    const isOwner = currentGroup.created_by === uid() || currentGroup.role === 'owner';

    container.innerHTML = `
      <button id="btn-grp-invite" class="btn-full btn-secondary" style="margin-bottom:16px">${t('group.invite_friend')}</button>
      <div class="grp-members-list">
        ${currentMembers.map(m => {
          const p    = m.profile;
          const isMe = m.user_id === uid();
          const role = m.role === 'owner' ? `<span class="grp-role-icon grp-role-owner">${Icons.s('crown', 14)}</span> ` : m.role === 'admin' ? `<span class="grp-role-icon grp-role-admin">${Icons.s('star', 14)}</span> ` : '';
          return `
            <div class="grp-member-item">
              ${avatarDiv(p.avatar_url, p.username, 'grp-member-avatar')}
              <div class="grp-member-info">
                <span class="grp-member-name">${role}${p.username}${isMe ? ' <span class="grp-rank-me-label">toi</span>' : ''}</span>
                ${p.best_performance?.value ? `<span class="grp-member-perf">${p.best_performance.icon || Icons.s('trophy', 12)} ${p.best_performance.value}</span>` : ''}
              </div>
              ${isOwner && !isMe ? `<button class="grp-member-kick" data-mid="${m.id}" title="${t('group.remove_member')}">✕</button>` : ''}
            </div>`;
        }).join('')}
      </div>`;

    document.getElementById('btn-grp-invite')?.addEventListener('click', openInviteFriends);
    container.querySelectorAll('.grp-member-kick').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm(t('group.confirm_remove_member'))) return;
        await App.supabase.from('group_members').delete().eq('id', btn.dataset.mid);
        await loadGroupDetails(currentGroup.id);
        renderGroupPage();
      }));
  }

  /* ─── Chat ──────────────────────────────────────────────── */

  async function loadMessages(groupId) {
    chatGroupId = groupId;
    chatMessages = [];
    const container = document.getElementById('grp-tab-chat');
    if (container) container.innerHTML = `<p class="social-empty" style="margin:auto">Chargement...</p>`;

    const { data } = await App.supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .neq('message_type', 'image') // images éphémères — pas de persistance
      .order('created_at', { ascending: true })
      .limit(100);

    if (!data || data.length === 0) { renderChatMessages(); return; }

    const senderIds = [...new Set(data.map(m => m.user_id))];
    let profileMap = {};
    if (App.supabase && senderIds.length > 0) {
      const { data: profiles } = await App.supabase
        .from('profiles').select('id, username, avatar_url').in('id', senderIds);
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    }
    chatMessages = data.map(m => ({
      ...m, profile: profileMap[m.user_id] || { username: '?' },
    }));
    renderChatMessages();
  }

  function scrollChatToBottom() {
    const body = document.querySelector('#page-group .grp-body');
    if (body) setTimeout(() => { body.scrollTop = body.scrollHeight; }, 60);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function renderMessage(msg) {
    const isMe  = msg.user_id === uid();
    const p     = msg.profile || {};
    const letter = (p.username || '?').charAt(0).toUpperCase();
    const av = p.avatar_url
      ? `<img src="${p.avatar_url}" class="chat-avatar" alt="${letter}">`
      : `<div class="chat-avatar chat-avatar-letter">${letter}</div>`;
    const time = new Date(msg.created_at).toLocaleTimeString(
      lang() === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });

    let bubbleContent = '';
    if (msg.message_type === 'ephemeral_image' && msg.image_data) {
      bubbleContent = `
        <div class="chat-ephemeral-wrap">
          <img src="${msg.image_data}" class="chat-img" alt="photo">
          <a class="chat-img-save" href="${msg.image_data}" download="photo.jpg">⬇ ${lang() === 'fr' ? 'Enregistrer' : 'Save'}</a>
        </div>`;
    } else if (msg.message_type === 'image' && msg.image_url) {
      bubbleContent = `<img src="${msg.image_url}" class="chat-img" alt="photo">`;
    } else if (msg.message_type === 'session' && msg.session_data) {
      const sd = typeof msg.session_data === 'string'
        ? JSON.parse(msg.session_data) : msg.session_data;
      const exCount = (sd.exercises || []).length;
      const safeData = escapeHtml(JSON.stringify(sd));
      bubbleContent = `
        <div class="chat-session-card">
          <div class="chat-session-icon">${Icons.s('dumbbell', 24)}</div>
          <div class="chat-session-info">
            <span class="chat-session-name">${escapeHtml(sd.name || t('group.session_unnamed'))}</span>
            <span class="chat-session-meta">${exCount} ${t('group.session_exercises')}</span>
          </div>
          <button class="chat-session-save-btn" data-session='${safeData}'>${t('group.session_save')}</button>
        </div>`;
    } else {
      const editBtn = isMe
        ? `<button class="chat-edit-btn" data-mid="${escapeHtml(msg.id)}" data-mc="${escapeHtml(msg.content || '')}">${Icons.s('edit', 12)}</button>`
        : '';
      const delBtn = isMe
        ? `<button class="chat-delete-btn" data-mid="${escapeHtml(msg.id)}">${Icons.s('trash', 12)}</button>`
        : '';
      bubbleContent = `<span class="chat-bubble-text">${escapeHtml(msg.content || '')}</span>${editBtn}${delBtn}`;
    }

    const edited = msg.is_edited ? `<span class="chat-edited">${t('group.edited')}</span>` : '';
    return `
      <div class="chat-row ${isMe ? 'chat-row-me' : 'chat-row-other'}" data-msg-id="${msg.id}">
        ${!isMe ? av : ''}
        <div class="chat-col">
          ${!isMe ? `<span class="chat-username">${escapeHtml(p.username || '?')}</span>` : ''}
          <div class="chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">
            ${bubbleContent}
          </div>
          <span class="chat-time">${time}${edited}</span>
        </div>
        ${isMe ? av : ''}
      </div>`;
  }

  function renderChatMessages() {
    const container = document.getElementById('grp-tab-chat');
    if (!container) return;
    if (chatMessages.length === 0) {
      container.innerHTML = `<p class="social-empty" style="margin:auto">${t('group.chat_empty')}</p>`;
    } else {
      container.innerHTML = chatMessages.map(renderMessage).join('');
      container.querySelectorAll('.chat-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => startEditGroupMsg(btn.dataset.mid, btn.dataset.mc));
      });
      container.querySelectorAll('.chat-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteGroupMsg(btn.dataset.mid));
      });
    }
    scrollChatToBottom();
  }

  async function deleteGroupMsg(msgId) {
    if (!confirm(t('dm.confirm_delete'))) return;
    await App.supabase.from('group_messages').delete().eq('id', msgId).eq('user_id', uid());
    chatMessages = chatMessages.filter(m => m.id !== msgId);
    renderChatMessages();
  }

  async function editGroupMsg(msgId, newContent) {
    if (!newContent?.trim() || !App.supabase) return;
    await App.supabase.from('group_messages').update({
      content: newContent.trim(), is_edited: true, updated_at: new Date().toISOString(),
    }).eq('id', msgId).eq('user_id', uid());
    const idx = chatMessages.findIndex(m => m.id === msgId);
    if (idx >= 0) { chatMessages[idx].content = newContent.trim(); chatMessages[idx].is_edited = true; }
    renderChatMessages();
  }

  function startEditGroupMsg(msgId, currentContent) {
    const row = document.querySelector(`#grp-tab-chat [data-msg-id="${msgId}"] .chat-bubble`);
    if (!row) return;
    row.innerHTML = `
      <div class="chat-edit-form">
        <input type="text" class="chat-edit-input" value="${escapeHtml(currentContent)}">
        <div class="chat-edit-actions">
          <button class="chat-edit-cancel">${Icons.s('x', 13)}</button>
          <button class="chat-edit-save">${Icons.s('check', 13)}</button>
        </div>
      </div>`;
    const input = row.querySelector('.chat-edit-input');
    input?.focus(); input?.select();
    row.querySelector('.chat-edit-save')?.addEventListener('click', () => editGroupMsg(msgId, input.value));
    row.querySelector('.chat-edit-cancel')?.addEventListener('click', renderChatMessages);
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); editGroupMsg(msgId, input.value); }
      if (e.key === 'Escape') renderChatMessages();
    });
  }

  async function sendTextMessage() {
    const input = document.getElementById('chat-input');
    const text  = input?.value?.trim();
    if (!text || !currentGroup) return;
    input.value = '';

    const { data: msg, error } = await App.supabase.from('group_messages').insert({
      group_id: currentGroup.id, user_id: uid(),
      content: text, message_type: 'text',
    }).select().single();

    if (!error && msg) {
      chatMessages.push({ ...msg, profile: {
        username:   App.state.profile?.username || '?',
        avatar_url: App.state.profile?.avatar_url || App.local.get('avatar_url') || null,
      }});
      renderChatMessages();
    }
  }

  /* ─── Compresse une image en base64 (canvas) ───────────── */
  function compressImage(file, maxWidth, quality) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  /* ─── Envoi image éphémère via Realtime (pas de stockage) ── */
  async function handleImageUpload(file) {
    if (!file || !currentGroup || !chatChannel) return;

    const btnImg = document.getElementById('btn-chat-image');
    if (btnImg) { btnImg.disabled = true; btnImg.textContent = '...'; }

    const imageData = await compressImage(file, 700, 0.72);
    if (!imageData) {
      if (btnImg) { btnImg.disabled = false; btnImg.textContent = '🖼'; }
      return;
    }

    const msgId   = 'eph_' + Date.now();
    const profile = {
      username:   App.state.profile?.username  || '?',
      avatar_url: App.state.profile?.avatar_url || App.local.get('avatar_url') || null,
    };

    // Ajout local immédiat
    chatMessages.push({
      id: msgId, user_id: uid(),
      message_type: 'ephemeral_image',
      image_data: imageData,
      created_at: new Date().toISOString(),
      profile,
    });
    renderChatMessages();

    // Broadcast aux autres membres (non stocké en DB)
    chatChannel.send({
      type:    'broadcast',
      event:   'ephemeral_image',
      payload: {
        id: msgId, user_id: uid(),
        image_data: imageData,
        created_at: new Date().toISOString(),
        username:   profile.username,
        avatar_url: profile.avatar_url,
      },
    });

    if (btnImg) { btnImg.disabled = false; btnImg.textContent = '🖼'; }
  }

  function openShareSessionPicker() {
    const lib  = App.local.get('workout_library') || [];
    const list = document.getElementById('share-session-list');
    if (!list) return;

    if (lib.length === 0) {
      list.innerHTML = `<p class="social-empty">${t('group.no_saved_sessions')}</p>`;
    } else {
      list.innerHTML = lib.map(s => `
        <div class="social-search-item">
          <span style="display:inline-flex;flex-shrink:0">${Icons.s('dumbbell', 24)}</span>
          <div style="flex:1;min-width:0">
            <span class="social-card-name">${escapeHtml(s.name)}</span>
            <span style="display:block;font-size:12px;color:var(--text-2)">${(s.exercises||[]).length} exercice(s)</span>
          </div>
          <button class="btn-soc btn-soc-add" data-sid="${s.id}">${t('group.share_btn')}</button>
        </div>`).join('');

      list.querySelectorAll('.btn-soc-add').forEach(btn =>
        btn.addEventListener('click', async () => {
          const sid     = parseInt(btn.dataset.sid);
          const session = lib.find(s => s.id === sid);
          if (!session) return;
          btn.disabled = true; btn.textContent = '...';
          await shareSession(session);
          document.getElementById('modal-share-session')?.classList.add('hidden');
        }));
    }
    document.getElementById('modal-share-session')?.classList.remove('hidden');
  }

  async function shareSession(session) {
    if (!currentGroup) return;
    const sessionData = {
      name: session.name,
      exercises: (session.exercises || []).map(e => ({
        id: e.id, name: e.name, muscles: e.muscles,
        defaultSets: e.defaultSets, defaultReps: e.defaultReps,
        isUnilateral: e.isUnilateral,
      })),
    };

    const { data: msg, error } = await App.supabase.from('group_messages').insert({
      group_id: currentGroup.id, user_id: uid(),
      message_type: 'session', session_data: sessionData,
    }).select().single();

    if (!error && msg) {
      chatMessages.push({ ...msg, profile: {
        username:   App.state.profile?.username || '?',
        avatar_url: App.state.profile?.avatar_url || App.local.get('avatar_url') || null,
      }});
      renderChatMessages();
    }
  }

  function openReceiveSession(sessionData) {
    _pendingSession = sessionData;
    const nameInput = document.getElementById('receive-session-name');
    if (nameInput) nameInput.value = sessionData.name || '';

    const exList = document.getElementById('receive-session-exercises');
    if (exList) {
      exList.innerHTML = (sessionData.exercises || []).map(e => `
        <div class="receive-session-ex">
          <span class="receive-session-ex-name">${escapeHtml(e.name || '')}</span>
          ${(e.muscles || []).length
            ? `<span class="receive-session-ex-muscles">${escapeHtml(e.muscles.join(', '))}</span>`
            : ''}
        </div>`).join('');
    }
    document.getElementById('modal-receive-session')?.classList.remove('hidden');
  }

  function saveReceivedSession() {
    if (!_pendingSession) return;
    const name = document.getElementById('receive-session-name')?.value?.trim();
    if (!name) return;

    const lib = App.local.get('workout_library') || [];
    lib.push({ id: Date.now(), name, exercises: _pendingSession.exercises || [] });
    App.local.set('workout_library', lib);

    document.getElementById('modal-receive-session')?.classList.add('hidden');
    _pendingSession = null;
  }

  function subscribeToChat(groupId) {
    if (chatChannel) { chatChannel.unsubscribe(); chatChannel = null; }

    chatChannel = App.supabase
      .channel('group-chat:' + groupId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const msg = payload.new;
        if (msg.user_id === uid()) return;

        let profile = { username: '?' };
        if (App.supabase) {
          const { data } = await App.supabase
            .from('profiles').select('username, avatar_url').eq('id', msg.user_id).single();
          if (data) profile = data;
        }
        chatMessages.push({ ...msg, profile });
        if (!document.getElementById('grp-tab-chat')?.classList.contains('hidden')) {
          renderChatMessages();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, payload => {
        const idx = chatMessages.findIndex(m => m.id === payload.new.id);
        if (idx >= 0) {
          chatMessages[idx] = { ...chatMessages[idx], ...payload.new };
          if (!document.getElementById('grp-tab-chat')?.classList.contains('hidden')) renderChatMessages();
        }
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, payload => {
        chatMessages = chatMessages.filter(m => m.id !== payload.old.id);
        if (!document.getElementById('grp-tab-chat')?.classList.contains('hidden')) renderChatMessages();
      })
      .on('broadcast', { event: 'ephemeral_image' }, payload => {
        const d = payload.payload;
        if (!d || d.user_id === uid()) return; // déjà ajouté localement
        chatMessages.push({
          id:           d.id,
          user_id:      d.user_id,
          message_type: 'ephemeral_image',
          image_data:   d.image_data,
          created_at:   d.created_at,
          profile: { username: d.username || '?', avatar_url: d.avatar_url || null },
        });
        if (!document.getElementById('grp-tab-chat')?.classList.contains('hidden')) {
          renderChatMessages();
        }
      })
      .subscribe();
  }

  function unsubscribeFromChat() {
    if (chatChannel) { chatChannel.unsubscribe(); chatChannel = null; }
    chatMessages = [];
    chatGroupId  = null;
  }

  /* ─── Créer un groupe ────────────────────────────────── */
  async function createGroup() {
    const name = document.getElementById('new-group-name')?.value?.trim();
    const desc = document.getElementById('new-group-desc')?.value?.trim();
    if (!name) return;

    const btn = document.getElementById('btn-confirm-create-group');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    const { data: group, error } = await App.supabase
      .from('groups')
      .insert({ name, description: desc || '', created_by: uid() })
      .select().single();

    if (error || !group) {
      if (btn) { btn.disabled = false; btn.textContent = t('group.create'); }
      return;
    }

    await App.supabase.from('group_members').insert({
      group_id: group.id, user_id: uid(),
      role: 'owner', status: 'active', invited_by: uid(),
    });

    document.getElementById('modal-create-group')?.classList.add('hidden');
    if (document.getElementById('new-group-name')) document.getElementById('new-group-name').value = '';
    if (document.getElementById('new-group-desc'))  document.getElementById('new-group-desc').value  = '';
    if (btn) { btn.disabled = false; btn.textContent = t('group.create'); }

    await loadGroups();
    renderGroupsList();

    // Ouvre directement le groupe créé
    currentGroup     = { ...group, role: 'owner', member_count: 1 };
    currentMembers   = [{ id: 'self', user_id: uid(), role: 'owner', status: 'active', profile: { id: uid(), username: App.state.profile?.username, avatar_url: App.state.profile?.avatar_url } }];
    currentChallenges = [];
    currentProgress   = {};
    document.querySelectorAll('.grp-tab').forEach(tb => tb.classList.toggle('active', tb.dataset.tab === 'members'));
    App.navigate('group');
    renderGroupPage();
  }

  /* ─── Inviter des amis ───────────────────────────────── */
  async function openInviteFriends() {
    const modal = document.getElementById('modal-invite-friends');
    const list  = document.getElementById('invite-friends-list');
    if (!modal || !list) return;
    modal.classList.remove('hidden');
    list.innerHTML = `<p class="social-empty">Chargement...</p>`;

    const alreadyIn = new Set(currentMembers.map(m => m.user_id));

    const { data: friendships } = await App.supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${uid()},addressee_id.eq.${uid()}`)
      .eq('status', 'accepted');

    const friendIds = (friendships || [])
      .map(f => f.requester_id === uid() ? f.addressee_id : f.requester_id)
      .filter(id => !alreadyIn.has(id));

    if (friendIds.length === 0) {
      list.innerHTML = `<p class="social-empty">${t('group.all_friends_in_group')}</p>`;
      return;
    }

    // Fetch also already-invited (status='invited') to show correct button state
    const { data: existingInvites } = await App.supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', currentGroup.id)
      .eq('status', 'invited');
    const alreadyInvited = new Set((existingInvites || []).map(m => m.user_id));

    let profileMap = {};
    if (App.supabase && friendIds.length > 0) {
      const { data: profiles } = await App.supabase
        .from('profiles').select('id, username, avatar_url').in('id', friendIds);
      if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
    }

    list.innerHTML = friendIds.map(id => {
      const p = profileMap[id] || { id, username: '?' };
      const l = (p.username || '?').charAt(0).toUpperCase();
      const av = p.avatar_url ? `<img src="${p.avatar_url}" class="social-avatar" alt="${l}">` : `<div class="social-avatar social-avatar-letter">${l}</div>`;
      const isInvited = alreadyInvited.has(id);
      return `
        <div class="social-search-item">
          ${av}
          <span class="social-card-name">${p.username}</span>
          ${isInvited
            ? `<span class="social-badge-pending">${t('social.pending_sent')}</span>`
            : `<button class="btn-soc btn-soc-add" data-uid="${id}">${t('group.invite')}</button>`}
        </div>`;
    }).join('');

    list.querySelectorAll('.btn-soc-add').forEach(btn =>
      btn.addEventListener('click', async () => {
        btn.textContent = '...'; btn.disabled = true;
        const { error } = await App.supabase.from('group_members').insert({
          group_id: currentGroup.id, user_id: btn.dataset.uid,
          role: 'member', status: 'invited', invited_by: uid(),
        });
        btn.textContent = error ? '❌' : '✓';
      }));
  }

  /* ─── Accepter / Refuser une invitation ─────────────── */
  async function acceptInvite(groupId, membershipId, btnAccept, btnDecline) {
    if (btnAccept) { btnAccept.disabled = true; btnAccept.textContent = '...'; }
    if (btnDecline) btnDecline.disabled = true;

    let error = null;
    let affected = 0;

    if (membershipId) {
      // Mise à jour par ID exact de la ligne (le plus fiable)
      const res = await App.supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('id', membershipId)
        .select();
      error = res.error;
      affected = (res.data || []).length;
    } else {
      // Fallback : par group_id + user_id
      const res = await App.supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('group_id', groupId)
        .eq('user_id', uid())
        .select();
      error = res.error;
      affected = (res.data || []).length;
    }

    if (error) {
      console.error('acceptInvite error:', error);
      alert('Erreur : ' + error.message);
      if (btnAccept) { btnAccept.disabled = false; btnAccept.textContent = t('social.accept'); }
      if (btnDecline) btnDecline.disabled = false;
      return;
    }

    if (affected === 0) {
      console.warn('acceptInvite: 0 lignes affectées — membershipId:', membershipId, 'groupId:', groupId, 'uid:', uid());
      alert('Invitation introuvable. Elle a peut-être déjà été traitée.');
      if (btnAccept) { btnAccept.disabled = false; btnAccept.textContent = t('social.accept'); }
      if (btnDecline) btnDecline.disabled = false;
      return;
    }

    await loadGroups();
    renderGroupsList();

    // Ouvre directement le groupe accepté
    const group = myGroups.find(g => g.id === groupId);
    if (group) openGroup(groupId);
  }

  async function declineInvite(groupId, membershipId, btnDecline, btnAccept) {
    if (btnDecline) { btnDecline.disabled = true; btnDecline.textContent = '...'; }
    if (btnAccept) btnAccept.disabled = true;

    let error = null;

    if (membershipId) {
      const res = await App.supabase
        .from('group_members')
        .delete()
        .eq('id', membershipId);
      error = res.error;
    } else {
      const res = await App.supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', uid());
      error = res.error;
    }

    if (error) {
      console.error('declineInvite error:', error);
      alert('Erreur : ' + error.message);
      if (btnDecline) { btnDecline.disabled = false; btnDecline.textContent = t('social.decline'); }
      if (btnAccept) btnAccept.disabled = false;
      return;
    }

    await loadGroups();
    renderGroupsList();
  }

  /* ─── Créer un défi ──────────────────────────────────── */
  function openCreateChallenge() {
    // Set min date (demain)
    const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const endEl = document.getElementById('challenge-end-date');
    if (endEl) { endEl.min = minDate; if (!endEl.value) endEl.value = ''; }
    // Reset form
    if (document.getElementById('challenge-title')) document.getElementById('challenge-title').value = '';
    if (document.getElementById('challenge-target')) document.getElementById('challenge-target').value = '';
    // Select first type by default
    const firstRadio = document.querySelector('input[name="challenge-type"]');
    if (firstRadio) firstRadio.checked = true;
    document.getElementById('modal-challenge-create')?.classList.remove('hidden');
  }

  async function createChallenge() {
    const title  = document.getElementById('challenge-title')?.value?.trim();
    const type   = document.querySelector('input[name="challenge-type"]:checked')?.value;
    const target = parseInt(document.getElementById('challenge-target')?.value);
    const endDate = document.getElementById('challenge-end-date')?.value;
    if (!title || !type || !target || !endDate || target <= 0) return;

    const btn = document.getElementById('btn-confirm-create-challenge');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    await App.supabase.from('group_challenges').insert({
      group_id: currentGroup.id, created_by: uid(),
      title, type, target_value: target, end_date: endDate,
    });

    document.getElementById('modal-challenge-create')?.classList.add('hidden');
    if (btn) { btn.disabled = false; btn.textContent = t('group.create'); }

    await loadGroupDetails(currentGroup.id);
    document.querySelectorAll('.grp-tab').forEach(tb => tb.classList.toggle('active', tb.dataset.tab === 'ranking'));
    renderGroupPage();
  }

  /* ─── Mettre à jour ma progression ──────────────────── */
  function openProgressModal(challengeId) {
    const c   = currentChallenges.find(c => c.id === challengeId);
    if (!c) return;
    const u   = unit(c.type);
    const cur = currentProgress[challengeId]?.[uid()] || 0;
    const ct  = ctInfo(c.type);

    document.getElementById('progress-challenge-id').value  = challengeId;
    document.getElementById('progress-challenge-name').textContent = `${ct.icon} ${c.title}`;
    document.getElementById('progress-unit-label').textContent     = u;
    document.getElementById('progress-current-val').textContent    = cur + ' ' + u;
    document.getElementById('progress-add-val').value              = c.type === 'sessions' ? '1' : '';
    document.getElementById('modal-progress-update')?.classList.remove('hidden');
  }

  async function saveProgress() {
    const challengeId = document.getElementById('progress-challenge-id')?.value;
    const add = parseFloat(document.getElementById('progress-add-val')?.value);
    if (!challengeId || !add || add <= 0) return;

    const current = currentProgress[challengeId]?.[uid()] || 0;
    const newVal  = current + add;

    const { error } = await App.supabase.from('group_challenge_progress').upsert({
      challenge_id: challengeId, user_id: uid(),
      value: newVal, updated_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id' });

    document.getElementById('modal-progress-update')?.classList.add('hidden');
    if (!error) {
      if (!currentProgress[challengeId]) currentProgress[challengeId] = {};
      currentProgress[challengeId][uid()] = newVal;
      renderGroupPage();
    }
  }

  /* ─── Quitter / Supprimer le groupe ─────────────────── */
  async function leaveGroup() {
    if (!confirm(t('group.confirm_leave'))) return;
    unsubscribeFromChat();
    await App.supabase.from('group_members').delete()
      .eq('group_id', currentGroup.id).eq('user_id', uid());
    document.getElementById('modal-group-settings')?.classList.add('hidden');
    document.getElementById('grp-chat-bar')?.classList.add('hidden');
    App.navigate('app'); App.switchTab('social');
    await loadGroups(); renderGroupsList();
  }

  async function deleteGroup() {
    if (!confirm(t('group.confirm_delete'))) return;
    unsubscribeFromChat();
    await App.supabase.from('groups').delete().eq('id', currentGroup.id);
    document.getElementById('modal-group-settings')?.classList.add('hidden');
    document.getElementById('grp-chat-bar')?.classList.add('hidden');
    App.navigate('app'); App.switchTab('social');
    await loadGroups(); renderGroupsList();
  }

  /* ─── Rendu liste groupes (onglet Social) ────────────── */
  function renderGroupsList() {
    const list = document.getElementById('groups-list');
    if (!list) return;

    list.innerHTML = myGroups.length === 0
      ? `<p class="social-empty">${t('group.no_groups')}</p>`
      : myGroups.map(g => {
          const avatarHtml = g.cover_url
            ? `<img src="${g.cover_url}" class="group-card-avatar" style="object-fit:cover;" alt="${g.name.charAt(0).toUpperCase()}">`
            : `<div class="group-card-avatar">${g.name.charAt(0).toUpperCase()}</div>`;
          return `
          <div class="group-card" data-gid="${g.id}">
            ${avatarHtml}
            <div class="group-card-info">
              <span class="group-card-name">${g.name}</span>
              <span class="group-card-meta">${g.member_count} membre${g.member_count !== 1 ? 's' : ''}${g.role === 'owner' ? ' · Admin' : ''}</span>
            </div>
            <span class="settings-arrow">›</span>
          </div>`;
        }).join('');

    list.querySelectorAll('.group-card').forEach(card =>
      card.addEventListener('click', () => openGroup(card.dataset.gid)));

    // Invitations
    const invSection = document.getElementById('group-invites-section');
    const invList    = document.getElementById('group-invites-list');
    if (invSection) invSection.classList.toggle('hidden', pendingInvites.length === 0);
    if (invList) {
      invList.innerHTML = pendingInvites.map(g => {
        const avHtml = g.cover_url
          ? `<img src="${g.cover_url}" class="group-card-avatar" style="width:46px;height:46px;object-fit:cover;flex-shrink:0;" alt="${g.name.charAt(0).toUpperCase()}">`
          : `<div class="group-card-avatar" style="width:46px;height:46px;font-size:18px;flex-shrink:0;">${g.name.charAt(0).toUpperCase()}</div>`;
        const inviterLine = g.inviter
          ? `<span style="display:block;font-size:12px;color:var(--text-2)">${t('group.invited_by')} ${g.inviter.username}</span>`
          : '';
        return `
          <div class="social-request-card grp-invite-card" data-gid="${g.id}">
            ${avHtml}
            <div style="flex:1;min-width:0">
              <span class="social-card-name">${g.name}</span>
              ${inviterLine}
            </div>
            <div class="social-card-actions">
              <button class="btn-soc btn-soc-accept grp-btn-accept" data-gid="${g.id}" data-mid="${g.membership_id || ''}">${t('social.accept')}</button>
              <button class="btn-soc btn-soc-decline grp-btn-decline" data-gid="${g.id}" data-mid="${g.membership_id || ''}">${t('social.decline')}</button>
            </div>
          </div>`;
      }).join('');

      invList.querySelectorAll('.grp-invite-card').forEach(card => {
        const btnA = card.querySelector('.grp-btn-accept');
        const btnD = card.querySelector('.grp-btn-decline');
        btnA?.addEventListener('click', () => acceptInvite(btnA.dataset.gid, btnA.dataset.mid || null, btnA, btnD));
        btnD?.addEventListener('click', () => declineInvite(btnD.dataset.gid, btnD.dataset.mid || null, btnD, btnA));
      });
    }
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    // Back — désinscrit le canal Realtime
    document.getElementById('btn-grp-back')?.addEventListener('click', () => {
      unsubscribeFromChat();
      document.getElementById('grp-chat-bar')?.classList.add('hidden');
      App.navigate('app'); App.switchTab('social');
    });

    // Tabs groupe
    document.querySelectorAll('.grp-tab').forEach(tab =>
      tab.addEventListener('click', () => {
        document.querySelectorAll('.grp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderGroupTab(tab.dataset.tab);
      }));

    // Créer groupe
    document.getElementById('btn-create-group')?.addEventListener('click', () =>
      document.getElementById('modal-create-group')?.classList.remove('hidden'));
    document.getElementById('btn-close-create-group')?.addEventListener('click', () =>
      document.getElementById('modal-create-group')?.classList.add('hidden'));
    document.getElementById('modal-create-group')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('btn-confirm-create-group')?.addEventListener('click', createGroup);

    // Paramètres groupe
    document.getElementById('btn-grp-settings')?.addEventListener('click', () => {
      const isOwner = currentGroup?.created_by === uid() || currentGroup?.role === 'owner';
      document.getElementById('btn-delete-group')?.classList.toggle('hidden', !isOwner);
      document.getElementById('modal-group-settings')?.classList.remove('hidden');
    });
    document.getElementById('btn-close-group-settings')?.addEventListener('click', () =>
      document.getElementById('modal-group-settings')?.classList.add('hidden'));
    document.getElementById('btn-leave-group')?.addEventListener('click', leaveGroup);
    document.getElementById('btn-delete-group')?.addEventListener('click', deleteGroup);

    // Inviter
    document.getElementById('btn-close-invite-friends')?.addEventListener('click', () =>
      document.getElementById('modal-invite-friends')?.classList.add('hidden'));
    document.getElementById('modal-invite-friends')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });

    // Créer défi
    document.getElementById('btn-close-challenge-create')?.addEventListener('click', () =>
      document.getElementById('modal-challenge-create')?.classList.add('hidden'));
    document.getElementById('modal-challenge-create')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('btn-confirm-create-challenge')?.addEventListener('click', createChallenge);

    // Mettre à jour progression
    document.getElementById('btn-close-progress-update')?.addEventListener('click', () =>
      document.getElementById('modal-progress-update')?.classList.add('hidden'));
    document.getElementById('btn-save-progress')?.addEventListener('click', saveProgress);

    // ── Photo de groupe (upload cover) ────────────────────
    const coverInput = document.getElementById('grp-cover-file');
    document.getElementById('grp-banner-avatar')?.addEventListener('click', () => {
      if (document.getElementById('grp-banner-avatar')?.classList.contains('grp-banner-avatar-owner')) {
        coverInput?.click();
      }
    });
    coverInput?.addEventListener('change', () => {
      const file = coverInput.files?.[0];
      if (file) uploadGroupCover(file);
      coverInput.value = '';
    });

    // ── Chat ──────────────────────────────────────────────
    // Envoi texte
    document.getElementById('btn-chat-send')?.addEventListener('click', sendTextMessage);
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
    });

    // Upload image
    const fileInput = document.getElementById('chat-image-file');
    document.getElementById('btn-chat-image')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) handleImageUpload(file);
      fileInput.value = '';
    });

    // Partager séance
    document.getElementById('btn-chat-session')?.addEventListener('click', openShareSessionPicker);
    document.getElementById('btn-close-share-session')?.addEventListener('click', () =>
      document.getElementById('modal-share-session')?.classList.add('hidden'));
    document.getElementById('modal-share-session')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });

    // Sauvegarder séance reçue
    document.getElementById('btn-close-receive-session')?.addEventListener('click', () => {
      document.getElementById('modal-receive-session')?.classList.add('hidden');
      _pendingSession = null;
    });
    document.getElementById('btn-save-received-session')?.addEventListener('click', saveReceivedSession);

    // Délégation : clic sur bouton "Récupérer" dans les messages du chat
    document.getElementById('grp-tab-chat')?.addEventListener('click', e => {
      const btn = e.target.closest('.chat-session-save-btn');
      if (!btn) return;
      try {
        const sd = JSON.parse(btn.dataset.session);
        openReceiveSession(sd);
      } catch { /* JSON invalide — ignorer */ }
    });

    // Clic sur image pour agrandir/réduire
    document.getElementById('grp-tab-chat')?.addEventListener('click', e => {
      const img = e.target.closest('.chat-img');
      if (img) img.classList.toggle('expanded');
    });
  }

  async function render() {
    if (!App.state.user) return;
    await loadGroups();
    renderGroupsList();
  }

  return { init, render };

})();
