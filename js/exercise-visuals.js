/* ═══════════════════════════════════════════════════════════
   NovaGYM — Visuels des exercices
   PNG custom (assets/exercises/) en priorité
   Fallback : diagramme anatomique SVG généré
   ═══════════════════════════════════════════════════════════ */

window.ExerciseVisuals = (() => {

  /* ─── Mapping exercice ID → fichier PNG ──────────────── */
  const IMGS = {
    // Pec · Épaule · Triceps
    bench_press:             '/assets/exercises/01_developpe_couche.png',
    incline_press:           '/assets/exercises/02_developpe_incline.png',
    ohp:                     '/assets/exercises/03_developpe_militaire.png',
    lateral_raise:           '/assets/exercises/04_elevations_laterales.png',
    front_raise:             '/assets/exercises/05_elevation_frontale.png',
    tricep_pushdown:         '/assets/exercises/06_extensions_triceps_poulie.png',
    dips:                    '/assets/exercises/07_dips_triceps.png',
    pushup:                  '/assets/exercises/08_pompes.png',
    dumbbell_bench_press:    '/assets/exercises/09_developpe_couche_halteres.png',
    cable_fly:               '/assets/exercises/10_ecartes_poulie_halteres.png',
    skull_crusher:           '/assets/exercises/11_barre_au_front.png',
    overhead_tricep:         '/assets/exercises/12_extension_nuque_haltere.png',
    dumbbell_shoulder_press: '/assets/exercises/13_developpe_halteres_epaules.png',

    // Dos · Biceps
    pullup:                  '/assets/exercises/01_tractions.png',
    barbell_row:             '/assets/exercises/02_rowing_barre.png',
    lat_pulldown:            '/assets/exercises/03_tirage_vertical.png',
    face_pull:               '/assets/exercises/04_face_pull.png',
    bicep_curl:              '/assets/exercises/05_curl_biceps.png',
    hammer_curl:             '/assets/exercises/06_curl_marteau.png',
    concentration_curl:      '/assets/exercises/07_curl_concentre.png',
    australian_pullup:       '/assets/exercises/08_tractions_australiennes.png',
    cable_row:               '/assets/exercises/09_tirage_horizontal_poulie.png',
    dumbbell_row:            '/assets/exercises/10_rowing_haltere.png',
    rear_delt_fly:           '/assets/exercises/11_oiseau_halteres.png',
    barbell_curl:            '/assets/exercises/12_curl_barre.png',
    preacher_curl:           '/assets/exercises/13_curl_pupitre.png',

    // Jambes · Fessiers · Mollets
    squat:                   '/assets/exercises/01_squat.png',
    leg_press:               '/assets/exercises/02_presse_a_cuisses.png',
    rdl:                     '/assets/exercises/03_souleve_terre_roumain.png',
    leg_curl:                '/assets/exercises/04_curl_ischio_jambiers.png',
    lunge:                   '/assets/exercises/05_fentes.png',
    calf_raise:              '/assets/exercises/06_elevations_mollets.png',
    bodyweight_squat:        '/assets/exercises/07_squat_poids_du_corps.png',
    glute_bridge:            '/assets/exercises/08_hip_thrust.png',
    deadlift:                '/assets/exercises/09_souleve_de_terre.png',
    leg_extension:           '/assets/exercises/10_leg_extension.png',
    stiff_leg_dl:            '/assets/exercises/11_souleve_terre_jambes_tendues.png',
    bulgarian_split_squat:   '/assets/exercises/12_fentes_bulgares.png',
    seated_calf_raise:       '/assets/exercises/13_mollets_assis.png',

    // Abdos · Core
    crunch:                  '/assets/exercises/01_crunch_v1.png',
    leg_raise:               '/assets/exercises/02_releves_jambes_v1.png',
    plank:                   '/assets/exercises/03_planche_v1.png',
    russian_twist:           '/assets/exercises/04_russian_twist_v1.png',
    side_plank:              '/assets/exercises/05_gainage_lateral_v1.png',
  };

  const RED    = '#FF3B30';
  const RED_DIM = '#CC2E26';
  const BODY   = '#282828';
  const BODY_OUTLINE = '#3A3A3A';
  const INACTIVE = '#1E1E1E';

  /* ─── Mapping muscle → parties du corps ──────────────── */
  const MUSCLE_MAP = {
    'Pectoraux':              { f: ['pec_l','pec_r'] },
    'Pectoraux supérieurs':   { f: ['pec_l','pec_r'] },
    'Pectoraux inférieurs':   { f: ['pec_l','pec_r'] },
    'Deltoïdes':              { f: ['delt_l','delt_r'], b: ['rdelt_l','rdelt_r'] },
    'Deltoïdes antérieurs':   { f: ['delt_l','delt_r'] },
    'Deltoïdes latéraux':     { f: ['delt_l','delt_r'], b: ['rdelt_l','rdelt_r'] },
    'Deltoïdes postérieurs':  { b: ['rdelt_l','rdelt_r'] },
    'Biceps brachial':        { f: ['bicep_l','bicep_r'] },
    'Biceps':                 { f: ['bicep_l','bicep_r'] },
    'Brachial':               { f: ['bicep_l','bicep_r'] },
    'Brachialis':             { f: ['bicep_l','bicep_r'] },
    'Pic du biceps':          { f: ['bicep_l','bicep_r'] },
    'Avant-bras':             { f: ['farm_l','farm_r'] },
    'Triceps':                { b: ['tri_l','tri_r'] },
    'Triceps (longue portion)':{ b: ['tri_l','tri_r'] },
    'Grand dorsal':           { b: ['lat_l','lat_r'] },
    'Trapèzes':               { b: ['trap_l','trap_r','trap_m'] },
    'Trapèzes moyens':        { b: ['trap_l','trap_r','trap_m'] },
    'Rhomboïdes':             { b: ['trap_m'] },
    'Rotateurs externes':     { b: ['rdelt_l','rdelt_r'] },
    'Abdominaux':             { f: ['abs_u','abs_m','abs_l'] },
    'Abdominaux (droit)':     { f: ['abs_u','abs_m','abs_l'] },
    'Abdominaux inférieurs':  { f: ['abs_l'] },
    'Obliques':               { f: ['obl_l','obl_r'] },
    'Fléchisseurs de hanches':{ f: ['hip_l','hip_r'] },
    'Adducteurs':             { f: ['quad_l','quad_r'] },
    'Quadriceps':             { f: ['quad_l','quad_r'] },
    'Fessiers':               { b: ['glute_l','glute_r'] },
    'Fessier moyen':          { b: ['glute_l','glute_r'] },
    'Ischio-jambiers':        { b: ['ham_l','ham_r'] },
    'Gastrocnémien':          { f: ['calf_l','calf_r'], b: ['bcalf_l','bcalf_r'] },
    'Soléaire':               { f: ['calf_l','calf_r'], b: ['bcalf_l','bcalf_r'] },
    'Érecteurs du rachis':    { b: ['erect_l','erect_r'] },
  };

  /* ─── Génère les IDs actifs depuis le tableau de muscles ─ */
  function getActive(muscles) {
    const f = new Set(), b = new Set();
    (muscles || []).forEach(m => {
      const map = MUSCLE_MAP[m];
      if (!map) return;
      (map.f || []).forEach(id => f.add(id));
      (map.b || []).forEach(id => b.add(id));
    });
    return { front: f, back: b };
  }

  /* ─── Couleur d'un élément ───────────────────────────── */
  const c = (active) => active ? RED : INACTIVE;
  const s = (active) => active ? RED_DIM : BODY_OUTLINE;

  /* ─── Vue avant ─────────────────────────────────────── */
  function frontView(act) {
    const a = act.front;
    const h = (id) => a.has(id);
    return `
<g>
  <!-- Tête -->
  <circle cx="45" cy="14" r="12" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
  <!-- Cou -->
  <rect x="40" y="26" width="10" height="10" rx="2" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>

  <!-- Deltoïde gauche -->
  <ellipse cx="27" cy="50" rx="12" ry="10" fill="${c(h('delt_l'))}" stroke="${s(h('delt_l'))}" stroke-width="1"/>
  <!-- Deltoïde droit -->
  <ellipse cx="63" cy="50" rx="12" ry="10" fill="${c(h('delt_r'))}" stroke="${s(h('delt_r'))}" stroke-width="1"/>

  <!-- Pec gauche -->
  <ellipse cx="34" cy="64" rx="11" ry="14" fill="${c(h('pec_l'))}" stroke="${s(h('pec_l'))}" stroke-width="1"/>
  <!-- Pec droit -->
  <ellipse cx="56" cy="64" rx="11" ry="14" fill="${c(h('pec_r'))}" stroke="${s(h('pec_r'))}" stroke-width="1"/>

  <!-- Bicep gauche -->
  <ellipse cx="16" cy="76" rx="7.5" ry="16" fill="${c(h('bicep_l'))}" stroke="${s(h('bicep_l'))}" stroke-width="1"/>
  <!-- Bicep droit -->
  <ellipse cx="74" cy="76" rx="7.5" ry="16" fill="${c(h('bicep_r'))}" stroke="${s(h('bicep_r'))}" stroke-width="1"/>

  <!-- Avant-bras gauche -->
  <ellipse cx="14" cy="108" rx="6" ry="13" fill="${c(h('farm_l'))}" stroke="${s(h('farm_l'))}" stroke-width="1"/>
  <!-- Avant-bras droit -->
  <ellipse cx="76" cy="108" rx="6" ry="13" fill="${c(h('farm_r'))}" stroke="${s(h('farm_r'))}" stroke-width="1"/>

  <!-- Abs haut -->
  <rect x="37" y="78" width="16" height="10" rx="3" fill="${c(h('abs_u'))}" stroke="${s(h('abs_u'))}" stroke-width="1"/>
  <!-- Abs milieu -->
  <rect x="37" y="90" width="16" height="10" rx="3" fill="${c(h('abs_m'))}" stroke="${s(h('abs_m'))}" stroke-width="1"/>
  <!-- Abs bas -->
  <rect x="37" y="102" width="16" height="10" rx="3" fill="${c(h('abs_l'))}" stroke="${s(h('abs_l'))}" stroke-width="1"/>

  <!-- Oblique gauche -->
  <ellipse cx="30" cy="100" rx="7" ry="14" fill="${c(h('obl_l'))}" stroke="${s(h('obl_l'))}" stroke-width="1"/>
  <!-- Oblique droit -->
  <ellipse cx="60" cy="100" rx="7" ry="14" fill="${c(h('obl_r'))}" stroke="${s(h('obl_r'))}" stroke-width="1"/>

  <!-- Hip gauche -->
  <ellipse cx="35" cy="128" rx="8" ry="9" fill="${c(h('hip_l'))}" stroke="${s(h('hip_l'))}" stroke-width="1"/>
  <!-- Hip droit -->
  <ellipse cx="55" cy="128" rx="8" ry="9" fill="${c(h('hip_r'))}" stroke="${s(h('hip_r'))}" stroke-width="1"/>

  <!-- Quad gauche -->
  <ellipse cx="33" cy="162" rx="11" ry="27" fill="${c(h('quad_l'))}" stroke="${s(h('quad_l'))}" stroke-width="1"/>
  <!-- Quad droit -->
  <ellipse cx="57" cy="162" rx="11" ry="27" fill="${c(h('quad_r'))}" stroke="${s(h('quad_r'))}" stroke-width="1"/>

  <!-- Genou gauche -->
  <ellipse cx="33" cy="192" rx="8" ry="5" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
  <!-- Genou droit -->
  <ellipse cx="57" cy="192" rx="8" ry="5" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>

  <!-- Mollet gauche -->
  <ellipse cx="32" cy="212" rx="8.5" ry="15" fill="${c(h('calf_l'))}" stroke="${s(h('calf_l'))}" stroke-width="1"/>
  <!-- Mollet droit -->
  <ellipse cx="58" cy="212" rx="8.5" ry="15" fill="${c(h('calf_r'))}" stroke="${s(h('calf_r'))}" stroke-width="1"/>

  <!-- Pieds -->
  <ellipse cx="32" cy="228" rx="9" ry="4" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
  <ellipse cx="58" cy="228" rx="9" ry="4" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
</g>`;
  }

  /* ─── Vue arrière ────────────────────────────────────── */
  function backView(act) {
    const a = act.back;
    const h = (id) => a.has(id);
    return `
<g>
  <!-- Tête -->
  <circle cx="45" cy="14" r="12" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
  <!-- Cou -->
  <rect x="40" y="26" width="10" height="10" rx="2" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>

  <!-- Trap gauche -->
  <ellipse cx="31" cy="46" rx="13" ry="9" fill="${c(h('trap_l'))}" stroke="${s(h('trap_l'))}" stroke-width="1"/>
  <!-- Trap droit -->
  <ellipse cx="59" cy="46" rx="13" ry="9" fill="${c(h('trap_r'))}" stroke="${s(h('trap_r'))}" stroke-width="1"/>
  <!-- Trap milieu -->
  <ellipse cx="45" cy="60" rx="13" ry="8" fill="${c(h('trap_m'))}" stroke="${s(h('trap_m'))}" stroke-width="1"/>

  <!-- Deltoïde arrière gauche -->
  <ellipse cx="19" cy="56" rx="10" ry="10" fill="${c(h('rdelt_l'))}" stroke="${s(h('rdelt_l'))}" stroke-width="1"/>
  <!-- Deltoïde arrière droit -->
  <ellipse cx="71" cy="56" rx="10" ry="10" fill="${c(h('rdelt_r'))}" stroke="${s(h('rdelt_r'))}" stroke-width="1"/>

  <!-- Tricep gauche -->
  <ellipse cx="14" cy="78" rx="7.5" ry="18" fill="${c(h('tri_l'))}" stroke="${s(h('tri_l'))}" stroke-width="1"/>
  <!-- Tricep droit -->
  <ellipse cx="76" cy="78" rx="7.5" ry="18" fill="${c(h('tri_r'))}" stroke="${s(h('tri_r'))}" stroke-width="1"/>

  <!-- Lat gauche -->
  <ellipse cx="27" cy="86" rx="9" ry="22" fill="${c(h('lat_l'))}" stroke="${s(h('lat_l'))}" stroke-width="1"/>
  <!-- Lat droit -->
  <ellipse cx="63" cy="86" rx="9" ry="22" fill="${c(h('lat_r'))}" stroke="${s(h('lat_r'))}" stroke-width="1"/>

  <!-- Érecteurs -->
  <rect x="38" y="80" width="7" height="42" rx="3" fill="${c(h('erect_l'))}" stroke="${s(h('erect_l'))}" stroke-width="1"/>
  <rect x="45" y="80" width="7" height="42" rx="3" fill="${c(h('erect_r'))}" stroke="${s(h('erect_r'))}" stroke-width="1"/>

  <!-- Fessier gauche -->
  <ellipse cx="33" cy="148" rx="13" ry="15" fill="${c(h('glute_l'))}" stroke="${s(h('glute_l'))}" stroke-width="1"/>
  <!-- Fessier droit -->
  <ellipse cx="57" cy="148" rx="13" ry="15" fill="${c(h('glute_r'))}" stroke="${s(h('glute_r'))}" stroke-width="1"/>

  <!-- Ischio gauche -->
  <ellipse cx="33" cy="180" rx="11" ry="25" fill="${c(h('ham_l'))}" stroke="${s(h('ham_l'))}" stroke-width="1"/>
  <!-- Ischio droit -->
  <ellipse cx="57" cy="180" rx="11" ry="25" fill="${c(h('ham_r'))}" stroke="${s(h('ham_r'))}" stroke-width="1"/>

  <!-- Genou gauche -->
  <ellipse cx="33" cy="192" rx="8" ry="5" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
  <!-- Genou droit -->
  <ellipse cx="57" cy="192" rx="8" ry="5" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>

  <!-- Mollet gauche (arrière) -->
  <ellipse cx="32" cy="212" rx="8.5" ry="15" fill="${c(h('bcalf_l'))}" stroke="${s(h('bcalf_l'))}" stroke-width="1"/>
  <!-- Mollet droit (arrière) -->
  <ellipse cx="58" cy="212" rx="8.5" ry="15" fill="${c(h('bcalf_r'))}" stroke="${s(h('bcalf_r'))}" stroke-width="1"/>

  <!-- Pieds -->
  <ellipse cx="32" cy="228" rx="9" ry="4" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
  <ellipse cx="58" cy="228" rx="9" ry="4" fill="${BODY}" stroke="${BODY_OUTLINE}" stroke-width="1"/>
</g>`;
  }

  /* ─── Génère le SVG complet ──────────────────────────── */
  function buildSVG(exercise) {
    const muscles = exercise.muscles || [];
    const active  = getActive(muscles);
    const hasBack  = active.back.size  > 0;
    const hasFront = active.front.size > 0 || !hasBack;

    const W = 210, H = 250;
    const fView  = frontView(active);
    const bView  = backView(active);
    const fLabel = hasFront && !hasBack ? '#B6FF00' : (hasFront ? '#B6FF00' : '#444');
    const bLabel = hasBack  && !hasFront ? '#B6FF00' : (hasBack  ? '#B6FF00' : '#444');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glowS" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Vue avant (x offset 5) -->
  <g transform="translate(5, 5)" filter="${hasFront ? 'url(#glowS)' : 'none'}">
    ${fView}
  </g>

  <!-- Séparateur -->
  <line x1="107" y1="10" x2="107" y2="240" stroke="#222" stroke-width="1"/>

  <!-- Vue arrière (x offset 115) -->
  <g transform="translate(115, 5)" filter="${hasBack ? 'url(#glowS)' : 'none'}">
    ${bView}
  </g>

  <!-- Labels -->
  <text x="55" y="247" text-anchor="middle"
        font-family="-apple-system,sans-serif" font-size="9" font-weight="700"
        fill="${fLabel}" letter-spacing="0.8">AVANT</text>
  <text x="160" y="247" text-anchor="middle"
        font-family="-apple-system,sans-serif" font-size="9" font-weight="700"
        fill="${bLabel}" letter-spacing="0.8">ARRIÈRE</text>
</svg>`;
  }

  /* ─── Retourne un data URI SVG ────────────────────────── */
  function getVisualSrc(exercise) {
    if (!exercise || exercise.isCustom) return null;
    // PNG en priorité
    if (IMGS[exercise.id]) return IMGS[exercise.id];
    // Fallback SVG pour les exercices sans image
    const svg = buildSVG(exercise);
    if (!svg) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return { getVisualSrc, buildSVG };

})();
