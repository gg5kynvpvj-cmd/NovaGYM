/* ═══════════════════════════════════════════════════════════
   NovaGYM — Page "Aujourd'hui"
   Affiche la séance du jour, gère débutant/avancé,
   exercices unilatéraux, suivi des séries, fin de séance
   ═══════════════════════════════════════════════════════════ */

window.Today = (() => {

  // État local de la séance en cours
  let currentExercises  = [];
  let sessionType       = 'rest';
  let completedSets     = {};  // { exerciseId: { setIndex: done } }
  let sessionStartTime  = null;
  let planWorkoutId     = null;
  let planWorkoutName   = null;
  let planWorkoutColor  = null;

  const WORKOUT_COLORS = ['#FF6B6B','#FF9F43','#FECA57','#1DD1A1','#54A0FF','#B6FF00','#DDA0DD','#FD79A8'];

  function applyPlanWorkoutStyle(name, color) {
    const nameEl  = document.getElementById('session-type-name');
    const badge   = document.getElementById('session-type-badge');
    if (nameEl) nameEl.textContent = name;
    if (badge) {
      badge.style.borderColor = color || '';
      badge.style.color       = color || '';
      badge.style.background  = color ? color + '18' : '';
    }
  }

  /* ─── Auto-save séance en cours ─────────────────────── */
  const DRAFT_KEY = 'session_draft';

  function saveDraft() {
    if (!currentExercises.length) return;
    const today = new Date().toISOString().split('T')[0];
    const inputs = {};
    currentExercises.forEach(ex => {
      const card = document.querySelector(`.exercise-card[data-exercise-id="${ex.id}"]`);
      if (!card) return;
      inputs[ex.id] = [...card.querySelectorAll('.set-item, .set-item-unilateral')].map(item => ({
        reps:    item.querySelector('.set-reps-input')?.value    || '',
        weight:  item.querySelector('.set-weight-input')?.value  || '',
        repsL:   item.querySelector('.uni-reps-left')?.value     || '',
        weightL: item.querySelector('.uni-weight-left')?.value   || '',
        repsR:   item.querySelector('.uni-reps-right')?.value    || '',
        weightR: item.querySelector('.uni-weight-right')?.value  || '',
      }));
    });
    App.local.set(DRAFT_KEY, {
      date: today, sessionType, exercises: currentExercises,
      completedSets, startTime: sessionStartTime, inputs,
      planWorkoutId, planWorkoutName, planWorkoutColor,
    });
  }

  function clearDraft() { App.local.del(DRAFT_KEY); }

  function restoreDraftVisuals() {
    currentExercises.forEach(ex => {
      const card = document.querySelector(`.exercise-card[data-exercise-id="${ex.id}"]`);
      if (!card) return;
      Object.entries(completedSets[ex.id] || {}).forEach(([idx, done]) => {
        const items = [...card.querySelectorAll('.set-item, .set-item-unilateral')];
        const item = items[parseInt(idx)];
        if (!item) return;
        if (done === true) {
          item.classList.add('done');
          item.querySelector('.set-check-btn')?.classList.add('done');
        } else if (done && typeof done === 'object') {
          if (done.left) {
            item.querySelector('.unilateral-btn[data-side="left"]')?.classList.add('done');
            item.querySelector('.uni-side-row[data-side="left"]')?.classList.add('done');
          }
          if (done.right) {
            item.querySelector('.unilateral-btn[data-side="right"]')?.classList.add('done');
            item.querySelector('.uni-side-row[data-side="right"]')?.classList.add('done');
          }
          if (done.left && done.right) item.classList.add('done');
        }
      });
      checkCardCompletion(ex.id);
    });
  }

  /* ─── Carte quotidienne (pas + défis personnels) ────── */
  function dailyStorageKey() {
    return 'daily_' + new Date().toISOString().split('T')[0];
  }
  function getDailyData() {
    const d = App.local.get(dailyStorageKey()) || {};
    return { steps: d.steps || 0, challenges: d.challenges || {} };
  }
  function saveDailyData(data) {
    App.local.set(dailyStorageKey(), data);
  }
  function getStepsGoal() {
    return parseInt(App.local.get('steps_goal')) || 10000;
  }
  function getWaterGoal() {
    return parseInt(App.local.get('water_goal')) || 2000;
  }
  function getWaterConsumed() {
    const today = new Date().toISOString().split('T')[0];
    const raw   = App.local.get('nutrition_' + today);
    if (!raw || Array.isArray(raw)) return 0;
    return raw.water || 0;
  }
  function renderWaterChallenge() {
    const goal     = getWaterGoal();
    const consumed = getWaterConsumed();
    const pct      = Math.min(100, goal > 0 ? Math.round((consumed / goal) * 100) : 0);
    const done     = consumed >= goal;

    const summary = document.getElementById('today-water-summary');
    if (summary) summary.textContent = `${consumed.toLocaleString('fr-FR')} / ${goal.toLocaleString('fr-FR')} ml`;

    const fill = document.getElementById('today-water-fill');
    if (fill) fill.style.width = pct + '%';

    const pctLbl = document.getElementById('today-water-pct');
    if (pctLbl) pctLbl.textContent = pct + '%';

    const section = document.querySelector('.daily-water-section');
    if (section) section.classList.toggle('water-done', done);
  }
  function getCustomChallenges() {
    return App.local.get('custom_challenges') || [];
  }
  function saveCustomChallenges(list) {
    App.local.set('custom_challenges', list);
  }

  function renderDailyCard() {
    const data   = getDailyData();
    const goal   = getStepsGoal();
    const steps  = data.steps;
    const kcal   = Math.round(steps * 0.04);
    const pct    = Math.min(100, goal > 0 ? (steps / goal) * 100 : 0);

    // Pas
    const stepsInput = document.getElementById('steps-input');
    if (stepsInput && document.activeElement !== stepsInput) stepsInput.value = steps;


    const kcalLabel = document.getElementById('steps-kcal-label');
    if (kcalLabel) kcalLabel.textContent = `~${kcal} kcal`;

    const fill = document.getElementById('steps-fill');
    if (fill) fill.style.width = pct + '%';

    // Défis personnels
    const list = document.getElementById('challenges-list');
    if (!list) return;

    const stepsOk   = steps >= goal;
    const customs   = getCustomChallenges();

    list.innerHTML = `
      <div class="challenge-row steps-goal-row${stepsOk ? ' done' : ''}" title="Appuyer pour modifier l'objectif">
        <span class="challenge-emoji">${Icons.s('activity', 16)}</span>
        <span class="challenge-label">${goal.toLocaleString('fr-FR')} pas <span class="steps-goal-edit-hint">✎</span></span>
        <span class="challenge-status">${stepsOk ? '✓' : ''}</span>
      </div>
    ` + customs.map(c => `
      <div class="challenge-row${data.challenges[c.id] ? ' done' : ''}" data-challenge="${c.id}">
        <span class="challenge-emoji">${Icons.s('target', 16)}</span>
        <span class="challenge-label">${c.label}</span>
        <span class="challenge-status">${data.challenges[c.id] ? '✓' : ''}</span>
        <button class="challenge-del-btn" data-del="${c.id}" title="Supprimer">✕</button>
      </div>
    `).join('');

    renderWaterChallenge();

    // Modifier l'objectif de pas en cliquant sur la ligne
    list.querySelector('.steps-goal-row')?.addEventListener('click', () => {
      const inp = prompt('Objectif de pas par jour :', goal);
      const val = parseInt(inp);
      if (val > 0) {
        App.local.set('steps_goal', val);
        renderDailyCard();
      }
    });

    // Toggle défi
    list.querySelectorAll('[data-challenge]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.challenge-del-btn')) return;
        const d = getDailyData();
        d.challenges[row.dataset.challenge] = !d.challenges[row.dataset.challenge];
        saveDailyData(d);
        renderDailyCard();
      });
    });
    // Supprimer défi
    list.querySelectorAll('.challenge-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('Supprimer ce défi ?')) return;
        const id  = btn.dataset.del;
        const upd = getCustomChallenges().filter(c => c.id !== id);
        saveCustomChallenges(upd);
        const d = getDailyData();
        delete d.challenges[id];
        saveDailyData(d);
        renderDailyCard();
      });
    });
  }

  function initDailyCard() {
    // Compteur de pas
    const stepsInput = document.getElementById('steps-input');
    if (stepsInput) {
      stepsInput.addEventListener('input', () => {
        const d = getDailyData();
        d.steps = Math.max(0, parseInt(stepsInput.value) || 0);
        saveDailyData(d);
        renderDailyCard();
        if (window.Nutrition) Nutrition.render();
      });
    }
    document.querySelectorAll('.steps-adj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = getDailyData();
        d.steps = Math.max(0, d.steps + parseInt(btn.dataset.adj));
        saveDailyData(d);
        renderDailyCard();
        if (window.Nutrition) Nutrition.render();
      });
    });


    // Modifier objectif eau en cliquant sur la section
    document.querySelector('.daily-water-section')?.addEventListener('click', () => {
      const inp = prompt('Objectif d\'eau par jour (ml) :', getWaterGoal());
      const val = parseInt(inp);
      if (val > 0) {
        App.local.set('water_goal', val);
        renderWaterChallenge();
        if (window.Nutrition) Nutrition.render();
      }
    });

    // Ajouter un défi personnalisé
    const addInput = document.getElementById('challenge-add-input');
    const addBtn   = document.getElementById('btn-add-challenge');
    function addChallenge() {
      const label = addInput?.value?.trim();
      if (!label) return;
      const list = getCustomChallenges();
      list.push({ id: 'c_' + Date.now(), label });
      saveCustomChallenges(list);
      if (addInput) addInput.value = '';
      renderDailyCard();
    }
    addBtn?.addEventListener('click', addChallenge);
    addInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addChallenge(); }
    });
  }

  /* ─── Formatage de la date ───────────────────────────── */
  function getTodayLabel() {
    const opts = { weekday:'long', day:'numeric', month:'long' };
    const str  = new Date().toLocaleDateString('fr-FR', opts);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ─── Refresh header ─────────────────────────────────── */
  function refreshHeader() {
    const profile = App.state.profile;
    const name    = profile?.username || 'Champion';

    document.getElementById('greeting-name').textContent = name;
    document.getElementById('today-date').textContent    = getTodayLabel();

    // Pilule calories
    if (profile) {
      const cal = Programs.calculateCalories(profile);
      const pill = document.getElementById('today-calories-pill');
      if (pill) pill.textContent = `${cal.calories} kcal`;
    }
  }

  /* ─── Réordonnancement exercices ────────────────────── */
  function moveExercise(exerciseId, direction) {
    const idx = currentExercises.findIndex(e => e.id === exerciseId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= currentExercises.length) return;
    [currentExercises[idx], currentExercises[newIdx]] = [currentExercises[newIdx], currentExercises[idx]];
    reRenderExerciseList();
  }

  function reRenderExerciseList() {
    const list = document.getElementById('exercise-list');
    if (!list) return;
    // Réordonne les cartes existantes sans les recréer (préserve les valeurs saisies)
    const firstBtn = list.querySelector('.add-exercise-btn');
    currentExercises.forEach(ex => {
      const card = list.querySelector(`.exercise-card[data-exercise-id="${ex.id}"]`);
      if (card) list.insertBefore(card, firstBtn || null);
    });
    updateProgress();
  }

  /* ─── Formatage durée (mm:ss ou Xs) ─────────────────── */
  function fmtDur(s) {
    if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    return `${s}s`;
  }

  /* ─── Config de séries par défaut ───────────────────── */
  function defaultSetsConfig(exercise) {
    const total = exercise.defaultSets || 3;
    if (exercise.isTimer) {
      const dur = exercise.defaultReps || 30;
      const cfg = [{ type: 'W', duration: Math.round(dur * 0.7) }];
      for (let i = 1; i < total; i++) cfg.push({ type: 'S', duration: dur });
      return cfg;
    }
    const reps = exercise.defaultReps || 10;
    const cfg  = [{ type: 'W', reps: Math.round(reps * 1.5) }];
    for (let i = 1; i < total; i++) cfg.push({ type: 'S', reps });
    return cfg;
  }

  /* ─── Étiquette d'une série (W1, S1, S2…) ───────────── */
  function setLabel(setsConfig, index) {
    const type = (setsConfig[index]?.type) || 'S';
    const n    = setsConfig.slice(0, index + 1).filter(s => (s.type || 'S') === type).length;
    return `${type}${n}`;
  }

  /* ─── Render exercices ───────────────────────────────── */
  function renderExerciseCard(exercise, index) {
    const profile = App.state.profile;
    if (!exercise.sets_config) exercise.sets_config = defaultSetsConfig(exercise);
    if (!exercise.restSeconds) exercise.restSeconds = 90;

    if (!completedSets[exercise.id]) completedSets[exercise.id] = {};

    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.dataset.exerciseId = exercise.id;

    /* ── Header ── */
    const header = document.createElement('div');
    header.className = 'exercise-card-header';
    header.style.cursor = 'pointer';

    const nameEl = document.createElement('span');
    nameEl.className = 'exercise-name';
    nameEl.textContent = exercise.name;
    header.appendChild(nameEl);

    const headerRight = document.createElement('div');
    headerRight.className = 'exercise-header-right';

    // Boutons réordonnancement ↑ ↓
    const upBtn = document.createElement('button');
    upBtn.className = 'exercise-info-btn exercise-move-btn';
    upBtn.title = 'Monter'; upBtn.textContent = '↑';
    upBtn.addEventListener('click', (e) => { e.stopPropagation(); moveExercise(exercise.id, -1); });
    headerRight.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.className = 'exercise-info-btn exercise-move-btn';
    downBtn.title = 'Descendre'; downBtn.textContent = '↓';
    downBtn.addEventListener('click', (e) => { e.stopPropagation(); moveExercise(exercise.id, 1); });
    headerRight.appendChild(downBtn);

    // Info (tous les utilisateurs)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'exercise-info-btn';
    infoBtn.textContent = '?';
    infoBtn.title = 'Voir la fiche exercice';
    infoBtn.addEventListener('click', (e) => { e.stopPropagation(); openExerciseDetail(exercise); });
    headerRight.appendChild(infoBtn);

    // Éditer exercice (ouvre le modal éditeur)
    const editBtn = document.createElement('button');
    editBtn.className = 'exercise-info-btn';
    editBtn.title = 'Modifier l\'exercice';
    editBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); openExerciseEditor(exercise, nameEl); });
    headerRight.appendChild(editBtn);

    // Supprimer (tous les utilisateurs)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'exercise-info-btn exercise-delete-btn';
    deleteBtn.title = 'Supprimer';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const removeMsg = window.I18n ? I18n.t('today.remove_confirm').replace('%s', exercise.name) : `Retirer "${exercise.name}" de la séance ?`;
      if (!confirm(removeMsg)) return;
      currentExercises = currentExercises.filter(ex => ex.id !== exercise.id);
      delete completedSets[exercise.id];
      card.remove();
      updateProgress();
    });
    headerRight.appendChild(deleteBtn);

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = 'exercise-chevron';
    chevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    headerRight.appendChild(chevron);

    header.appendChild(headerRight);
    card.appendChild(header);

    /* ── Corps dépliable ── */
    const collapseBody = document.createElement('div');
    collapseBody.className = 'exercise-collapse-body';

    // Collapsed par défaut
    card.classList.add('collapsed');
    chevron.style.transform = 'rotate(-90deg)';
    header.addEventListener('click', () => {
      const collapsed = card.classList.toggle('collapsed');
      chevron.style.transform = collapsed ? 'rotate(-90deg)' : '';
    });

    // Lignes de séries depuis sets_config
    const setsRow = document.createElement('div');
    setsRow.className = 'sets-row';
    card._setsRow    = setsRow;
    const getRestFn  = () => parseInt(App.local.get('rest_' + exercise.id)) || exercise.restSeconds || 90;

    exercise.sets_config.forEach((sc, i) => {
      let setEl;
      if (exercise.isTimer) {
        setEl = buildTimerSet(exercise, i, sc, getRestFn);
      } else if (exercise.isUnilateral) {
        setEl = buildUnilateralSet(exercise, i, sc.reps, getRestFn);
      } else {
        setEl = buildRegularSet(exercise, i, sc, getRestFn);
      }
      setsRow.appendChild(setEl);
    });

    collapseBody.appendChild(setsRow);
    card.appendChild(collapseBody);
    return card;
  }

  /* ─── Série standard ─────────────────────────────────── */
  function buildRegularSet(exercise, index, setConfig, getRestFn) {
    const sc        = (typeof setConfig === 'object' && setConfig !== null) ? setConfig : { type: 'S', reps: setConfig || 10 };
    const reps      = sc.reps || 10;
    const isFailure = sc.isFailure || false;
    const repTarget = isFailure ? '∞' : reps;
    const label     = setLabel(exercise.sets_config || [], index);

    const item = document.createElement('div');
    item.className = 'set-item';

    item.innerHTML = `
      <span class="set-number">${label}</span>
      <span class="set-reps-label${isFailure ? ' failure' : ''}">×${repTarget}</span>
      <input class="set-reps-input" type="number" placeholder="${isFailure ? '∞' : ''}" min="0" step="1">
      <input class="set-weight-input" type="number" placeholder="kg" min="0" step="0.5">
      <button class="set-check-btn" type="button">✓</button>
    `;

    const repsInput = item.querySelector('.set-reps-input');
    const repsLabel = item.querySelector('.set-reps-label');
    if (repsInput && repsLabel) {
      repsInput.addEventListener('input', () => {
        repsLabel.style.display = repsInput.value ? 'none' : '';
      });
    }

    const checkBtn = item.querySelector('.set-check-btn');
    checkBtn.addEventListener('click', () => {
      const done = !checkBtn.classList.contains('done');
      checkBtn.classList.toggle('done', done);
      item.classList.toggle('done', done);

      if (!completedSets[exercise.id]) completedSets[exercise.id] = {};
      completedSets[exercise.id][index] = done;

      if (done) Timer.start(getRestFn ? getRestFn() : undefined);
      checkCardCompletion(exercise.id);
      updateProgress();
    });

    return item;
  }

  /* ─── Série unilatérale (G/D avec duplication auto) ─── */
  function buildUnilateralSet(exercise, index, reps, getRestFn) {
    const item = document.createElement('div');
    item.className = 'set-item-unilateral';

    item.innerHTML = `
      <div class="uni-header">
        <span class="set-number">${index === 0 ? 'W' : 'S' + index}</span>
        <span class="set-reps-label">×${reps}</span>
      </div>
      <div class="uni-side-row" data-side="left">
        <span class="uni-side-label">G</span>
        <input class="set-reps-input uni-reps-left" type="number" placeholder="" min="0" step="1">
        <input class="set-weight-input uni-weight-left" type="number" placeholder="kg" min="0" step="0.5">
        <button class="unilateral-btn" data-side="left" type="button">✓</button>
      </div>
      <div class="uni-side-row" data-side="right">
        <span class="uni-side-label">D</span>
        <input class="set-reps-input uni-reps-right" type="number" placeholder="" min="0" step="1">
        <input class="set-weight-input uni-weight-right" type="number" placeholder="kg" min="0" step="0.5">
        <button class="unilateral-btn" data-side="right" type="button">✓</button>
      </div>
    `;

    if (!completedSets[exercise.id]) completedSets[exercise.id] = {};
    if (!completedSets[exercise.id][index]) completedSets[exercise.id][index] = { left: false, right: false };

    const repsL   = item.querySelector('.uni-reps-left');
    const weightL = item.querySelector('.uni-weight-left');
    const repsR   = item.querySelector('.uni-reps-right');
    const weightR = item.querySelector('.uni-weight-right');

    item.querySelectorAll('.unilateral-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = btn.dataset.side;
        const done = !btn.classList.contains('done');
        btn.classList.toggle('done', done);
        item.querySelector(`.uni-side-row[data-side="${side}"]`)?.classList.toggle('done', done);
        completedSets[exercise.id][index][side] = done;

        // Auto-dupliquer vers l'autre côté si vide
        if (done && side === 'left' && !repsR.value && !weightR.value) {
          repsR.value   = repsL.value;
          weightR.value = weightL.value;
        }
        if (done && side === 'right' && !repsL.value && !weightL.value) {
          repsL.value   = repsR.value;
          weightL.value = weightR.value;
        }

        const both = completedSets[exercise.id][index].left && completedSets[exercise.id][index].right;
        item.classList.toggle('done', both);
        if (both) Timer.start(getRestFn ? getRestFn() : undefined);

        checkCardCompletion(exercise.id);
        updateProgress();
      });
    });

    return item;
  }

  /* ─── Série avec chronomètre intégré ────────────────── */
  function buildTimerSet(exercise, index, setConfig, getRestFn) {
    const duration  = setConfig.duration ?? exercise.defaultReps ?? 30;
    const label     = setLabel(exercise.sets_config || [], index);
    const isUni     = exercise.isUnilateral;

    const item = document.createElement('div');
    item.className = 'set-item set-item-timer';

    if (!completedSets[exercise.id]) completedSets[exercise.id] = {};

    if (isUni) {
      // Gainage latéral : G et D avec comptes à rebours séparés
      item.innerHTML = `
        <div class="uni-header">
          <span class="set-number">${label}</span>
          <span class="set-reps-label">${fmtDur(duration)}</span>
        </div>
        <div class="uni-side-row" data-side="left">
          <span class="uni-side-label">G</span>
          <div class="set-timer-block">
            <button class="set-timer-toggle" data-side="left" type="button">${Icons.s('play', 14)}</button>
            <span class="set-timer-disp" data-side="left">${fmtDur(duration)}</span>
          </div>
          <button class="unilateral-btn" data-side="left" type="button">✓</button>
        </div>
        <div class="uni-side-row" data-side="right">
          <span class="uni-side-label">D</span>
          <div class="set-timer-block">
            <button class="set-timer-toggle" data-side="right" type="button">${Icons.s('play', 14)}</button>
            <span class="set-timer-disp" data-side="right">${fmtDur(duration)}</span>
          </div>
          <button class="unilateral-btn" data-side="right" type="button">✓</button>
        </div>
      `;

      if (!completedSets[exercise.id][index]) completedSets[exercise.id][index] = { left: false, right: false };

      ['left', 'right'].forEach(side => {
        let rem = duration, running = false, iv = null;
        const toggleBtn = item.querySelector(`.set-timer-toggle[data-side="${side}"]`);
        const dispEl    = item.querySelector(`.set-timer-disp[data-side="${side}"]`);
        const checkBtn  = item.querySelector(`.unilateral-btn[data-side="${side}"]`);
        const sideRow   = item.querySelector(`.uni-side-row[data-side="${side}"]`);

        function validateSide() {
          clearInterval(iv); running = false;
          toggleBtn.textContent = '✓'; toggleBtn.disabled = true;
          completedSets[exercise.id][index][side] = true;
          checkBtn.classList.add('done'); sideRow.classList.add('done');
          const both = completedSets[exercise.id][index].left && completedSets[exercise.id][index].right;
          item.classList.toggle('done', both);
          if (both) Timer.start(getRestFn ? getRestFn() : undefined);
          checkCardCompletion(exercise.id); updateProgress();
        }

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (running) {
            running = false; clearInterval(iv); toggleBtn.innerHTML = Icons.s('play', 14);
          } else {
            if (rem <= 0) rem = duration;
            running = true; toggleBtn.innerHTML = Icons.s('pause', 14);
            iv = setInterval(() => {
              rem--;
              dispEl.textContent = fmtDur(rem);
              if (rem <= 0) { clearInterval(iv); running = false; validateSide(); }
            }, 1000);
          }
        });

        checkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const done = !checkBtn.classList.contains('done');
          if (done) {
            validateSide();
          } else {
            clearInterval(iv); running = false; rem = duration;
            toggleBtn.innerHTML = Icons.s('play', 14); toggleBtn.disabled = false;
            dispEl.textContent = fmtDur(duration);
            checkBtn.classList.remove('done'); sideRow.classList.remove('done');
            item.classList.remove('done');
            completedSets[exercise.id][index][side] = false;
            checkCardCompletion(exercise.id); updateProgress();
          }
        });
      });

    } else {
      // Exercice bilatéral (planche, etc.)
      item.innerHTML = `
        <span class="set-number">${label}</span>
        <div class="set-timer-block">
          <button class="set-timer-toggle" type="button">${Icons.s('play', 14)}</button>
          <span class="set-timer-disp">${fmtDur(duration)}</span>
        </div>
        <button class="set-check-btn" type="button">✓</button>
      `;

      let rem = duration, running = false, iv = null;
      const toggleBtn = item.querySelector('.set-timer-toggle');
      const dispEl    = item.querySelector('.set-timer-disp');
      const checkBtn  = item.querySelector('.set-check-btn');

      function validate() {
        clearInterval(iv); running = false;
        toggleBtn.textContent = '✓'; toggleBtn.disabled = true;
        if (!completedSets[exercise.id]) completedSets[exercise.id] = {};
        completedSets[exercise.id][index] = true;
        checkBtn.classList.add('done'); item.classList.add('done');
        Timer.start(getRestFn ? getRestFn() : undefined);
        checkCardCompletion(exercise.id); updateProgress();
      }

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (running) {
          running = false; clearInterval(iv); toggleBtn.innerHTML = Icons.s('play', 14);
        } else {
          if (rem <= 0) rem = duration;
          running = true; toggleBtn.innerHTML = Icons.s('pause', 14);
          iv = setInterval(() => {
            rem--;
            dispEl.textContent = fmtDur(rem);
            if (rem <= 0) { clearInterval(iv); running = false; validate(); }
          }, 1000);
        }
      });

      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const done = !checkBtn.classList.contains('done');
        checkBtn.classList.toggle('done', done);
        item.classList.toggle('done', done);
        if (done) {
          clearInterval(iv); running = false;
          toggleBtn.textContent = '✓'; toggleBtn.disabled = true;
          if (!completedSets[exercise.id]) completedSets[exercise.id] = {};
          completedSets[exercise.id][index] = true;
          Timer.start(getRestFn ? getRestFn() : undefined);
        } else {
          rem = duration; dispEl.textContent = fmtDur(duration);
          toggleBtn.innerHTML = Icons.s('play', 14); toggleBtn.disabled = false;
          delete completedSets[exercise.id]?.[index];
        }
        checkCardCompletion(exercise.id); updateProgress();
      });
    }

    return item;
  }

  /* ─── Vérifier si toutes les séries d'un exercice sont faites ─ */
  function checkCardCompletion(exerciseId) {
    const card = document.querySelector(`.exercise-card[data-exercise-id="${exerciseId}"]`);
    if (!card) return;

    const checks = card.querySelectorAll('.set-check-btn');
    const uniLeft  = card.querySelectorAll('.unilateral-btn[data-side="left"]');
    const uniRight = card.querySelectorAll('.unilateral-btn[data-side="right"]');

    let allDone = true;
    if (checks.length > 0) {
      allDone = [...checks].every(c => c.classList.contains('done'));
    } else if (uniLeft.length > 0) {
      allDone = [...uniLeft].every(c => c.classList.contains('done'))
             && [...uniRight].every(c => c.classList.contains('done'));
    }

    card.classList.toggle('completed', allDone);
  }

  /* ─── Progression ────────────────────────────────────── */
  function updateProgress() {
    const done  = document.querySelectorAll('.exercise-card.completed').length;
    const total = currentExercises.length;
    document.getElementById('session-progress-text').textContent = `${done} / ${total}`;

    // Affiche le bouton "Terminer" si tous les exercices sont faits
    const finishBtn = document.getElementById('btn-finish-session');
    if (finishBtn) finishBtn.classList.toggle('hidden', done < total || total === 0);
    saveDraft();
  }

  /* ─── Fiche exercice (modal) ─────────────────────────── */
  function openExerciseDetail(exercise) {
    const content = document.getElementById('exercise-detail-content');
    if (!content) return;

    const muscleTags = (exercise.muscles || []).map(m => `<span class="muscle-tag">${m}</span>`).join('');
    const tipItems   = (exercise.tips || []).map(t => `
      <div class="tip-item">
        <span class="tip-icon">✓</span>
        <span class="tip-text">${t}</span>
      </div>
    `).join('');

    content.innerHTML = `
      <h2 class="exercise-detail-name">${exercise.name}</h2>
      <p class="exercise-detail-muscles">${(exercise.muscles || []).join(' · ')}</p>

      <div class="detail-section">
        <p class="detail-section-title">Le mouvement</p>
        <p class="detail-description">${exercise.description || 'Description non disponible.'}</p>
      </div>

      <div class="detail-section">
        <p class="detail-section-title">Muscles travaillés</p>
        <div class="detail-muscles-list">${muscleTags}</div>
      </div>

      <div class="detail-section">
        <p class="detail-section-title">Comment bien l'exécuter</p>
        <div class="tips-list">${tipItems}</div>
      </div>
    `;

    document.getElementById('modal-exercise')?.classList.remove('hidden');
  }

  /* ─── Fin de séance ──────────────────────────────────── */
  async function finishSession() {
    const profile = App.state.profile;
    if (!profile) return;

    // Bloque si aucune série validée
    const hasAnyValidated = Object.values(completedSets).some(setMap =>
      Object.values(setMap).some(v => v === true || (v && v.left && v.right))
    );
    if (!hasAnyValidated) {
      alert(window.I18n ? I18n.t('today.min_series') : 'Valide au moins une série avant de terminer la séance.');
      return;
    }

    const duration = sessionStartTime
      ? Math.round((Date.now() - sessionStartTime) / 1000)
      : 0;

    // Bloque si la séance a duré moins de 3 minutes
    if (duration < 180) {
      const remaining = Math.ceil((180 - duration) / 60);
      const msg = window.I18n
        ? I18n.t('today.too_short').replace('%s', remaining)
        : `La séance doit durer au moins 3 minutes. Encore ${remaining} minute${remaining > 1 ? 's' : ''}.`;
      alert(msg);
      return;
    }

    // Calcule le volume total
    let totalVolume = 0;
    document.querySelectorAll('.set-weight-input').forEach(input => {
      const val = parseFloat(input.value);
      if (val > 0) totalVolume += val;
    });

    // Collecte les poids et reps par exercice
    const exercisesData = currentExercises.map(ex => {
      const card = document.querySelector(`.exercise-card[data-exercise-id="${ex.id}"]`);
      const setItems = card ? [...card.querySelectorAll('.set-item, .set-item-unilateral')] : [];
      const weights = [];
      const reps    = [];
      setItems.forEach(item => {
        const w = parseFloat(item.querySelector('.set-weight-input')?.value);
        const r = parseInt(item.querySelector('.set-reps-input')?.value);
        weights.push(isNaN(w) ? null : w);
        reps.push(isNaN(r) ? null : r);
      });
      return { id: ex.id, name: ex.name, weights, reps };
    });

    const session = {
      id:            'session_' + Date.now(),
      user_id:       App.state.user?.id,
      date:          new Date().toISOString().split('T')[0],
      type:          sessionType,
      workout_name:  planWorkoutName  || null,
      workout_color: planWorkoutColor || null,
      duration,
      completed:     true,
      volume:        totalVolume,
      exercises:     exercisesData,
    };

    // Sauvegarde locale
    const sessions = App.local.get('sessions') || [];
    sessions.unshift(session);
    App.local.set('sessions', sessions);
    App.state.sessions = sessions;

    // Compte les exercices dont toutes les séries sont validées
    const completedCount = currentExercises.filter(ex => {
      const sets  = ex.sets_config || [];
      const done  = completedSets[ex.id] || {};
      if (sets.length === 0) return false;
      return sets.every((sc, i) => {
        const s = done[i];
        if (ex.isUnilateral || (ex.isTimer && ex.isUnilateral)) return s?.left && s?.right;
        return s === true;
      });
    }).length;

    // Réinitialise l'état de séance (permet un re-render propre si on revient sur Today)
    currentExercises = [];
    completedSets    = {};
    sessionStartTime = null;
    planWorkoutId    = null;
    planWorkoutName  = null;
    planWorkoutColor = null;
    clearDraft();

    // Sauvegarde Supabase
    if (App.supabase && App.state.user && !App.state.user.id.startsWith('local_')) {
      const { data: savedSession, error: sessionErr } = await App.supabase.from('sessions').insert({
        user_id:   session.user_id,
        date:      session.date,
        type:      session.type,
        duration:  session.duration,
        completed: true,
        volume:    totalVolume,
      }).select('id').single();
      if (sessionErr) { console.warn(sessionErr.message); }
      else if (savedSession && exercisesData.length > 0) {
        const exRows = exercisesData.map(ex => ({
          session_id:    savedSession.id,
          exercise_name: ex.name,
          exercise_id:   String(ex.id || ''),
          sets: ex.weights.map((w, i) => ({ weight: w, reps: ex.reps?.[i] ?? 0 })),
        }));
        await App.supabase.from('session_exercises').insert(exRows)
          .then(({ error }) => { if (error) console.warn(error.message); });
      }
    }

    Timer.hideWidget();

    // Met à jour les défis de groupe automatiquement
    if (window.Groups) {
      Groups.autoUpdateChallengeProgress('sessions', 1);
      if (totalVolume > 0) Groups.autoUpdateChallengeProgress('volume', Math.round(totalVolume));
    }

    // Vérifie les badges
    const newBadges = await Badges.check(App.state.user?.id);

    // Check semaine complète
    const weekComplete = await Badges.checkWeekComplete(sessions);

    const tt = window.I18n ? I18n.t.bind(I18n) : k => k;
    if (weekComplete) {
      showCelebration(Icons.s('trophy', 52), tt('today.week_done'),
        `Bravo ${profile.username} ! Tu as complété toute ta semaine d'entraînement. Continue comme ça, tu es sur la bonne voie !`
      );
    } else if (newBadges.length > 0) {
      const b = newBadges[0];
      const bName = window.I18n ? I18n.t('badge.' + b.id + '.name') : b.id;
      showCelebration(Icons.s('medal', 52), tt('today.new_badge'), `Tu as débloqué : ${bName}`);
    } else {
      showCelebration(Icons.s('check', 52), tt('today.session_done'),
        `Bravo ${profile.username} ! ${completedCount} exercice${completedCount !== 1 ? 's' : ''} complété${completedCount !== 1 ? 's' : ''}. Récupère bien.`
      );
    }

    // Recharge l'historique et les stats
    await History.load();
    await Stats.refresh();
  }

  /* ─── Modal célébration ──────────────────────────────── */
  function showCelebration(icon, title, body) {
    document.getElementById('celebration-emoji').innerHTML = icon;
    document.getElementById('celebration-title').textContent = title;
    document.getElementById('celebration-body').textContent  = body;
    document.getElementById('modal-celebration')?.classList.remove('hidden');
  }

  /* ─── Render complet de la page Today ───────────────── */
  function render() {
    const profile = App.state.profile;
    if (!profile) return;

    refreshHeader();
    renderDailyCard();

    // Si une séance est en cours, ne pas re-rendre les exercices
    // (évite de perdre les valeurs saisies en changeant d'onglet)
    if (currentExercises.length > 0) return;

    // Restaure un brouillon de séance sauvegardé (si même journée)
    const _today = new Date().toISOString().split('T')[0];
    const _draft = App.local.get(DRAFT_KEY);
    if (_draft?.date === _today && Array.isArray(_draft.exercises) && _draft.exercises.length > 0) {
      sessionType      = _draft.sessionType;
      currentExercises = _draft.exercises;
      completedSets    = _draft.completedSets || {};
      sessionStartTime = _draft.startTime     || Date.now();
      planWorkoutId    = _draft.planWorkoutId  || null;
      planWorkoutName  = _draft.planWorkoutName || null;
      planWorkoutColor = _draft.planWorkoutColor || null;

      document.getElementById('rest-day-card')?.classList.add('hidden');
      document.getElementById('session-container')?.classList.remove('hidden');
      if (planWorkoutName) {
        applyPlanWorkoutStyle(planWorkoutName, planWorkoutColor);
      } else {
        const _nameEl = document.getElementById('session-type-name');
        if (_nameEl) _nameEl.textContent = Programs.SESSION_NAMES[sessionType] || sessionType;
      }

      const _list = document.getElementById('exercise-list');
      _list.innerHTML = '';
      currentExercises.forEach((ex, i) => _list.appendChild(renderExerciseCard(ex, i)));

      // Restaure les valeurs saisies
      const _inp = _draft.inputs || {};
      currentExercises.forEach(ex => {
        const card = document.querySelector(`.exercise-card[data-exercise-id="${ex.id}"]`);
        if (!card) return;
        const items = [...card.querySelectorAll('.set-item, .set-item-unilateral')];
        (_inp[ex.id] || []).forEach((d, i) => {
          const item = items[i]; if (!item) return;
          const fill = (sel, val) => { const el = item.querySelector(sel); if (el && val) el.value = val; };
          fill('.set-reps-input',   d.reps);
          fill('.set-weight-input', d.weight);
          fill('.uni-reps-left',    d.repsL);
          fill('.uni-weight-left',  d.weightL);
          fill('.uni-reps-right',   d.repsR);
          fill('.uni-weight-right', d.weightR);
        });
      });
      restoreDraftVisuals();

      const _addBtn = document.createElement('button');
      _addBtn.className = 'add-exercise-btn'; _addBtn.id = 'btn-add-exercise-today';
      _addBtn.textContent = window.I18n ? I18n.t('today.add_exercise') : '+ Ajouter un exercice';
      _addBtn.addEventListener('click', openExercisePicker);
      _list.appendChild(_addBtn);
      const _libBtn = document.createElement('button');
      _libBtn.className = 'add-exercise-btn';
      _libBtn.style.background = 'var(--bg-card-2)'; _libBtn.style.color = 'var(--text-2)';
      _libBtn.innerHTML = `${Icons.s('book-open', 16)} ${window.I18n ? I18n.t('modal.workout_lib') : 'Mes séances'}`;
      _libBtn.addEventListener('click', openWorkoutLib);
      _list.appendChild(_libBtn);

      updateEstimatedTime(currentExercises);
      updateProgress();
      return;
    }

    sessionType = Programs.getTodayType(profile);

    // Vérifie si une séance de la bibliothèque est planifiée aujourd'hui
    const todayPlan = Programs.getTodayPlanWorkout();
    const isRest = sessionType === 'rest' && !todayPlan;

    document.getElementById('rest-day-card')?.classList.toggle('hidden', !isRest);
    document.getElementById('session-container')?.classList.toggle('hidden', isRest);

    if (isRest) {
      Timer.hideWidget();
      planWorkoutId = null; planWorkoutName = null; planWorkoutColor = null;
      return;
    }

    if (todayPlan) {
      // Séance planifiée depuis la bibliothèque
      planWorkoutId   = todayPlan.id;
      planWorkoutName = todayPlan.name;
      planWorkoutColor = todayPlan.color || null;
      applyPlanWorkoutStyle(todayPlan.name, todayPlan.color);
      currentExercises = todayPlan.exercises.map(e => ({ ...e }));
    } else {
      // Séance auto (type)
      planWorkoutId = null; planWorkoutName = null; planWorkoutColor = null;
      const typeName = Programs.SESSION_NAMES[sessionType] || sessionType;
      const nameEl = document.getElementById('session-type-name');
      if (nameEl) nameEl.textContent = typeName;
      currentExercises = Programs.getExercisesForType(sessionType, profile.program_type, profile.level, profile.location);
    }
    updateEstimatedTime(currentExercises);
    completedSets    = {};
    sessionStartTime = Date.now();

    const list = document.getElementById('exercise-list');
    list.innerHTML = '';

    currentExercises.forEach((ex, i) => {
      list.appendChild(renderExerciseCard(ex, i));
    });

    // Bouton ajouter exercice — pour TOUS les utilisateurs
    const addBtn = document.createElement('button');
    addBtn.className = 'add-exercise-btn';
    addBtn.id = 'btn-add-exercise-today';
    addBtn.textContent = window.I18n ? I18n.t('today.add_exercise') : '+ Ajouter un exercice';
    addBtn.addEventListener('click', openExercisePicker);
    list.appendChild(addBtn);

    // Bouton bibliothèque de séances
    const libBtn = document.createElement('button');
    libBtn.className = 'add-exercise-btn';
    libBtn.style.background = 'var(--bg-card-2)';
    libBtn.style.color = 'var(--text-2)';
    libBtn.innerHTML = `${Icons.s('book-open', 16)} ${window.I18n ? I18n.t('modal.workout_lib') : 'Mes séances'}`;
    libBtn.addEventListener('click', openWorkoutLib);
    list.appendChild(libBtn);

    updateProgress();
  }

  /* ─── Picker d'exercices ─────────────────────────────── */
  function ALL_CATEGORIES() {
    const t = window.I18n ? I18n.t.bind(I18n) : k => k;
    return [
      { key: 'polyarticular', label: t('cat.polyarticular') },
      { key: 'home',          label: t('cat.home') },
      { key: 'pectoraux',     label: t('cat.pectoraux') },
      { key: 'dos',           label: t('cat.dos') },
      { key: 'epaules',       label: t('cat.epaules') },
      { key: 'biceps',        label: t('cat.biceps') },
      { key: 'triceps',       label: t('cat.triceps') },
      { key: 'abdominaux',    label: t('cat.abdominaux') },
      { key: 'quadriceps',    label: t('cat.quadriceps') },
      { key: 'ischio',        label: t('cat.ischio') },
      { key: 'fessiers',      label: t('cat.fessiers') },
      { key: 'mollets',       label: t('cat.mollets') },
      { key: 'custom',        label: t('cat.custom') },
    ];
  }
  function MUSCLE_CATS() { return ALL_CATEGORIES().filter(c => c.key !== 'home' && c.key !== 'custom'); }

  function openExercisePicker() {
    const modal   = document.getElementById('modal-exercise-picker');
    const catList = document.getElementById('picker-categories');
    const exList  = document.getElementById('picker-exercise-list');
    const search  = document.getElementById('picker-search');
    if (!modal) return;

    const cats = ALL_CATEGORIES();

    // Rend les catégories
    catList.innerHTML = cats.map(c =>
      `<button class="picker-cat-btn" data-cat="${c.key}">${c.label}</button>`
    ).join('');

    let activeCat = null;

    function showCategory(cat) {
      activeCat = cat;
      catList.querySelectorAll('.picker-cat-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.cat === cat)
      );
      let exercises;
      if (cat === 'custom') {
        exercises = getCustomExercises().map(e => ({ ...e, _cat: 'custom' }));
      } else if (cat === 'home') {
        exercises = [];
        MUSCLE_CATS().forEach(c => {
          const exs = window.EXERCISES_RESOLVE ? EXERCISES_RESOLVE(c.key) : (window.EXERCISES?.[c.key] || []);
          exs.forEach(e => { if (e.equipment === 'home') exercises.push({ ...e, _cat: c.key }); });
        });
      } else {
        exercises = window.EXERCISES_RESOLVE ? EXERCISES_RESOLVE(cat) : (window.EXERCISES?.[cat] || []);
      }
      renderPickerExercises(exercises);
    }

    function getAllExercises() {
      const all = [];
      cats.forEach(c => {
        if (c.key === 'custom') {
          getCustomExercises().forEach(e => all.push({ ...e, _cat: 'custom' }));
        } else {
          const exs = window.EXERCISES_RESOLVE ? EXERCISES_RESOLVE(c.key) : (window.EXERCISES?.[c.key] || []);
          exs.forEach(e => all.push({ ...e, _cat: c.key }));
        }
      });
      return all;
    }

    const t = window.I18n ? I18n.t.bind(I18n) : k => k;

    function renderPickerExercises(list, showCat = false) {
      const q           = search?.value?.toLowerCase() || '';
      const homeSearch  = q === 'maison' || q === 'home';
      const filtered    = q ? list.filter(e =>
        (homeSearch && e.equipment === 'home') ||
        e.name?.toLowerCase().includes(q) ||
        (e.muscles || []).some(m => m.toLowerCase().includes(q))
      ) : list;

      if (filtered.length === 0) {
        exList.innerHTML = `<p class="picker-empty">${t('today.no_exercise')}</p>`;
        return;
      }
      exList.innerHTML = filtered.map(ex => {
        const cat      = ex._cat || activeCat || '';
        const isCustom = ex.isCustom || cat === 'custom';
        const isHome   = ex.equipment === 'home';
        const catLabel = showCat ? (cats.find(c => c.key === cat)?.label || '') : '';
        const delIcon  = isCustom
          ? `<span class="picker-ex-del-icon" data-del-id="${ex.id}" title="${t('nutr.delete_item')}">${Icons.s('trash', 14)}</span>`
          : '';
        const homeBadge = isHome && !isCustom
          ? `<span class="picker-ex-home-badge">${Icons.s('home', 12)}</span>`
          : '';
        return `
          <button class="picker-ex-btn${isCustom ? ' picker-ex-custom' : ''}" data-id="${ex.id}" data-cat="${cat}">
            <span class="picker-ex-name">${ex.name}${catLabel ? `<span class="picker-ex-cat"> · ${catLabel}</span>` : ''}</span>
            <span class="picker-ex-muscles">${(ex.muscles || []).slice(0,2).join(', ')}</span>
            ${homeBadge}${delIcon}
          </button>`;
      }).join('');

      exList.querySelectorAll('.picker-ex-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const delIcon = e.target.closest('.picker-ex-del-icon');
          if (delIcon) {
            if (confirm(t('today.del_custom_confirm'))) {
              deleteCustomExercise(delIcon.dataset.delId);
              if (activeCat === 'custom') {
                showCategory('custom');
              } else {
                renderPickerExercises(getAllExercises(), true);
              }
            }
            return;
          }
          const exId = btn.dataset.id;
          const cat  = btn.dataset.cat;
          let exercise = getCustomExercises().find(ex => ex.id === exId);
          if (!exercise) {
            const resolved = window.EXERCISES_RESOLVE ? EXERCISES_RESOLVE(cat) : (window.EXERCISES?.[cat] || []);
            exercise = resolved.find(ex => ex.id === exId);
          }
          if (!exercise) return;
          addPickedExercise(exercise);
          closeModal('modal-exercise-picker');
        });
      });
    }

    // Search live — global si query présente
    if (search) {
      search.value = '';
      search.oninput = () => {
        const q = search.value.trim();
        if (q) {
          catList.querySelectorAll('.picker-cat-btn').forEach(b => b.classList.remove('active'));
          renderPickerExercises(getAllExercises(), true);
        } else {
          showCategory(activeCat || cats[0].key);
        }
      };
    }

    // Event delegation catégories
    catList.onclick = (e) => {
      const btn = e.target.closest('.picker-cat-btn');
      if (btn) showCategory(btn.dataset.cat);
    };

    // Affiche la première catégorie par défaut
    showCategory(cats[0].key);
    modal.classList.remove('hidden');
  }

  function addPickedExercise(exercise) {
    // Évite les doublons d'id
    if (currentExercises.some(e => e.id === exercise.id)) {
      exercise = { ...exercise, id: exercise.id + '_' + Date.now() };
    }
    if (!completedSets[exercise.id]) completedSets[exercise.id] = {};
    currentExercises.push(exercise);

    const list    = document.getElementById('exercise-list');
    const addBtn  = document.getElementById('btn-add-exercise-today');
    const card    = renderExerciseCard(exercise, currentExercises.length - 1);
    if (addBtn) list.insertBefore(card, addBtn);
    else list.appendChild(card);
    updateProgress();
  }

  function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

  /* ─── Temps estimé de séance ─────────────────────────── */
  function updateEstimatedTime(exercises) {
    const el = document.getElementById('session-estimated-time');
    if (!el || !exercises) return;
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.defaultSets || 3), 0);
    const minutes   = Math.round(totalSets * 2.5); // ~2.5 min par série (effort + repos)
    el.textContent  = `~${minutes} min`;
  }

  /* ─── Changement de type de séance ───────────────────── */
  function initSessionTypeChange() {
    function openSessionTypeModal() {
      const modal    = document.getElementById('modal-session-type');
      const typeList = document.getElementById('session-type-list');
      if (!modal || !typeList) return;

      typeList.innerHTML = Object.entries(Programs.SESSION_NAMES)
        .filter(([k]) => k !== 'rest')
        .map(([k, v]) => `
          <button class="picker-ex-btn" data-type="${k}">
            <span class="picker-ex-name">${v}</span>
          </button>
        `).join('');

      typeList.querySelectorAll('[data-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          sessionType = btn.dataset.type;
          const nameEl = document.getElementById('session-type-name');
          if (nameEl) nameEl.textContent = Programs.SESSION_NAMES[sessionType] || sessionType;

          const profile = App.state.profile;
          currentExercises = Programs.getExercisesForType(
            sessionType, profile?.program_type, profile?.level, profile?.location
          );
          completedSets    = {};
          sessionStartTime = Date.now();

          const list = document.getElementById('exercise-list');
          list.innerHTML = '';
          currentExercises.forEach((ex, i) => list.appendChild(renderExerciseCard(ex, i)));

          const addBtn = document.createElement('button');
          addBtn.className = 'add-exercise-btn';
          addBtn.id = 'btn-add-exercise-today';
          addBtn.textContent = window.I18n ? I18n.t('today.add_exercise') : '+ Ajouter un exercice';
          addBtn.addEventListener('click', openExercisePicker);
          list.appendChild(addBtn);

          const libBtn2 = document.createElement('button');
          libBtn2.className = 'add-exercise-btn';
          libBtn2.style.background = 'var(--bg-card-2)';
          libBtn2.style.color = 'var(--text-2)';
          libBtn2.innerHTML = `${Icons.s('book-open', 16)} ${window.I18n ? I18n.t('modal.workout_lib') : 'Mes séances'}`;
          libBtn2.addEventListener('click', openWorkoutLib);
          list.appendChild(libBtn2);

          updateProgress();
          updateEstimatedTime(currentExercises);
          closeModal('modal-session-type');
        });
      });

      modal.classList.remove('hidden');
    }

    document.getElementById('session-type-badge')?.addEventListener('click', openSessionTypeModal);

    document.getElementById('modal-session-type')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('btn-close-session-type')?.addEventListener('click', () => {
      closeModal('modal-session-type');
    });
  }

  /* ─── Exercices personnalisés (stockage) ────────────── */
  function getCustomExercises() {
    return App.local.get('custom_exercises') || [];
  }
  function saveCustomExercise(ex) {
    const list = getCustomExercises();
    list.push(ex);
    App.local.set('custom_exercises', list);
  }
  function deleteCustomExercise(id) {
    App.local.set('custom_exercises', getCustomExercises().filter(e => e.id !== id));
  }

  /* ─── Bibliothèque de séances ───────────────────────── */
  function getWorkoutLib() {
    return App.local.get('workout_library') || [];
  }

  function saveWorkoutToLib(name, exercises, color) {
    const lib = getWorkoutLib();
    lib.push({ id: Date.now(), name, color: color || null, exercises: exercises.map(e => ({ id: e.id, name: e.name, muscles: e.muscles, defaultSets: e.defaultSets, defaultReps: e.defaultReps, isUnilateral: e.isUnilateral })) });
    App.local.set('workout_library', lib);
  }

  function deleteWorkoutFromLib(id) {
    App.local.set('workout_library', getWorkoutLib().filter(t => t.id !== id));
    renderWorkoutLib();
  }

  function renderWorkoutLib() {
    const list = document.getElementById('workout-lib-list');
    if (!list) return;
    const lib = getWorkoutLib();
    const tl = window.I18n ? I18n.t.bind(I18n) : k => k;
    if (lib.length === 0) {
      list.innerHTML = `<div class="workout-lib-empty">${tl('today.lib_empty').replace(/\n/g, '<br>')}</div>`;
      return;
    }
    const plan = Programs.getWorkoutPlan();
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const todayKey = dayNames[new Date().getDay()];

    list.innerHTML = lib.map(t => {
      const colorDot = t.color
        ? `<span class="workout-color-dot" style="background:${t.color}"></span>`
        : `<span class="workout-color-dot workout-color-dot-empty"></span>`;
      const plannedDays = Object.entries(plan).filter(([,id]) => id === t.id).map(([d]) => Programs.getDayShort(d));
      const planBadge   = plannedDays.length
        ? `<span class="workout-plan-badge">${plannedDays.join(', ')}</span>`
        : '';
      return `
      <div class="workout-lib-item">
        ${colorDot}
        <div class="workout-lib-info">
          <div class="workout-lib-name" style="${t.color ? `color:${t.color}` : ''}">${t.name}${planBadge}</div>
          <div class="workout-lib-meta">${t.exercises.length} exercice${t.exercises.length > 1 ? 's' : ''}</div>
        </div>
        <button class="workout-lib-share" data-share-id="${t.id}" title="${tl('today.share_workout')}">${Icons.s('share', 14)}</button>
        <button class="workout-lib-edit" data-edit-id="${t.id}" title="Modifier">✎</button>
        <button class="workout-lib-load" data-lib-id="${t.id}">${tl('today.load_btn')}</button>
        <button class="workout-lib-del" data-del-id="${t.id}">✕</button>
      </div>
    `}).join('');
    list.querySelectorAll('.workout-lib-edit').forEach(btn => {
      btn.addEventListener('click', () => openWorkoutEditor(parseInt(btn.dataset.editId)));
    });
    list.querySelectorAll('.workout-lib-load').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = getWorkoutLib().find(t => t.id == btn.dataset.libId);
        if (!t) return;
        const loadMsg = window.I18n ? I18n.t('today.load_confirm').replace('%s', t.name) : `Charger "${t.name}" ? Les exercices actuels seront remplacés.`;
        if (confirm(loadMsg)) {
          const list2 = document.getElementById('exercise-list');
          const addBtn2 = document.getElementById('btn-add-exercise-today');
          currentExercises = [];
          completedSets    = {};
          if (list2 && addBtn2) {
            while (list2.firstChild && list2.firstChild !== addBtn2) list2.removeChild(list2.firstChild);
          }
          t.exercises.forEach(ex => addPickedExercise({ ...ex }));
          closeModal('modal-workout-lib');
        }
      });
    });
    list.querySelectorAll('.workout-lib-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = getWorkoutLib().find(t => t.id == btn.dataset.delId);
        if (confirm(`Supprimer la séance "${t?.name || ''}" ?`)) deleteWorkoutFromLib(parseInt(btn.dataset.delId));
      });
    });
    list.querySelectorAll('.workout-lib-share').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!App.supabase || !App.state.user?.id) {
          alert(window.I18n ? I18n.t('today.share_login_required') : 'Connecte-toi pour partager des séances.');
          return;
        }
        const workout = getWorkoutLib().find(t => t.id == btn.dataset.shareId);
        if (!workout) return;
        btn.disabled = true;
        const prev = btn.innerHTML;
        btn.innerHTML = '...';
        // Check if already shared under same name
        const { data: existing } = await App.supabase
          .from('shared_workouts')
          .select('id')
          .eq('user_id', App.state.user.id)
          .eq('name', workout.name)
          .maybeSingle();
        const payload = { user_id: App.state.user.id, name: workout.name, exercises: workout.exercises };
        const { error } = existing
          ? await App.supabase.from('shared_workouts').update({ exercises: workout.exercises }).eq('id', existing.id)
          : await App.supabase.from('shared_workouts').insert(payload);
        btn.disabled = false;
        btn.innerHTML = prev;
        if (!error) alert(window.I18n ? I18n.t('today.workout_shared') : 'Séance partagée sur ton profil !');
      });
    });
  }

  /* ─── Éditeur de séance sauvegardée ─────────────────────── */
  function openWorkoutEditor(workoutId) {
    const lib     = getWorkoutLib();
    const workout = lib.find(t => t.id === workoutId);
    if (!workout) return;

    let editingExercises = workout.exercises.map(e => ({ ...e }));

    document.getElementById('ew-name').value = workout.name;

    function renderEditorExercises() {
      const container = document.getElementById('ew-exercises-list');
      if (!container) return;
      container.innerHTML = '';
      editingExercises.forEach((ex, i) => {
        const row = document.createElement('div');
        row.className = 'we-ex-row';
        row.innerHTML = `
          <span class="we-ex-name">${ex.name}</span>
          <div class="we-ex-btns">
            <button class="we-ex-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="we-ex-btn" data-down="${i}" ${i === editingExercises.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="we-ex-btn we-ex-del" data-del="${i}">✕</button>
          </div>
        `;
        container.appendChild(row);
      });
      container.querySelectorAll('[data-up]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.up);
          if (idx > 0) { [editingExercises[idx - 1], editingExercises[idx]] = [editingExercises[idx], editingExercises[idx - 1]]; renderEditorExercises(); }
        });
      });
      container.querySelectorAll('[data-down]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.down);
          if (idx < editingExercises.length - 1) { [editingExercises[idx], editingExercises[idx + 1]] = [editingExercises[idx + 1], editingExercises[idx]]; renderEditorExercises(); }
        });
      });
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          editingExercises.splice(parseInt(btn.dataset.del), 1);
          renderEditorExercises();
        });
      });
    }

    renderEditorExercises();

    // Rendu du color picker
    let selectedColor = workout.color || null;
    const cpContainer = document.getElementById('ew-color-picker');
    if (cpContainer) {
      cpContainer.innerHTML = WORKOUT_COLORS.map(c => `
        <button class="color-swatch${c === selectedColor ? ' active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>
      `).join('') + `<button class="color-swatch color-swatch-none${!selectedColor ? ' active' : ''}" data-color="" title="Aucune couleur">✕</button>`;
      cpContainer.querySelectorAll('.color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          cpContainer.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedColor = btn.dataset.color || null;
        });
      });
    }

    document.getElementById('modal-edit-workout')?.classList.remove('hidden');

    document.getElementById('btn-ew-save').onclick = () => {
      const newName = document.getElementById('ew-name').value.trim();
      if (!newName) return;
      workout.name      = newName;
      workout.color     = selectedColor;
      workout.exercises = editingExercises;
      App.local.set('workout_library', lib);
      closeModal('modal-edit-workout');
      renderWorkoutLib();
    };
  }

  /* ─── Éditeur d'exercice (modal 📝) ─────────────────── */
  function openExerciseEditor(exercise, nameEl) {
    const modal = document.getElementById('modal-edit-exercise');
    if (!modal) return;
    if (!exercise.sets_config) exercise.sets_config = defaultSetsConfig(exercise);

    // Pré-remplit le nom
    document.getElementById('ee-name').value = exercise.name;

    // Pré-remplit le repos
    const restVal = parseInt(App.local.get('rest_' + exercise.id)) || exercise.restSeconds || 90;
    document.getElementById('ee-rest').value = restVal;

    // Rend la liste des séries
    renderEditorSets(exercise.sets_config, exercise.isTimer);

    modal.classList.remove('hidden');

    // Bouton delete — visible uniquement pour les exercices personnalisés
    const delBtn = document.getElementById('btn-ee-delete');
    if (delBtn) {
      delBtn.classList.toggle('hidden', !exercise.isCustom);
      delBtn.onclick = () => {
        const delMsg = window.I18n ? I18n.t('today.del_exercise_confirm').replace('%s', exercise.name) : `Supprimer définitivement l'exercice "${exercise.name}" ?`;
        if (confirm(delMsg)) {
          const exId = exercise.id;
          deleteCustomExercise(exId);
          currentExercises = currentExercises.filter(e => e.id !== exId);
          delete completedSets[exId];
          closeModal('modal-edit-exercise');
          document.querySelector(`.exercise-card[data-exercise-id="${exId}"]`)?.remove();
          updateProgress();
        }
      };
    }

    // Bouton + ajouter série
    document.getElementById('btn-ee-add-set').onclick = () => {
      exercise.sets_config.push(exercise.isTimer ? { type: 'S', duration: exercise.defaultReps || 30 } : { type: 'S', reps: 10 });
      renderEditorSets(exercise.sets_config, exercise.isTimer);
    };

    // Sauvegarde
    document.getElementById('btn-ee-save').onclick = () => {
      const newName = document.getElementById('ee-name').value.trim();
      const newRest = parseInt(document.getElementById('ee-rest').value) || 90;
      if (!newName) return;

      // Récupère les sets depuis le formulaire de l'éditeur
      const rows = document.querySelectorAll('.ee-set-row');
      exercise.sets_config = Array.from(rows).map(row => {
        const base = { type: row.querySelector('.ee-set-type').value };
        if (exercise.isTimer) {
          base.duration = parseInt(row.querySelector('.ee-set-reps').value) || 30;
        } else {
          base.reps      = parseInt(row.querySelector('.ee-set-reps').value) || 10;
          base.isFailure = row.querySelector('.ee-set-failure')?.checked || false;
        }
        return base;
      });

      exercise.name        = newName;
      exercise.restSeconds = newRest;
      App.local.set('rest_' + exercise.id, newRest);
      if (nameEl) nameEl.textContent = newName;

      closeModal('modal-edit-exercise');

      const card = document.querySelector(`.exercise-card[data-exercise-id="${exercise.id}"]`);
      if (card?._setsRow) {
        // ── Snapshot de l'état courant AVANT de vider ──────────────
        const snapshot = [];
        card._setsRow.querySelectorAll('.set-item, .set-item-unilateral').forEach((item) => {
          if (exercise.isUnilateral) {
            snapshot.push({
              repsL:     item.querySelector('.uni-reps-left')?.value    || '',
              weightL:   item.querySelector('.uni-weight-left')?.value  || '',
              repsR:     item.querySelector('.uni-reps-right')?.value   || '',
              weightR:   item.querySelector('.uni-weight-right')?.value || '',
              doneLeft:  item.querySelector('.unilateral-btn[data-side="left"]')?.classList.contains('done')  || false,
              doneRight: item.querySelector('.unilateral-btn[data-side="right"]')?.classList.contains('done') || false,
            });
          } else {
            snapshot.push({
              reps:   item.querySelector('.set-reps-input')?.value   || '',
              weight: item.querySelector('.set-weight-input')?.value || '',
              done:   item.querySelector('.set-check-btn')?.classList.contains('done') || false,
            });
          }
        });

        // ── Reconstruction ──────────────────────────────────────────
        card._setsRow.innerHTML = '';
        completedSets[exercise.id] = {};
        const getRestFn = () => newRest;

        exercise.sets_config.forEach((sc, i) => {
          let setEl;
          if (exercise.isTimer)           setEl = buildTimerSet(exercise, i, sc, getRestFn);
          else if (exercise.isUnilateral) setEl = buildUnilateralSet(exercise, i, sc.reps, getRestFn);
          else                            setEl = buildRegularSet(exercise, i, sc, getRestFn);
          card._setsRow.appendChild(setEl);

          // ── Restauration si cet index existait avant ────────────
          if (i >= snapshot.length) return;
          const snap = snapshot[i];

          if (exercise.isUnilateral) {
            const repsL   = setEl.querySelector('.uni-reps-left');
            const weightL = setEl.querySelector('.uni-weight-left');
            const repsR   = setEl.querySelector('.uni-reps-right');
            const weightR = setEl.querySelector('.uni-weight-right');
            const btnL    = setEl.querySelector('.unilateral-btn[data-side="left"]');
            const btnR    = setEl.querySelector('.unilateral-btn[data-side="right"]');
            const rowL    = setEl.querySelector('.uni-side-row[data-side="left"]');
            const rowR    = setEl.querySelector('.uni-side-row[data-side="right"]');
            if (repsL && snap.repsL)     repsL.value   = snap.repsL;
            if (weightL && snap.weightL) weightL.value = snap.weightL;
            if (repsR && snap.repsR)     repsR.value   = snap.repsR;
            if (weightR && snap.weightR) weightR.value = snap.weightR;
            if (!completedSets[exercise.id][i]) completedSets[exercise.id][i] = { left: false, right: false };
            if (snap.doneLeft  && btnL) { btnL.classList.add('done'); rowL?.classList.add('done'); completedSets[exercise.id][i].left  = true; }
            if (snap.doneRight && btnR) { btnR.classList.add('done'); rowR?.classList.add('done'); completedSets[exercise.id][i].right = true; }
            const both = completedSets[exercise.id][i].left && completedSets[exercise.id][i].right;
            setEl.classList.toggle('done', both);
          } else {
            const repsInput   = setEl.querySelector('.set-reps-input');
            const repsLabel   = setEl.querySelector('.set-reps-label');
            const weightInput = setEl.querySelector('.set-weight-input');
            const checkBtn    = setEl.querySelector('.set-check-btn');
            if (repsInput && snap.reps) {
              repsInput.value = snap.reps;
              if (repsLabel) repsLabel.style.display = 'none';
            }
            if (weightInput && snap.weight) weightInput.value = snap.weight;
            if (snap.done && checkBtn) {
              checkBtn.classList.add('done');
              setEl.classList.add('done');
              completedSets[exercise.id][i] = true;
            }
          }
        });
      } else {
        reRenderExerciseList();
      }
      checkCardCompletion(exercise.id);
      updateProgress();
    };
  }

  function renderEditorSets(setsConfig, isTimer = false) {
    const container = document.getElementById('ee-sets-list');
    if (!container) return;
    container.innerHTML = setsConfig.map((sc, i) => {
      const val = isTimer ? (sc.duration || 30) : (sc.reps || 10);
      const max = isTimer ? 3600 : 100;
      const timerOrFailure = isTimer
        ? ''
        : `<label class="toggle-row" style="gap:5px;font-size:12px"><input class="ee-set-failure" type="checkbox"${sc.isFailure ? ' checked' : ''}> Échec</label>`;
      return `
        <div class="ee-set-row" data-idx="${i}">
          <select class="ee-set-type input-field" style="width:70px">
            <option value="W"${sc.type === 'W' ? ' selected' : ''}>W</option>
            <option value="S"${sc.type !== 'W' ? ' selected' : ''}>S</option>
          </select>
          <input class="ee-set-reps input-field" type="number" value="${val}" min="1" max="${max}" style="width:65px" inputmode="numeric" placeholder="${isTimer ? 'sec' : 'reps'}">
          ${timerOrFailure}
          <button class="exercise-info-btn exercise-delete-btn ee-del-btn" data-idx="${i}" type="button">✕</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.ee-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setsConfig.splice(parseInt(btn.dataset.idx), 1);
        renderEditorSets(setsConfig);
      });
    });
  }

  function openWorkoutLib() {
    renderWorkoutLib();
    document.getElementById('modal-workout-lib')?.classList.remove('hidden');
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    document.getElementById('btn-close-exercise')?.addEventListener('click', () => {
      document.getElementById('modal-exercise')?.classList.add('hidden');
    });

    // Bibliothèque de séances
    document.getElementById('btn-close-workout-lib')?.addEventListener('click', () => {
      closeModal('modal-workout-lib');
    });
    document.getElementById('modal-workout-lib')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-workout-lib');
    });

    // Éditeur de séance sauvegardée
    document.getElementById('btn-close-edit-workout')?.addEventListener('click', () => {
      closeModal('modal-edit-workout');
    });
    document.getElementById('modal-edit-workout')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-edit-workout');
    });
    document.getElementById('btn-save-workout-lib')?.addEventListener('click', () => {
      if (currentExercises.length === 0) {
        alert(window.I18n ? I18n.t('today.save_first') : 'Ajoute des exercices avant de sauvegarder.');
        return;
      }
      const defaultName = `${window.I18n ? I18n.t('today.session_badge') : 'Séance'} ${new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}`;
      const name = prompt(window.I18n ? I18n.t('today.session_name_prompt') : 'Nom de la séance :', defaultName);
      if (!name?.trim()) return;
      saveWorkoutToLib(name.trim(), currentExercises);
      renderWorkoutLib();
      alert('Séance sauvegardée !');
    });

    document.getElementById('btn-close-edit-exercise')?.addEventListener('click', () => closeModal('modal-edit-exercise'));
    document.getElementById('modal-edit-exercise')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-edit-exercise');
    });

    document.getElementById('btn-close-exercise-picker')?.addEventListener('click', () => {
      closeModal('modal-exercise-picker');
    });
    document.getElementById('modal-exercise-picker')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-exercise-picker');
    });

    // Créer exercice personnalisé
    document.getElementById('btn-create-exercise')?.addEventListener('click', () => {
      closeModal('modal-exercise-picker');
      document.getElementById('ce-name').value = '';
      document.getElementById('ce-sets').value = '3';
      document.getElementById('ce-reps').value = '10';
      document.getElementById('ce-rest').value = '90';
      document.getElementById('ce-unilateral').checked = false;
      document.getElementById('ce-timer').checked = false;
      document.getElementById('ce-reps-label').textContent = 'Répétitions';
      document.getElementById('ce-error').textContent = '';
      document.getElementById('modal-create-exercise')?.classList.remove('hidden');
    });

    // Toggle "durée" dans le form de création
    document.getElementById('ce-timer')?.addEventListener('change', (e) => {
      const isTimer = e.target.checked;
      const label   = document.getElementById('ce-reps-label');
      const input   = document.getElementById('ce-reps');
      if (label) label.textContent = isTimer ? 'Durée (secondes)' : 'Répétitions';
      if (input) { input.value = isTimer ? '30' : '10'; input.max = isTimer ? '3600' : '100'; }
    });
    document.getElementById('btn-close-create-exercise')?.addEventListener('click', () => {
      closeModal('modal-create-exercise');
    });
    document.getElementById('modal-create-exercise')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-create-exercise');
    });
    document.getElementById('btn-save-custom-exercise')?.addEventListener('click', () => {
      const name = document.getElementById('ce-name').value.trim();
      if (!name) { document.getElementById('ce-error').textContent = 'Saisis un nom.'; return; }
      const muscle = document.getElementById('ce-muscle').value;
      const sets   = parseInt(document.getElementById('ce-sets').value) || 3;
      const reps   = parseInt(document.getElementById('ce-reps').value) || 10;
      const rest   = parseInt(document.getElementById('ce-rest').value) || 90;
      const uni    = document.getElementById('ce-unilateral').checked;

      const isTimer = document.getElementById('ce-timer')?.checked || false;
      const customEx = {
        id:          'custom_' + Date.now(),
        name,
        muscles:     [muscle],
        defaultSets: sets,
        defaultReps: reps,
        restSeconds: rest,
        isUnilateral: uni,
        isTimer,
        isCustom:    true,
      };
      saveCustomExercise(customEx);
      addPickedExercise(customEx);
      closeModal('modal-create-exercise');
    });

    document.getElementById('btn-finish-session')?.addEventListener('click', () => {
      if (confirm(window.I18n ? I18n.t('today.finish_confirm') : 'Terminer la séance ?')) finishSession();
    });

    document.getElementById('btn-close-celebration')?.addEventListener('click', () => {
      document.getElementById('modal-celebration')?.classList.add('hidden');
    });

    document.getElementById('modal-exercise')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });
    document.getElementById('modal-celebration')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });

    // Sauvegarde le brouillon quand l'utilisateur modifie un poids ou des reps
    document.getElementById('exercise-list')?.addEventListener('input', saveDraft);

    initSessionTypeChange();
    initDailyCard();
  }

  return { init, render, openExercisePicker, openWorkoutLib, renderWaterChallenge };

})();
