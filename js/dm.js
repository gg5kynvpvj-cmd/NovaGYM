/* ═══════════════════════════════════════════════════════════
   NovaGYM — Messages Privés (DM)
   Conversations 1-to-1 entre amis, temps réel via Supabase
   ═══════════════════════════════════════════════════════════ */

window.DM = (() => {

  let currentConvId  = null;
  let currentOther   = null; // { id, username, avatar_url }
  let dmMessages     = [];
  let dmChannel      = null;
  let conversations  = [];

  /* ─── Helpers ──────────────────────────────────────────── */
  function myId()      { return App.state?.user?.id; }
  function myProfile() { return App.state?.profile; }
  function t(key)      { return window.I18n ? I18n.t(key) : key; }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function fmtShort(ts) {
    const d   = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return fmtTime(ts);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  function avatarEl(url, name, cls = 'chat-avatar') {
    const l = (name || '?').charAt(0).toUpperCase();
    return url
      ? `<img src="${esc(url)}" class="${cls}" alt="${esc(name)}">`
      : `<div class="${cls} chat-avatar-letter">${l}</div>`;
  }

  /* ─── Conversation ─────────────────────────────────────── */
  async function getOrCreateConversation(otherId) {
    if (!App.supabase || !myId()) return null;
    const me = myId();

    const { data: existing } = await App.supabase
      .from('private_conversations')
      .select('id')
      .or(`and(user1_id.eq.${me},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${me})`)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created } = await App.supabase
      .from('private_conversations')
      .insert({ user1_id: me, user2_id: otherId })
      .select('id')
      .single();

    return created?.id || null;
  }

  /* ─── Chargement messages ──────────────────────────────── */
  async function loadMessages(convId) {
    if (!App.supabase) return;

    const { data } = await App.supabase
      .from('private_messages')
      .select('*, sender:profiles!sender_id(id, username, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100);

    dmMessages = data || [];
    renderMessages();
    scrollToBottom();
  }

  /* ─── Envoi texte ──────────────────────────────────────── */
  async function sendTextMessage() {
    const input = document.getElementById('dm-input');
    const text  = input?.value?.trim();
    if (!text || !currentConvId || !App.supabase) return;
    input.value = '';

    const me = myId();

    // Optimistic update
    const tmpMsg = {
      id:           'tmp-' + Date.now(),
      conversation_id: currentConvId,
      sender_id:    me,
      content:      text,
      message_type: 'text',
      is_edited:    false,
      created_at:   new Date().toISOString(),
      sender:       { id: me, username: myProfile()?.username, avatar_url: App.local.get('avatar_url') },
    };
    dmMessages.push(tmpMsg);
    renderMessages();
    scrollToBottom();

    await App.supabase.from('private_messages').insert({
      conversation_id: currentConvId,
      sender_id:       me,
      content:         text,
      message_type:    'text',
    });

    await App.supabase.from('private_conversations').update({
      last_message_at:        new Date().toISOString(),
      last_message_text:      text,
      last_message_sender_id: me,
    }).eq('id', currentConvId);
  }

  /* ─── Envoi image (éphémère via broadcast) ─────────────── */
  function handleImageUpload(file) {
    if (!file || !dmChannel) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 700;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.72);

        // Broadcast
        dmChannel.send({
          type: 'broadcast', event: 'dm_image',
          payload: { conv_id: currentConvId, sender_id: myId(), image_data: b64 },
        });

        // Affiche localement
        dmMessages.push({
          id:           'tmp-img-' + Date.now(),
          sender_id:    myId(),
          message_type: 'ephemeral_image',
          image_data:   b64,
          created_at:   new Date().toISOString(),
          sender:       { id: myId(), username: myProfile()?.username, avatar_url: App.local.get('avatar_url') },
        });
        renderMessages();
        scrollToBottom();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /* ─── Modification message ─────────────────────────────── */
  async function editMessage(msgId, newContent) {
    if (!newContent?.trim() || !App.supabase) return;
    await App.supabase.from('private_messages').update({
      content:    newContent.trim(),
      is_edited:  true,
      updated_at: new Date().toISOString(),
    }).eq('id', msgId).eq('sender_id', myId());
    // Optimistic
    const idx = dmMessages.findIndex(m => m.id === msgId);
    if (idx >= 0) { dmMessages[idx].content = newContent.trim(); dmMessages[idx].is_edited = true; }
    renderMessages();
  }

  /* ─── Realtime ─────────────────────────────────────────── */
  function subscribeToMessages(convId) {
    if (dmChannel) { dmChannel.unsubscribe(); dmChannel = null; }

    dmChannel = App.supabase
      .channel('dm:' + convId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async payload => {
        const msg = payload.new;
        // Ignore own messages (already optimistic)
        if (msg.sender_id === myId()) {
          const tmpIdx = dmMessages.findIndex(m => m.id.startsWith('tmp-') && m.content === msg.content && m.sender_id === myId());
          if (tmpIdx >= 0) { dmMessages[tmpIdx] = { ...dmMessages[tmpIdx], ...msg }; renderMessages(); }
          return;
        }
        const { data: profile } = await App.supabase
          .from('profiles').select('id, username, avatar_url').eq('id', msg.sender_id).maybeSingle();
        dmMessages.push({ ...msg, sender: profile });
        renderMessages();
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${convId}`,
      }, payload => {
        const idx = dmMessages.findIndex(m => m.id === payload.new.id);
        if (idx >= 0) { dmMessages[idx] = { ...dmMessages[idx], ...payload.new }; renderMessages(); }
      })
      .on('broadcast', { event: 'dm_image' }, payload => {
        const d = payload.payload;
        if (!d || d.conv_id !== currentConvId || d.sender_id === myId()) return;
        dmMessages.push({
          id:           'tmp-img-' + Date.now(),
          sender_id:    d.sender_id,
          message_type: 'ephemeral_image',
          image_data:   d.image_data,
          created_at:   new Date().toISOString(),
          sender:       { id: d.sender_id, username: currentOther?.username, avatar_url: currentOther?.avatar_url },
        });
        renderMessages();
        scrollToBottom();
      })
      .subscribe();
  }

  function unsubscribe() {
    if (dmChannel) { dmChannel.unsubscribe(); dmChannel = null; }
    dmMessages    = [];
    currentConvId = null;
  }

  /* ─── Rendu messages ───────────────────────────────────── */
  function renderMessage(msg) {
    const isMe   = msg.sender_id === myId();
    const sender = msg.sender || {};
    const name   = sender.username || '?';
    const av     = avatarEl(sender.avatar_url, name);
    const time   = fmtTime(msg.created_at);
    const edited = msg.is_edited ? `<span class="chat-edited">${t('dm.edited')}</span>` : '';

    let bubble = '';
    if (msg.message_type === 'ephemeral_image' || msg.message_type === 'image') {
      const src = msg.image_data || msg.image_url;
      bubble = `<div class="chat-ephemeral-wrap">
        <img src="${src}" class="chat-img" alt="photo">
        ${msg.image_data ? `<a class="chat-img-save" href="${src}" download="photo.jpg">${Icons.s('download', 13)} ${t('dm.save_img')}</a>` : ''}
      </div>`;
    } else {
      const editBtn = isMe
        ? `<button class="chat-edit-btn" data-mid="${esc(msg.id)}" data-mc="${esc(msg.content || '')}">${Icons.s('edit', 12)}</button>`
        : '';
      bubble = `<span class="chat-bubble-text">${esc(msg.content || '')}</span>${editBtn}`;
    }

    return `<div class="chat-row ${isMe ? 'chat-row-me' : 'chat-row-other'}" data-msg-id="${esc(msg.id)}">
      ${!isMe ? av : ''}
      <div class="chat-col">
        ${!isMe ? `<span class="chat-username">${esc(name)}</span>` : ''}
        <div class="chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}">${bubble}</div>
        <span class="chat-time">${time}${edited}</span>
      </div>
      ${isMe ? av : ''}
    </div>`;
  }

  function renderMessages() {
    const body = document.getElementById('dm-body');
    if (!body) return;

    if (!dmMessages.length) {
      body.innerHTML = `<p class="dm-empty">${t('dm.empty')}</p>`;
      return;
    }

    body.innerHTML = dmMessages.map(renderMessage).join('');

    body.querySelectorAll('.chat-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => startInlineEdit(btn.dataset.mid, btn.dataset.mc));
    });
  }

  function scrollToBottom() {
    const body = document.getElementById('dm-body');
    if (body) setTimeout(() => { body.scrollTop = body.scrollHeight; }, 60);
  }

  /* ─── Edition inline ───────────────────────────────────── */
  function startInlineEdit(msgId, currentContent) {
    const row = document.querySelector(`#dm-body [data-msg-id="${msgId}"] .chat-bubble`);
    if (!row) return;
    row.innerHTML = `
      <div class="chat-edit-form">
        <input type="text" class="chat-edit-input" value="${esc(currentContent)}">
        <div class="chat-edit-actions">
          <button class="chat-edit-cancel">${Icons.s('x', 13)}</button>
          <button class="chat-edit-save">${Icons.s('check', 13)}</button>
        </div>
      </div>`;
    const input = row.querySelector('.chat-edit-input');
    input?.focus(); input?.select();
    row.querySelector('.chat-edit-save')?.addEventListener('click', () => editMessage(msgId, input.value));
    row.querySelector('.chat-edit-cancel')?.addEventListener('click', renderMessages);
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); editMessage(msgId, input.value); }
      if (e.key === 'Escape') renderMessages();
    });
  }

  /* ─── Liste des conversations ──────────────────────────── */
  async function loadConversations() {
    if (!App.supabase || !myId()) return;
    const me = myId();

    const { data } = await App.supabase
      .from('private_conversations')
      .select('*')
      .or(`user1_id.eq.${me},user2_id.eq.${me}`)
      .order('last_message_at', { ascending: false });

    if (!data?.length) { conversations = []; renderConversationsList(); return; }

    const otherIds = [...new Set(data.map(c => c.user1_id === me ? c.user2_id : c.user1_id))];
    const { data: profiles } = await App.supabase
      .from('profiles').select('id, username, avatar_url').in('id', otherIds);

    const pMap = {};
    (profiles || []).forEach(p => { pMap[p.id] = p; });

    conversations = data.map(c => {
      const otherId = c.user1_id === me ? c.user2_id : c.user1_id;
      return { ...c, other: pMap[otherId] || { id: otherId, username: '?', avatar_url: null } };
    });

    renderConversationsList();
  }

  function renderConversationsList() {
    const section = document.getElementById('dm-conversations-section');
    const list    = document.getElementById('dm-conversations-list');
    if (!section || !list) return;

    if (!conversations.length) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');

    const me = myId();
    list.innerHTML = conversations.map(c => {
      const isLastMe = c.last_message_sender_id === me;
      const lastText = c.last_message_text
        ? `${isLastMe ? t('dm.you_prefix') : ''}${esc(c.last_message_text)}`
        : t('dm.start');
      return `<div class="dm-convo-item" data-cid="${c.id}" data-uid="${c.other.id}">
        ${avatarEl(c.other.avatar_url, c.other.username, 'dm-convo-av')}
        <div class="dm-convo-info">
          <span class="dm-convo-name">${esc(c.other.username || '?')}</span>
          <span class="dm-convo-last">${lastText}</span>
        </div>
        <span class="dm-convo-time">${fmtShort(c.last_message_at)}</span>
      </div>`;
    }).join('');

    list.querySelectorAll('.dm-convo-item').forEach(item => {
      item.addEventListener('click', () => {
        const conv = conversations.find(c => c.id === item.dataset.cid);
        if (conv) openDMFromConv(conv);
      });
    });
  }

  async function openDMFromConv(conv) {
    currentOther  = conv.other;
    currentConvId = conv.id;
    openPage();
    await loadMessages(conv.id);
    subscribeToMessages(conv.id);
  }

  /* ─── Ouvrir une conversation DM ──────────────────────── */
  async function openDM(otherId, otherProfile) {
    currentOther = otherProfile;
    openPage();

    const convId = await getOrCreateConversation(otherId);
    if (!convId) { closeDM(); return; }
    currentConvId = convId;

    await loadMessages(convId);
    subscribeToMessages(convId);
  }

  function openPage() {
    const nameEl = document.getElementById('dm-other-name');
    const avEl   = document.getElementById('dm-other-av');
    if (nameEl) nameEl.textContent = currentOther?.username || '?';
    if (avEl)   avEl.innerHTML     = avatarEl(currentOther?.avatar_url, currentOther?.username, 'dm-header-av');
    App.navigate('dm');
    document.getElementById('dm-input')?.focus();
  }

  function closeDM() {
    unsubscribe();
    App.navigate('app');
    loadConversations();
  }

  /* ─── Init ─────────────────────────────────────────────── */
  function init() {
    document.getElementById('btn-dm-back')?.addEventListener('click', closeDM);
    document.getElementById('btn-dm-send')?.addEventListener('click', sendTextMessage);

    document.getElementById('dm-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
    });

    document.getElementById('dm-image-input')?.addEventListener('change', e => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
      e.target.value = '';
    });

    loadConversations();
  }

  return { init, openDM, loadConversations, renderConversationsList };

})();
