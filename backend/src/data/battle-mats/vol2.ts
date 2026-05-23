// Battle Mats Volume 2 — Giant Book of Battle Mats (Loke Battle Mats)
// 62 pages = 31 doubles-pages combinables
// Chaque paire de pages forme une carte double format utilisable seule ou combinée
// Source : analyse de la 4e de couverture — noms à affiner si nécessaire

import type { BattleMat, BattleMatTag } from './types.js';

// Volume 2 — 31 doubles-pages
export const BATTLE_MATS_VOL2: BattleMat[] = [

  // Pages 1-2 : Chemin de pierres / plaine ouverte avec rochers
  {
    id: 'BM2-01-02',
    volume: 2,
    pages: [1, 2],
    nom: 'Rocky Path',
    nomFr: 'Chemin rocailleux',
    description: 'Un chemin de terre entre des rochers épars dans une plaine. Terrain ouvert avec quelques couverts naturels. Idéal pour une embuscade ou une rencontre de voyage.',
    tags: ['exterieur', 'plaine', 'voyage', 'rencontre'],
    ambiances: ['voyage', 'plaine', 'jour'],
    typesDefis: ['combat', 'exploration'],
  },

  // Pages 3-4 : Terrain herbeux avec arbres, lisière de forêt
  {
    id: 'BM2-03-04',
    volume: 2,
    pages: [3, 4],
    nom: 'Forest Edge',
    nomFr: 'Lisière de forêt',
    description: 'Une clairière herbeuse en bordure de forêt avec quelques grands arbres. Terrain mixte offrant couvert et espace de mouvement.',
    tags: ['exterieur', 'foret', 'plaine', 'rencontre', 'combat'],
    ambiances: ['foret', 'nature', 'jour'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },

  // Pages 5-6 : Chemin forestier, arbres denses
  {
    id: 'BM2-05-06',
    volume: 2,
    pages: [5, 6],
    nom: 'Forest Track',
    nomFr: 'Piste en forêt',
    description: 'Un sentier étroit serpentant entre des arbres denses. Visibilité réduite, nombreux couverts. Parfait pour une embuscade ou une rencontre mystérieuse dans les bois.',
    tags: ['exterieur', 'foret', 'voyage', 'combat', 'exploration'],
    ambiances: ['foret', 'dense', 'mystere'],
    typesDefis: ['combat', 'exploration', 'fuite', 'enquete'],
  },

  // Pages 7-8 : Terrain forestier avec collines et rochers
  {
    id: 'BM2-07-08',
    volume: 2,
    pages: [7, 8],
    nom: 'Hilly Forest',
    nomFr: 'Forêt vallonnée',
    description: 'Un terrain accidenté avec des collines boisées, des rochers et des arbres anciens. Carte polyvalente pour les aventures en pleine nature.',
    tags: ['exterieur', 'foret', 'montagne', 'exploration'],
    ambiances: ['foret', 'nature', 'jour'],
    typesDefis: ['exploration', 'combat', 'fuite'],
  },

  // Pages 9-10 : Zone marécageuse, eau et boue
  {
    id: 'BM2-09-10',
    volume: 2,
    pages: [9, 10],
    nom: 'Swamp',
    nomFr: 'Marais',
    description: 'Un marais avec des flaques d\'eau sombre, des touffes d\'herbe et des arbres morts. Terrain difficile, atmosphère oppressante. Idéal pour une rencontre inquiétante.',
    tags: ['exterieur', 'marais', 'eau', 'exploration', 'combat'],
    ambiances: ['marais', 'sombre', 'mystere', 'frisson'],
    typesDefis: ['exploration', 'combat', 'enquete'],
  },

  // Pages 11-12 : Grille vierge / blank grid
  {
    id: 'BM2-11-12',
    volume: 2,
    pages: [11, 12],
    nom: 'Blank Grid',
    nomFr: 'Grille vierge',
    description: 'Une grille vierge à utiliser librement pour dessiner n\'importe quel lieu. Parfait pour les lieux inventés ou les zones personnalisées.',
    tags: ['interieur', 'exterieur'],
    ambiances: ['neutre'],
    typesDefis: ['combat', 'exploration', 'rencontre'],
  },

  // Pages 13-14 : Donjon / couloirs de pierre
  {
    id: 'BM2-13-14',
    volume: 2,
    pages: [13, 14],
    nom: 'Dungeon Corridors',
    nomFr: 'Couloirs de donjon',
    description: 'Des couloirs de pierre avec des croisements et des portes. Typique d\'un donjon classique. Idéal pour l\'exploration souterraine ou une embuscade dans les tunnels.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'enigme'],
  },

  // Pages 15-16 : Grottes naturelles / cavernes
  {
    id: 'BM2-15-16',
    volume: 2,
    pages: [15, 16],
    nom: 'Natural Caves',
    nomFr: 'Grottes naturelles',
    description: 'Des cavernes aux parois irrégulières avec des stalactites et des passages étroits. Atmosphère souterraine naturelle, différente d\'un donjon taillé.',
    tags: ['interieur', 'souterrain', 'exploration', 'combat'],
    ambiances: ['grottes', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'fuite'],
  },

  // Pages 17-18 : Salle dallée / intérieur décoré (temple ou palais)
  {
    id: 'BM2-17-18',
    volume: 2,
    pages: [17, 18],
    nom: 'Ornate Hall',
    nomFr: 'Salle ornée',
    description: 'Une grande salle dallée avec des motifs géométriques colorés. Peut être un temple, un palais ou une salle du trône. Lieu majestueux pour une confrontation importante.',
    tags: ['interieur', 'temple', 'batiment', 'combat', 'rencontre'],
    ambiances: ['temple', 'majestueux', 'mystere'],
    typesDefis: ['combat', 'negociation', 'enigme'],
  },

  // Pages 19-20 : Intérieur de bâtiment / maison ou auberge
  {
    id: 'BM2-19-20',
    volume: 2,
    pages: [19, 20],
    nom: 'Interior Building',
    nomFr: 'Intérieur de bâtiment',
    description: 'L\'intérieur d\'un bâtiment avec plusieurs pièces, couloirs et mobilier. Peut servir d\'auberge, de maison de notable ou de boutique.',
    tags: ['interieur', 'batiment', 'village', 'rencontre'],
    ambiances: ['village', 'interieur', 'jour'],
    typesDefis: ['negociation', 'enquete', 'combat'],
  },

  // Pages 21-22 : Catacombes / couloirs souterrains avec tombes
  {
    id: 'BM2-21-22',
    volume: 2,
    pages: [21, 22],
    nom: 'Catacombs',
    nomFr: 'Catacombes',
    description: 'Des galeries souterraines avec des niches funéraires et des couloirs étroits. Atmosphère lugubre parfaite pour les aventures avec des morts-vivants ou des secrets enfouis.',
    tags: ['interieur', 'souterrain', 'donjon', 'exploration', 'combat'],
    ambiances: ['souterrain', 'sombre', 'frisson', 'mystere'],
    typesDefis: ['exploration', 'combat', 'enquete'],
  },

  // Pages 23-24 : Salle dallée complexe / labyrinthe intérieur
  {
    id: 'BM2-23-24',
    volume: 2,
    pages: [23, 24],
    nom: 'Labyrinth Hall',
    nomFr: 'Salle labyrinthe',
    description: 'Une grande salle avec des murs intérieurs formant un labyrinthe de couloirs et de salles. Idéal pour les scénarios d\'exploration ou d\'énigme.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration'],
    ambiances: ['donjon', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'fuite'],
  },

  // Pages 25-26 : Salle circulaire / puits central ou autel
  {
    id: 'BM2-25-26',
    volume: 2,
    pages: [25, 26],
    nom: 'Circular Chamber',
    nomFr: 'Salle circulaire',
    description: 'Une salle ronde avec un élément central (puits, autel ou colonne). Architecture symétrique, bonne visibilité. Parfaite pour un combat de boss ou un rituel.',
    tags: ['interieur', 'donjon', 'temple', 'combat'],
    ambiances: ['donjon', 'temple', 'mystere'],
    typesDefis: ['combat', 'enigme', 'negociation'],
  },

  // Pages 27-28 : Couloirs de donjon avec salles
  {
    id: 'BM2-27-28',
    volume: 2,
    pages: [27, 28],
    nom: 'Dungeon Rooms',
    nomFr: 'Salles de donjon',
    description: 'Un réseau de salles rectangulaires reliées par des couloirs. Classique du donjon d\'exploration avec des zones distinctes pour chaque rencontre.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'enigme'],
  },

  // Pages 29-30 : Salle dallée avec motifs / intérieur élaboré
  {
    id: 'BM2-29-30',
    volume: 2,
    pages: [29, 30],
    nom: 'Decorated Chamber',
    nomFr: 'Salle décorée',
    description: 'Une salle aux dalles décorées de motifs complexes. Peut être un temple, une salle secrète ou le bureau d\'un mage. Lieu d\'importance narrative.',
    tags: ['interieur', 'temple', 'batiment', 'rencontre'],
    ambiances: ['temple', 'majestueux', 'mystere'],
    typesDefis: ['enigme', 'negociation', 'combat'],
  },

  // Pages 31-32 : Grande salle avec couloirs et pièces diverses
  {
    id: 'BM2-31-32',
    volume: 2,
    pages: [31, 32],
    nom: 'Complex Interior',
    nomFr: 'Intérieur complexe',
    description: 'Un bâtiment ou complexe avec de nombreuses pièces de tailles variées et des couloirs. Carte polyvalente pour les explorations intérieures détaillées.',
    tags: ['interieur', 'batiment', 'donjon', 'exploration'],
    ambiances: ['interieur', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'combat', 'enquete'],
  },

  // Pages 33-34 : Grande salle avec table centrale / salle du conseil
  {
    id: 'BM2-33-34',
    volume: 2,
    pages: [33, 34],
    nom: 'Council Hall',
    nomFr: 'Salle du conseil',
    description: 'Une grande salle avec une longue table centrale et des chaises. Idéale pour une négociation tendue, un procès ou la rencontre avec un chef de faction.',
    tags: ['interieur', 'batiment', 'rencontre'],
    ambiances: ['village', 'interieur', 'jour'],
    typesDefis: ['negociation', 'enquete', 'combat'],
  },

  // Pages 35-36 : Cour extérieure / place avec bâtiments
  {
    id: 'BM2-35-36',
    volume: 2,
    pages: [35, 36],
    nom: 'Courtyard',
    nomFr: 'Cour extérieure',
    description: 'Une cour pavée entourée de bâtiments avec quelques éléments (tonneau, charrette, puits). Lieu de vie dans un village ou une forteresse.',
    tags: ['exterieur', 'village', 'batiment', 'rencontre', 'combat'],
    ambiances: ['village', 'jour', 'civilise'],
    typesDefis: ['combat', 'negociation', 'fuite'],
  },

  // Pages 37-38 : Couloirs de donjon avec cellules / prison
  {
    id: 'BM2-37-38',
    volume: 2,
    pages: [37, 38],
    nom: 'Prison Cells',
    nomFr: 'Cellules de prison',
    description: 'Un couloir avec des cellules de part et d\'autre. Parfait pour une scène de sauvetage, d\'évasion ou de rencontre avec un prisonnier important.',
    tags: ['interieur', 'donjon', 'batiment', 'exploration'],
    ambiances: ['donjon', 'sombre', 'frisson'],
    typesDefis: ['exploration', 'fuite', 'enigme', 'enquete'],
  },

  // Pages 39-40 : Couloirs et salles de donjon (variante)
  {
    id: 'BM2-39-40',
    volume: 2,
    pages: [39, 40],
    nom: 'Dungeon Layout',
    nomFr: 'Plan de donjon',
    description: 'Un autre plan de donjon avec une configuration de salles et couloirs différente. Variante utile pour les aventures nécessitant plusieurs zones distinctes.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat'],
  },

  // Pages 41-42 : Intérieur avec cour centrale / maison à cour
  {
    id: 'BM2-41-42',
    volume: 2,
    pages: [41, 42],
    nom: 'Courtyard House',
    nomFr: 'Maison à cour',
    description: 'Un bâtiment avec une cour intérieure centrale et des pièces tout autour. Peut être une riche demeure, une guilde ou un petit monastère.',
    tags: ['interieur', 'exterieur', 'batiment', 'rencontre'],
    ambiances: ['village', 'civilise', 'jour'],
    typesDefis: ['negociation', 'enquete', 'combat'],
  },

  // Pages 43-44 : Grande salle complexe avec multiples salles colorées
  {
    id: 'BM2-43-44',
    volume: 2,
    pages: [43, 44],
    nom: 'Grand Complex',
    nomFr: 'Grand complexe',
    description: 'Un vaste complexe intérieur avec de nombreuses salles de couleurs variées. Idéal pour un donjon thématique ou un temple avec différentes zones.',
    tags: ['interieur', 'donjon', 'temple', 'exploration'],
    ambiances: ['temple', 'donjon', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'combat'],
  },

  // Pages 45-46 : Zone côtière / quai avec bateaux
  {
    id: 'BM2-45-46',
    volume: 2,
    pages: [45, 46],
    nom: 'Dockside',
    nomFr: 'Quai et port',
    description: 'Un quai en bois avec des bateaux amarrés, des tonneaux et des caisses. Zone portuaire animée, idéale pour une rencontre avec des contrebandiers ou une poursuite.',
    tags: ['exterieur', 'eau', 'village', 'rencontre', 'combat'],
    ambiances: ['port', 'cote', 'jour'],
    typesDefis: ['combat', 'fuite', 'enquete', 'negociation'],
  },

  // Pages 47-48 : Zone côtière avec récifs / plage rocheuse
  {
    id: 'BM2-47-48',
    volume: 2,
    pages: [47, 48],
    nom: 'Rocky Shore',
    nomFr: 'Rivage rocheux',
    description: 'Une côte avec des rochers, des récifs et une plage. Un bateau peut être visible. Cadre pour des rencontres nautiques ou des découvertes sur le rivage.',
    tags: ['exterieur', 'eau', 'cote', 'exploration'],
    ambiances: ['cote', 'mer', 'jour'],
    typesDefis: ['exploration', 'combat', 'fuite'],
  },

  // Pages 49-50 : Zone de lave / terrain volcanique
  {
    id: 'BM2-49-50',
    volume: 2,
    pages: [49, 50],
    nom: 'Lava Fields',
    nomFr: 'Champs de lave',
    description: 'Un terrain volcanique avec des fissures rougeoyantes et de la lave. Environnement extrême et spectaculaire pour un affrontement final mémorable.',
    tags: ['exterieur', 'lave', 'montagne', 'combat'],
    ambiances: ['volcanique', 'danger', 'frisson'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 51-52 : Zone aquatique / marais côtier ou lac
  {
    id: 'BM2-51-52',
    volume: 2,
    pages: [51, 52],
    nom: 'Coastal Marsh',
    nomFr: 'Marais côtier',
    description: 'Une zone humide entre mer et terre, avec des îlots de sable et des herbes aquatiques. Terrain difficile et atmosphère particulière.',
    tags: ['exterieur', 'eau', 'marais', 'cote', 'exploration'],
    ambiances: ['marais', 'cote', 'mystere'],
    typesDefis: ['exploration', 'combat', 'fuite'],
  },

  // Pages 53-54 : Désert / terrain sableux
  {
    id: 'BM2-53-54',
    volume: 2,
    pages: [53, 54],
    nom: 'Desert',
    nomFr: 'Désert de sable',
    description: 'Un terrain désertique avec des dunes de sable et quelques rochers. Vaste espace ouvert avec peu de couverts. Idéal pour une rencontre en milieu hostile.',
    tags: ['exterieur', 'desert', 'plaine', 'combat', 'voyage'],
    ambiances: ['desert', 'chaud', 'jour'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },

  // Pages 55-56 : Zone de glace / terrain enneigé ou glacé
  {
    id: 'BM2-55-56',
    volume: 2,
    pages: [55, 56],
    nom: 'Ice Field',
    nomFr: 'Terrain de glace',
    description: 'Un paysage glacé avec des fissures dans la glace et de la neige. Terrain glissant et dangereux, parfait pour une aventure hivernale ou nordique.',
    tags: ['exterieur', 'glace', 'plaine', 'exploration', 'combat'],
    ambiances: ['froid', 'hiver', 'danger'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },

  // Pages 57-58 : Eau / rivière ou lac avec berges
  {
    id: 'BM2-57-58',
    volume: 2,
    pages: [57, 58],
    nom: 'River Crossing',
    nomFr: 'Traversée de rivière',
    description: 'Une rivière avec des berges et éventuellement un gué ou un pont. Obstacle naturel classique pour une rencontre ou une embuscade lors d\'une traversée.',
    tags: ['exterieur', 'eau', 'voyage', 'rencontre', 'combat'],
    ambiances: ['nature', 'riviere', 'jour'],
    typesDefis: ['combat', 'exploration', 'fuite', 'enigme'],
  },

  // Pages 59-60 : Bateau / pont de navire vu du dessus
  {
    id: 'BM2-59-60',
    volume: 2,
    pages: [59, 60],
    nom: 'Ship Deck',
    nomFr: 'Pont de navire',
    description: 'Le pont d\'un navire vu du dessus avec mâts, cordages et pontons. Idéal pour une scène de combat naval, un abordage ou une fuite en mer.',
    tags: ['exterieur', 'eau', 'cote', 'combat'],
    ambiances: ['mer', 'bateau', 'aventure'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 61-62 : Grille vierge supplémentaire
  {
    id: 'BM2-61-62',
    volume: 2,
    pages: [61, 62],
    nom: 'Blank Grid 2',
    nomFr: 'Grille vierge (2)',
    description: 'Une seconde grille vierge pour les créations personnalisées de la Maîtresse de Jeu.',
    tags: ['interieur', 'exterieur'],
    ambiances: ['neutre'],
    typesDefis: ['combat', 'exploration', 'rencontre'],
  },
];

// Helper : recherche par tags
export function searchBattleMats(
  tags: BattleMatTag[],
  volume?: 1 | 2 | 3
): BattleMat[] {
  return BATTLE_MATS_VOL2.filter((mat) => {
    const matchVol = volume ? mat.volume === volume : true;
    const matchTags = tags.some((t) => mat.tags.includes(t));
    return matchVol && matchTags;
  });
}

// Helper : résumé compact pour injection dans le prompt LLM
export function getBattleMatsSummary(mats: BattleMat[]): string {
  return mats
    .map(
      (m) =>
        `${m.id} "${m.nomFr}" (Vol.${m.volume} p.${m.pages[0]}-${m.pages[1]}) — ${m.description.slice(0, 80)}... [${m.tags.join(', ')}]`
    )
    .join('\n');
}
