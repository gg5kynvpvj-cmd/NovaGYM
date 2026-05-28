/* ═══════════════════════════════════════════════════════════
   NovaGYM — Visuels SVG des exercices
   Génère des cartes SVG inline pour chaque exercice prédéfini
   Style : fond sombre, 2 positions stick figure, muscles colorés
   ═══════════════════════════════════════════════════════════ */

window.ExerciseVisuals = (() => {

  const ACCENT = '#B6FF00';
  const BG     = '#111111';
  const FIG1   = '#555555';   // position de départ
  const FIG2   = '#E0E0E0';   // position cible

  /* ─── Couleurs par muscle ─────────────────────────────── */
  const MC = {
    'Pectoraux':                  '#FF6B6B',
    'Pectoraux supérieurs':       '#FF6B6B',
    'Pectoraux inférieurs':       '#FF6B6B',
    'Quadriceps':                 '#FF9F43',
    'Fessiers':                   '#FF7675',
    'Ischio-jambiers':            '#A29BFE',
    'Grand dorsal':               '#74B9FF',
    'Biceps brachial':            '#55EFC4',
    'Biceps':                     '#55EFC4',
    'Brachial':                   '#55EFC4',
    'Brachialis':                 '#55EFC4',
    'Avant-bras':                 '#55EFC4',
    'Triceps':                    '#FD79A8',
    'Triceps (longue portion)':   '#FD79A8',
    'Deltoïdes':                  '#FDCB6E',
    'Deltoïdes antérieurs':       '#FDCB6E',
    'Deltoïdes latéraux':         '#FDCB6E',
    'Deltoïdes postérieurs':      '#FDCB6E',
    'Abdominaux':                 '#6C5CE7',
    'Abdominaux (droit)':         '#6C5CE7',
    'Abdominaux inférieurs':      '#6C5CE7',
    'Obliques':                   '#6C5CE7',
    'Gastrocnémien':              '#00CEC9',
    'Soléaire':                   '#00CEC9',
    'Trapèzes':                   '#81ECEC',
    'Trapèzes moyens':            '#81ECEC',
    'Érecteurs du rachis':        '#B2BEC3',
    'Fléchisseurs de hanches':    '#DFE6E9',
    'Rhomboïdes':                 '#74B9FF',
    'Rotateurs externes':         '#FDCB6E',
    'Pic du biceps':              '#55EFC4',
  };

  /* ─── Poses (coordonnées relatives au centre de hanche) ─
     Format : { hd, ls, rs, le, re, lw, rw, hp, lk, rk, la, ra }
     Y+ = bas, Y- = haut                                     */
  const P = {
    stand: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-23,-52], re:[23,-52], lw:[-25,-22], rw:[25,-22],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    squat: {
      hd:[2,-54], ls:[-14,-35], rs:[22,-35],
      le:[-18,-14], re:[28,-14], lw:[-22,-2], rw:[34,-2],
      hp:[0,12], lk:[-24,48], rk:[26,48], la:[-20,70], ra:[22,70]
    },
    deadlift_bot: {
      hd:[12,-68], ls:[-14,-50], rs:[18,-50],
      le:[-10,-28], re:[15,-28], lw:[-5,-4], rw:[12,-4],
      hp:[-2,10], lk:[-12,52], rk:[14,52], la:[-12,80], ra:[14,80]
    },
    deadlift_top: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-20,-56], re:[20,-56], lw:[-20,-26], rw:[20,-26],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    ohp_bot: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-28,-54], re:[28,-54], lw:[-28,-22], rw:[28,-22],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    ohp_top: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-12,-116], re:[12,-116], lw:[-8,-138], rw:[8,-138],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    bench_bot: {
      hd:[0,-10], ls:[-26,2], rs:[26,2],
      le:[-38,-18], re:[38,-18], lw:[-28,-40], rw:[28,-40],
      hp:[0,28], lk:[-10,60], rk:[10,60], la:[-10,88], ra:[10,88]
    },
    bench_top: {
      hd:[0,-10], ls:[-26,2], rs:[26,2],
      le:[-26,-36], re:[26,-36], lw:[-18,-62], rw:[18,-62],
      hp:[0,28], lk:[-10,60], rk:[10,60], la:[-10,88], ra:[10,88]
    },
    pullup_bot: {
      hd:[0,-60], ls:[-16,-40], rs:[16,-40],
      le:[-12,-66], re:[12,-66], lw:[-8,-88], rw:[8,-88],
      hp:[0,18], lk:[-10,55], rk:[10,55], la:[-10,88], ra:[10,88]
    },
    pullup_top: {
      hd:[0,-80], ls:[-18,-64], rs:[18,-64],
      le:[-24,-88], re:[24,-88], lw:[-8,-88], rw:[8,-88],
      hp:[0,-10], lk:[-10,30], rk:[10,30], la:[-10,65], ra:[10,65]
    },
    row_bot: {
      hd:[8,-58], ls:[-14,-40], rs:[18,-40],
      le:[-10,-20], re:[22,-20], lw:[-5,2], rw:[28,2],
      hp:[0,10], lk:[-12,50], rk:[14,50], la:[-12,80], ra:[14,80]
    },
    row_top: {
      hd:[8,-58], ls:[-14,-40], rs:[18,-40],
      le:[-22,-12], re:[30,-12], lw:[-5,2], rw:[28,2],
      hp:[0,10], lk:[-12,50], rk:[14,50], la:[-12,80], ra:[14,80]
    },
    curl_bot: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-20,-52], re:[20,-52], lw:[-22,-18], rw:[22,-18],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    curl_top: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-20,-52], re:[20,-52], lw:[-28,-74], rw:[28,-74],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    pushup_top: {
      hd:[-5,-16], ls:[-24,-4], rs:[26,-4],
      le:[-24,-4], re:[26,-4], lw:[-24,30], rw:[26,30],
      hp:[0,22], lk:[-4,54], rk:[6,54], la:[-4,80], ra:[6,80]
    },
    pushup_bot: {
      hd:[-5,-8], ls:[-24,4], rs:[26,4],
      le:[-36,-6], re:[38,-6], lw:[-24,30], rw:[26,30],
      hp:[0,26], lk:[-4,58], rk:[6,58], la:[-4,82], ra:[6,82]
    },
    plank: {
      hd:[-6,-14], ls:[-22,-2], rs:[28,-2],
      le:[-22,26], re:[28,26], lw:[-22,26], rw:[28,26],
      hp:[0,20], lk:[-4,56], rk:[6,56], la:[-4,80], ra:[6,80]
    },
    lat_bot: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-22,-52], re:[22,-52], lw:[-24,-22], rw:[24,-22],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    lat_top: {
      hd:[0,-104], ls:[-20,-80], rs:[20,-80],
      le:[-44,-80], re:[44,-80], lw:[-55,-72], rw:[55,-72],
      hp:[0,0], lk:[-11,40], rk:[11,40], la:[-12,80], ra:[12,80]
    },
    crunch_bot: {
      hd:[0,-8], ls:[-26,6], rs:[26,6],
      le:[-26,6], re:[26,6], lw:[-18,-14], rw:[18,-14],
      hp:[0,32], lk:[-12,60], rk:[12,60], la:[-14,58], ra:[14,58]
    },
    crunch_top: {
      hd:[0,-22], ls:[-22,-8], rs:[22,-8],
      le:[-22,-8], re:[22,-8], lw:[-16,-28], rw:[16,-28],
      hp:[0,32], lk:[-12,60], rk:[12,60], la:[-14,58], ra:[14,58]
    },
    lunge: {
      hd:[-2,-100], ls:[-18,-78], rs:[22,-78],
      le:[-22,-52], re:[26,-52], lw:[-22,-20], rw:[26,-20],
      hp:[0,0], lk:[-22,38], rk:[30,38], la:[-24,78], ra:[55,28]
    },
    dip_top: {
      hd:[0,-104], ls:[-22,-80], rs:[22,-80],
      le:[-28,-58], re:[28,-58], lw:[-30,-26], rw:[30,-26],
      hp:[0,0], lk:[-8,36], rk:[8,36], la:[-8,74], ra:[8,74]
    },
    dip_bot: {
      hd:[0,-82], ls:[-22,-62], rs:[22,-62],
      le:[-36,-46], re:[36,-46], lw:[-30,-26], rw:[30,-26],
      hp:[0,22], lk:[-8,58], rk:[8,58], la:[-8,94], ra:[8,94]
    },
    bridge_bot: {
      hd:[-32,8], ls:[-46,20], rs:[8,20],
      le:[-46,20], re:[8,20], lw:[-50,36], rw:[12,36],
      hp:[0,34], lk:[-16,60], rk:[16,60], la:[-26,42], ra:[26,42]
    },
    bridge_top: {
      hd:[-32,8], ls:[-46,20], rs:[8,20],
      le:[-46,20], re:[8,20], lw:[-50,36], rw:[12,36],
      hp:[0,8], lk:[-20,42], rk:[20,42], la:[-28,32], ra:[28,32]
    },
    seated: {
      hd:[0,-92], ls:[-20,-70], rs:[20,-70],
      le:[-22,-44], re:[22,-44], lw:[-24,-18], rw:[24,-18],
      hp:[0,10], lk:[-14,50], rk:[14,50], la:[-14,50], ra:[14,50]
    },
  };

  /* ─── Mapping exercice → [pose1, pose2, label1, label2] ─ */
  const EP = {
    bench_press:           ['bench_bot','bench_top','Descente','Poussée'],
    incline_press:         ['bench_bot','bench_top','Position basse','Extension'],
    dumbbell_bench_press:  ['bench_bot','bench_top','Descente','Poussée'],
    cable_fly:             ['lat_bot','lat_top','Ouverture','Fermeture'],
    skull_crusher:         ['bench_bot','bench_top','Flexion','Extension'],
    ohp:                   ['ohp_bot','ohp_top','Position basse','Bras tendus'],
    dumbbell_shoulder_press:['ohp_bot','ohp_top','Position basse','Bras tendus'],
    lateral_raise:         ['lat_bot','lat_top','Position basse','Bras levés'],
    front_raise:           ['lat_bot','lat_top','Position basse','Bras levés'],
    rear_delt_fly:         ['lat_bot','lat_top','Position basse','Écartés'],
    tricep_pushdown:       ['curl_top','curl_bot','Position haute','Extension'],
    overhead_tricep:       ['ohp_bot','ohp_top','Nuque','Extension'],
    dips:                  ['dip_bot','dip_top','Position basse','Position haute'],
    pushup:                ['pushup_bot','pushup_top','Position basse','Extension'],
    pike_pushup:           ['pushup_bot','pushup_top','Descente','Poussée'],
    pullup:                ['pullup_bot','pullup_top','Suspendu','Chin-up'],
    australian_pullup:     ['pullup_bot','pullup_top','Bras tendus','Tirage'],
    barbell_row:           ['row_bot','row_top','Extension','Tirage'],
    lat_pulldown:          ['pullup_bot','pullup_top','Bras tendus','Tirage'],
    cable_row:             ['row_bot','row_top','Extension','Tirage'],
    dumbbell_row:          ['row_bot','row_top','Extension','Tirage'],
    face_pull:             ['row_bot','row_top','Extension','Tirage visage'],
    bicep_curl:            ['curl_bot','curl_top','Extension','Contraction'],
    hammer_curl:           ['curl_bot','curl_top','Extension','Contraction'],
    concentration_curl:    ['curl_bot','curl_top','Extension','Contraction'],
    barbell_curl:          ['curl_bot','curl_top','Extension','Contraction'],
    preacher_curl:         ['curl_bot','curl_top','Extension','Contraction'],
    squat:                 ['stand','squat','Position haute','Position basse'],
    leg_press:             ['bench_top','bench_bot','Extension','Flexion'],
    rdl:                   ['deadlift_top','deadlift_bot','Position haute','Descente'],
    deadlift:              ['deadlift_bot','deadlift_top','Position basse','Extension'],
    lunge:                 ['stand','lunge','Debout','Fente'],
    leg_curl:              ['pushup_top','pushup_bot','Extension','Flexion'],
    calf_raise:            ['stand','stand','Talons bas','Pointes'],
    bodyweight_squat:      ['stand','squat','Debout','Position basse'],
    glute_bridge:          ['bridge_bot','bridge_top','Position basse','Extension'],
    leg_extension:         ['seated','seated','Flexion','Extension'],
    stiff_leg_dl:          ['deadlift_top','deadlift_bot','Debout','Descente'],
    bulgarian_split_squat: ['stand','lunge','Debout','Descente'],
    seated_calf_raise:     ['seated','seated','Position basse','Pointes'],
    crunch:                ['crunch_bot','crunch_top','Allongé','Contraction'],
    leg_raise:             ['crunch_bot','crunch_top','Jambes basses','Jambes levées'],
    plank:                 ['plank','plank','Gainage','Tiens la position'],
    russian_twist:         ['crunch_top','crunch_top','Assis','Rotation'],
    side_plank:            ['plank','plank','Côté gauche','Côté droit'],
  };

  /* ─── Dessine un stick figure ─────────────────────────── */
  function fig(pose, color, cx, cy, sc) {
    const s = sc || 0.55;
    const q = (j) => [+(cx + j[0]*s).toFixed(1), +(cy + j[1]*s).toFixed(1)];
    const p = pose;
    const hd = q(p.hd), ls = q(p.ls), rs = q(p.rs);
    const le = q(p.le), re = q(p.re), lw = q(p.lw), rw = q(p.rw);
    const hp = q(p.hp);
    const lhp = [+(cx+(p.hp[0]-10)*s).toFixed(1), hp[1]];
    const rhp = [+(cx+(p.hp[0]+10)*s).toFixed(1), hp[1]];
    const lk = q(p.lk), rk = q(p.rk), la = q(p.la), ra = q(p.ra);
    const nk = [+(cx+(p.ls[0]+p.rs[0])/2*s).toFixed(1), +(cy+(p.ls[1]+p.rs[1])/2*s).toFixed(1)];
    const sw = 2.5;
    const L = (a,b) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke-width="${sw}"/>`;
    return `<g stroke="${color}" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="${hd[0]}" cy="${hd[1]}" r="${+(7*s).toFixed(1)}" fill="${color}18" stroke="${color}" stroke-width="${sw}"/>
      ${L(hd,nk)}${L(ls,rs)}${L(ls,le)}${L(le,lw)}${L(rs,re)}${L(re,rw)}
      ${L(nk,hp)}${L(lhp,rhp)}${L(lhp,lk)}${L(lk,la)}${L(rhp,rk)}${L(rk,ra)}
      <line x1="${+(la[0]-5*s).toFixed(1)}" y1="${la[1]}" x2="${+(la[0]+4*s).toFixed(1)}" y2="${la[1]}" stroke-width="${sw}"/>
      <line x1="${+(ra[0]-4*s).toFixed(1)}" y1="${ra[1]}" x2="${+(ra[0]+5*s).toFixed(1)}" y2="${ra[1]}" stroke-width="${sw}"/>
    </g>`;
  }

  /* ─── Génère le SVG complet d'un exercice ─────────────── */
  function buildSVG(exercise) {
    const entry = EP[exercise.id];
    if (!entry) return null;
    const [p1id, p2id, lbl1, lbl2] = entry;
    const pose1 = P[p1id], pose2 = P[p2id];
    if (!pose1 || !pose2) return null;

    const W = 390, H = 200;
    const leftW = 108; // panel muscles

    // Muscles (max 3)
    const muscles = (exercise.muscles || []).slice(0, 3);

    // Tips (max 2)
    const tips = (exercise.tips || []).slice(0, 2).map(t =>
      t.length > 46 ? t.slice(0, 44) + '…' : t
    );

    // Centre des figures
    const figScale = 0.52;
    const f1x = leftW + 60, f1y = 108;
    const f2x = leftW + 178, f2y = 108;

    const figure1 = fig(pose1, FIG1, f1x, f1y, figScale);
    const figure2 = fig(pose2, FIG2, f2x, f2y, figScale);

    const muscleRows = muscles.map((m, i) => {
      const color = MC[m] || '#888';
      const shortM = m.length > 22 ? m.slice(0, 20) + '…' : m;
      return `
        <circle cx="12" cy="${55 + i*17}" r="4.5" fill="${color}"/>
        <text x="22" y="${59 + i*17}" font-size="9.5" fill="#AAAAAA">${shortM}</text>`;
    }).join('');

    const tip1 = tips[0] || '';
    const tip2 = tips[1] || '';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#131313"/>
      <stop offset="100%" stop-color="#0A0A0A"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="10"/>

  <!-- Barre accent + titre -->
  <rect x="12" y="12" width="3" height="26" fill="${ACCENT}" rx="1.5"/>
  <text x="20" y="23" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
        font-size="13" font-weight="800" fill="white" letter-spacing="-0.2"
        >${(exercise.name||'').toUpperCase()}</text>

  <!-- Panel gauche : muscles -->
  <rect x="0" y="0" width="${leftW}" height="${H}" fill="#0D0D0D" rx="10"/>
  <rect x="${leftW-1}" y="0" width="1" height="${H}" fill="#1E1E1E"/>
  <text x="10" y="45" font-family="-apple-system,sans-serif"
        font-size="8" font-weight="700" fill="#3A3A3A" letter-spacing="1">MUSCLES</text>
  ${muscleRows}

  <!-- Labels étapes -->
  <circle cx="${f1x}" cy="20" r="8" fill="${ACCENT}22" stroke="${ACCENT}55" stroke-width="1"/>
  <text x="${f1x}" y="24" text-anchor="middle" font-family="-apple-system,sans-serif"
        font-size="8" font-weight="700" fill="${ACCENT}">1</text>
  <text x="${f1x}" y="35" text-anchor="middle" font-family="-apple-system,sans-serif"
        font-size="8" fill="#555">${(lbl1||'').toUpperCase()}</text>

  <circle cx="${f2x}" cy="20" r="8" fill="${ACCENT}33" stroke="${ACCENT}" stroke-width="1"/>
  <text x="${f2x}" y="24" text-anchor="middle" font-family="-apple-system,sans-serif"
        font-size="8" font-weight="700" fill="${ACCENT}">2</text>
  <text x="${f2x}" y="35" text-anchor="middle" font-family="-apple-system,sans-serif"
        font-size="8" fill="#888">${(lbl2||'').toUpperCase()}</text>

  <!-- Flèche centrale -->
  <text x="${(f1x+f2x)/2}" y="113" text-anchor="middle"
        font-size="18" fill="#2A2A2A" font-family="sans-serif">›</text>

  <!-- Figures -->
  ${figure1}
  ${figure2}

  <!-- Séparateur tips -->
  <rect x="${leftW+1}" y="158" width="${W-leftW-1}" height="1" fill="#1A1A1A"/>

  <!-- Tips -->
  ${tip1 ? `<text x="${leftW+10}" y="172"
    font-family="-apple-system,sans-serif" font-size="9" fill="#666">
    <tspan fill="${ACCENT}" font-weight="700">✓ </tspan>${tip1}
  </text>` : ''}
  ${tip2 ? `<text x="${leftW+10}" y="188"
    font-family="-apple-system,sans-serif" font-size="9" fill="#666">
    <tspan fill="${ACCENT}" font-weight="700">✓ </tspan>${tip2}
  </text>` : ''}
</svg>`;
  }

  /* ─── Retourne un data URI SVG ────────────────────────── */
  function getVisualSrc(exercise) {
    if (!exercise || exercise.isCustom) return null;
    const svg = buildSVG(exercise);
    if (!svg) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return { getVisualSrc, buildSVG };

})();
