/* ═══════════════════════════════════════════════════════════
   NovaGYM — Visuels des exercices v2
   PNG custom (assets/exercises/) en priorité
   Fallback : diagramme anatomique SVG (bezier + dégradés)
   ═══════════════════════════════════════════════════════════ */

window.ExerciseVisuals = (() => {

  /* ─── Mapping exercice ID → fichier PNG ──────────────────── */
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
    pike_pushup:             '/assets/exercises/pike_pushup.png',

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

  /* ─── Mapping muscle → groupes anatomiques ──────────────── */
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

  /* ─── Calcule les IDs actifs depuis la liste muscles ────── */
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

  /* ─── Palette ───────────────────────────────────────────── */
  const C_JOINT = '#B0B0B0';
  const C_BODY  = '#C4C4C4';
  const C_LINE  = '#7A7A7A';
  const C_ACT   = '#CC1800';

  /* Attributs SVG selon état actif/inactif */
  function fa(active) {
    return active
      ? `fill="url(#mRed)"  stroke="${C_ACT}" stroke-width="0.8" filter="url(#glow)"`
      : `fill="url(#mGray)" stroke="${C_LINE}" stroke-width="0.5"`;
  }

  /* ─── Vue avant ─────────────────────────────────────────── */
  function frontView(act) {
    const a = act.front;
    const h = id => a.has(id);
    const M = (id, d) => `<path d="${d}" ${fa(h(id))}/>`;

    return `<g>
  <!-- Tête -->
  <circle cx="45" cy="14" r="12" fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.8"/>
  <ellipse cx="33" cy="14" rx="2.5" ry="4" fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.4"/>
  <ellipse cx="57" cy="14" rx="2.5" ry="4" fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.4"/>
  <!-- Cou -->
  <path d="M39,26 C38,29 38,33 38,35 L52,35 C52,33 52,29 51,26 Z"
        fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.5"/>

  <!-- Deltoïde gauche -->
  ${M('delt_l','M16,38 C9,42 5,54 8,65 C10,73 17,75 23,71 C28,67 29,56 27,48 C25,40 20,36 16,38 Z')}
  <!-- Deltoïde droit -->
  ${M('delt_r','M74,38 C81,42 85,54 82,65 C80,73 73,75 67,71 C62,67 61,56 63,48 C65,40 70,36 74,38 Z')}

  <!-- Pec gauche -->
  ${M('pec_l','M40,48 C32,48 21,53 16,62 C12,69 13,79 18,85 C23,91 30,92 36,89 C40,87 40,80 40,73 Z')}
  <!-- Pec droit -->
  ${M('pec_r','M50,48 C58,48 69,53 74,62 C78,69 77,79 72,85 C67,91 60,92 54,89 C50,87 50,80 50,73 Z')}

  <!-- Bicep gauche -->
  ${M('bicep_l','M9,64 C3,74 3,89 7,99 C9,105 14,107 19,103 C24,99 24,84 22,72 C20,62 13,58 9,64 Z')}
  <!-- Bicep droit -->
  ${M('bicep_r','M81,64 C87,74 87,89 83,99 C81,105 76,107 71,103 C66,99 66,84 68,72 C70,62 77,58 81,64 Z')}

  <!-- Avant-bras gauche -->
  ${M('farm_l','M7,101 C4,111 4,124 7,130 C9,134 13,134 16,130 C19,126 19,113 17,103 Z')}
  <!-- Avant-bras droit -->
  ${M('farm_r','M83,101 C86,111 86,124 83,130 C81,134 77,134 74,130 C71,126 71,113 73,103 Z')}

  <!-- Abdos haut -->
  ${M('abs_u','M37,82 L37,93 Q40.5,95 44,93 L44,82 Q40.5,80 37,82 Z')}
  <!-- Abdos milieu -->
  ${M('abs_m','M37,95 L37,106 Q40.5,108 44,106 L44,95 Q40.5,93 37,95 Z')}
  <!-- Abdos bas -->
  ${M('abs_l','M37,108 L37,119 Q40.5,121 44,119 L44,108 Q40.5,106 37,108 Z')}

  <!-- Oblique gauche -->
  ${M('obl_l','M27,78 C24,88 23,103 26,115 C28,121 33,122 37,118 L37,94 C35,86 31,74 27,78 Z')}
  <!-- Oblique droit -->
  ${M('obl_r','M63,78 C66,88 67,103 64,115 C62,121 57,122 53,118 L53,94 C55,86 59,74 63,78 Z')}

  <!-- Fléchisseurs hanches gauche -->
  ${M('hip_l','M29,121 C25,128 24,137 27,143 C29,147 34,147 37,143 C39,139 39,131 37,124 Z')}
  <!-- Fléchisseurs hanches droit -->
  ${M('hip_r','M61,121 C65,128 66,137 63,143 C61,147 56,147 53,143 C51,139 51,131 53,124 Z')}

  <!-- Quad gauche -->
  ${M('quad_l','M26,141 C21,155 20,171 22,184 C24,193 30,195 36,191 C41,187 41,172 40,156 C39,143 34,134 26,141 Z')}
  <!-- Quad droit -->
  ${M('quad_r','M64,141 C69,155 70,171 68,184 C66,193 60,195 54,191 C49,187 49,172 50,156 C51,143 56,134 64,141 Z')}

  <!-- Genou gauche -->
  <ellipse cx="32" cy="188" rx="7.5" ry="5" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>
  <!-- Genou droit -->
  <ellipse cx="58" cy="188" rx="7.5" ry="5" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>

  <!-- Mollet gauche (avant) -->
  ${M('calf_l','M24,193 C21,204 21,217 23,223 C25,229 30,230 34,226 C38,222 38,211 36,200 Z')}
  <!-- Mollet droit (avant) -->
  ${M('calf_r','M66,193 C69,204 69,217 67,223 C65,229 60,230 56,226 C52,222 52,211 54,200 Z')}

  <!-- Pieds -->
  <ellipse cx="30" cy="232" rx="10" ry="4" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>
  <ellipse cx="60" cy="232" rx="10" ry="4" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>
</g>`;
  }

  /* ─── Vue arrière ───────────────────────────────────────── */
  function backView(act) {
    const a = act.back;
    const h = id => a.has(id);
    const M = (id, d) => `<path d="${d}" ${fa(h(id))}/>`;

    return `<g>
  <!-- Tête -->
  <circle cx="45" cy="14" r="12" fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.8"/>
  <ellipse cx="33" cy="14" rx="2.5" ry="4" fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.4"/>
  <ellipse cx="57" cy="14" rx="2.5" ry="4" fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.4"/>
  <!-- Cou -->
  <path d="M39,26 C38,29 38,33 38,35 L52,35 C52,33 52,29 51,26 Z"
        fill="${C_BODY}" stroke="${C_LINE}" stroke-width="0.5"/>

  <!-- Trapèze gauche -->
  ${M('trap_l','M31,34 C24,38 18,48 21,58 C23,66 30,68 36,64 C42,60 43,52 42,44 Z')}
  <!-- Trapèze droit -->
  ${M('trap_r','M59,34 C66,38 72,48 69,58 C67,66 60,68 54,64 C48,60 47,52 48,44 Z')}
  <!-- Trapèze milieu / Rhomboïdes -->
  ${M('trap_m','M36,62 C39,68 41,73 45,75 C49,73 51,68 54,62 C51,55 48,50 45,50 C42,50 39,55 36,62 Z')}

  <!-- Deltoïde postérieur gauche -->
  ${M('rdelt_l','M16,38 C9,42 5,54 8,65 C10,73 17,75 23,71 C28,67 29,56 27,48 C25,40 20,36 16,38 Z')}
  <!-- Deltoïde postérieur droit -->
  ${M('rdelt_r','M74,38 C81,42 85,54 82,65 C80,73 73,75 67,71 C62,67 61,56 63,48 C65,40 70,36 74,38 Z')}

  <!-- Tricep gauche -->
  ${M('tri_l','M9,64 C3,76 3,93 7,103 C9,109 14,111 19,107 C24,103 24,88 22,76 C20,64 13,58 9,64 Z')}
  <!-- Tricep droit -->
  ${M('tri_r','M81,64 C87,76 87,93 83,103 C81,109 76,111 71,107 C66,103 66,88 68,76 C70,64 77,58 81,64 Z')}

  <!-- Grand dorsal gauche -->
  ${M('lat_l','M19,61 C13,73 12,92 15,110 C17,122 24,126 31,122 C38,118 39,102 39,86 C39,68 30,55 19,61 Z')}
  <!-- Grand dorsal droit -->
  ${M('lat_r','M71,61 C77,73 78,92 75,110 C73,122 66,126 59,122 C52,118 51,102 51,86 C51,68 60,55 71,61 Z')}

  <!-- Érecteur gauche -->
  ${M('erect_l','M37,80 L37,124 C38,126 40,126 41,124 L41,80 Q39,78 37,80 Z')}
  <!-- Érecteur droit -->
  ${M('erect_r','M49,80 L49,124 C50,126 52,126 53,124 L53,80 Q51,78 49,80 Z')}

  <!-- Fessier gauche -->
  ${M('glute_l','M23,126 C18,137 18,154 22,164 C26,172 34,174 40,170 C45,166 46,153 45,140 C44,128 35,118 23,126 Z')}
  <!-- Fessier droit -->
  ${M('glute_r','M67,126 C72,137 72,154 68,164 C64,172 56,174 50,170 C45,166 44,153 45,140 C46,128 55,118 67,126 Z')}

  <!-- Ischio gauche -->
  ${M('ham_l','M24,168 C20,180 20,196 23,206 C25,212 30,214 35,210 C40,206 40,192 38,180 C36,167 29,162 24,168 Z')}
  <!-- Ischio droit -->
  ${M('ham_r','M66,168 C70,180 70,196 67,206 C65,212 60,214 55,210 C50,206 50,192 52,180 C54,167 61,162 66,168 Z')}

  <!-- Genou gauche -->
  <ellipse cx="32" cy="208" rx="7.5" ry="5" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>
  <!-- Genou droit -->
  <ellipse cx="58" cy="208" rx="7.5" ry="5" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>

  <!-- Mollet gauche (arrière) -->
  ${M('bcalf_l','M23,212 C20,222 20,232 22,238 C24,242 29,242 33,238 C37,234 37,224 35,214 Z')}
  <!-- Mollet droit (arrière) -->
  ${M('bcalf_r','M67,212 C70,222 70,232 68,238 C66,242 61,242 57,238 C53,234 53,224 55,214 Z')}

  <!-- Pieds -->
  <ellipse cx="30" cy="244" rx="10" ry="4" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>
  <ellipse cx="60" cy="244" rx="10" ry="4" fill="${C_JOINT}" stroke="${C_LINE}" stroke-width="0.5"/>
</g>`;
  }

  /* ─── Assemble le SVG complet ───────────────────────────── */
  function buildSVG(exercise) {
    const muscles  = exercise.muscles || [];
    const active   = getActive(muscles);
    const hasBack  = active.back.size  > 0;
    const hasFront = active.front.size > 0 || !hasBack;

    const W = 220, H = 268;
    const fLabel = hasFront ? '#B6FF00' : '#555';
    const bLabel = hasBack  ? '#B6FF00' : '#555';

    return `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     style="display:block">
  <defs>
    <!-- Dégradé radial — muscle actif (rouge) -->
    <radialGradient id="mRed" cx="38%" cy="30%" r="70%">
      <stop offset="0%"   stop-color="#FF7055"/>
      <stop offset="50%"  stop-color="#FF2D00"/>
      <stop offset="100%" stop-color="#9A0E00"/>
    </radialGradient>
    <!-- Dégradé radial — muscle inactif (gris) -->
    <radialGradient id="mGray" cx="38%" cy="30%" r="70%">
      <stop offset="0%"   stop-color="#DEDEDE"/>
      <stop offset="55%"  stop-color="#C0C0C0"/>
      <stop offset="100%" stop-color="#8E8E8E"/>
    </radialGradient>
    <!-- Halo lumineux sur muscles actifs -->
    <filter id="glow" x="-45%" y="-45%" width="190%" height="190%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Vue avant -->
  <g transform="translate(5,8)" opacity="${hasFront ? 1 : 0.6}">
    ${frontView(active)}
  </g>

  <!-- Séparateur -->
  <line x1="111" y1="6" x2="111" y2="260"
        stroke="#444" stroke-width="0.7" opacity="0.35"/>

  <!-- Vue arrière -->
  <g transform="translate(118,8)" opacity="${hasBack ? 1 : 0.6}">
    ${backView(active)}
  </g>

  <!-- Labels AVANT / ARRIÈRE -->
  <text x="58"  y="${H - 3}" text-anchor="middle"
        font-family="-apple-system,sans-serif" font-size="8.5" font-weight="700"
        fill="${fLabel}" letter-spacing="1">AVANT</text>
  <text x="162" y="${H - 3}" text-anchor="middle"
        font-family="-apple-system,sans-serif" font-size="8.5" font-weight="700"
        fill="${bLabel}" letter-spacing="1">ARRIÈRE</text>
</svg>`;
  }

  /* ─── Retourne src pour un exercice ─────────────────────── */
  function getVisualSrc(exercise) {
    if (!exercise || exercise.isCustom) return null;
    if (IMGS[exercise.id]) return IMGS[exercise.id];
    const svg = buildSVG(exercise);
    if (!svg) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return { getVisualSrc, buildSVG };

})();
