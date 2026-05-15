/* ═══════════════════════════════════════════════════════════
   NovaGYM — Chronomètre de repos STICKY
   Reste visible en permanence quand actif (même en scrollant)
   ═══════════════════════════════════════════════════════════ */

window.Timer = (() => {

  let seconds   = 90;   // Durée par défaut
  let remaining = 0;
  let running   = false;
  let interval  = null;
  let soundEnabled = true;

  const widget  = () => document.getElementById('timer-widget');
  const display = () => document.getElementById('timer-display');
  const toggle  = () => document.getElementById('timer-toggle');

  /* ─── Affichage ──────────────────────────────────────── */
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function updateDisplay() {
    const d = display();
    if (!d) return;
    d.textContent = formatTime(remaining);
    d.classList.toggle('warning', remaining <= 15 && running);
  }

  /* ─── Contrôles ──────────────────────────────────────── */
  function start(secs) {
    if (secs !== undefined) seconds = secs;
    remaining = seconds;
    running   = true;
    clearInterval(interval);
    interval = setInterval(tick, 1000);
    updateDisplay();
    updateToggleBtn();
    showWidget();
  }

  function pause() {
    running = false;
    clearInterval(interval);
    updateToggleBtn();
  }

  function resume() {
    if (remaining <= 0) { start(); return; }
    running  = true;
    interval = setInterval(tick, 1000);
    updateToggleBtn();
  }

  function reset() {
    pause();
    remaining = seconds;
    running   = false;
    updateDisplay();
    updateToggleBtn();
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(interval);
      running = false;
      remaining = 0;
      updateDisplay();
      updateToggleBtn();
      playEndAlarm();
      return;
    }
    remaining--;
    if (remaining === 15) playWarningBeep();
    updateDisplay();
  }

  function updateToggleBtn() {
    const btn = toggle();
    if (!btn) return;
    btn.textContent = running ? '⏸' : '▶';
    btn.style.background = running ? '#333' : 'var(--accent)';
    btn.style.color = running ? '#fff' : '#000';
  }

  /* ─── Visibilité du widget ───────────────────────────── */
  function showWidget() {
    widget()?.classList.remove('hidden');
  }

  function hideWidget() {
    pause();
    widget()?.classList.add('hidden');
  }

  /* ─── Sons ───────────────────────────────────────────── */

  // Alerte 15 secondes : 3 bips courts répétés
  function playWarningBeep() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.3, 0.6].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(660, ctx.currentTime + offset);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.28, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.22);
      });
    } catch(e) {}
  }

  // Alarme de fin : 5 bips forts et longs
  function playEndAlarm() {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.45, 0.9, 1.35, 1.8].forEach((offset, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        // Légère montée de fréquence sur les derniers bips
        osc.frequency.setValueAtTime(i < 3 ? 880 : 1040, ctx.currentTime + offset);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.6, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.38);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.38);
      });
    } catch(e) {}
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    // Bouton play/pause
    document.getElementById('timer-toggle')?.addEventListener('click', () => {
      if (running) pause();
      else if (remaining > 0) resume();
      else start();
    });

    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const secs = parseInt(btn.dataset.seconds);
        start(secs);
        // Feedback visuel
        document.querySelectorAll('.preset-btn').forEach(b => b.style.background = '');
        btn.style.background = 'var(--accent)';
        btn.style.color = '#000';
        setTimeout(() => {
          btn.style.background = '';
          btn.style.color = '';
        }, 400);
      });
    });

    // Son (réglage depuis settings)
    const soundToggle = document.getElementById('toggle-timer-sound');
    if (soundToggle) {
      const stored = App.local.get('timer_sound');
      soundEnabled = stored !== false;
      soundToggle.checked = soundEnabled;
      soundToggle.addEventListener('change', () => {
        soundEnabled = soundToggle.checked;
        App.local.set('timer_sound', soundEnabled);
      });
    }

    updateDisplay();
  }

  /* Démarrer depuis l'extérieur (ex: après avoir coché une série) */
  function startDefault() {
    start(seconds);
  }

  return { init, start, pause, resume, reset, hideWidget, showWidget, startDefault, playEndAlarm, get running() { return running; } };

})();
