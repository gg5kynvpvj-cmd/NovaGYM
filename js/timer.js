/* ═══════════════════════════════════════════════════════════
   NovaGYM — Chronomètre Dynamic Island
   iOS-compatible : AudioContext partagé, déverrouillé au 1er touch
   ═══════════════════════════════════════════════════════════ */

window.Timer = (() => {

  let seconds      = 90;
  let remaining    = 0;
  let running      = false;
  let interval     = null;
  let soundEnabled = true;
  let isExpanded   = false;

  /* ─── AudioContext partagé (iOS exige un seul contexte) ─── */
  let _ctx = null;

  function getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }

  function unlockAudio() {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  /* ─── Refs DOM ───────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  /* ─── Affichage ──────────────────────────────────────────── */
  function fmt(s) {
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  }

  function updateDisplay() {
    const time      = fmt(remaining);
    const isWarning = remaining <= 15 && running;

    const ds = $('timer-display');
    if (ds) { ds.textContent = time; ds.classList.toggle('warning', isWarning); }

    const db = $('timer-display-big');
    if (db) { db.textContent = time; db.classList.toggle('warning', isWarning); }
  }

  function updateBtns() {
    const icon = running ? Icons.s('pause', 14) : Icons.s('play', 14);
    const bg   = running ? 'rgba(255,255,255,0.15)' : 'var(--accent)';
    const col  = running ? '#fff' : '#000';
    [$('timer-toggle'), $('timer-toggle-big')].forEach(btn => {
      if (!btn) return;
      btn.innerHTML        = icon;
      btn.style.background = bg;
      btn.style.color      = col;
    });
  }

  /* ─── Expand / Collapse ──────────────────────────────────── */
  function expand() {
    isExpanded = true;
    $('di-collapsed')?.classList.add('hidden');
    $('di-expanded')?.classList.remove('hidden');
  }

  function collapse() {
    isExpanded = false;
    $('di-collapsed')?.classList.remove('hidden');
    $('di-expanded')?.classList.add('hidden');
  }

  /* ─── Visibilité widget ──────────────────────────────────── */
  function showWidget() { $('timer-widget')?.classList.remove('hidden'); }
  function hideWidget()  { pause(); $('timer-widget')?.classList.add('hidden'); collapse(); }

  /* ─── Contrôles ──────────────────────────────────────────── */
  function start(secs) {
    if (secs !== undefined) seconds = secs;
    remaining = seconds;
    running   = true;
    clearInterval(interval);
    interval = setInterval(tick, 1000);
    updateDisplay();
    updateBtns();
    showWidget();
  }

  function pause() {
    running = false;
    clearInterval(interval);
    updateBtns();
  }

  function resume() {
    if (remaining <= 0) { start(); return; }
    running  = true;
    interval = setInterval(tick, 1000);
    updateBtns();
  }

  function reset() {
    pause();
    remaining = seconds;
    updateDisplay();
    updateBtns();
  }

  function handleToggle() {
    if (running) pause();
    else if (remaining > 0) resume();
    else start();
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(interval);
      running   = false;
      remaining = 0;
      updateDisplay();
      updateBtns();
      playEndAlarm();
      return;
    }
    remaining--;
    if (remaining === 15) playWarningBeep();
    updateDisplay();
  }

  /* ─── Sons ───────────────────────────────────────────────── */
  function playBeeps(freqList, offsets, vol, dur) {
    if (!soundEnabled) return;
    try {
      const ctx = getCtx();
      ctx.resume().then(() => {
        offsets.forEach((t, i) => {
          const osc = ctx.createOscillator();
          const g   = ctx.createGain();
          osc.connect(g);
          g.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freqList[i] ?? freqList[0], ctx.currentTime + t);
          g.gain.setValueAtTime(vol, ctx.currentTime + t);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + dur);
        });
      });
    } catch (e) {}
  }

  function playWarningBeep() {
    playBeeps([660, 660, 660], [0, 0.28, 0.56], 0.28, 0.22);
  }

  function playEndAlarm() {
    playBeeps([880, 880, 880, 1040, 1040], [0, 0.42, 0.84, 1.26, 1.68], 0.6, 0.36);
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    /* Déverrouiller l'audio dès le 1er geste (obligatoire sur iOS) */
    const unlock = () => {
      unlockAudio();
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('click', unlock, true);
    };
    document.addEventListener('touchstart', unlock, { capture: true, passive: true });
    document.addEventListener('click', unlock, true);

    /* Expand au tap sur la pilule collapsed */
    $('di-collapsed')?.addEventListener('click', e => {
      if (e.target.closest('#timer-toggle')) return; // laisse le bouton gérer
      expand();
    });

    /* Collapse au clic hors du widget */
    document.addEventListener('click', e => {
      if (isExpanded && !e.target.closest('#timer-widget')) collapse();
    });

    /* Boutons play/pause */
    $('timer-toggle')?.addEventListener('click', e => {
      e.stopPropagation();
      handleToggle();
    });
    $('timer-toggle-big')?.addEventListener('click', e => {
      e.stopPropagation();
      handleToggle();
    });

    /* Presets */
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        start(parseInt(btn.dataset.seconds));
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 400);
      });
    });

    /* Bouton fermer ✕ */
    $('btn-timer-close')?.addEventListener('click', e => {
      e.stopPropagation();
      reset();
      hideWidget();
    });

    /* Toggle son */
    const soundToggle = $('toggle-timer-sound');
    if (soundToggle) {
      const stored = App.local.get('timer_sound');
      soundEnabled       = stored !== false;
      soundToggle.checked = soundEnabled;
      soundToggle.addEventListener('change', () => {
        soundEnabled = soundToggle.checked;
        App.local.set('timer_sound', soundEnabled);
      });
    }

    updateDisplay();
    updateBtns();
  }

  function startDefault() { start(seconds); }

  return {
    init, start, pause, resume, reset,
    hideWidget, showWidget, startDefault, playEndAlarm,
    get running() { return running; }
  };

})();
