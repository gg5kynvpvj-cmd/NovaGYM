/* ═══════════════════════════════════════════════════════════
   NovaGYM — Base de données des exercices
   Chaque exercice contient : nom, muscles, description, conseils,
   si unilatéral, sets/reps par défaut, équipement requis.
   ═══════════════════════════════════════════════════════════ */

window.EXERCISES = {

  /* ─── PUSH ─────────────────────────────────────────── */
  push: [
    {
      id: 'bench_press',
      name: 'Développé couché',
      muscles: ['Pectoraux', 'Deltoïdes antérieurs', 'Triceps'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 8, restSeconds: 120,
      equipment: 'gym',
      description: "L'exercice roi de la musculation. Allongé sur un banc horizontal, tu abaisses une barre chargée jusqu'à la poitrine, puis tu la repousses vers le haut. Idéal pour développer la force et l'épaisseur des pectoraux.",
      tips: [
        "Serre les omoplates ensemble avant de saisir la barre",
        "Garde les pieds bien à plat sur le sol",
        "Descends la barre lentement en 3 secondes",
        "Vise le milieu de ton sternum — pas le cou",
        "Ne rebondis jamais la barre sur ta poitrine"
      ]
    },
    {
      id: 'incline_press',
      name: 'Développé incliné',
      muscles: ['Pectoraux supérieurs', 'Deltoïdes antérieurs', 'Triceps'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 10, restSeconds: 90,
      equipment: 'gym',
      description: "Variante du développé couché avec le banc incliné à 30-45°. Cible davantage la partie supérieure des pectoraux pour un chest plus complet et bombé.",
      tips: [
        "Règle l'inclinaison à 30-45° maximum",
        "Garde les coudes à 75° par rapport au corps",
        "Contracte bien les pectoraux en haut du mouvement",
        "Respire — expire en poussant, inspire en descendant"
      ]
    },
    {
      id: 'ohp',
      name: 'Développé militaire',
      muscles: ['Deltoïdes', 'Triceps', 'Trapèzes'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 8, restSeconds: 120,
      equipment: 'gym',
      description: "Exercice de force debout ou assis. Tu pousses une barre au-dessus de ta tête, les bras tendus. Excellent pour construire des épaules larges et puissantes.",
      tips: [
        "Serre les fessiers et abdos pour protéger le bas du dos",
        "Garde le regard légèrement vers le haut en poussant",
        "La barre doit passer devant le nez, pas derrière",
        "Rentre le cou et avance le buste une fois la barre en haut"
      ]
    },
    {
      id: 'lateral_raise',
      name: 'Élévations latérales',
      muscles: ['Deltoïdes latéraux'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'gym',
      description: "Exercice d'isolation pour élargir les épaules. Tu lèves deux haltères sur les côtés jusqu'à la hauteur des épaules, créant le look 3D si recherché.",
      tips: [
        "Légère flexion des coudes tout au long du mouvement",
        "Lève jusqu'à hauteur des épaules — pas plus haut",
        "Contrôle la descente, ne laisse pas tomber les bras",
        "Penche légèrement les pouces vers le bas (comme vider un verre)"
      ]
    },
    {
      id: 'front_raise',
      name: 'Élévation frontale',
      muscles: ['Deltoïdes antérieurs'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Exercice d'isolation ciblant le deltoïde antérieur. Tu lèves les haltères devant toi jusqu'à la hauteur des épaules pour sculpter l'avant de l'épaule.",
      tips: [
        "Légère flexion des coudes, paumes vers le bas",
        "Monte jusqu'à la hauteur des épaules — pas plus haut",
        "Contrôle la descente lentement pour maximiser le travail",
        "Garde le buste droit, évite de te balancer"
      ]
    },
    {
      id: 'tricep_pushdown',
      name: 'Extensions triceps poulie',
      muscles: ['Triceps'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Exercice d'isolation pour les triceps à la poulie haute. Tu tends les bras vers le bas en gardant les coudes fixes contre le corps. Parfait pour finir une séance push.",
      tips: [
        "Coudes collés au corps et immobiles",
        "Tend les bras complètement — contracte les triceps en bas",
        "Remonte lentement jusqu'à angle 90° — ne remonte pas plus haut",
        "Reste droit, ne penche pas vers l'avant"
      ]
    },
    {
      id: 'dips',
      name: 'Dips (triceps)',
      muscles: ['Triceps', 'Pectoraux inférieurs', 'Deltoïdes'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 10, restSeconds: 90,
      equipment: 'gym',
      description: "Exercice au poids du corps sur barres parallèles. Tu te soulèves avec les bras pour monter et descendre ton corps. Un classique pour des triceps massifs.",
      tips: [
        "Garde le buste droit pour cibler les triceps",
        "Descends jusqu'à 90° de flexion au coude — pas plus",
        "Ne te balance pas — contrôle pur",
        "Ajoute du poids avec une ceinture une fois à l'aise"
      ]
    },
    {
      id: 'pushup',
      name: 'Pompes',
      muscles: ['Pectoraux', 'Triceps', 'Deltoïdes antérieurs'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'home',
      description: "L'exercice de base, aucun matériel nécessaire. Le corps forme une planche rigide, tu descends jusqu'à effleurer le sol puis tu remontres. Fondamental et efficace.",
      tips: [
        "Corps gaîné comme une planche — fessiers et abdos contractés",
        "Coudes à 45° par rapport au corps — ni trop écartés ni trop fermés",
        "Descends jusqu'à ce que ta poitrine touche presque le sol",
        "Expires en poussant, inspire en descendant"
      ]
    },
    {
      id: 'pike_pushup',
      name: 'Pompes en piqué',
      muscles: ['Deltoïdes', 'Triceps'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'home',
      description: "Variante des pompes qui cible davantage les épaules. Les fesses en l'air, tu descends la tête entre tes mains pour travailler les deltoïdes.",
      tips: [
        "Forme un V inversé avec ton corps",
        "Descends jusqu'à ce que ta tête touche presque le sol",
        "Garde les jambes le plus droites possible",
        "C'est la version au poids du corps du développé militaire"
      ]
    },
    {
      id: 'dumbbell_bench_press',
      name: 'Développé couché haltères',
      muscles: ['Pectoraux', 'Deltoïdes antérieurs', 'Triceps'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 10, restSeconds: 90,
      equipment: 'gym',
      description: "Version haltères du développé couché. La plus grande amplitude de mouvement permet un meilleur étirement des pectoraux, et chaque bras travaille indépendamment pour corriger les déséquilibres.",
      tips: [
        "Commence avec les haltères sur les cuisses, bascule en t'allongeant",
        "Descends les haltères jusqu'à ce que tes coudes dépassent le banc",
        "Garde les poignets droits — ne les laisse pas plier vers l'arrière",
        "Serre les pectoraux en haut — les haltères presque en contact"
      ]
    },
    {
      id: 'cable_fly',
      name: 'Écartés (poulie / haltères)',
      muscles: ['Pectoraux', 'Deltoïdes antérieurs'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'gym',
      description: "Exercice d'isolation par excellence pour les pectoraux. En ouvrant les bras sur les côtés, tu étires et contractes les fibres pectorales sans l'aide des triceps. Idéal pour finir une séance chest.",
      tips: [
        "Légère flexion des coudes — jamais les bras complètement tendus",
        "Imagine que tu entoures un tonneau avec tes bras",
        "Contracte les pectoraux en ramenant les mains — pas juste les bras",
        "Mouvement lent et contrôlé — évite l'élan"
      ]
    },
    {
      id: 'skull_crusher',
      name: 'Barre au front',
      muscles: ['Triceps'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Exercice d'isolation puissant pour les triceps. Allongé, tu descends la barre (EZ ou droite) vers le front en fléchissant seulement les coudes. Développe la masse et l'épaisseur des triceps.",
      tips: [
        "Coudes pointés vers le plafond — immobiles tout le long",
        "Descends jusqu'à quelques centimètres du front ou du crâne",
        "Remonte lentement — ne verrouille pas totalement les coudes en haut",
        "Prise légèrement plus étroite que les épaules, barre EZ recommandée"
      ]
    },
    {
      id: 'overhead_tricep',
      name: 'Extension nuque haltère',
      muscles: ['Triceps (longue portion)'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Bras tendus au-dessus de la tête, tu descends un haltère derrière la nuque en fléchissant les coudes. Cible spécifiquement la longue portion du triceps, souvent négligée.",
      tips: [
        "Tiens l'haltère à deux mains derrière la tête",
        "Coudes pointés vers le plafond — ne les laisse pas s'écarter",
        "Descends jusqu'à sentir l'étirement maximal du triceps",
        "Remonte en contractant fort les triceps"
      ]
    },
    {
      id: 'dumbbell_shoulder_press',
      name: 'Développé haltères (épaules)',
      muscles: ['Deltoïdes', 'Triceps', 'Trapèzes'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 90,
      equipment: 'gym',
      description: "Assis ou debout, tu pousses deux haltères au-dessus de ta tête. Plus grande liberté de mouvement que la barre, chaque épaule travaille de façon indépendante pour corriger les asymétries.",
      tips: [
        "Démarre avec les haltères à hauteur des oreilles, coudes à 90°",
        "Pousse vers le haut et légèrement vers l'intérieur",
        "Ne monte pas les épaules vers les oreilles — garde-les basses",
        "Contrôle la descente pour protéger les épaules"
      ]
    }
  ],

  /* ─── PULL ──────────────────────────────────────────── */
  pull: [
    {
      id: 'pullup',
      name: 'Tractions',
      muscles: ['Grand dorsal', 'Biceps', 'Trapèzes moyens'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 6, restSeconds: 120,
      equipment: 'gym',
      description: "Le squat du haut du corps. Tu te suspends à une barre et tu tires ton corps vers le haut jusqu'à ce que ton menton dépasse la barre. Développe un dos large en V.",
      tips: [
        "Prise légèrement plus large que les épaules",
        "Engage les omoplates vers le bas avant de tirer",
        "Remonte jusqu'à ce que le sternum touche la barre",
        "Descends lentement — le négatif est aussi important"
      ]
    },
    {
      id: 'barbell_row',
      name: 'Rowing barre',
      muscles: ['Grand dorsal', 'Trapèzes', 'Biceps', 'Érecteurs du rachis'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 8, restSeconds: 120,
      equipment: 'gym',
      description: "Exercice de force pour épaissir le dos. Penché à 45°, tu tires une barre vers le bas de l'abdomen. Un des exercices les plus efficaces pour construire un dos puissant.",
      tips: [
        "Dos plat — ne l'arrondit JAMAIS avec du poids",
        "Tire vers le bas-ventre, pas vers la poitrine",
        "Garde la tête dans le prolongement du dos",
        "Serre les omoplates en fin de mouvement"
      ]
    },
    {
      id: 'lat_pulldown',
      name: 'Tirage vertical',
      muscles: ['Grand dorsal', 'Biceps', 'Trapèzes'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 90,
      equipment: 'gym',
      description: "Version machine des tractions. Assis, tu tires la barre de la poulie vers ta poitrine. Idéal pour débuter ou progresser vers les vraies tractions.",
      tips: [
        "Légère inclinaison du buste en arrière",
        "Tire vers le haut de la poitrine — pas le menton",
        "Engage les coudes vers le bas et l'arrière",
        "Remonte lentement pour étirer le grand dorsal"
      ]
    },
    {
      id: 'face_pull',
      name: 'Face Pull',
      muscles: ['Trapèzes moyens', 'Deltoïdes postérieurs', 'Rotateurs externes'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'gym',
      description: "Exercice essentiel souvent négligé pour la santé des épaules. Tu tires une corde vers ton visage à la poulie. Excellent pour corriger la posture et renforcer les épaules.",
      tips: [
        "Poulie à hauteur du visage ou légèrement plus haute",
        "Tire les mains vers les oreilles — ouvrir vers l'extérieur",
        "Coudes à la hauteur des épaules ou au-dessus",
        "Léger poids, haute répétition — la technique prime"
      ]
    },
    {
      id: 'bicep_curl',
      name: 'Curl biceps',
      muscles: ['Biceps brachial', 'Brachial'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "L'exercice iconique pour les biceps. Debout, tu fléchis les coudes pour amener les haltères ou la barre jusqu'aux épaules. Simple, efficace, incontournable.",
      tips: [
        "Coudes collés aux flancs — immobiles",
        "Monte en 1 seconde, descends en 3 secondes",
        "Tourne les paumes vers le haut au sommet du mouvement",
        "Évite de balancer le buste — c'est de la triche"
      ]
    },
    {
      id: 'hammer_curl',
      name: 'Curl marteau',
      muscles: ['Biceps brachial', 'Brachialis', 'Avant-bras'],
      isUnilateral: true,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Variante du curl avec prise neutre (pouces vers le haut). Travaille davantage le brachialis et les avant-bras. Donne de l'épaisseur au bras. Se fait avec un bras à la fois.",
      tips: [
        "Prise neutre : pouce vers le plafond tout au long",
        "Coude fixe contre le corps — ne bouge pas",
        "Contracte fort en haut, descends lentement",
        "Alterne les bras ou fais les deux ensemble"
      ]
    },
    {
      id: 'concentration_curl',
      name: 'Curl concentré',
      muscles: ['Biceps brachial', 'Pic du biceps'],
      isUnilateral: true,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Assis, coude contre la cuisse, tu curl un haltère lentement. Exercice d'isolation pure pour maximiser le pic du biceps. Un bras à la fois pour une concentration totale.",
      tips: [
        "Assis, coude appuyé à l'intérieur de la cuisse",
        "Monte en supinant (tourne le poignet vers l'extérieur)",
        "Contracte fort en haut — maintiens 1 seconde",
        "Descend en 3 secondes pour maximiser l'étirement"
      ]
    },
    {
      id: 'australian_pullup',
      name: 'Tractions australiennes',
      muscles: ['Grand dorsal', 'Biceps', 'Trapèzes'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 90,
      equipment: 'home',
      description: "Traction horizontale avec le corps incliné sous une barre basse. Plus facile que les tractions classiques, parfaite pour débuter. Ton dos doit rester droit et rigide.",
      tips: [
        "Corps droit comme une planche — ne plie pas aux hanches",
        "Tire ta poitrine vers la barre",
        "Descends lentement en contrôlant",
        "Plus l'inclinaison est grande (corps horizontal), plus c'est difficile"
      ]
    },
    {
      id: 'cable_row',
      name: 'Tirage horizontal (poulie)',
      muscles: ['Grand dorsal', 'Trapèzes', 'Biceps', 'Rhomboïdes'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 12, restSeconds: 90,
      equipment: 'gym',
      description: "Assis face à une poulie basse, tu tires la poignée vers ton abdomen en gardant le dos droit. Excellent pour développer l'épaisseur du dos avec une tension constante tout au long du mouvement.",
      tips: [
        "Tronc légèrement incliné en arrière — pas en avant",
        "Tire vers le bas-ventre, pas vers la poitrine",
        "Serre les omoplates ensemble en fin de mouvement",
        "Reviens lentement en avant pour étirer le dos"
      ]
    },
    {
      id: 'dumbbell_row',
      name: 'Rowing haltère',
      muscles: ['Grand dorsal', 'Trapèzes', 'Biceps'],
      isUnilateral: true,
      defaultSets: 4, defaultReps: 10, restSeconds: 90,
      equipment: 'gym',
      description: "Un genou et une main sur un banc, tu tires un haltère lourd vers ta hanche. Permet de charger très lourd unilatéralement et de concentrer le travail sur un côté du dos à la fois.",
      tips: [
        "Dos strictement parallèle au sol — ne te tords pas",
        "Tire le coude vers le plafond, pas la main vers l'épaule",
        "Serre fort l'omoplate en haut du mouvement",
        "Laisse l'haltère descendre bas pour un étirement complet"
      ]
    },
    {
      id: 'rear_delt_fly',
      name: 'Oiseau haltères',
      muscles: ['Deltoïdes postérieurs', 'Trapèzes moyens', 'Rhomboïdes'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'gym',
      description: "Penché à 45° ou assis, tu lèves deux haltères légers sur les côtés pour cibler les deltoïdes postérieurs. Essentiel pour une épaule complète et équilibrée, souvent négligé.",
      tips: [
        "Poids très léger — la technique prime absolument",
        "Coudes légèrement fléchis, paumes face au sol",
        "Lève jusqu'à la hauteur des épaules",
        "Contrôle la descente — 3 secondes minimum"
      ]
    },
    {
      id: 'barbell_curl',
      name: 'Curl barre',
      muscles: ['Biceps brachial', 'Brachial'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 10, restSeconds: 60,
      equipment: 'gym',
      description: "La version barre du curl biceps. Debout, tu fléchis les deux bras simultanément en tenant une barre. Permet de charger plus lourd que les haltères pour maximiser la force et le volume des biceps.",
      tips: [
        "Prise supinée (paumes vers le haut), légèrement plus large que les épaules",
        "Coudes collés aux flancs — ils ne bougent pas",
        "Monte en 1 seconde, descends en 3 secondes",
        "Barre EZ pour moins de stress sur les poignets"
      ]
    },
    {
      id: 'preacher_curl',
      name: 'Curl pupitre',
      muscles: ['Biceps brachial (pic)', 'Brachial'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Les bras appuyés sur un pupitre incliné, tu curl une barre ou des haltères. Le pupitre élimine totalement la triche et isole les biceps de façon maximale. Idéal pour le pic du biceps.",
      tips: [
        "Bras bien appuyés sur le pupitre du début à la fin",
        "Descends jusqu'à extension quasi-complète — ne bloque pas les coudes",
        "Monte lentement — ne balance pas",
        "Contracte fort en haut et maintiens 1 seconde"
      ]
    }
  ],

  /* ─── LEGS ──────────────────────────────────────────── */
  legs: [
    {
      id: 'squat',
      name: 'Squat',
      muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers', 'Érecteurs du rachis'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 8, restSeconds: 180,
      equipment: 'gym',
      description: "Le roi de tous les exercices. Barre sur les trapèzes, tu descends jusqu'à ce que tes cuisses soient parallèles au sol, puis tu remontes. Développe l'ensemble du bas du corps.",
      tips: [
        "Pieds légèrement plus larges que les épaules, légèrement ouverts",
        "Descends jusqu'à ce que les cuisses soient parallèles ou en-dessous",
        "Genoux dans l'axe des orteils — ne rentre jamais vers l'intérieur",
        "Garde le dos droit et la poitrine haute tout le long",
        "Pousse dans le sol — ne pense pas à te lever, pense à pousser"
      ]
    },
    {
      id: 'leg_press',
      name: 'Presse à cuisses',
      muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 12, restSeconds: 120,
      equipment: 'gym',
      description: "Machine permettant de charger lourd en sécurité. Assis dans la machine, tu pousses une plateforme lestée avec les pieds. Position des pieds = muscles ciblés différents.",
      tips: [
        "Pieds hauts sur la plateforme = plus de fessiers",
        "Pieds bas = plus de quadriceps",
        "Ne bloque jamais totalement les genoux en haut",
        "Descends jusqu'à 90° ou plus — ne triche pas sur la profondeur"
      ]
    },
    {
      id: 'rdl',
      name: 'Soulevé de terre roumain',
      muscles: ['Ischio-jambiers', 'Fessiers', 'Érecteurs du rachis'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 10, restSeconds: 120,
      equipment: 'gym',
      description: "Glisse la barre le long de tes jambes en maintenant le dos droit et en poussant les hanches vers l'arrière. Développe les ischios et les fessiers en profondeur.",
      tips: [
        "Dos droit toute la durée — c'est la règle absolue",
        "Glisse la barre contre les jambes du début à la fin",
        "Pousse les hanches EN ARRIÈRE (pas vers le bas)",
        "Descends jusqu'à ce que tu sentes l'étirement des ischios",
        "Contracte les fessiers pour remonter"
      ]
    },
    {
      id: 'leg_curl',
      name: 'Curl ischio-jambiers',
      muscles: ['Ischio-jambiers'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 60,
      equipment: 'gym',
      description: "Machine d'isolation pour les ischio-jambiers. Allongé sur le ventre, tu fléchis les genoux pour ramener le poids vers les fessiers. Essentiel pour l'équilibre quadriceps/ischios.",
      tips: [
        "Allongé sur le ventre, hanches bien plaquées sur le banc",
        "Remonte en 1 seconde, descends en 3 secondes",
        "Contracte les ischios fort en fin de mouvement",
        "Ne soulève pas les hanches — garde-les au contact du banc"
      ]
    },
    {
      id: 'lunge',
      name: 'Fentes',
      muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],
      isUnilateral: true,
      defaultSets: 3, defaultReps: 12, restSeconds: 90,
      equipment: 'gym',
      description: "Exercice unilatéral qui travaille chaque jambe séparément. Tu avances un pied, descends le genou arrière vers le sol, puis tu reviens. Excellent pour corriger les déséquilibres.",
      tips: [
        "Grand pas en avant — genou avant ne dépasse pas le bout du pied",
        "Genou arrière descend sans toucher le sol",
        "Garde le buste droit — ne te penche pas en avant",
        "Pousse avec le talon avant pour remonter"
      ]
    },
    {
      id: 'calf_raise',
      name: 'Élévations des mollets',
      muscles: ['Gastrocnémien', 'Soléaire'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 20, restSeconds: 60,
      equipment: 'gym',
      description: "Debout, tu montes sur la pointe des pieds pour solliciter les mollets. Simple mais efficace quand on respecte la pleine amplitude et la lenteur.",
      tips: [
        "Monte aussi haut que possible — contracte fort en haut",
        "Descends lentement jusqu'à étirer le mollet en bas",
        "Fait sur une marche pour plus d'amplitude",
        "Maintiens 1 seconde en haut pour maximiser la contraction"
      ]
    },
    {
      id: 'bodyweight_squat',
      name: 'Squat au poids du corps',
      muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 20, restSeconds: 60,
      equipment: 'home',
      description: "Le squat sans barre. Parfait pour apprendre le mouvement ou s'entraîner à la maison. Les bras tendus devant soi pour l'équilibre. Technique identique au squat avec barre.",
      tips: [
        "Pieds largeur des épaules, orteils légèrement ouverts",
        "Descends le plus bas possible — cherche le sol",
        "Genoux dans l'axe des orteils",
        "Garde la poitrine haute et le dos droit"
      ]
    },
    {
      id: 'glute_bridge',
      name: 'Hip Thrust',
      muscles: ['Fessiers', 'Ischio-jambiers', 'Adducteurs'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'home',
      description: "Allongé sur le dos, genoux fléchis, tu pousses les hanches vers le plafond en contractant les fessiers. L'exercice le plus efficace pour développer les fessiers.",
      tips: [
        "Pied à plat, genoux à 90° quand les hanches sont en haut",
        "Pousse dans les talons — pas les orteils",
        "Contracte les fessiers fort en haut — maintiens 2 secondes",
        "Protège le bas du dos en engageant les abdos"
      ]
    },
    {
      id: 'deadlift',
      name: 'Soulevé de terre',
      muscles: ['Ischio-jambiers', 'Fessiers', 'Grand dorsal', 'Trapèzes', 'Quadriceps', 'Érecteurs du rachis'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 5, restSeconds: 180,
      equipment: 'gym',
      description: "Le mouvement roi de la force. Tu soulèves une barre depuis le sol jusqu'à la position debout en engageant presque tous les muscles du corps. Aucun autre exercice ne développe autant la force globale.",
      tips: [
        "Barre sur le milieu des pieds — à 2-3 cm des tibias",
        "Dos plat et poitrine haute — c'est impératif avec du lourd",
        "Pousse dans le sol comme pour l'écarter de la barre",
        "Verrouille les hanches et les genoux en même temps",
        "Descends la barre en glissant contre les jambes — pas en la jetant"
      ]
    },
    {
      id: 'leg_extension',
      name: 'Leg Extension',
      muscles: ['Quadriceps'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'gym',
      description: "Machine d'isolation pour les quadriceps. Assis, tu tends les jambes vers l'avant contre une résistance. Excellent finisseur après les exercices polyarticulaires pour brûler les quads.",
      tips: [
        "Assure-toi que le coussin est bien positionné sur les chevilles",
        "Tend les jambes complètement — contracte les quads fort en haut",
        "Descends lentement — 3 secondes minimum",
        "Ne laisse pas les fessiers se soulever du siège"
      ]
    },
    {
      id: 'stiff_leg_dl',
      name: 'Soulevé de terre jambes tendues',
      muscles: ['Ischio-jambiers', 'Fessiers', 'Érecteurs du rachis'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 12, restSeconds: 90,
      equipment: 'gym',
      description: "Version du soulevé de terre avec jambes quasiment tendues. L'accent est mis sur l'étirement et le renforcement des ischio-jambiers. Différent du roumain par la moindre flexion des genoux.",
      tips: [
        "Jambes presque tendues — légère flexion tolérée",
        "Descends jusqu'à sentir un fort étirement dans les ischios",
        "Dos plat — ne l'arrondit jamais",
        "Mouvement lent et contrôlé, surtout la descente"
      ]
    },
    {
      id: 'bulgarian_split_squat',
      name: 'Fentes bulgares',
      muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],
      isUnilateral: true,
      defaultSets: 3, defaultReps: 10, restSeconds: 90,
      equipment: 'gym',
      description: "Le pied arrière sur un banc, tu descends en fente profonde. L'un des exercices les plus exigeants pour les jambes. Développe la force, la stabilité et corrige les déséquilibres entre jambes.",
      tips: [
        "Pied avant suffisamment loin pour que le genou ne dépasse pas les orteils",
        "Descends jusqu'à ce que le genou arrière frôle le sol",
        "Buste droit — ne te penche pas trop en avant",
        "Pousse dans le talon avant pour remonter"
      ]
    },
    {
      id: 'seated_calf_raise',
      name: 'Mollets assis',
      muscles: ['Soléaire', 'Gastrocnémien'],
      isUnilateral: false,
      defaultSets: 4, defaultReps: 20, restSeconds: 60,
      equipment: 'gym',
      description: "Assis sur la machine, genoux fléchis à 90°, tu montes sur la pointe des pieds. Cible principalement le soléaire (sous le mollet) souvent négligé. Complément essentiel des mollets debout.",
      tips: [
        "Monte le plus haut possible — contracte fort en haut",
        "Descends jusqu'à l'étirement maximum en bas",
        "La position assise isole mieux le soléaire que debout",
        "Lent et contrôlé — pas de rebond en bas"
      ]
    }
  ],

  /* ─── ABS ───────────────────────────────────────────── */
  abs: [
    {
      id: 'crunch',
      name: 'Crunch',
      muscles: ['Abdominaux (droit)'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 20, restSeconds: 45,
      equipment: 'home',
      description: "L'exercice abdominal de base. Allongé sur le dos, genoux fléchis, tu enroules le haut du tronc vers les genoux. Simple, efficace pour isoler les abdominaux droits.",
      tips: [
        "Ne tire pas sur la nuque avec les mains — juste effleure les tempes",
        "Expire fort en montant — contracte les abdos au maximum",
        "N'essaie pas de te lever complètement — juste décoller les omoplates",
        "Descends lentement — le négatif compte autant que la montée"
      ]
    },
    {
      id: 'leg_raise',
      name: 'Relevés de jambes',
      muscles: ['Abdominaux inférieurs', 'Fléchisseurs de hanches'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 15, restSeconds: 60,
      equipment: 'home',
      description: "Allongé sur le dos, tu montes les jambes tendues vers le plafond. Très efficace pour travailler la partie basse des abdominaux, difficile à cibler avec les crunchs classiques.",
      tips: [
        "Bas du dos collé au sol pendant tout le mouvement",
        "Jambes tendues ou légèrement fléchies selon ton niveau",
        "Descends lentement sans poser les pieds entre les reps",
        "Expire en montant, inspire en descendant"
      ]
    },
    {
      id: 'plank',
      name: 'Planche',
      muscles: ['Abdominaux', 'Obliques', 'Érecteurs du rachis'],
      isUnilateral: false, isTimer: true,
      defaultSets: 3, defaultReps: 45, restSeconds: 45,
      equipment: 'home',
      description: "Exercice isométrique fondamental. Le corps forme une ligne droite des talons à la tête, appuyé sur les avant-bras et les orteils. Renforce le gainage profond de tout le tronc.",
      tips: [
        "Corps en ligne droite — ni les fesses en l'air ni affaissées",
        "Contracte les abdos, les fessiers et les quads en même temps",
        "Regarde le sol — pas devant toi",
        "Respire normalement — ne retiens pas ta respiration"
      ]
    },
    {
      id: 'russian_twist',
      name: 'Russian Twist',
      muscles: ['Obliques', 'Abdominaux'],
      isUnilateral: false,
      defaultSets: 3, defaultReps: 20, restSeconds: 45,
      equipment: 'home',
      description: "Assis en position semi-allongée, tu fais tourner ton buste de gauche à droite en tenant un poids ou tes mains jointes. Excellent pour développer les obliques et la rotation du tronc.",
      tips: [
        "Pieds décollés ou posés selon ton niveau",
        "Tourne les épaules, pas seulement les bras",
        "Expire à chaque rotation",
        "Ajoute un poids ou un ballon médical pour progresser"
      ]
    },
    {
      id: 'side_plank',
      name: 'Gainage latéral',
      muscles: ['Obliques', 'Fessier moyen', 'Abdominaux'],
      isUnilateral: true, isTimer: true,
      defaultSets: 3, defaultReps: 30, restSeconds: 45,
      equipment: 'home',
      description: "Version latérale de la planche. Appuyé sur un avant-bras et le côté du pied, tu maintiens le corps en ligne droite. Cible les obliques et le gainage latéral, essentiels pour la stabilité.",
      tips: [
        "Corps en ligne droite des pieds à la tête",
        "Hanche haute — ne la laisse pas s'affaisser",
        "Fais les deux côtés de façon équilibrée",
        "Regard droit devant — pas vers le sol"
      ]
    }
  ],

  /* ─── UPPER ─────────────────────────────────────────── */
  upper: [
    { id: 'bench_press',    ref: 'push' },
    { id: 'barbell_row',    ref: 'pull' },
    { id: 'ohp',            ref: 'push' },
    { id: 'lat_pulldown',   ref: 'pull' },
    { id: 'lateral_raise',  ref: 'push' },
    { id: 'bicep_curl',     ref: 'pull' },
    { id: 'tricep_pushdown', ref: 'push' }
  ],

  /* ─── LOWER ─────────────────────────────────────────── */
  lower: [
    { id: 'squat',          ref: 'legs' },
    { id: 'rdl',            ref: 'legs' },
    { id: 'leg_press',      ref: 'legs' },
    { id: 'lunge',          ref: 'legs' },
    { id: 'leg_curl',       ref: 'legs' },
    { id: 'calf_raise',     ref: 'legs' }
  ],

  /* ─── BRO SPLIT ─────────────────────────────────────── */
  chest: [
    { id: 'bench_press',    ref: 'push' },
    { id: 'incline_press',  ref: 'push' },
    { id: 'dips',           ref: 'push' },
    { id: 'pushup',         ref: 'push' }
  ],
  back: [
    { id: 'barbell_row',    ref: 'pull' },
    { id: 'pullup',         ref: 'pull' },
    { id: 'lat_pulldown',   ref: 'pull' },
    { id: 'face_pull',      ref: 'pull' }
  ],
  shoulders: [
    { id: 'ohp',            ref: 'push' },
    { id: 'lateral_raise',  ref: 'push' },
    { id: 'face_pull',      ref: 'pull' }
  ],
  arms: [
    { id: 'bicep_curl',         ref: 'pull' },
    { id: 'hammer_curl',        ref: 'pull' },
    { id: 'concentration_curl', ref: 'pull' },
    { id: 'tricep_pushdown',    ref: 'push' },
    { id: 'dips',               ref: 'push' }
  ],

  /* ─── FULL BODY ──────────────────────────────────────── */
  full_body: [
    { id: 'squat',          ref: 'legs' },
    { id: 'bench_press',    ref: 'push' },
    { id: 'barbell_row',    ref: 'pull' },
    { id: 'ohp',            ref: 'push' },
    { id: 'rdl',            ref: 'legs' }
  ],

  /* ─── HOME ───────────────────────────────────────────── */
  home_push: [
    { id: 'pushup',         ref: 'push' },
    { id: 'pike_pushup',    ref: 'push' },
    { id: 'dips',           ref: 'push' }
  ],
  home_pull: [
    { id: 'australian_pullup', ref: 'pull' },
    { id: 'pullup',            ref: 'pull' }
  ],
  home_legs: [
    { id: 'bodyweight_squat', ref: 'legs' },
    { id: 'lunge',            ref: 'legs' },
    { id: 'glute_bridge',     ref: 'legs' },
    { id: 'calf_raise',       ref: 'legs' }
  ],

  /* ─── PAR GROUPE MUSCULAIRE (picker) ─────────────────── */
  polyarticular: [
    { id: 'squat',        ref: 'legs' },
    { id: 'bench_press',  ref: 'push' },
    { id: 'deadlift',     ref: 'legs' },
    { id: 'pullup',       ref: 'pull' },
    { id: 'ohp',          ref: 'push' },
    { id: 'dips',         ref: 'push' }
  ],
  pectoraux: [
    { id: 'bench_press',           ref: 'push' },
    { id: 'dumbbell_bench_press',  ref: 'push' },
    { id: 'incline_press',         ref: 'push' },
    { id: 'pushup',                ref: 'push' },
    { id: 'cable_fly',             ref: 'push' },
    { id: 'dips',                  ref: 'push' }
  ],
  dos: [
    { id: 'pullup',        ref: 'pull' },
    { id: 'lat_pulldown',  ref: 'pull' },
    { id: 'cable_row',     ref: 'pull' },
    { id: 'barbell_row',   ref: 'pull' },
    { id: 'dumbbell_row',  ref: 'pull' },
    { id: 'deadlift',      ref: 'legs' }
  ],
  epaules: [
    { id: 'ohp',                    ref: 'push' },
    { id: 'dumbbell_shoulder_press', ref: 'push' },
    { id: 'lateral_raise',          ref: 'push' },
    { id: 'front_raise',            ref: 'push' },
    { id: 'rear_delt_fly',          ref: 'pull' },
    { id: 'face_pull',              ref: 'pull' }
  ],
  biceps: [
    { id: 'barbell_curl',       ref: 'pull' },
    { id: 'bicep_curl',         ref: 'pull' },
    { id: 'hammer_curl',        ref: 'pull' },
    { id: 'preacher_curl',      ref: 'pull' }
  ],
  triceps: [
    { id: 'skull_crusher',    ref: 'push' },
    { id: 'tricep_pushdown',  ref: 'push' },
    { id: 'overhead_tricep',  ref: 'push' },
    { id: 'dips',             ref: 'push' }
  ],
  quadriceps: [
    { id: 'squat',         ref: 'legs' },
    { id: 'leg_press',     ref: 'legs' },
    { id: 'lunge',         ref: 'legs' },
    { id: 'leg_extension', ref: 'legs' }
  ],
  ischio: [
    { id: 'stiff_leg_dl', ref: 'legs' },
    { id: 'leg_curl',     ref: 'legs' }
  ],
  fessiers: [
    { id: 'glute_bridge',          ref: 'legs' },
    { id: 'squat',                 ref: 'legs' },
    { id: 'bulgarian_split_squat', ref: 'legs' }
  ],
  mollets: [
    { id: 'calf_raise',        ref: 'legs' },
    { id: 'seated_calf_raise', ref: 'legs' }
  ],
  abdominaux: [
    { id: 'crunch',        ref: 'abs' },
    { id: 'leg_raise',     ref: 'abs' },
    { id: 'plank',         ref: 'abs' },
    { id: 'russian_twist', ref: 'abs' },
    { id: 'side_plank',    ref: 'abs' }
  ]
};

/* Résolution des références (upper/lower/bro split pointent vers push/pull/legs) */
window.EXERCISES_RESOLVE = function(category) {
  const list = window.EXERCISES[category];
  if (!list) return [];
  return list.map(ex => {
    if (ex.ref) {
      const found = window.EXERCISES[ex.ref].find(e => e.id === ex.id);
      return found || null;
    }
    return ex;
  }).filter(Boolean);
};

/* Chercher un exercice par ID dans toute la DB */
window.EXERCISES_FIND = function(id) {
  const cats = ['push','pull','legs','abs'];
  for (const cat of cats) {
    const found = window.EXERCISES[cat].find(e => e.id === id);
    if (found) return found;
  }
  return null;
};
