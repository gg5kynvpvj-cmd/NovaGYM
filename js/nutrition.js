/* ═══════════════════════════════════════════════════════════
   NovaGYM — Nutrition tracker (refonte v2)
   Cartes par type de repas, recherche OFF, code-barres, eau
   ═══════════════════════════════════════════════════════════ */

window.Nutrition = (() => {

  let currentPeriod   = 'today';
  let currentMealType = 'breakfast';
  let selectedProduct = null; // { name, cal100, protein100, carbs100, fat100 }
  let baseNutrition   = null; // même objet, pour recalcFromQty
  let searchTimeout   = null;
  let html5Scanner    = null;

  const MEAL_TYPES = [
    { key: 'breakfast', label: 'Petit déjeuner', icon: '🌅' },
    { key: 'lunch',     label: 'Déjeuner',       icon: '☀️' },
    { key: 'dinner',    label: 'Dîner',           icon: '🌙' },
    { key: 'snacks',    label: 'Collations',      icon: '🍎' },
  ];

  /* ─── Clés localStorage ──────────────────────────────────── */
  function dayKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return 'nutrition_' + y + '-' + m + '-' + day;
  }

  function todayKey() { return dayKey(new Date()); }

  function getData(key) {
    const raw = App.local.get(key || todayKey());
    if (!raw) return { meals: [], water: 0 };
    if (Array.isArray(raw)) return { meals: raw, water: 0 }; // migration ancien format
    return { meals: raw.meals || [], water: raw.water || 0 };
  }

  function saveData(data, key) {
    App.local.set(key || todayKey(), data);
  }

  /* ─── Agrège les données sur N jours ─────────────────────── */
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

  /* ─── Anneau calories (canvas) ───────────────────────────── */
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

  function getStepsBurned() {
    const today = new Date().toISOString().split('T')[0];
    const data  = App.local.get('daily_' + today) || {};
    return Math.round((data.steps || 0) * 0.04);
  }

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

  /* ─── Helpers DOM ────────────────────────────────────────── */
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function setBar(id, val, goal) {
    const el = document.getElementById(id);
    if (el) el.style.width = goal > 0 ? `${Math.min(100, (val / goal) * 100)}%` : '0%';
  }
  function showEl(id, visible) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !visible);
  }

  /* ─── Render principal ───────────────────────────────────── */
  function render() {
    if (currentPeriod === 'today') {
      renderToday();
    } else {
      renderPeriod(currentPeriod === 'week' ? 7 : 30);
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

    drawRing(totals.calories, effectiveGoal);
    setText('nutr-consumed', totals.calories);
    setText('nutr-goal',     effectiveGoal ? `${effectiveGoal} kcal` : '—');
    const rem = effectiveGoal - totals.calories;
    setText('nutr-remaining', effectiveGoal
      ? (rem >= 0 ? `${rem} restantes` : `${Math.abs(rem)} dépassées`)
      : '—');

    const stepsEl = document.getElementById('nutr-steps-burned');
    if (stepsEl) {
      if (stepsBurned > 0) {
        stepsEl.textContent = `👟 +${stepsBurned} kcal (marche)`;
        stepsEl.classList.remove('hidden');
      } else {
        stepsEl.classList.add('hidden');
      }
    }

    setText('nutr-p-val', `${Math.round(totals.protein)} / ${goalP || '—'} g`);
    setText('nutr-c-val', `${Math.round(totals.carbs)} / ${goalC || '—'} g`);
    setText('nutr-f-val', `${Math.round(totals.fat)} / ${goalF || '—'} g`);
    setBar('nutr-p-bar', totals.protein, goalP);
    setBar('nutr-c-bar', totals.carbs,   goalC);
    setBar('nutr-f-bar', totals.fat,     goalF);

    renderWater(data);
    renderMealCards(meals);

    showEl('nutr-meals-section', true);
    showEl('nutr-period-section', false);

    const waterCard = document.querySelector('.nutr-water-card');
    if (waterCard) waterCard.classList.remove('hidden');
  }

  function renderPeriod(numDays) {
    const totals = aggregateDays(numDays);
    const { goalCal, goalP, goalC, goalF } = getGoals();
    const label = numDays === 7 ? 'Cette semaine' : 'Ce mois';
    const days  = totals.days || 1;

    const avgCal = Math.round(totals.calories / days);
    drawRing(avgCal, goalCal);
    setText('nutr-consumed', avgCal);
    setText('nutr-goal',     goalCal ? `${goalCal} kcal` : '—');
    setText('nutr-remaining', `moy. / jour`);

    const avgP = Math.round(totals.protein / days);
    const avgC = Math.round(totals.carbs   / days);
    const avgF = Math.round(totals.fat     / days);
    setText('nutr-p-val', `${avgP} / ${goalP || '—'} g`);
    setText('nutr-c-val', `${avgC} / ${goalC || '—'} g`);
    setText('nutr-f-val', `${avgF} / ${goalF || '—'} g`);
    setBar('nutr-p-bar', avgP, goalP);
    setBar('nutr-c-bar', avgC, goalC);
    setBar('nutr-f-bar', avgF, goalF);

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

    showEl('nutr-meals-section', false);
    showEl('nutr-period-section', true);

    const waterCard = document.querySelector('.nutr-water-card');
    if (waterCard) waterCard.classList.add('hidden');
  }

  /* ─── Cartes repas par type ──────────────────────────────── */
  function renderMealCards(meals) {
    MEAL_TYPES.forEach(({ key }) => {
      const typeMeals = meals.filter(m => (m.mealType || 'breakfast') === key);
      const totals = typeMeals.reduce(
        (acc, m) => ({ calories: acc.calories + (m.calories || 0), protein: acc.protein + (m.protein || 0), carbs: acc.carbs + (m.carbs || 0), fat: acc.fat + (m.fat || 0) }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      setText(`nutr-kcal-${key}`, `${totals.calories} kcal`);

      const macrosEl = document.getElementById(`nutr-macros-${key}`);
      if (macrosEl) {
        macrosEl.innerHTML = `
          <span class="nutr-macro-chip nutr-macro-c">G ${Math.round(totals.carbs)}g</span>
          <span class="nutr-macro-chip nutr-macro-p">P ${Math.round(totals.protein)}g</span>
          <span class="nutr-macro-chip nutr-macro-f">L ${Math.round(totals.fat)}g</span>
        `;
      }

      const itemsEl = document.getElementById(`nutr-items-${key}`);
      if (!itemsEl) return;

      if (!typeMeals.length) { itemsEl.innerHTML = ''; return; }

      itemsEl.innerHTML = typeMeals.map(meal => `
        <div class="nutr-meal-item">
          <div class="nutr-meal-item-left">
            <span class="nutr-meal-item-name">${meal.name || 'Aliment'}</span>
            ${meal.quantity ? `<span class="nutr-meal-item-qty">${meal.quantity}g</span>` : ''}
          </div>
          <div class="nutr-meal-item-right">
            <span class="nutr-meal-item-kcal">${meal.calories || 0} kcal</span>
            <button class="nutr-meal-item-del" data-id="${meal.id}" title="Supprimer">✕</button>
          </div>
        </div>
      `).join('');

      itemsEl.querySelectorAll('.nutr-meal-item-del').forEach(btn => {
        btn.addEventListener('click', () => {
          const d = getData();
          d.meals = d.meals.filter(m => String(m.id) !== btn.dataset.id);
          saveData(d);
          render();
        });
      });
    });
  }

  /* ─── Suivi eau ──────────────────────────────────────────── */
  function getWaterGoal() {
    return parseInt(App.local.get('water_goal')) || 2000;
  }

  function renderWater(data) {
    const d        = data || getData();
    const consumed = d.water || 0;
    const goal     = getWaterGoal();
    const pct      = Math.min(100, goal > 0 ? Math.round((consumed / goal) * 100) : 0);

    setText('nutr-water-val', `${consumed.toLocaleString('fr-FR')} ml`);
    setText('nutr-water-goal-lbl', `/ ${goal.toLocaleString('fr-FR')} ml ✎`);
    setText('nutr-water-pct', `${pct}%`);

    const fill = document.getElementById('nutr-water-fill');
    if (fill) fill.style.width = pct + '%';
  }

  function addWater() {
    const input  = document.getElementById('water-amount-input');
    const amount = parseInt(input?.value);
    if (!amount || amount <= 0) return;
    const d = getData();
    d.water = (d.water || 0) + amount;
    saveData(d);
    renderWater(d);
    if (window.Today) Today.renderWaterChallenge();
    if (input) input.value = '';
  }

  function initWaterTracker() {
    document.getElementById('btn-water-add')?.addEventListener('click', addWater);

    document.getElementById('water-amount-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addWater(); }
    });

    document.getElementById('btn-water-reset')?.addEventListener('click', () => {
      const d = getData();
      d.water = 0;
      saveData(d);
      renderWater(d);
      if (window.Today) Today.renderWaterChallenge();
    });

    // Modifier l'objectif en cliquant sur le label
    document.getElementById('nutr-water-goal-lbl')?.addEventListener('click', () => {
      const inp = prompt('Objectif d\'eau par jour (ml) :', getWaterGoal());
      const val = parseInt(inp);
      if (val > 0) {
        App.local.set('water_goal', val);
        renderWater();
        if (window.Today) Today.renderWaterChallenge();
      }
    });
  }

  /* ─── Bibliothèque favoris ───────────────────────────────── */
  function getMealLib() { return App.local.get('meal_library') || []; }

  function saveMealToLib(meal) {
    const lib = getMealLib();
    if (!lib.find(m => m.name === meal.name)) {
      lib.push({ id: Date.now(), name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
      App.local.set('meal_library', lib);
    }
  }

  function renderFoodFavs() {
    const lib   = getMealLib();
    const list  = document.getElementById('food-favs-list');
    const empty = document.getElementById('food-favs-empty');
    if (!list) return;

    if (!lib.length) {
      list.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    list.innerHTML = lib.map(m => `
      <div class="food-fav-chip" data-fav-id="${m.id}">
        <span class="food-fav-name">${m.name}</span>
        <span class="food-fav-cal">${m.calories} kcal</span>
        <span class="food-fav-del" data-del-id="${m.id}">✕</span>
      </div>
    `).join('');

    list.querySelectorAll('.food-fav-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        if (e.target.closest('.food-fav-del')) return;
        const meal = getMealLib().find(m => m.id == chip.dataset.favId);
        if (!meal) return;
        selectProduct({ name: meal.name, cal100: meal.calories, protein100: meal.protein || 0, carbs100: meal.carbs || 0, fat100: meal.fat || 0 });
      });
    });

    list.querySelectorAll('.food-fav-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        App.local.set('meal_library', getMealLib().filter(m => m.id != btn.dataset.delId));
        renderFoodFavs();
      });
    });
  }

  /* ─── Modal recherche aliment ────────────────────────────── */
  function openFoodSearch(mealType) {
    currentMealType = mealType;
    const typeInfo = MEAL_TYPES.find(t => t.key === mealType);
    setText('food-search-title', (typeInfo ? `${typeInfo.icon} ${typeInfo.label}` : 'Ajouter des aliments'));

    // Réinitialise l'état
    const input = document.getElementById('food-search-input');
    if (input) input.value = '';
    const resultsList = document.getElementById('food-results-list');
    if (resultsList) resultsList.innerHTML = '';
    showEl('food-search-hint', true);
    showEl('food-barcode-section', false);
    const toggleBtn = document.getElementById('btn-toggle-barcode');
    if (toggleBtn) toggleBtn.textContent = '📷 Taper un code-barres';
    const bcInput = document.getElementById('food-barcode-input');
    if (bcInput) bcInput.value = '';
    showEl('food-barcode-not-found', false);

    // Step 1 visible, 2 + manuel cachés
    showStep(1);

    selectedProduct = null;
    baseNutrition   = null;

    renderFoodFavs();
    document.getElementById('modal-food-search')?.classList.remove('hidden');
  }

  function closeFoodSearch() {
    document.getElementById('modal-food-search')?.classList.add('hidden');
    selectedProduct = null;
    baseNutrition   = null;
  }

  function showStep(n) {
    showEl('food-search-step1',  n === 1);
    showEl('food-search-step2',  n === 2);
    showEl('food-search-manual', n === 3);
  }

  /* ─── Recherche par nom (Open Food Facts) ────────────────── */
  async function searchFoodByName(query) {
    if (!query || query.length < 2) {
      showEl('food-search-hint', true);
      const list = document.getElementById('food-results-list');
      if (list) list.innerHTML = '';
      return;
    }
    showEl('food-search-hint', false);
    const list = document.getElementById('food-results-list');
    if (list) list.innerHTML = '<p class="food-search-loading">Recherche en cours…</p>';

    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=15&fields=product_name,brands,nutriments,code`;
      const res  = await fetch(url);
      const json = await res.json();
      renderSearchResults(json.products || []);
    } catch {
      if (list) list.innerHTML = '<p class="food-search-error">Erreur de connexion.</p>';
    }
  }

  function renderSearchResults(products) {
    const list = document.getElementById('food-results-list');
    if (!list) return;

    const valid = products.filter(p => p.product_name);

    if (!valid.length) {
      list.innerHTML = `<p class="food-search-hint">Aucun résultat. <button class="btn-link" id="btn-no-result-manual" type="button">Créer manuellement →</button></p>`;
      document.getElementById('btn-no-result-manual')?.addEventListener('click', () => showStep(3));
      return;
    }

    list.innerHTML = valid.map(p => {
      const n    = p.nutriments || {};
      const cal  = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
      const name = p.product_name || 'Produit sans nom';
      const brand = p.brands ? `<span class="food-result-brand">${p.brands.split(',')[0]}</span>` : '';
      return `
        <div class="food-result-item"
             data-name="${name.replace(/"/g, '&quot;')}"
             data-cal="${cal}"
             data-protein="${Math.round((n['proteins_100g'] || 0) * 10) / 10}"
             data-carbs="${Math.round((n['carbohydrates_100g'] || 0) * 10) / 10}"
             data-fat="${Math.round((n['fat_100g'] || 0) * 10) / 10}">
          <div class="food-result-info">
            <span class="food-result-name">${name}</span>
            ${brand}
          </div>
          <span class="food-result-kcal">${cal} kcal<br><small>/100g</small></span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.food-result-item').forEach(item => {
      item.addEventListener('click', () => selectProduct({
        name:       item.dataset.name,
        cal100:     parseFloat(item.dataset.cal),
        protein100: parseFloat(item.dataset.protein),
        carbs100:   parseFloat(item.dataset.carbs),
        fat100:     parseFloat(item.dataset.fat),
      }));
    });
  }

  /* ─── Sélection produit → étape 2 ───────────────────────── */
  function selectProduct(product) {
    selectedProduct = product;
    baseNutrition   = { calories: product.cal100, protein: product.protein100, carbs: product.carbs100, fat: product.fat100 };

    setText('food-product-name', product.name);
    setText('food-product-meta', `P ${product.protein100}g · G ${product.carbs100}g · L ${product.fat100}g · ${product.cal100} kcal (pour 100g)`);

    const qtyInput = document.getElementById('food-product-qty');
    if (qtyInput) qtyInput.value = 100;
    updateProductCalc();

    const saveFav = document.getElementById('food-save-fav');
    if (saveFav) saveFav.checked = false;

    showStep(2);
  }

  function updateProductCalc() {
    if (!baseNutrition) return;
    const qty = parseFloat(document.getElementById('food-product-qty')?.value) || 0;
    const f   = qty / 100;
    setText('food-calc-cal',     Math.round(baseNutrition.calories * f));
    setText('food-calc-protein', Math.round(baseNutrition.protein  * f * 10) / 10);
    setText('food-calc-carbs',   Math.round(baseNutrition.carbs    * f * 10) / 10);
    setText('food-calc-fat',     Math.round(baseNutrition.fat      * f * 10) / 10);
  }

  function addSelectedProduct() {
    if (!selectedProduct || !baseNutrition) return;
    const qty = parseFloat(document.getElementById('food-product-qty')?.value) || 100;
    const f   = qty / 100;

    const meal = {
      id:       Date.now(),
      name:     selectedProduct.name,
      quantity: qty,
      calories: Math.round(baseNutrition.calories * f),
      protein:  Math.round(baseNutrition.protein  * f * 10) / 10,
      carbs:    Math.round(baseNutrition.carbs     * f * 10) / 10,
      fat:      Math.round(baseNutrition.fat        * f * 10) / 10,
      mealType: currentMealType,
    };

    if (document.getElementById('food-save-fav')?.checked) saveMealToLib(meal);

    const d = getData();
    d.meals.push(meal);
    saveData(d);
    closeFoodSearch();
    render();
  }

  /* ─── Code-barres ────────────────────────────────────────── */
  async function fetchProductByBarcode(barcode) {
    showEl('food-barcode-not-found', false);
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        showEl('food-barcode-not-found', true);
        return;
      }

      const p = json.product;
      const n = p.nutriments || {};
      selectProduct({
        name:       p.product_name || p.brands || 'Produit scanné',
        cal100:     Math.round(n['energy-kcal_100g'] || n['energy-kcal_serving'] || 0),
        protein100: Math.round((n['proteins_100g']       || 0) * 10) / 10,
        carbs100:   Math.round((n['carbohydrates_100g']  || 0) * 10) / 10,
        fat100:     Math.round((n['fat_100g']            || 0) * 10) / 10,
      });
    } catch {
      alert('Erreur de connexion à Open Food Facts.');
    }
  }

  /* ─── Scanner caméra ─────────────────────────────────────── */
  function openScanner() {
    document.getElementById('modal-barcode-scanner')?.classList.remove('hidden');
    if (typeof Html5Qrcode === 'undefined') return;

    html5Scanner = new Html5Qrcode('barcode-scanner-view');
    html5Scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 100 } },
      async (code) => {
        await closeScanner();
        await fetchProductByBarcode(code);
      },
      () => {}
    ).catch(() => closeScanner());
  }

  async function closeScanner() {
    document.getElementById('modal-barcode-scanner')?.classList.add('hidden');
    if (html5Scanner) {
      try { await html5Scanner.stop(); } catch {}
      try { html5Scanner.clear(); } catch {}
      html5Scanner = null;
    }
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    // Sélecteur de période
    document.getElementById('nutr-period')?.addEventListener('change', e => {
      currentPeriod = e.target.value;
      render();
    });

    // Boutons "+ Ajouter des aliments"
    document.querySelectorAll('.btn-add-meal-type').forEach(btn => {
      btn.addEventListener('click', () => openFoodSearch(btn.dataset.mealType));
    });

    // Fermer food search
    document.getElementById('btn-close-food-search')?.addEventListener('click', closeFoodSearch);
    document.getElementById('modal-food-search')?.addEventListener('click', function(e) {
      if (e.target === this) closeFoodSearch();
    });

    // Recherche par nom (debounce 400ms)
    document.getElementById('food-search-input')?.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      const q = e.target.value.trim();
      searchTimeout = setTimeout(() => searchFoodByName(q), 400);
    });

    // Toggle section code-barres
    document.getElementById('btn-toggle-barcode')?.addEventListener('click', () => {
      const section  = document.getElementById('food-barcode-section');
      const isHidden = section?.classList.contains('hidden');
      section?.classList.toggle('hidden', !isHidden);
      const btn = document.getElementById('btn-toggle-barcode');
      if (btn) btn.textContent = isHidden ? '📷 Masquer le code-barres' : '📷 Taper un code-barres';
    });

    // Valider code-barres saisi manuellement
    document.getElementById('btn-barcode-validate')?.addEventListener('click', async () => {
      const code = document.getElementById('food-barcode-input')?.value?.trim();
      if (code) await fetchProductByBarcode(code);
    });
    document.getElementById('food-barcode-input')?.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = e.target.value.trim();
        if (code) await fetchProductByBarcode(code);
      }
    });

    // Scanner caméra
    document.getElementById('btn-barcode-camera')?.addEventListener('click', openScanner);
    document.getElementById('btn-close-scanner')?.addEventListener('click', closeScanner);

    // Créer manuellement (depuis "produit introuvable")
    document.getElementById('btn-food-create-manual')?.addEventListener('click', () => showStep(3));

    // Étape 2 — quantité
    document.getElementById('food-product-qty')?.addEventListener('input', updateProductCalc);

    // Étape 2 — retour
    document.getElementById('btn-food-back')?.addEventListener('click', () => {
      selectedProduct = null;
      baseNutrition   = null;
      showStep(1);
    });

    // Étape 2 — Ajouter
    document.getElementById('btn-food-add')?.addEventListener('click', addSelectedProduct);

    // Formulaire manuel — retour
    document.getElementById('btn-food-back-manual')?.addEventListener('click', () => showStep(1));

    // Formulaire manuel — soumettre
    document.getElementById('form-food-manual')?.addEventListener('submit', e => {
      e.preventDefault();
      const name     = (document.getElementById('food-manual-name')?.value || '').trim() || 'Aliment';
      const qty      = parseFloat(document.getElementById('food-manual-qty')?.value)     || null;
      const calories = parseFloat(document.getElementById('food-manual-cal')?.value)     || 0;
      const protein  = parseFloat(document.getElementById('food-manual-protein')?.value) || 0;
      const carbs    = parseFloat(document.getElementById('food-manual-carbs')?.value)   || 0;
      const fat      = parseFloat(document.getElementById('food-manual-fat')?.value)     || 0;

      const meal = { id: Date.now(), name, quantity: qty, calories, protein, carbs, fat, mealType: currentMealType };

      if (document.getElementById('food-manual-save-fav')?.checked) saveMealToLib(meal);

      const d = getData();
      d.meals.push(meal);
      saveData(d);
      closeFoodSearch();
      render();
    });

    // Suivi eau
    initWaterTracker();
  }

  return { init, render };

})();
