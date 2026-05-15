/* ═══════════════════════════════════════════════════════════
   NovaGYM — Page Statistiques
   Nuage de points Canvas, macros, badges, compteurs
   ═══════════════════════════════════════════════════════════ */

window.Stats = (() => {

  let volumeRange = 7;
  let repsRange   = 7;

  /* ─── Utilitaires canvas ─────────────────────────────── */
  function setupCanvas(canvas, height) {
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, W: rect.width, H: height };
  }

  function chartColors() {
    const isLight = document.documentElement.classList.contains('light');
    return {
      bg:    isLight ? '#F2F2F7' : '#0B0B0B',
      grid:  isLight ? 'rgba(0,0,0,0.07)' : '#1A1A1A',
      lbl:   isLight ? '#8E8E93' : '#555555',
      empty: isLight ? '#AEAEB2' : '#444444',
    };
  }

  function drawEmpty(ctx, W, H, color) {
    ctx.fillStyle = color;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Complète ta première séance', W / 2, H / 2);
  }

  function drawGrid(ctx, pad, cW, cH, W, H, gridColor) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }
  }

  function drawXLabels(ctx, from, days, pad, cW, H, lblColor) {
    ctx.fillStyle = lblColor;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const ticks = days <= 7 ? [0, 2, 4, 6] : days <= 30 ? [0, 7, 14, 21, days - 1] : [0, 60, 120, 180, 240, 300, days - 1];
    ticks.forEach(off => {
      const d = new Date(from);
      d.setDate(d.getDate() + off);
      const lbl = days <= 30
        ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      ctx.fillText(lbl, pad.left + (off / (days - 1)) * cW, H - 6);
    });
  }

  /* ─── Nuage de points — Volume ───────────────────────── */
  function drawScatterChart(sessions, days) {
    days = days || volumeRange;
    const canvas = document.getElementById('scatter-chart');
    if (!canvas) return;
    const { ctx, W, H } = setupCanvas(canvas, 200);
    const { bg, grid, lbl, empty } = chartColors();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const completed = sessions.filter(s => s.completed);
    if (completed.length === 0) { drawEmpty(ctx, W, H, empty); return; }

    const now  = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - (days - 1));

    const recent = completed.filter(s => new Date(s.date || s.created_at) >= from);

    const pad = { top: 16, right: 20, bottom: 36, left: 44 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;

    const toX = d => pad.left + (Math.max(0, (new Date(d) - from) / (1000 * 60 * 60 * 24)) / (days - 1)) * cW;
    const volumes = recent.map(s => s.volume || 1);
    const maxVol  = Math.max(...volumes, 1);
    const toY = v => pad.top + cH - ((v / maxVol) * cH);

    drawGrid(ctx, pad, cW, cH, W, H, grid);
    drawXLabels(ctx, from, days, pad, cW, H, lbl);

    ctx.fillStyle = lbl;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach(ratio => {
      ctx.fillText(Math.round(maxVol * ratio) + 'kg', pad.left - 6, pad.top + cH - ratio * cH + 4);
    });

    recent.forEach(session => {
      const x = toX(session.date || session.created_at);
      const vol = session.volume || 1;
      const y = toY(vol);
      const r = Math.max(5, Math.min(12, 4 + (vol / maxVol) * 8));
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
      grad.addColorStop(0, 'rgba(182,255,0,0.4)');
      grad.addColorStop(1, 'rgba(182,255,0,0)');
      ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#B6FF00'; ctx.fill();
    });

    if (recent.length > 1) {
      const xs = recent.map(s => toX(s.date || s.created_at));
      const ys = recent.map(s => toY(s.volume || 1));
      const n  = xs.length;
      const mx = xs.reduce((a,b) => a+b,0)/n, my = ys.reduce((a,b) => a+b,0)/n;
      const slope = xs.reduce((acc,x,i) => acc+(x-mx)*(ys[i]-my),0) / xs.reduce((acc,x) => acc+(x-mx)**2,0);
      const inter = my - slope*mx;
      ctx.beginPath();
      ctx.moveTo(xs[0], slope*xs[0]+inter);
      ctx.lineTo(xs[n-1], slope*xs[n-1]+inter);
      ctx.strokeStyle = 'rgba(182,255,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4,4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /* ─── Graphique Reps ─────────────────────────────────── */
  function drawRepsChart(sessions, days) {
    days = days || repsRange;
    const canvas = document.getElementById('reps-chart');
    if (!canvas) return;
    const { ctx, W, H } = setupCanvas(canvas, 180);
    const { bg, grid, lbl, empty } = chartColors();

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const completed = sessions.filter(s => s.completed && Array.isArray(s.exercises) && s.exercises.length > 0);
    if (completed.length === 0) { drawEmpty(ctx, W, H, empty); return; }

    const now  = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - (days - 1));
    const recent = completed.filter(s => new Date(s.date || s.created_at) >= from);
    if (recent.length === 0) { drawEmpty(ctx, W, H, empty); return; }

    // Total reps per session
    const data = recent.map(s => {
      const reps = (s.exercises || []).reduce((sum, ex) => {
        return sum + (ex.reps || []).reduce((a, r) => a + (r || 0), 0);
      }, 0);
      return { date: s.date || s.created_at, reps };
    });

    const pad = { top: 16, right: 20, bottom: 36, left: 44 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;
    const maxR = Math.max(...data.map(d => d.reps), 1);
    const toX  = d => pad.left + (Math.max(0, (new Date(d) - from) / (1000*60*60*24)) / (days-1)) * cW;
    const toY  = r => pad.top + cH - ((r / maxR) * cH);

    drawGrid(ctx, pad, cW, cH, W, H, grid);
    drawXLabels(ctx, from, days, pad, cW, H, lbl);

    ctx.fillStyle = lbl;
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach(ratio => {
      ctx.fillText(Math.round(maxR * ratio), pad.left - 6, pad.top + cH - ratio * cH + 4);
    });

    // Ligne
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = toX(d.date), y = toY(d.reps);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(182,255,0,0.6)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Points
    data.forEach(d => {
      ctx.beginPath();
      ctx.arc(toX(d.date), toY(d.reps), 4, 0, Math.PI*2);
      ctx.fillStyle = '#B6FF00';
      ctx.fill();
    });
  }

  /* ─── Calendrier hebdomadaire ────────────────────────── */
  function renderWeeklyCalendar() {
    const container = document.getElementById('weekly-days');
    if (!container) return;

    const sessions  = App.state.sessions || [];
    const today     = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    // Start on Monday
    const monday    = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    const dayNames  = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    // Build set of session date strings (YYYY-MM-DD local)
    const sessionDates = new Set(sessions
      .filter(s => s.completed)
      .map(s => {
        const d = new Date(s.date || s.created_at);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      })
    );

    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const day  = new Date(monday);
      day.setDate(monday.getDate() + i);
      const key  = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const isToday  = key === todayKey;
      const hasSess  = sessionDates.has(key);

      const cell = document.createElement('div');
      cell.className = 'week-day' + (isToday ? ' today' : '');
      cell.innerHTML = `
        <span class="week-day-name">${dayNames[i]}</span>
        <span class="week-day-num">${day.getDate()}</span>
        <span class="week-day-dot${hasSess ? ' has-session' : ''}"></span>
      `;
      container.appendChild(cell);
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

    drawScatterChart(App.state.sessions || [], volumeRange);
    drawRepsChart(App.state.sessions || [], repsRange);
    renderWeeklyCalendar();
    Badges.renderBadges('badges-grid');
    renderCounters();
  }

  /* ─── Charge les sessions ─────────────────────────────── */
  async function loadSessions() {
    const userId = App.state.user?.id;
    if (App.supabase && userId && !userId.startsWith('local_')) {
      const { data } = await App.supabase
        .from('sessions')
        .select('*, session_exercises(*)')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (data) {
        App.state.sessions = data.map(s => ({
          ...s,
          exercises: (s.session_exercises || []).map(ex => ({
            name:    ex.exercise_name,
            id:      ex.exercise_id,
            weights: (ex.sets || []).map(set => set.weight),
            reps:    (ex.sets || []).map(set => set.reps),
          })),
        }));
        App.local.set('sessions', App.state.sessions);
        return;
      }
    }
    App.state.sessions = App.local.get('sessions') || [];
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    // Filtres graphique volume
    document.querySelectorAll('.chart-filter-btns:not(#reps-filter-btns) .chart-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-filter-btns:not(#reps-filter-btns) .chart-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        volumeRange = parseInt(btn.dataset.range);
        drawScatterChart(App.state.sessions || [], volumeRange);
      });
    });

    // Filtres graphique reps
    document.querySelectorAll('#reps-filter-btns .chart-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#reps-filter-btns .chart-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        repsRange = parseInt(btn.dataset.range);
        drawRepsChart(App.state.sessions || [], repsRange);
      });
    });

    // Re-draw au resize pour que le canvas reste net
    window.addEventListener('resize', () => {
      if (document.getElementById('tab-stats')?.classList.contains('active')) {
        drawScatterChart(App.state.sessions || [], volumeRange);
        drawRepsChart(App.state.sessions || [], repsRange);
      }
    });
  }

  return { init, refresh, loadSessions };

})();
