/* ═══════════════════════════════════════════════════════════
   NovaGYM — Internationalisation (FR / EN / ES)
   ═══════════════════════════════════════════════════════════ */

window.I18n = (() => {

  const LANGS = {
    fr: {
      flag: '🇫🇷', name: 'Français',
      // Auth
      'auth.login': 'Se connecter', 'auth.register': "S'inscrire",
      'auth.subtitle': 'Ton coach personnel de musculation',
      'auth.email': 'Email', 'auth.password': 'Mot de passe',
      'auth.password_new': 'Mot de passe (min. 6 caractères)',
      'auth.username': 'Pseudonyme', 'auth.forgot': 'Mot de passe oublié ?',
      'auth.create': 'Créer mon compte',
      // Nav
      'nav.today': "Aujourd'hui", 'nav.stats': 'Stats',
      'nav.history': 'Historique', 'nav.nutrition': 'Nutrition', 'nav.settings': 'Réglages',
      // Onboarding
      'ob.step': 'Étape', 'ob.of': 'sur',
      'ob.step1.title': 'Dis-nous\nqui tu es',
      'ob.step1.sub': 'Pour un programme 100% personnalisé',
      'ob.weight': 'Poids (kg)', 'ob.height': 'Taille (cm)',
      'ob.age': 'Âge', 'ob.bodyfat': 'Masse grasse (%)',
      'ob.male': 'Homme', 'ob.female': 'Femme', 'ob.other': 'Autre',
      'ob.step2.title': 'Ton objectif',
      'ob.step2.sub': 'Tout est calculé automatiquement',
      'ob.bulk': 'Prise de masse', 'ob.bulk.desc': '+300 kcal surplus',
      'ob.maintain': 'Maintien', 'ob.maintain.desc': 'Équilibre parfait',
      'ob.cut': 'Sèche', 'ob.cut.desc': '-400 kcal déficit',
      'ob.diet': 'Régime alimentaire',
      'ob.standard': 'Standard', 'ob.vegetarian': 'Végétarien',
      'ob.vegan': 'Vegan', 'ob.keto': 'Keto',
      'ob.step3.title': 'Ton programme',
      'ob.level': 'Ton niveau',
      'ob.beginner': 'Débutant', 'ob.beginner.desc': 'Je découvre',
      'ob.advanced': 'Avancé', 'ob.advanced.desc': "J'ai de l'expérience",
      'ob.series': 'Type de séries',
      'ob.fixed': 'Séries fixes', 'ob.fixed.desc': 'Reps précises, progression par charge',
      'ob.failure': 'Fixes + échec', 'ob.failure.desc': "Dernière série à l'échec musculaire",
      'ob.step4.title': "Tes jours\nd'entraînement",
      'ob.step4.sub': "Sélectionne tous les jours où tu t'entraînes",
      'ob.finish': 'Voir mon programme →',
      'ob.continue': 'Continuer →', 'ob.back': '← Retour',
      // Days
      'day.monday': 'Lun', 'day.tuesday': 'Mar', 'day.wednesday': 'Mer',
      'day.thursday': 'Jeu', 'day.friday': 'Ven', 'day.saturday': 'Sam', 'day.sunday': 'Dim',
      // Today
      'today.greeting': 'Bonjour,', 'today.rest': 'Jour de repos',
      'today.rest.desc': 'Récupère bien, tu le mérites.',
      'today.exercises': 'exercices', 'today.finish': '✓ Terminer la séance',
      'today.add': '+ Ajouter un exercice personnalisé',
      'today.add.set': '+ Ajouter une série',
      'timer.label': 'Repos',
      // Stats
      'stats.title': 'Statistiques', 'stats.calories': 'Besoins caloriques',
      'stats.volume': "Volume d'entraînement", 'stats.last30': '30 derniers jours',
      'stats.badges': 'Badges remportés', 'stats.total': 'Séances totales',
      'stats.streak': 'Semaines consécutives', 'stats.badge.count': 'Badges obtenus',
      'stats.protein': 'Protéines', 'stats.carbs': 'Glucides', 'stats.fat': 'Lipides',
      // History
      'history.title': 'Historique', 'history.empty': 'Tes séances terminées apparaîtront ici',
      'history.thisweek': 'Cette semaine', 'history.lastweek': 'Semaine dernière',
      'history.thismonth': 'Ce mois', 'history.older': 'Plus ancien',
      // Settings
      'set.account': 'COMPTE', 'set.edit.profile': 'Modifier le profil',
      'set.edit.username': 'Modifier le pseudonyme',
      'set.location.title': "LIEU D'ENTRAÎNEMENT",
      'set.location.home': 'Maison', 'set.location.gym': 'Salle de sport',
      'set.program.title': 'MON PROGRAMME',
      'set.series.type': 'Type de séries', 'set.training.days': "Jours d'entraînement",
      'set.prefs': 'PRÉFÉRENCES', 'set.theme': 'Thème',
      'set.theme.dark': 'Sombre', 'set.theme.light': 'Clair',
      'set.sound': 'Son du chronomètre', 'set.language': 'Langue',
      'set.data': 'DONNÉES', 'set.export': 'Exporter mes données',
      'set.reset': 'Réinitialiser tout',
      'set.support': 'SUPPORT', 'set.help': 'Aide & FAQ',
      'set.logout': 'Se déconnecter',
      // Modals
      'modal.edit.title': 'Modifier le profil',
      'modal.username.title': 'Pseudonyme',
      'modal.lang.title': 'Langue / Language',
      'modal.series.title': 'Type de séries',
      'modal.days.title': "Jours d'entraînement",
      'modal.reset.title': 'Tout réinitialiser ?',
      'modal.reset.body': 'Cette action est irréversible. Tout ton historique et tes données seront effacés.',
      'modal.reset.confirm': 'Oui, tout effacer',
      // Help
      'help.title': 'Aide & Support', 'help.faq': 'FAQ', 'help.contact': 'Contact',
      // Common
      'save': 'Sauvegarder', 'cancel': 'Annuler',
      'common.save': 'Sauvegarder', 'common.cancel': 'Annuler',
      // Settings (alias keys used in HTML)
      'settings.account': 'COMPTE',
      'settings.editProfile': 'Modifier le profil',
      'settings.changeUsername': 'Modifier le pseudonyme',
      'settings.program': 'PROGRAMME',
      'settings.programType': 'Type de programme',
      'settings.location': "Lieu d'entraînement",
      'settings.home': 'Maison',
      'settings.gym': 'Salle',
      'settings.seriesType': 'Type de séries',
      'settings.trainingDays': "Jours d'entraînement",
      'settings.preferences': 'PRÉFÉRENCES',
      'settings.timerSound': 'Son du chronomètre',
      'settings.theme': 'Apparence',
      'settings.dark': 'Sombre',
      'settings.light': 'Clair',
      'settings.language': 'Langue',
      'settings.data': 'DONNÉES',
      'settings.export': 'Exporter mes données',
      'settings.reset': 'Réinitialiser tout',
      'settings.support': 'SUPPORT',
      'settings.help': 'Aide & FAQ',
      'settings.logout': 'Se déconnecter',
      // Reset modal
      'reset.title': 'Tout réinitialiser ?',
      'reset.body': 'Cette action est irréversible. Tout ton historique et tes données seront effacés.',
      'reset.confirm': 'Oui, tout effacer',
      // Series modal
      'series.fixed': 'Séries fixes',
      'series.fixedDesc': 'Reps précises, progression par charge',
      'series.failure': 'Fixes + échec',
      'series.failureDesc': "Dernière série à l'échec musculaire",
      // Days
      'days.mon': 'Lun', 'days.tue': 'Mar', 'days.wed': 'Mer',
      'days.thu': 'Jeu', 'days.fri': 'Ven', 'days.sat': 'Sam', 'days.sun': 'Dim',
    },

    en: {
      flag: '🇬🇧', name: 'English',
      'auth.login': 'Sign in', 'auth.register': 'Sign up',
      'auth.subtitle': 'Your personal strength coach',
      'auth.email': 'Email', 'auth.password': 'Password',
      'auth.password_new': 'Password (min. 6 characters)',
      'auth.username': 'Username', 'auth.forgot': 'Forgot password?',
      'auth.create': 'Create account',
      'nav.today': 'Today', 'nav.stats': 'Stats',
      'nav.history': 'History', 'nav.nutrition': 'Nutrition', 'nav.settings': 'Settings',
      'ob.step': 'Step', 'ob.of': 'of',
      'ob.step1.title': 'Tell us\nabout you',
      'ob.step1.sub': '100% personalized program',
      'ob.weight': 'Weight (kg)', 'ob.height': 'Height (cm)',
      'ob.age': 'Age', 'ob.bodyfat': 'Body fat (%)',
      'ob.male': 'Male', 'ob.female': 'Female', 'ob.other': 'Other',
      'ob.step2.title': 'Your goal',
      'ob.step2.sub': 'Everything is calculated automatically',
      'ob.bulk': 'Muscle gain', 'ob.bulk.desc': '+300 kcal surplus',
      'ob.maintain': 'Maintain', 'ob.maintain.desc': 'Perfect balance',
      'ob.cut': 'Cut', 'ob.cut.desc': '-400 kcal deficit',
      'ob.diet': 'Diet',
      'ob.standard': 'Standard', 'ob.vegetarian': 'Vegetarian',
      'ob.vegan': 'Vegan', 'ob.keto': 'Keto',
      'ob.step3.title': 'Your program',
      'ob.level': 'Your level',
      'ob.beginner': 'Beginner', 'ob.beginner.desc': 'Just starting',
      'ob.advanced': 'Advanced', 'ob.advanced.desc': 'I have experience',
      'ob.series': 'Set type',
      'ob.fixed': 'Fixed sets', 'ob.fixed.desc': 'Precise reps, progress by weight',
      'ob.failure': 'Fixed + failure', 'ob.failure.desc': 'Last set to muscular failure',
      'ob.step4.title': 'Your training\ndays',
      'ob.step4.sub': 'Select all days you train',
      'ob.finish': 'See my program →',
      'ob.continue': 'Continue →', 'ob.back': '← Back',
      'day.monday': 'Mon', 'day.tuesday': 'Tue', 'day.wednesday': 'Wed',
      'day.thursday': 'Thu', 'day.friday': 'Fri', 'day.saturday': 'Sat', 'day.sunday': 'Sun',
      'today.greeting': 'Hello,', 'today.rest': 'Rest day',
      'today.rest.desc': 'Recover well, you deserve it.',
      'today.exercises': 'exercises', 'today.finish': '✓ Finish workout',
      'today.add': '+ Add custom exercise', 'today.add.set': '+ Add a set',
      'timer.label': 'Rest',
      'stats.title': 'Statistics', 'stats.calories': 'Caloric needs',
      'stats.volume': 'Training volume', 'stats.last30': 'Last 30 days',
      'stats.badges': 'Earned badges', 'stats.total': 'Total sessions',
      'stats.streak': 'Consecutive weeks', 'stats.badge.count': 'Badges earned',
      'stats.protein': 'Protein', 'stats.carbs': 'Carbs', 'stats.fat': 'Fat',
      'history.title': 'History', 'history.empty': 'Your completed sessions will appear here',
      'history.thisweek': 'This week', 'history.lastweek': 'Last week',
      'history.thismonth': 'This month', 'history.older': 'Older',
      'set.account': 'ACCOUNT', 'set.edit.profile': 'Edit profile',
      'set.edit.username': 'Change username',
      'set.location.title': 'TRAINING LOCATION',
      'set.location.home': 'Home', 'set.location.gym': 'Gym',
      'set.program.title': 'MY PROGRAM',
      'set.series.type': 'Set type', 'set.training.days': 'Training days',
      'set.prefs': 'PREFERENCES', 'set.theme': 'Theme',
      'set.theme.dark': 'Dark', 'set.theme.light': 'Light',
      'set.sound': 'Timer sound', 'set.language': 'Language',
      'set.data': 'DATA', 'set.export': 'Export my data',
      'set.reset': 'Reset everything',
      'set.support': 'SUPPORT', 'set.help': 'Help & FAQ',
      'set.logout': 'Sign out',
      'modal.edit.title': 'Edit profile',
      'modal.username.title': 'Username',
      'modal.lang.title': 'Language / Langue',
      'modal.series.title': 'Set type',
      'modal.days.title': 'Training days',
      'modal.reset.title': 'Reset everything?',
      'modal.reset.body': 'This action is irreversible. All your history and data will be deleted.',
      'modal.reset.confirm': 'Yes, delete everything',
      'help.title': 'Help & Support', 'help.faq': 'FAQ', 'help.contact': 'Contact',
      'save': 'Save', 'cancel': 'Cancel',
      'common.save': 'Save', 'common.cancel': 'Cancel',
      'settings.account': 'ACCOUNT',
      'settings.editProfile': 'Edit profile',
      'settings.changeUsername': 'Change username',
      'settings.program': 'PROGRAM',
      'settings.programType': 'Program type',
      'settings.location': 'Training location',
      'settings.home': 'Home',
      'settings.gym': 'Gym',
      'settings.seriesType': 'Set type',
      'settings.trainingDays': 'Training days',
      'settings.preferences': 'PREFERENCES',
      'settings.timerSound': 'Timer sound',
      'settings.theme': 'Appearance',
      'settings.dark': 'Dark',
      'settings.light': 'Light',
      'settings.language': 'Language',
      'settings.data': 'DATA',
      'settings.export': 'Export my data',
      'settings.reset': 'Reset everything',
      'settings.support': 'SUPPORT',
      'settings.help': 'Help & FAQ',
      'settings.logout': 'Sign out',
      'reset.title': 'Reset everything?',
      'reset.body': 'This action is irreversible. All your history and data will be deleted.',
      'reset.confirm': 'Yes, delete everything',
      'series.fixed': 'Fixed sets',
      'series.fixedDesc': 'Precise reps, progress by weight',
      'series.failure': 'Fixed + failure',
      'series.failureDesc': 'Last set to muscular failure',
      'days.mon': 'Mon', 'days.tue': 'Tue', 'days.wed': 'Wed',
      'days.thu': 'Thu', 'days.fri': 'Fri', 'days.sat': 'Sat', 'days.sun': 'Sun',
    },

    es: {
      flag: '🇪🇸', name: 'Español',
      'auth.login': 'Iniciar sesión', 'auth.register': 'Registrarse',
      'auth.subtitle': 'Tu entrenador personal de musculación',
      'auth.email': 'Email', 'auth.password': 'Contraseña',
      'auth.password_new': 'Contraseña (mín. 6 caracteres)',
      'auth.username': 'Apodo', 'auth.forgot': '¿Olvidaste tu contraseña?',
      'auth.create': 'Crear cuenta',
      'nav.today': 'Hoy', 'nav.stats': 'Stats',
      'nav.history': 'Historial', 'nav.nutrition': 'Nutrición', 'nav.settings': 'Ajustes',
      'ob.step': 'Paso', 'ob.of': 'de',
      'ob.step1.title': 'Cuéntanos\nsobre ti',
      'ob.step1.sub': 'Programa 100% personalizado',
      'ob.weight': 'Peso (kg)', 'ob.height': 'Altura (cm)',
      'ob.age': 'Edad', 'ob.bodyfat': 'Grasa corporal (%)',
      'ob.male': 'Hombre', 'ob.female': 'Mujer', 'ob.other': 'Otro',
      'ob.step2.title': 'Tu objetivo',
      'ob.step2.sub': 'Todo se calcula automáticamente',
      'ob.bulk': 'Ganar masa', 'ob.bulk.desc': '+300 kcal superávit',
      'ob.maintain': 'Mantener', 'ob.maintain.desc': 'Equilibrio perfecto',
      'ob.cut': 'Definición', 'ob.cut.desc': '-400 kcal déficit',
      'ob.diet': 'Dieta',
      'ob.standard': 'Estándar', 'ob.vegetarian': 'Vegetariano',
      'ob.vegan': 'Vegano', 'ob.keto': 'Keto',
      'ob.step3.title': 'Tu programa',
      'ob.level': 'Tu nivel',
      'ob.beginner': 'Principiante', 'ob.beginner.desc': 'Estoy empezando',
      'ob.advanced': 'Avanzado', 'ob.advanced.desc': 'Tengo experiencia',
      'ob.series': 'Tipo de series',
      'ob.fixed': 'Series fijas', 'ob.fixed.desc': 'Reps precisas, progreso por carga',
      'ob.failure': 'Fijas + fallo', 'ob.failure.desc': 'Última serie hasta el fallo muscular',
      'ob.step4.title': 'Tus días\nde entrenamiento',
      'ob.step4.sub': 'Selecciona todos los días que entrenas',
      'ob.finish': 'Ver mi programa →',
      'ob.continue': 'Continuar →', 'ob.back': '← Atrás',
      'day.monday': 'Lun', 'day.tuesday': 'Mar', 'day.wednesday': 'Mié',
      'day.thursday': 'Jue', 'day.friday': 'Vie', 'day.saturday': 'Sáb', 'day.sunday': 'Dom',
      'today.greeting': '¡Hola,', 'today.rest': 'Día de descanso',
      'today.rest.desc': 'Recupérate bien, te lo mereces.',
      'today.exercises': 'ejercicios', 'today.finish': '✓ Terminar sesión',
      'today.add': '+ Agregar ejercicio personalizado', 'today.add.set': '+ Agregar una serie',
      'timer.label': 'Descanso',
      'stats.title': 'Estadísticas', 'stats.calories': 'Necesidades calóricas',
      'stats.volume': 'Volumen de entrenamiento', 'stats.last30': 'Últimos 30 días',
      'stats.badges': 'Insignias ganadas', 'stats.total': 'Sesiones totales',
      'stats.streak': 'Semanas consecutivas', 'stats.badge.count': 'Insignias obtenidas',
      'stats.protein': 'Proteínas', 'stats.carbs': 'Carbohidratos', 'stats.fat': 'Grasas',
      'history.title': 'Historial', 'history.empty': 'Tus sesiones completadas aparecerán aquí',
      'history.thisweek': 'Esta semana', 'history.lastweek': 'Semana pasada',
      'history.thismonth': 'Este mes', 'history.older': 'Más antiguo',
      'set.account': 'CUENTA', 'set.edit.profile': 'Editar perfil',
      'set.edit.username': 'Cambiar apodo',
      'set.location.title': 'LUGAR DE ENTRENAMIENTO',
      'set.location.home': 'Casa', 'set.location.gym': 'Gimnasio',
      'set.program.title': 'MI PROGRAMA',
      'set.series.type': 'Tipo de series', 'set.training.days': 'Días de entrenamiento',
      'set.prefs': 'PREFERENCIAS', 'set.theme': 'Tema',
      'set.theme.dark': 'Oscuro', 'set.theme.light': 'Claro',
      'set.sound': 'Sonido del temporizador', 'set.language': 'Idioma',
      'set.data': 'DATOS', 'set.export': 'Exportar mis datos',
      'set.reset': 'Restablecer todo',
      'set.support': 'SOPORTE', 'set.help': 'Ayuda & FAQ',
      'set.logout': 'Cerrar sesión',
      'modal.edit.title': 'Editar perfil',
      'modal.username.title': 'Apodo',
      'modal.lang.title': 'Idioma / Language',
      'modal.series.title': 'Tipo de series',
      'modal.days.title': 'Días de entrenamiento',
      'modal.reset.title': '¿Restablecer todo?',
      'modal.reset.body': 'Esta acción es irreversible. Todo tu historial y datos serán eliminados.',
      'modal.reset.confirm': 'Sí, eliminar todo',
      'help.title': 'Ayuda & Soporte', 'help.faq': 'FAQ', 'help.contact': 'Contacto',
      'save': 'Guardar', 'cancel': 'Cancelar',
      'common.save': 'Guardar', 'common.cancel': 'Cancelar',
      'settings.account': 'CUENTA',
      'settings.editProfile': 'Editar perfil',
      'settings.changeUsername': 'Cambiar apodo',
      'settings.program': 'PROGRAMA',
      'settings.programType': 'Tipo de programa',
      'settings.location': 'Lugar de entrenamiento',
      'settings.home': 'Casa',
      'settings.gym': 'Gimnasio',
      'settings.seriesType': 'Tipo de series',
      'settings.trainingDays': 'Días de entrenamiento',
      'settings.preferences': 'PREFERENCIAS',
      'settings.timerSound': 'Sonido del temporizador',
      'settings.theme': 'Apariencia',
      'settings.dark': 'Oscuro',
      'settings.light': 'Claro',
      'settings.language': 'Idioma',
      'settings.data': 'DATOS',
      'settings.export': 'Exportar mis datos',
      'settings.reset': 'Restablecer todo',
      'settings.support': 'SOPORTE',
      'settings.help': 'Ayuda & FAQ',
      'settings.logout': 'Cerrar sesión',
      'reset.title': '¿Restablecer todo?',
      'reset.body': 'Esta acción es irreversible. Todo tu historial y datos serán eliminados.',
      'reset.confirm': 'Sí, eliminar todo',
      'series.fixed': 'Series fijas',
      'series.fixedDesc': 'Reps precisas, progreso por carga',
      'series.failure': 'Fijas + fallo',
      'series.failureDesc': 'Última serie hasta el fallo muscular',
      'days.mon': 'Lun', 'days.tue': 'Mar', 'days.wed': 'Mié',
      'days.thu': 'Jue', 'days.fri': 'Vie', 'days.sat': 'Sáb', 'days.sun': 'Dom',
    }
  };

  let currentLang = 'fr';

  /* Traduit une clé */
  function t(key) {
    return LANGS[currentLang]?.[key] ?? LANGS['fr']?.[key] ?? key;
  }

  /* Applique les traductions à tous les éléments data-i18n */
  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (el.tagName === 'INPUT') {
        if (el.type !== 'file') el.placeholder = val;
      } else {
        // Supporte les sauts de ligne (\n) dans les titres
        el.innerHTML = val.replace(/\n/g, '<br>');
      }
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
    // Met à jour l'attribut lang du document
    document.documentElement.lang = currentLang;
  }

  /* Change la langue et applique */
  function setLang(lang) {
    if (!LANGS[lang]) return;
    currentLang = lang;
    App.local.set('lang', lang);
    apply();
    // Met à jour l'affichage dans les réglages
    const display = document.getElementById('lang-display');
    if (display) display.textContent = `${LANGS[lang].flag} ${LANGS[lang].name}`;
    // Coche la bonne langue dans le modal
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  /* Initialisation au démarrage */
  function init() {
    const saved = App.local.get('lang') || 'fr';
    currentLang = saved;
    apply();
    const display = document.getElementById('lang-display');
    if (display) display.textContent = `${LANGS[saved].flag} ${LANGS[saved].name}`;
  }

  return { t, setLang, apply, init, LANGS, get lang() { return currentLang; } };

})();
