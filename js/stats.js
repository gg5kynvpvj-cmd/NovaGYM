/* ═══════════════════════════════════════════════════════════
   NovaGYM — Page Statistiques
   Nuage de points Canvas, macros, badges, compteurs
   ═══════════════════════════════════════════════════════════ */

window.Stats = (() => {

  /* ─── Nuage de points (Canvas) ───────────────────────── */
  function drawScatterChart(sessions) {
    const canvas = document.getElementById('scatter-chart');
    if (!canvas) return;

    const ctx    = canvas.getContext('2d');
    const dpr    = window.devicePixelRatio || 1;
    const rect   = canvas.getBoundingClientRect();

    // Résolution haute densité
    canvas.width  = rect.width  * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = 200;

    ctx.clearRect(0, 0, W, H);

    // Fond
    const isLight   = document.documentElement.classList.contains('light');
    const chartBg   = isLight ? '#F2F2F7' : '#0B0B0B';
    const gridColor = isLight ? 'rgba(0,0,0,0.07)' : '#1A1A1A';
    const lblColor  = isLight ? '#8E8E93' : '#555555';
    const emptyColor = isLight ? '#AEAEB2' : '#444444';

    ctx.fillStyle = chartBg;
    ctx.fillRect(0, 0, W, H);

    const completed = sessions.filter(s => s.completed);
    if (completed.length === 0) {
      ctx.fillStyle = emptyColor;
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Complète ta première séance', W / 2, H / 2);
      return;
    }

    // 30 derniers jours
    const now   = new Date();
    const from  = new Date(now);
    from.setDate(from.getDate() - 29);

    const recent = completed.filter(s => new Date(s.date || s.created_at) >= from);

    // Padding
    const pad = { top: 16, right: 20, bottom: 36, left: 40 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;

    // Echelle X : 0..29 (jours depuis 'from')
    const toX = (date) => {
      const d = new Date(date);
      const diff = Math.floor((d - from) / (1000 * 60 * 60 * 24));
      return pad.left + (diff / 29) * cW;
    };

    // Echelle Y : volume (0..max)
    const volumes = recent.map(s => s.volume || 1);
    const maxVol  = Math.max(...volumes, 1);
    const toY = (vol) => pad.top + cH - ((vol / maxVol) * cH);

    // Grille
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // Axe X — labels
    ctx.fillStyle  = lblColor;
    ctx.font       = `10px -apple-system, sans-serif`;
    ctx.textAlign  = 'center';
    [0, 7, 14, 21, 29].forEach(dayOff => {
      const d = new Date(from);
      d.setDate(d.getDate() + dayOff);
      const label = d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
      ctx.fillText(label, pad.left + (dayOff / 29) * cW, H - 6);
    });

    // Axe Y — labels
    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach(ratio => {
      const val = Math.round(maxVol * ratio);
      const y   = pad.top + cH - (ratio * cH);
      ctx.fillText(val + 'kg', pad.left - 6, y + 4);
    });

    // Points
    recent.forEach(session => {
      const x   = toX(session.date || session.created_at);
      const vol  = session.volume || 1;
      const y   = toY(vol);
      const r   = Math.max(5, Math.min(12, 4 + (vol / maxVol) * 8));

      // Halo
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      grad.addColorStop(0, 'rgba(182, 255, 0, 0.4)');
      grad.addColorStop(1, 'rgba(182, 255, 0, 0)');
      ctx.beginPath();
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Point
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#B6FF00';
      ctx.fill();
    });

    // Ligne de tendance
    if (recent.length > 1) {
      const n  = recent.length;
      const xs = recent.map(s => toX(s.date || s.created_at));
      const ys = recent.map(s => toY(s.volume || 1));
      const mx = xs.reduce((a,b) => a+b, 0) / n;
      const my = ys.reduce((a,b) => a+b, 0) / n;
      const slope = xs.reduce((acc,x,i) => acc + (x-mx)*(ys[i]-my), 0)
                  / xs.reduce((acc,x)  => acc + (x-mx)**2, 0);
      const intercept = my - slope * mx;

      const x1 = xs[0];
      const x2 = xs[xs.length - 1];
      ctx.beginPath();
      ctx.moveTo(x1, slope * x1 + intercept);
      ctx.lineTo(x2, slope * x2 + intercept);
      ctx.strokeStyle = 'rgba(182, 255, 0, 0.25)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* ─── Compteurs ──────────────────────────────────────── */
  function renderCounters() {
    const sessions = App.state.sessions || [];
    const badges   = App.state.badges   || [];
    const streak   = Badges.calculateStreak(sessions);

    animateCounter('stat-total-sessions', sessions.filter(s => s.completed).length);
    animateCounter('stat-current-streak', streak);
    animateCounter('stat-total-badges',   badges.length);
  }

  function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step  = Math.ceil(target / 20) || 1;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 40);
  }

  /* ─── Refresh complet ─────────────────────────────────── */
  async function refresh() {
    // Charge les sessions
    await loadSessions();

    // Charge les badges
    if (App.state.user) {
      await Badges.loadEarned(App.state.user.id);
    }

    drawScatterChart(App.state.sessions || []);
    Badges.renderBadges('badges-grid');
    renderCounters();
  }

  /* ─── Charge les sessions ─────────────────────────────── */
  async function loadSessions() {
    const userId = App.state.user?.id;
    if (App.supabase && userId && !userId.startsWith('local_')) {
      const { data } = await App.supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (data) {
        App.state.sessions = data;
        App.local.set('sessions', data);
        return;
      }
    }
    App.state.sessions = App.local.get('sessions') || [];
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    // Re-draw au resize pour que le canvas reste net
    window.addEventListener('resize', () => {
      if (document.getElementById('tab-stats')?.classList.contains('active')) {
        drawScatterChart(App.state.sessions || []);
      }
    });
  }

  return { init, refresh, loadSessions };

})();
