/* ═══════════════════════════════════════════════════════════
   NovaGYM — Nutrition tracker
   Anneau calories, macros, repas, scan code-barres, suivi
   ═══════════════════════════════════════════════════════════ */

window.Nutrition = (() => {

  let currentPeriod  = 'today';
  let baseNutrition  = null; // valeurs pour 100g stockées lors d'un scan

  function setMealField(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v;
  }

  function recalcFromQuantity() {
    if (!baseNutrition) return;
    const qty = parseFloat(document.getElementById('meal-quantity')?.value);
    if (!qty || qty <= 0) return;
    const f = qty / 100;
    setMealField('meal-calories', Math.round(baseNutrition.calories * f));
    setMealField('meal-protein',  Math.round(baseNutrition.protein  * f * 10) / 10);
    setMealField('meal-carbs',    Math.round(baseNutrition.carbs    * f * 10) / 10);
    setMealField('meal-fat',      Math.round(baseNutrition.fat      * f * 10) / 10);
  }

  /* ─── Clés localStorage ──────────────────────────────── */
  function dayKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return 'nutrition_' + y + '-' + m + '-' + day;
  }

  function todayKey() { return dayKey(new Date()); }

  function getData(key) {
    return App.local.get(key || todayKey()) || { meals: [] };
  }

  function saveData(data, key) {
    App.local.set(key || todayKey(), data);
  }

  /* ─── Agrège les données sur N jours ─────────────────── */
  function aggregateDays(numDays) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, days: 0 };
    for (let i = 0; i < numDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const data = getData(dayKey(d));
      if (!data.meals?.length) continue;
      totals.days++;
      data.meals.forEach(m => {
        totals.calories += m.calories || 0;
        totals.protein  += m.protein  || 0;
        totals.carbs    += m.carbs    || 0;
        totals.fat      += m.fat      || 0;
      });
    }
    return totals;
  }

  /* ─── Anneau calories (canvas) ───────────────────────── */
  function drawRing(consumed, goal) {
    const canvas = document.getElementById('nutrition-ring');
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const dpr  = window.devicePixelRatio || 1;
    const size = 140;

    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx    = size / 2;
    const cy    = size / 2;
    const r     = 54;
    const lw    = 14;
    const ratio = goal > 0 ? Math.min(consumed / goal, 1) : 0;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();

    if (ratio > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.strokeStyle = consumed > goal ? '#FF453A' : '#B6FF00';
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
  }

  /* ─── Calories brûlées par la marche (pas du jour) ─── */
  function getStepsBurned() {
    const key  = 'daily_' + todayKey();
    const data = App.local.get(key) || {};
    return Math.round((data.steps || 0) * 0.04);
  }

  /* ─── Calcule les objectifs depuis le profil ─────────── */
  function getGoals() {
    const profile = App.state.profile;
    if (!profile) return { goalCal: 0, goalP: 0, goalC: 0, goalF: 0 };
    const calc = Programs.calculateCalories(profile);
    return {
      goalCal: calc.calories || 0,
      goalP:   parseInt(calc.protein) || 0,
      goalC:   parseInt(calc.carbs)   || 0,
      goalF:   parseInt(calc.fat)     || 0,
    };
  }

  /* ─── Render complet ─────────────────────────────────── */
  function render() {
    const period = currentPeriod;

    if (period === 'today') {
      renderToday();
    } else {
      renderPeriod(period === 'week' ? 7 : 30);
    }
  }

  function renderToday() {
    const data  = getData();
    const meals = data.meals || [];

    const totals = meals.reduce((acc, m) => {
      acc.calories += m.calories || 0;
      acc.protein  += m.protein  || 0;
      acc.carbs    += m.carbs    || 0;
      acc.fat      += m.fat      || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const { goalCal, goalP, goalC, goalF } = getGoals();
    const stepsBurned   = getStepsBurned();
    const effectiveGoal = goalCal + stepsBurned;

    // Anneau + valeurs
    drawRing(totals.calories, effectiveGoal);
    setText('nutr-consumed', totals.calories);
    setText('nutr-goal',     effectiveGoal ? `${effectiveGoal} kcal` : '—');
    const rem = effectiveGoal - totals.calories;
    setText('nutr-remaining', effectiveGoal
      ? (rem >= 0 ? `${rem} restantes` : `${Math.abs(rem)} dépassées`)
      : '—');

    // Indicateur marche
    const stepsEl = document.getElementById('nutr-steps-burned');
    if (stepsEl) {
      if (stepsBurned > 0) {
        stepsEl.textContent = `👟 +${stepsBurned} kcal (marche)`;
        stepsEl.classList.remove('hidden');
      } else {
        stepsEl.classList.add('hidden');
      }
    }

    // Barres macros
    setText('nutr-p-val', `${totals.protein} / ${goalP || '—'} g`);
    setText('nutr-c-val', `${totals.carbs} / ${goalC || '—'} g`);
    setText('nutr-f-val', `${totals.fat} / ${goalF || '—'} g`);
    setBar('nutr-p-bar', totals.protein, goalP);
    setBar('nutr-c-bar', totals.carbs,   goalC);
    setBar('nutr-f-bar', totals.fat,     goalF);

    // Liste repas
    renderMealsList(meals);

    // Affiche section repas
    showSection('nutr-meals-section', true);
    showSection('nutr-period-section', false);
  }

  function renderPeriod(numDays) {
    const totals = aggregateDays(numDays);
    const { goalCal, goalP, goalC, goalF } = getGoals();
    const label = numDays === 7 ? 'Cette semaine' : 'Ce mois';
    const days  = totals.days || 1;

    // Anneau : moyenne journalière
    const avgCal = Math.round(totals.calories / days);
    drawRing(avgCal, goalCal);
    setText('nutr-consumed', avgCal);
    setText('nutr-goal',     goalCal ? `${goalCal} kcal` : '—');
    setText('nutr-remaining', `moy. / jour`);

    // Barres macros (moyennes)
    const avgP = Math.round(totals.protein / days);
    const avgC = Math.round(totals.carbs / days);
    const avgF = Math.round(totals.fat / days);
    setText('nutr-p-val', `${avgP} / ${goalP || '—'} g`);
    setText('nutr-c-val', `${avgC} / ${goalC || '—'} g`);
    setText('nutr-f-val', `${avgF} / ${goalF || '—'} g`);
    setBar('nutr-p-bar', avgP, goalP);
    setBar('nutr-c-bar', avgC, goalC);
    setBar('nutr-f-bar', avgF, goalF);

    // Section résumé période
    const periodEl = document.getElementById('nutr-period-section');
    if (periodEl) {
      periodEl.innerHTML = `
        <div class="nutr-period-summary">
          <h3 class="card-title">${label} — Totaux</h3>
          <div class="nutr-period-stats">
            <div class="nutr-period-stat">
              <span class="nutr-period-stat-val">${totals.calories}</span>
              <span class="nutr-period-stat-label">kcal</span>
            </div>
            <div class="nutr-period-stat">
              <span class="nutr-period-stat-val">${Math.round(totals.protein)}g</span>
              <span class="nutr-period-stat-label">Protéines</span>
            </div>
            <div class="nutr-period-stat">
              <span class="nutr-period-stat-val">${Math.round(totals.carbs)}g</span>
              <span class="nutr-period-stat-label">Glucides</span>
            </div>
            <div class="nutr-period-stat">
              <span class="nutr-period-stat-val">${Math.round(totals.fat)}g</span>
              <span class="nutr-period-stat-label">Lipides</span>
            </div>
          </div>
          <p class="nutr-period-days">${totals.days} jour${totals.days !== 1 ? 's' : ''} enregistré${totals.days !== 1 ? 's' : ''} sur ${numDays}</p>
        </div>
      `;
    }

    showSection('nutr-meals-section', false);
    showSection('nutr-period-section', true);
  }

  /* ─── Liste des repas ────────────────────────────────── */
  function renderMealsList(meals) {
    const list = document.getElementById('nutrition-meals-list');
    if (!list) return;

    if (!meals.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🥗</span>
          <p>Aucun repas enregistré aujourd'hui</p>
        </div>
      `;
      return;
    }

    list.innerHTML = meals.map((meal, idx) => {
      const qtyLabel = meal.quantity ? `${meal.quantity}g · ` : '';
      return `
      <div class="meal-card">
        <div class="meal-card-left">
          <span class="meal-name-text">${meal.name || 'Repas'}</span>
          <span class="meal-macros-text">${qtyLabel}P ${meal.protein || 0}g · G ${meal.carbs || 0}g · L ${meal.fat || 0}g</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="meal-calories-text">${meal.calories || 0} kcal</span>
          <button class="btn-delete-meal" data-idx="${idx}" title="Supprimer">✕</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.btn-delete-meal').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = getData();
        d.meals.splice(parseInt(btn.dataset.idx), 1);
        saveData(d);
        render();
      });
    });
  }

  /* ─── Helpers DOM ────────────────────────────────────── */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setBar(id, val, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = goal > 0 ? `${Math.min(100, (val / goal) * 100)}%` : '0%';
  }
  function showSection(id, visible) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !visible);
  }

  /* ─── Open Food Facts — fetch produit ────────────────── */
  async function fetchProduct(barcode) {
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        alert('Produit introuvable dans Open Food Facts.');
        return;
      }

      const p = json.product;
      const n = p.nutriments || {};

      const calories = Math.round(n['energy-kcal_100g'] || n['energy-kcal_serving'] || 0);
      const protein  = Math.round((n['proteins_100g']        || n['proteins_serving']        || 0) * 10) / 10;
      const carbs    = Math.round((n['carbohydrates_100g']   || n['carbohydrates_serving']   || 0) * 10) / 10;
      const fat      = Math.round((n['fat_100g']             || n['fat_serving']             || 0) * 10) / 10;

      // Stocke les valeurs 100g comme base pour le calcul par quantité
      baseNutrition = { calories, protein, carbs, fat };

      // Pré-remplit le formulaire
      setMealField('meal-name',     p.product_name || p.brands || '');
      setMealField('meal-quantity', 100);
      setMealField('meal-calories', calories);
      setMealField('meal-protein',  protein);
      setMealField('meal-carbs',    carbs);
      setMealField('meal-fat',      fat);

      const noteEl = document.getElementById('meal-scan-note');
      if (noteEl) {
        noteEl.textContent = 'Valeurs pour 100g. Modifiez la quantité pour recalculer automatiquement.';
        noteEl.classList.remove('hidden');
      }

      document.getElementById('modal-add-meal')?.classList.remove('hidden');
    } catch (err) {
      alert('Erreur de connexion à Open Food Facts.');
      console.error(err);
    }
  }

  /* ─── Scanner code-barres ────────────────────────────── */
  let html5Scanner = null;

  function initBarcodeScanner() {
    // Saisie manuelle
    document.getElementById('meal-barcode')?.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = e.target.value.trim();
        if (code) { e.target.value = ''; await fetchProduct(code); }
      }
    });

    // Bouton 📷
    document.getElementById('btn-scan-barcode')?.addEventListener('click', async () => {
      const manualCode = document.getElementById('meal-barcode')?.value?.trim();
      if (manualCode) {
        document.getElementById('meal-barcode').value = '';
        await fetchProduct(manualCode);
        return;
      }
      openScanner();
    });

    // Fermer scanner
    document.getElementById('btn-close-scanner')?.addEventListener('click', closeScanner);
  }

  function openScanner() {
    document.getElementById('modal-barcode-scanner')?.classList.remove('hidden');

    if (typeof Html5Qrcode === 'undefined') return;

    html5Scanner = new Html5Qrcode('barcode-scanner-view');
    html5Scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 100 } },
      async (code) => {
        await closeScanner();
        await fetchProduct(code);
      },
      () => {}
    ).catch(() => closeScanner());
  }

  async function closeScanner() {
    document.getElementById('modal-barcode-scanner')?.classList.add('hidden');
    if (html5Scanner) {
      try { await html5Scanner.stop(); } catch(e) {}
      try { html5Scanner.clear(); } catch(e) {}
      html5Scanner = null;
    }
  }

  /* ─── Sélecteur de période ───────────────────────────── */
  function initPeriodSelector() {
    const sel = document.getElementById('nutr-period');
    if (!sel) return;
    sel.addEventListener('change', () => {
      currentPeriod = sel.value;
      render();
    });
  }

  /* ─── Bibliothèque de repas (favoris) ───────────────── */
  function getMealLib() {
    return App.local.get('meal_library') || [];
  }

  function saveMealToLib(meal) {
    const lib = getMealLib();
    if (!lib.find(m => m.name === meal.name)) {
      lib.push({ id: Date.now(), name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
      App.local.set('meal_library', lib);
    }
  }

  function removeMealFromLib(id) {
    App.local.set('meal_library', getMealLib().filter(m => m.id !== id));
    renderMealFavorites();
  }

  function fillFormFromLib(meal) {
    baseNutrition = null;
    setMealField('meal-name', meal.name);
    setMealField('meal-calories', meal.calories || '');
    setMealField('meal-protein', meal.protein || '');
    setMealField('meal-carbs', meal.carbs || '');
    setMealField('meal-fat', meal.fat || '');
  }

  function renderMealFavorites() {
    const lib = getMealLib();
    const section = document.getElementById('meal-favorites-section');
    const list    = document.getElementById('meal-favorites-list');
    if (!section || !list) return;
    if (lib.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    list.innerHTML = lib.map(m => `
      <div class="meal-fav-chip" data-fav-id="${m.id}">
        <span class="meal-fav-name">${m.name}</span>
        <span class="meal-fav-cal">${m.calories} kcal</span>
        <span class="meal-fav-del" data-del-id="${m.id}">✕</span>
      </div>
    `).join('');
    list.querySelectorAll('.meal-fav-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        if (e.target.closest('.meal-fav-del')) return;
        const meal = getMealLib().find(m => m.id == chip.dataset.favId);
        if (meal) fillFormFromLib(meal);
      });
    });
    list.querySelectorAll('.meal-fav-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        removeMealFromLib(parseInt(btn.dataset.delId));
      });
    });
  }

  /* ─── Init ───────────────────────────────────────────── */
  function init() {
    // Ouvrir modal ajout (ouverture manuelle — reset base)
    document.getElementById('btn-add-meal')?.addEventListener('click', () => {
      baseNutrition = null;
      setMealField('meal-quantity', '');
      setMealField('meal-name', '');
      setMealField('meal-calories', '');
      setMealField('meal-protein', '');
      setMealField('meal-carbs', '');
      setMealField('meal-fat', '');
      const barcodeEl = document.getElementById('meal-barcode');
      if (barcodeEl) barcodeEl.value = '';
      const noteEl = document.getElementById('meal-scan-note');
      if (noteEl) noteEl.classList.add('hidden');
      renderMealFavorites();
      document.getElementById('modal-add-meal')?.classList.remove('hidden');
    });

    // Quantité → recalcul automatique
    document.getElementById('meal-quantity')?.addEventListener('input', recalcFromQuantity);

    // Fermer modal
    document.getElementById('btn-close-add-meal')?.addEventListener('click', () => {
      document.getElementById('modal-add-meal')?.classList.add('hidden');
    });
    document.getElementById('modal-add-meal')?.addEventListener('click', function(e) {
      if (e.target === this) this.classList.add('hidden');
    });

    // Soumettre repas
    document.getElementById('form-add-meal')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name     = (document.getElementById('meal-name').value || '').trim() || 'Repas';
      const quantity = parseFloat(document.getElementById('meal-quantity').value) || null;
      const calories = parseFloat(document.getElementById('meal-calories').value) || 0;
      const protein  = parseFloat(document.getElementById('meal-protein').value)  || 0;
      const carbs    = parseFloat(document.getElementById('meal-carbs').value)    || 0;
      const fat      = parseFloat(document.getElementById('meal-fat').value)      || 0;

      const meal = { id: Date.now(), name, quantity, calories, protein, carbs, fat };
      const data = getData();
      data.meals.push(meal);
      saveData(data);

      if (document.getElementById('meal-save-fav')?.checked) saveMealToLib(meal);

      baseNutrition = null;
      document.getElementById('form-add-meal').reset();
      document.getElementById('modal-add-meal')?.classList.add('hidden');
      render();
    });

    initBarcodeScanner();
    initPeriodSelector();
  }

  return { init, render };

})();
