/* ═══════════════════════════════════════════════════════════
   NovaGYM — Logique des programmes d'entraînement
   Génère le planning hebdomadaire et les exercices du jour
   ═══════════════════════════════════════════════════════════ */

window.Programs = (() => {

  const DAYS_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const DAYS_FR    = { monday:'Lundi', tuesday:'Mardi', wednesday:'Mercredi', thursday:'Jeudi', friday:'Vendredi', saturday:'Samedi', sunday:'Dimanche' };
  const DAYS_SHORT = { monday:'Lun', tuesday:'Mar', wednesday:'Mer', thursday:'Jeu', friday:'Ven', saturday:'Sam', sunday:'Dim' };

  // Noms lisibles pour chaque type de séance
  const SESSION_NAMES = {
    push:       'Push — Poussée',
    pull:       'Pull — Tirage',
    legs:       'Legs — Jambes',
    upper:      'Upper — Haut du corps',
    lower:      'Lower — Bas du corps',
    full_body:  'Full Body',
    chest:      'Pectoraux',
    back:       'Dos',
    shoulders:  'Épaules',
    arms:       'Bras',
    rest:       'Repos',
    home_push:  'Push — Maison',
    home_pull:  'Pull — Maison',
    home_legs:  'Jambes — Maison',
    custom:     'Séance libre',
  };

  // Couleurs par type de séance
  const SESSION_COLORS = {
    push: '#FF6B6B', pull: '#4ECDC4', legs: '#45B7D1',
    upper: '#96CEB4', lower: '#FFEAA7', full_body: '#B6FF00',
    chest: '#FF6B6B', back: '#4ECDC4', shoulders: '#DDA0DD',
    arms: '#FFB347', rest: '#555555',
    home_push: '#FF6B6B', home_pull: '#4ECDC4', home_legs: '#45B7D1',
  };

  /**
   * Génère le mapping jour → type de séance
   * selon le programme et les jours sélectionnés
   */
  function buildSchedule(programType, trainingDays) {
    const days = DAYS_ORDER.filter(d => trainingDays.includes(d));
    const schedule = {};

    // Initialise tous les jours comme repos
    DAYS_ORDER.forEach(d => { schedule[d] = 'rest'; });

    switch (programType) {

      case 'ppl': {
        const pattern = ['push','pull','legs'];
        days.forEach((day, i) => { schedule[day] = pattern[i % 3]; });
        break;
      }

      case 'upper_lower': {
        const pattern = ['upper','lower'];
        days.forEach((day, i) => { schedule[day] = pattern[i % 2]; });
        break;
      }

      case 'full_body': {
        days.forEach(day => { schedule[day] = 'full_body'; });
        break;
      }

      case 'bro_split': {
        const pattern = ['chest','back','shoulders','arms','legs'];
        days.forEach((day, i) => { schedule[day] = pattern[i % 5]; });
        break;
      }

      case 'home': {
        const pattern = ['home_push','home_pull','home_legs'];
        days.forEach((day, i) => { schedule[day] = pattern[i % 3]; });
        break;
      }

      case 'custom': {
        // Programme personnalisé : jours d'entraînement = 'custom', user choisit les exos
        days.forEach(day => { schedule[day] = 'custom'; });
        break;
      }

      case 'gym':
      default: {
        const pattern = ['push','pull','legs'];
        days.forEach((day, i) => { schedule[day] = pattern[i % 3]; });
        break;
      }
    }

    return schedule;
  }

  /**
   * Retourne le type de séance d'aujourd'hui
   */
  function getTodayType(profile) {
    if (!profile) return null;
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const todayName = dayNames[new Date().getDay()];
    const schedule = buildSchedule(profile.program_type, profile.training_days || []);
    return schedule[todayName] || 'rest';
  }

  /**
   * Retourne les exercices pour un type de séance donné
   * Filtre par équipement (home vs gym) et lieu de profil
   */
  function getExercisesForType(sessionType, programType, level, location) {
    let exercises = [];

    if (sessionType === 'rest') return [];
    if (sessionType === 'custom') return [];  // Programme personnalisé : user choisit ses exos

    // Si le lieu est "home" (depuis réglages), remapper vers exercices maison
    const effectiveLocation = location || (programType === 'home' ? 'home' : 'gym');

    const catMap = {
      push: 'push', pull: 'pull', legs: 'legs',
      upper: 'upper', lower: 'lower', full_body: 'full_body',
      chest: 'chest', back: 'back', shoulders: 'shoulders', arms: 'arms',
      home_push: 'home_push', home_pull: 'home_pull', home_legs: 'home_legs',
    };

    // Si lieu = home, utiliser les variantes maison pour push/pull/legs
    const homeRemap = { push: 'home_push', pull: 'home_pull', legs: 'home_legs' };
    let resolvedType = sessionType;
    if (effectiveLocation === 'home' && homeRemap[sessionType]) {
      resolvedType = homeRemap[sessionType];
    }

    const cat = catMap[resolvedType];
    if (!cat) return [];

    exercises = EXERCISES_RESOLVE(cat);

    // Filtre équipement si lieu = home
    if (effectiveLocation === 'home') {
      exercises = exercises.filter(ex => ex.equipment === 'home' || !ex.equipment);
    }

    // Débutant : limiter le nombre d'exercices
    if (level === 'beginner' && exercises.length > 4) {
      exercises = exercises.slice(0, 4);
    }

    return exercises;
  }

  /**
   * Calcul calorique Katch-McArdle amélioré
   * Prend en compte : masse grasse, objectif, niveau
   */
  function calculateCalories(profile) {
    const { weight, height, age, body_fat_pct, goal, level, gender } = profile;

    // Masse maigre
    const lbm = weight * (1 - (body_fat_pct || 15) / 100);

    // BMR Katch-McArdle
    let bmr = 370 + (21.6 * lbm);

    // Ajustement genre si pas de masse grasse renseignée
    if (!body_fat_pct) {
      if (gender === 'female') bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
      else bmr = 66 + (13.7 * weight) + (5 * height) - (6.8 * age);
    }

    // Multiplicateur d'activité selon niveau
    const activityMultiplier = level === 'advanced' ? 1.55 : 1.375;
    let tdee = bmr * activityMultiplier;

    // Ajustement selon objectif
    const goalAdjust = { bulk: 300, maintain: 0, cut: -400 };
    const calories = Math.round(tdee + (goalAdjust[goal] || 0));

    // Macros
    let protein, fat, carbs;
    if (goal === 'cut') {
      protein = Math.round(weight * 2.4);      // Plus de protéines en sèche
    } else {
      protein = Math.round(weight * 2.0);
    }
    fat    = Math.round((calories * 0.25) / 9);
    carbs  = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

    return {
      calories,
      protein: `${protein}g`,
      carbs:   `${carbs}g`,
      fat:     `${fat}g`,
    };
  }

  /* API publique */
  return {
    buildSchedule,
    getTodayType,
    getExercisesForType,
    calculateCalories,
    SESSION_NAMES,
    SESSION_COLORS,
    DAYS_FR,
    DAYS_SHORT,
    DAYS_ORDER,
  };

})();
