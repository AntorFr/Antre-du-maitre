// Battle Mats Volume 1 — Book of Battle Mats (Loke Battle Mats, LBM037)
// 62 pages = 31 doubles-pages combinables
// Source : analyse de la 4e de couverture

import type { BattleMat } from './types.js';

export const BATTLE_MATS_VOL1: BattleMat[] = [

  // Pages 1-2 : Plaine herbeuse ouverte / terrain neutre
  {
    id: 'BM1-01-02',
    volume: 1,
    pages: [1, 2],
    nom: 'Open Grassland',
    nomFr: 'Prairie ouverte',
    description: 'Une vaste prairie herbeuse avec quelques touffes et rochers épars. Terrain très ouvert, peu de couverts. Idéal pour une rencontre de voyage ou un combat en rase campagne.',
    tags: ['exterieur', 'plaine', 'voyage', 'rencontre', 'combat'],
    ambiances: ['plaine', 'nature', 'jour'],
    typesDefis: ['combat', 'fuite'],
  },

  // Pages 3-4 : Lisière de forêt herbeuse avec arbres
  {
    id: 'BM1-03-04',
    volume: 1,
    pages: [3, 4],
    nom: 'Grassy Forest Edge',
    nomFr: 'Bordure de forêt herbeuse',
    description: 'Une zone de transition entre prairie et forêt avec quelques arbres isolés et de l\'herbe haute. Terrain polyvalent pour des rencontres à la sortie des bois.',
    tags: ['exterieur', 'foret', 'plaine', 'rencontre'],
    ambiances: ['foret', 'nature', 'jour'],
    typesDefis: ['combat', 'exploration', 'enquete'],
  },

  // Pages 5-6 : Chemin de village / route pavée avec bâtiments
  {
    id: 'BM1-05-06',
    volume: 1,
    pages: [5, 6],
    nom: 'Village Street',
    nomFr: 'Rue de village',
    description: 'Une rue pavée de village avec des bâtiments de chaque côté et des détails urbains (tonneaux, charrettes). Parfait pour des rencontres en milieu civilisé ou une poursuite dans les rues.',
    tags: ['exterieur', 'village', 'batiment', 'rencontre', 'combat'],
    ambiances: ['village', 'civilise', 'jour'],
    typesDefis: ['negociation', 'enquete', 'fuite', 'combat'],
  },

  // Pages 7-8 : Terrain avec rochers et végétation clairsemée
  {
    id: 'BM1-07-08',
    volume: 1,
    pages: [7, 8],
    nom: 'Rocky Terrain',
    nomFr: 'Terrain rocheux',
    description: 'Un terrain semi-aride avec des rochers de tailles variées et une végétation clairsemée. Offre de nombreux couverts naturels pour des combats tactiques.',
    tags: ['exterieur', 'plaine', 'montagne', 'combat', 'exploration'],
    ambiances: ['nature', 'aride', 'jour'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 9-10 : Terrain humide / mare ou étang avec végétation
  {
    id: 'BM1-09-10',
    volume: 1,
    pages: [9, 10],
    nom: 'Pond & Wetland',
    nomFr: 'Mare et zone humide',
    description: 'Un étang entouré de végétation aquatique et de terre détrempée. Terrain difficile avec un obstacle central. Bien adapté aux créatures aquatiques ou aux rencontres près de l\'eau.',
    tags: ['exterieur', 'eau', 'marais', 'rencontre'],
    ambiances: ['nature', 'humide', 'jour'],
    typesDefis: ['combat', 'exploration', 'enquete'],
  },

  // Pages 11-12 : Grille vierge
  {
    id: 'BM1-11-12',
    volume: 1,
    pages: [11, 12],
    nom: 'Blank Grid',
    nomFr: 'Grille vierge',
    description: 'Une grille vierge à utiliser librement pour dessiner n\'importe quel lieu personnalisé.',
    tags: ['interieur', 'exterieur'],
    ambiances: ['neutre'],
    typesDefis: ['combat', 'exploration', 'rencontre'],
  },

  // Pages 13-14 : Rue de ville avec pavés et bâtiments plus larges
  {
    id: 'BM1-13-14',
    volume: 1,
    pages: [13, 14],
    nom: 'Town Square',
    nomFr: 'Place de ville',
    description: 'Une place de ville animée avec des pavés, des bâtiments tout autour et un espace central ouvert. Idéal pour un marché, une confrontation publique ou une scène de négociation.',
    tags: ['exterieur', 'village', 'batiment', 'rencontre'],
    ambiances: ['village', 'civilise', 'jour'],
    typesDefis: ['negociation', 'enquete', 'combat', 'fuite'],
  },

  // Pages 15-16 : Terrain de forêt avec un bâtiment isolé (chaumière ?)
  {
    id: 'BM1-15-16',
    volume: 1,
    pages: [15, 16],
    nom: 'Forest Hut',
    nomFr: 'Cabane en forêt',
    description: 'Un bâtiment isolé au milieu des arbres — chaumière, abri de chasse ou hutte de sorcière. Parfait pour une rencontre avec un PNJ mystérieux vivant à l\'écart.',
    tags: ['exterieur', 'foret', 'batiment', 'rencontre', 'exploration'],
    ambiances: ['foret', 'mystere', 'jour'],
    typesDefis: ['enquete', 'negociation', 'combat'],
  },

  // Pages 17-18 : Intérieur de taverne / grande salle commune
  {
    id: 'BM1-17-18',
    volume: 1,
    pages: [17, 18],
    nom: 'Tavern Interior',
    nomFr: 'Intérieur de taverne',
    description: 'La salle commune d\'une taverne avec tables, chaises, comptoir et escalier. Lieu de vie incontournable pour les aventuriers — discussions, rumeurs et bagarres de taverne.',
    tags: ['interieur', 'batiment', 'village', 'rencontre', 'taverne'],
    ambiances: ['village', 'interieur', 'jour', 'nuit'],
    typesDefis: ['negociation', 'enquete', 'combat'],
  },

  // Pages 19-20 : Zone portuaire / quai avec bateau
  {
    id: 'BM1-19-20',
    volume: 1,
    pages: [19, 20],
    nom: 'Harbor & Boat',
    nomFr: 'Port et embarcation',
    description: 'Un quai de port avec un bateau à quai, des cordages et du matériel de navigation. Pour des aventures maritimes, des contrebandiers ou un départ en mer mouvementé.',
    tags: ['exterieur', 'eau', 'cote', 'batiment', 'rencontre', 'combat'],
    ambiances: ['port', 'cote', 'jour'],
    typesDefis: ['combat', 'fuite', 'enquete', 'negociation'],
  },

  // Pages 21-22 : Terrain aride / désert avec rochers
  {
    id: 'BM1-21-22',
    volume: 1,
    pages: [21, 22],
    nom: 'Arid Wasteland',
    nomFr: 'Terres arides',
    description: 'Un terrain désertique et pierreux avec peu de végétation. Chaleur et espace ouvert. Rencontres épuisantes dans un environnement hostile.',
    tags: ['exterieur', 'desert', 'plaine', 'voyage', 'combat'],
    ambiances: ['desert', 'aride', 'jour'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },

  // Pages 23-24 : Donjon / couloirs et salles de pierre
  {
    id: 'BM1-23-24',
    volume: 1,
    pages: [23, 24],
    nom: 'Stone Dungeon',
    nomFr: 'Donjon de pierre',
    description: 'Un réseau classique de couloirs et salles en pierre taillée. Plan de donjon typique avec croisements et portes. La base pour toute exploration souterraine.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'enigme'],
  },

  // Pages 25-26 : Grande salle intérieure / hall de château ou salle du trône
  {
    id: 'BM1-25-26',
    volume: 1,
    pages: [25, 26],
    nom: 'Great Hall',
    nomFr: 'Grande salle',
    description: 'Un vaste hall intérieur avec un couloir central et des colonnes. Peut être une salle du trône, une salle de banquet ou l\'entrée d\'un château. Lieu de confrontations importantes.',
    tags: ['interieur', 'batiment', 'temple', 'rencontre', 'combat'],
    ambiances: ['chateau', 'majestueux', 'civilise'],
    typesDefis: ['negociation', 'combat', 'enigme'],
  },

  // Pages 27-28 : Forêt automnale / terrain forestier coloré
  {
    id: 'BM1-27-28',
    volume: 1,
    pages: [27, 28],
    nom: 'Autumn Forest',
    nomFr: 'Forêt automnale',
    description: 'Une forêt aux couleurs d\'automne avec des feuilles rousses et des arbres denses. Atmosphère mélancolique et mystérieuse, idéale pour des rencontres à tonalité inquiétante.',
    tags: ['exterieur', 'foret', 'exploration', 'rencontre'],
    ambiances: ['foret', 'automne', 'mystere'],
    typesDefis: ['exploration', 'enquete', 'combat'],
  },

  // Pages 29-30 : Intérieur complexe avec plusieurs salles / manoir
  {
    id: 'BM1-29-30',
    volume: 1,
    pages: [29, 30],
    nom: 'Manor Interior',
    nomFr: 'Intérieur de manoir',
    description: 'Le plan intérieur d\'un manoir ou d\'une grande demeure avec des pièces variées et des couloirs. Pour des enquêtes dans une maison mystérieuse ou une infiltration.',
    tags: ['interieur', 'batiment', 'exploration', 'rencontre'],
    ambiances: ['interieur', 'mystere', 'nuit'],
    typesDefis: ['enquete', 'exploration', 'enigme', 'combat'],
  },

  // Pages 31-32 : Zone de lave / terrain volcanique
  {
    id: 'BM1-31-32',
    volume: 1,
    pages: [31, 32],
    nom: 'Lava Zone',
    nomFr: 'Zone volcanique',
    description: 'Des plateformes de roche au-dessus de rivières de lave. Terrain extrêmement dangereux et spectaculaire. Réservé pour un affrontement final épique dans un environnement de feu.',
    tags: ['exterieur', 'lave', 'montagne', 'combat'],
    ambiances: ['volcanique', 'danger', 'frisson'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 33-34 : Donjon avec salles spéciales / pièces thématiques
  {
    id: 'BM1-33-34',
    volume: 1,
    pages: [33, 34],
    nom: 'Thematic Dungeon',
    nomFr: 'Donjon thématique',
    description: 'Un donjon avec des salles aux configurations particulières — certaines rondes, certaines avec des éléments centraux. Plus varié qu\'un plan standard, pour un donjon mémorable.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'combat'],
  },

  // Pages 35-36 : Couloirs de donjon variés
  {
    id: 'BM1-35-36',
    volume: 1,
    pages: [35, 36],
    nom: 'Dungeon Passages',
    nomFr: 'Passages de donjon',
    description: 'Un réseau de passages souterrains avec des embranchements et des alcôves. Bien adapté pour une exploration tendue ou une poursuite dans les entrailles d\'un donjon.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'fuite', 'combat'],
  },

  // Pages 37-38 : Rues de ville / quartier urbain avec ruelles
  {
    id: 'BM1-37-38',
    volume: 1,
    pages: [37, 38],
    nom: 'City District',
    nomFr: 'Quartier de ville',
    description: 'Un quartier urbain avec des rues et des ruelles entre des bâtiments. Plus dense qu\'une simple rue de village. Pour des courses-poursuites ou des scènes de filature.',
    tags: ['exterieur', 'village', 'batiment', 'rencontre', 'combat'],
    ambiances: ['ville', 'civilise', 'nuit'],
    typesDefis: ['fuite', 'enquete', 'combat', 'negociation'],
  },

  // Pages 39-40 : Forêt automnale ou clairière avec chemin
  {
    id: 'BM1-39-40',
    volume: 1,
    pages: [39, 40],
    nom: 'Forest Clearing Path',
    nomFr: 'Clairière avec chemin',
    description: 'Une clairière forestière traversée par un chemin. Espace ouvert entouré d\'arbres. Lieu classique pour une embuscade ou une rencontre inattendue en voyage.',
    tags: ['exterieur', 'foret', 'voyage', 'rencontre', 'combat'],
    ambiances: ['foret', 'nature', 'jour'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 41-42 : Grandes salles intérieures / complexe de donjon
  {
    id: 'BM1-41-42',
    volume: 1,
    pages: [41, 42],
    nom: 'Dungeon Complex',
    nomFr: 'Complexe de donjon',
    description: 'Un grand complexe souterrain avec des salles de tailles variées et de nombreuses connexions. Pour une longue exploration avec plusieurs zones distinctes.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'enigme'],
  },

  // Pages 43-44 : Zone de lave intérieure / grotte volcanique
  {
    id: 'BM1-43-44',
    volume: 1,
    pages: [43, 44],
    nom: 'Volcanic Cave',
    nomFr: 'Grotte volcanique',
    description: 'Une caverne avec des coulées de lave et des rochers de basalte. L\'intérieur d\'un volcan ou d\'une forge géante. Pour un boss igné ou un repaire de dragon.',
    tags: ['interieur', 'souterrain', 'lave', 'combat'],
    ambiances: ['volcanique', 'souterrain', 'danger'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },

  // Pages 45-46 : Couloirs de donjon orthogonaux / plan carré
  {
    id: 'BM1-45-46',
    volume: 1,
    pages: [45, 46],
    nom: 'Grid Dungeon',
    nomFr: 'Donjon en grille',
    description: 'Un donjon aux couloirs bien ordonnés en grille régulière. Plan prévisible mais facile à naviguer pour les joueurs débutants.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'enigme'],
  },

  // Pages 47-48 : Zone bleue / intérieur avec eau ou temple aquatique
  {
    id: 'BM1-47-48',
    volume: 1,
    pages: [47, 48],
    nom: 'Water Temple',
    nomFr: 'Temple aquatique',
    description: 'Une salle intérieure avec des zones d\'eau — fontaine, bassin ou temple au-dessus de l\'eau. Atmosphère mystérieuse, idéal pour une énigme ou une rencontre avec une entité aquatique.',
    tags: ['interieur', 'temple', 'eau', 'souterrain', 'rencontre'],
    ambiances: ['temple', 'eau', 'mystere'],
    typesDefis: ['enigme', 'combat', 'exploration'],
  },

  // Pages 49-50 : Zone enneigée extérieure / terrain hivernal
  {
    id: 'BM1-49-50',
    volume: 1,
    pages: [49, 50],
    nom: 'Snow Field',
    nomFr: 'Champ de neige',
    description: 'Un terrain extérieur recouvert de neige avec quelques rochers émergents. Paysage hivernal vaste et dégagé. Pour des aventures nordiques ou une rencontre dans le froid.',
    tags: ['exterieur', 'glace', 'plaine', 'voyage', 'combat'],
    ambiances: ['hiver', 'froid', 'jour'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },

  // Pages 51-52 : Village enneigé / bâtiments sous la neige
  {
    id: 'BM1-51-52',
    volume: 1,
    pages: [51, 52],
    nom: 'Snow Village',
    nomFr: 'Village sous la neige',
    description: 'Un village recouvert de neige avec des bâtiments aux toits enneigés. Ambiance hivernale dans un lieu civilisé. Pour une enquête dans un village isolé par les neiges.',
    tags: ['exterieur', 'village', 'batiment', 'glace', 'rencontre'],
    ambiances: ['village', 'hiver', 'froid'],
    typesDefis: ['enquete', 'negociation', 'combat'],
  },

  // Pages 53-54 : Terrain enneigé avec arbres / forêt hivernale
  {
    id: 'BM1-53-54',
    volume: 1,
    pages: [53, 54],
    nom: 'Winter Forest',
    nomFr: 'Forêt hivernale',
    description: 'Une forêt sous la neige avec des arbres dénudés et un sol blanc. Atmosphère froide et inquiétante. Parfaite pour une rencontre nocturne ou une poursuite en hiver.',
    tags: ['exterieur', 'foret', 'glace', 'exploration', 'combat'],
    ambiances: ['foret', 'hiver', 'froid', 'frisson'],
    typesDefis: ['exploration', 'combat', 'fuite', 'enquete'],
  },

  // Pages 55-56 : Terrain désertique avec oasis ou ruines
  {
    id: 'BM1-55-56',
    volume: 1,
    pages: [55, 56],
    nom: 'Desert Ruins',
    nomFr: 'Ruines dans le désert',
    description: 'Un terrain désertique avec des ruines de pierre et peut-être une petite oasis. Pour explorer des vestiges d\'une civilisation ancienne dans un environnement hostile.',
    tags: ['exterieur', 'desert', 'plaine', 'exploration', 'rencontre'],
    ambiances: ['desert', 'ruines', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'combat'],
  },

  // Pages 57-58 : Zone humide / marais avec végétation dense
  {
    id: 'BM1-57-58',
    volume: 1,
    pages: [57, 58],
    nom: 'Dense Marsh',
    nomFr: 'Marais dense',
    description: 'Un marais avec une végétation très dense, des flaques et des arbres morts. Terrain presque impraticable, visibilité réduite. Pour une rencontre angoissante dans les terres humides.',
    tags: ['exterieur', 'marais', 'eau', 'exploration'],
    ambiances: ['marais', 'sombre', 'mystere', 'frisson'],
    typesDefis: ['exploration', 'fuite', 'combat', 'enquete'],
  },

  // Pages 59-60 : Cimetière / terrain avec tombes
  {
    id: 'BM1-59-60',
    volume: 1,
    pages: [59, 60],
    nom: 'Cemetery',
    nomFr: 'Cimetière',
    description: 'Un cimetière avec des pierres tombales, une chapelle et une atmosphère sinistre. Lieu classique pour des rencontres avec des morts-vivants ou des secrets enterrés.',
    tags: ['exterieur', 'batiment', 'rencontre', 'combat'],
    ambiances: ['cimetiere', 'sombre', 'frisson', 'nuit'],
    typesDefis: ['combat', 'enquete', 'enigme', 'exploration'],
  },

  // Pages 61-62 : Grille vierge
  {
    id: 'BM1-61-62',
    volume: 1,
    pages: [61, 62],
    nom: 'Blank Grid',
    nomFr: 'Grille vierge',
    description: 'Une grille vierge à utiliser librement pour dessiner n\'importe quel lieu personnalisé.',
    tags: ['interieur', 'exterieur'],
    ambiances: ['neutre'],
    typesDefis: ['combat', 'exploration', 'rencontre'],
  },
];
