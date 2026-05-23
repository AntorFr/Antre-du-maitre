// Battle Mats Volume 3 — Big Book of Battle Mats (Loke Battle Mats, LBM028)
// 60 pages = 30 doubles-pages combinables
// Source : analyse de la 4e de couverture

import type { BattleMat } from './battle-mats-index';

export const BATTLE_MATS_VOL3: BattleMat[] = [

  // Pages 1-2 : Champ de bataille extérieur avec tentes militaires / camp
  {
    id: 'BM3-01-02',
    volume: 3,
    pages: [1, 2],
    nom: 'Military Camp',
    nomFr: 'Camp militaire',
    description: 'Un champ de bataille avec des tentes militaires, des barricades et un terrain herbeux piétiné. Idéal pour une attaque de camp, une négociation entre factions ou une scène de guerre.',
    tags: ['exterieur', 'plaine', 'batiment', 'rencontre', 'combat'],
    ambiances: ['militaire', 'guerre', 'jour'],
    typesDefis: ['combat', 'negociation', 'fuite', 'enquete'],
  },

  // Pages 3-4 : Terrain herbeux avec haies et obstacles / champs cultivés
  {
    id: 'BM3-03-04',
    volume: 3,
    pages: [3, 4],
    nom: 'Farmland',
    nomFr: 'Terres agricoles',
    description: 'Des champs cultivés avec des haies, des murets et des rangées de cultures. Terrain cloisonné avec de nombreux couverts naturels. Pour des poursuites à travers la campagne ou des rencontres rurales.',
    tags: ['exterieur', 'plaine', 'village', 'voyage', 'combat'],
    ambiances: ['campagne', 'rural', 'jour'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 5-6 : Ruines extérieures / vestiges de murs et colonnes
  {
    id: 'BM3-05-06',
    volume: 3,
    pages: [5, 6],
    nom: 'Ancient Ruins',
    nomFr: 'Ruines anciennes',
    description: 'Les vestiges d\'un bâtiment ancien avec des murs effondrés, des colonnes brisées et de l\'herbe qui envahit tout. Pour l\'exploration de lieux chargés d\'histoire ou de magie oubliée.',
    tags: ['exterieur', 'plaine', 'exploration', 'rencontre'],
    ambiances: ['ruines', 'mystere', 'jour'],
    typesDefis: ['exploration', 'enigme', 'combat', 'enquete'],
  },

  // Pages 7-8 : Clairière avec cercle de pierres / site magique
  {
    id: 'BM3-07-08',
    volume: 3,
    pages: [7, 8],
    nom: 'Stone Circle',
    nomFr: 'Cercle de pierres',
    description: 'Une clairière avec un cercle de menhirs lumineux ou gravés. Site magique mystérieux parfait pour un rituel, une énigme druidique ou l\'invocation d\'une entité.',
    tags: ['exterieur', 'foret', 'temple', 'rencontre', 'exploration'],
    ambiances: ['mystere', 'magique', 'nuit'],
    typesDefis: ['enigme', 'combat', 'enquete'],
  },

  // Pages 9-10 : Intérieur mécanique / couloirs de type vaisseau ou forge
  {
    id: 'BM3-09-10',
    volume: 3,
    pages: [9, 10],
    nom: 'Mechanical Interior',
    nomFr: 'Intérieur mécanique',
    description: 'Des couloirs et salles aux allures mécaniques ou industrielles — engrenages, tuyaux, metal. Peut être une forge géante, un automate ou les entrailles d\'un golem. Cadre inhabituel et mémorable.',
    tags: ['interieur', 'souterrain', 'exploration', 'combat'],
    ambiances: ['mecanique', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'combat'],
  },

  // Pages 11-12 : Couloirs souterrains larges / tunnel avec rail ou canal
  {
    id: 'BM3-11-12',
    volume: 3,
    pages: [11, 12],
    nom: 'Underground Tunnels',
    nomFr: 'Tunnels souterrains',
    description: 'De larges tunnels souterrains qui pourraient abriter un canal ou une voie. Passages importants sous une ville ou une montagne. Pour une exploration ou une poursuite souterraine.',
    tags: ['interieur', 'souterrain', 'eau', 'exploration', 'voyage'],
    ambiances: ['souterrain', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'fuite', 'combat'],
  },

  // Pages 13-14 : Intérieur de donjon avec salles et couloirs variés
  {
    id: 'BM3-13-14',
    volume: 3,
    pages: [13, 14],
    nom: 'Dungeon Rooms',
    nomFr: 'Salles de donjon',
    description: 'Un plan de donjon classique avec des salles rectangulaires et des couloirs bien tracés. Configuration propre et lisible, idéale pour les explorateurs débutants.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration', 'combat'],
    ambiances: ['donjon', 'sombre', 'souterrain'],
    typesDefis: ['exploration', 'combat', 'enigme'],
  },

  // Pages 15-16 : Donjon avec salle centrale et alcôves / labyrinthe en damier
  {
    id: 'BM3-15-16',
    volume: 3,
    pages: [15, 16],
    nom: 'Checkerboard Dungeon',
    nomFr: 'Donjon en damier',
    description: 'Un donjon avec des dalles en damier contrasté et des salles en alcôves. Le motif visuel fort crée une atmosphère particulière, comme un défi ou un lieu enchanté.',
    tags: ['interieur', 'donjon', 'souterrain', 'exploration'],
    ambiances: ['donjon', 'mystere', 'magique'],
    typesDefis: ['enigme', 'exploration', 'combat'],
  },

  // Pages 17-18 : Zone extérieure avec terrain humide et éléments naturels épars
  {
    id: 'BM3-17-18',
    volume: 3,
    pages: [17, 18],
    nom: 'Wetland Clearing',
    nomFr: 'Clairière humide',
    description: 'Une zone ouverte avec des mares, des rochers et une végétation humide éparse. Terrain accidenté entre marais et prairie. Pour une rencontre dans un milieu naturel difficile.',
    tags: ['exterieur', 'marais', 'plaine', 'eau', 'exploration'],
    ambiances: ['marais', 'nature', 'jour'],
    typesDefis: ['exploration', 'combat', 'fuite'],
  },

  // Pages 19-20 : Zone désertique avec oasis et palmiers
  {
    id: 'BM3-19-20',
    volume: 3,
    pages: [19, 20],
    nom: 'Desert Oasis',
    nomFr: 'Oasis dans le désert',
    description: 'Une oasis avec une source d\'eau, des palmiers et du sable tout autour. Lieu de repos rare dans le désert, convoité par toutes les créatures des environs.',
    tags: ['exterieur', 'desert', 'eau', 'rencontre', 'exploration'],
    ambiances: ['desert', 'chaud', 'jour'],
    typesDefis: ['negociation', 'combat', 'enquete'],
  },

  // Pages 21-22 : Zone naturelle avec lac et végétation luxuriante
  {
    id: 'BM3-21-22',
    volume: 3,
    pages: [21, 22],
    nom: 'Forest Lake',
    nomFr: 'Lac en forêt',
    description: 'Un lac entouré de végétation dense avec des berges variées. Cadre paisible qui peut cacher un secret — une créature aquatique, un trésor immergé ou un passage secret.',
    tags: ['exterieur', 'foret', 'eau', 'exploration', 'rencontre'],
    ambiances: ['foret', 'nature', 'jour', 'mystere'],
    typesDefis: ['exploration', 'enquete', 'combat'],
  },

  // Pages 23-24 : Terrain extérieur avec ruines et végétation envahissante
  {
    id: 'BM3-23-24',
    volume: 3,
    pages: [23, 24],
    nom: 'Overgrown Ruins',
    nomFr: 'Ruines envahies par la végétation',
    description: 'D\'anciennes structures recouvertes de lierre et de végétation. La nature a repris ses droits sur un lieu jadis important. Pour une exploration archéologique ou une embuscade dans les décombres.',
    tags: ['exterieur', 'foret', 'exploration', 'rencontre'],
    ambiances: ['ruines', 'foret', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'combat', 'enquete'],
  },

  // Pages 25-26 : Intérieur avec salles de stockage / entrepôt ou crypte
  {
    id: 'BM3-25-26',
    volume: 3,
    pages: [25, 26],
    nom: 'Storage Vaults',
    nomFr: 'Salles de stockage / crypte',
    description: 'Un espace intérieur avec des rangées d\'alcôves, de niches ou d\'étagères. Peut être un entrepôt, une bibliothèque souterraine ou une crypte avec des sarcophages.',
    tags: ['interieur', 'souterrain', 'batiment', 'exploration'],
    ambiances: ['souterrain', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'enquete', 'combat', 'enigme'],
  },

  // Pages 27-28 : Zone aquatique colorée avec créatures / fond marin ou lac enchanté
  {
    id: 'BM3-27-28',
    volume: 3,
    pages: [27, 28],
    nom: 'Enchanted Waters',
    nomFr: 'Eaux enchantées',
    description: 'Une zone aquatique avec des couleurs vives — algues, coraux ou magie. Peut représenter un fond de lac enchanté, une grotte sous-marine ou un plan d\'eau féerique. Très visuel et mémorable.',
    tags: ['interieur', 'exterieur', 'eau', 'exploration', 'rencontre'],
    ambiances: ['magique', 'eau', 'mystere', 'frisson'],
    typesDefis: ['exploration', 'enigme', 'combat'],
  },

  // Pages 29-30 : Désert avec ruines et tombes / nécropole désertique
  {
    id: 'BM3-29-30',
    volume: 3,
    pages: [29, 30],
    nom: 'Desert Necropolis',
    nomFr: 'Nécropole du désert',
    description: 'Un site funéraire désertique avec des tombes, des obélisques et des sarcophages en plein air. Pour des aventures avec des momies ou à la recherche d\'un trésor de pharaon.',
    tags: ['exterieur', 'desert', 'exploration', 'rencontre'],
    ambiances: ['desert', 'ruines', 'mystere', 'frisson'],
    typesDefis: ['exploration', 'enigme', 'combat', 'enquete'],
  },

  // Pages 31-32 : Zone côtière avec quai et eau / embarcadère
  {
    id: 'BM3-31-32',
    volume: 3,
    pages: [31, 32],
    nom: 'Waterfront Dock',
    nomFr: 'Embarcadère',
    description: 'Un quai en bois au bord de l\'eau avec des pilotis et des pontons. Plus petit et intime qu\'un grand port — un mouillage discret, un lieu de rendez-vous secret ou une cache de contrebandiers.',
    tags: ['exterieur', 'eau', 'cote', 'batiment', 'rencontre'],
    ambiances: ['port', 'cote', 'nuit'],
    typesDefis: ['enquete', 'negociation', 'fuite', 'combat'],
  },

  // Pages 33-34 : Intérieur de temple ou salle avec décorations
  {
    id: 'BM3-33-34',
    volume: 3,
    pages: [33, 34],
    nom: 'Temple Sanctum',
    nomFr: 'Sanctuaire de temple',
    description: 'L\'intérieur d\'un temple avec une salle principale décorée et des chapelles latérales. Lieu sacré pour une confrontation religieuse, une énigme divine ou la rencontre avec un haut prêtre.',
    tags: ['interieur', 'temple', 'batiment', 'rencontre'],
    ambiances: ['temple', 'majestueux', 'mystere'],
    typesDefis: ['negociation', 'enigme', 'combat'],
  },

  // Pages 35-36 : Grande salle intérieure simple / hall vide
  {
    id: 'BM3-35-36',
    volume: 3,
    pages: [35, 36],
    nom: 'Empty Hall',
    nomFr: 'Grand hall vide',
    description: 'Un grand hall intérieur épuré avec peu de mobilier. Sa simplicité en fait une carte polyvalente pour n\'importe quelle confrontation en intérieur — arène improvisée, salle d\'audience ou entrepôt.',
    tags: ['interieur', 'batiment', 'combat', 'rencontre'],
    ambiances: ['interieur', 'neutre'],
    typesDefis: ['combat', 'negociation'],
  },

  // Pages 37-38 : Arène circulaire / amphithéâtre
  {
    id: 'BM3-37-38',
    volume: 3,
    pages: [37, 38],
    nom: 'Circular Arena',
    nomFr: 'Arène circulaire',
    description: 'Une arène ronde avec des gradins tout autour et une zone de combat centrale bien délimitée. Parfaite pour un combat organisé, un tournoi ou un jugement par les armes devant une foule.',
    tags: ['exterieur', 'interieur', 'batiment', 'combat', 'rencontre'],
    ambiances: ['arene', 'spectacle', 'jour'],
    typesDefis: ['combat', 'negociation'],
  },

  // Pages 39-40 : Bâtiment multi-pièces / plan d'habitation détaillé
  {
    id: 'BM3-39-40',
    volume: 3,
    pages: [39, 40],
    nom: 'Residential Building',
    nomFr: 'Bâtiment résidentiel',
    description: 'Le plan intérieur d\'un bâtiment d\'habitation avec cuisine, chambres, salon et couloirs. Pour une infiltration, une fouille de domicile ou une scène de vie quotidienne qui tourne mal.',
    tags: ['interieur', 'batiment', 'village', 'exploration'],
    ambiances: ['village', 'interieur', 'nuit'],
    typesDefis: ['enquete', 'exploration', 'fuite', 'combat'],
  },

  // Pages 41-42 : Dirigeable / pont d'un navire aérien vu du dessus
  {
    id: 'BM3-41-42',
    volume: 3,
    pages: [41, 42],
    nom: 'Airship Deck',
    nomFr: 'Pont de dirigeable',
    description: 'Le pont d\'un navire aérien ou dirigeable vu du dessus — une carte unique et spectaculaire. Pour un combat à bord d\'un vaisseau volant, une scène de piraterie aérienne ou une fuite sur les toits du ciel.',
    tags: ['exterieur', 'combat', 'exploration'],
    ambiances: ['aerien', 'aventure', 'spectacle'],
    typesDefis: ['combat', 'fuite', 'enigme'],
  },

  // Pages 43-44 : Grande salle dallée en damier coloré / salle de jeu ou palais
  {
    id: 'BM3-43-44',
    volume: 3,
    pages: [43, 44],
    nom: 'Checkered Palace Hall',
    nomFr: 'Salle de palais en damier',
    description: 'Une salle somptueuse avec un sol en damier de couleurs contrastées et des éléments décoratifs. Peut être une salle du trône, une salle de réception royale ou une salle de jeux enchantée.',
    tags: ['interieur', 'batiment', 'temple', 'rencontre', 'combat'],
    ambiances: ['palais', 'majestueux', 'magique'],
    typesDefis: ['negociation', 'enigme', 'combat'],
  },

  // Pages 45-46 : Couloirs de bois / intérieur de bâtiment en bois
  {
    id: 'BM3-45-46',
    volume: 3,
    pages: [45, 46],
    nom: 'Wooden Building',
    nomFr: 'Bâtiment en bois',
    description: 'L\'intérieur d\'un bâtiment entièrement construit en bois — une grange, une grande salle de guilde ou une forteresse de bois. Texture chaleureuse, nombreuses pièces fonctionnelles.',
    tags: ['interieur', 'batiment', 'village', 'rencontre'],
    ambiances: ['village', 'interieur', 'jour'],
    typesDefis: ['negociation', 'enquete', 'combat'],
  },

  // Pages 47-48 : Intérieur avec salle centrale et niches / temple ou bibliothèque
  {
    id: 'BM3-47-48',
    volume: 3,
    pages: [47, 48],
    nom: 'Library or Shrine',
    nomFr: 'Bibliothèque ou sanctuaire',
    description: 'Une salle intérieure avec une zone centrale et des niches ou rayonnages sur les côtés. Peut être une bibliothèque magique, une salle de trophées ou un petit sanctuaire secret.',
    tags: ['interieur', 'batiment', 'temple', 'rencontre', 'exploration'],
    ambiances: ['temple', 'mystere', 'sombre'],
    typesDefis: ['enquete', 'enigme', 'negociation'],
  },

  // Pages 49-50 : Zone extérieure enneigée avec bâtiment / village hivernal
  {
    id: 'BM3-49-50',
    volume: 3,
    pages: [49, 50],
    nom: 'Snowy Settlement',
    nomFr: 'Hameau sous la neige',
    description: 'Un petit hameau ou bâtiment isolé sous une épaisse couche de neige. L\'hiver a tout recouvert. Pour une scène de survie, une quête dans un village coupé du monde ou une rencontre avec des habitants hivernaux.',
    tags: ['exterieur', 'village', 'batiment', 'glace', 'rencontre'],
    ambiances: ['hiver', 'village', 'froid'],
    typesDefis: ['enquete', 'negociation', 'combat', 'exploration'],
  },

  // Pages 51-52 : Arène / salle circulaire avec zone de combat centrale et lave
  {
    id: 'BM3-51-52',
    volume: 3,
    pages: [51, 52],
    nom: 'Lava Arena',
    nomFr: 'Arène de lave',
    description: 'Une salle circulaire avec une zone de combat entourée de lave. Un lieu de combat spectaculaire et dangereux — une arène de gladiateurs infernale ou le repaire d\'un boss dans un volcan.',
    tags: ['interieur', 'lave', 'combat', 'rencontre'],
    ambiances: ['volcanique', 'arene', 'danger', 'frisson'],
    typesDefis: ['combat', 'fuite'],
  },

  // Pages 53-54 : Intérieur de temple ou complexe souterrain élaboré
  {
    id: 'BM3-53-54',
    volume: 3,
    pages: [53, 54],
    nom: 'Temple Complex',
    nomFr: 'Complexe de temple',
    description: 'Un vaste complexe intérieur avec des salles dédiées à différentes fonctions — autel, sacristie, crypte. Pour une aventure de plusieurs scènes dans un même lieu religieux.',
    tags: ['interieur', 'temple', 'souterrain', 'exploration', 'rencontre'],
    ambiances: ['temple', 'sombre', 'mystere'],
    typesDefis: ['exploration', 'enigme', 'combat', 'enquete'],
  },

  // Pages 55-56 : Zone désertique avec grandes dalles / plateau aride
  {
    id: 'BM3-55-56',
    volume: 3,
    pages: [55, 56],
    nom: 'Arid Plateau',
    nomFr: 'Plateau aride',
    description: 'Un plateau rocheux et aride avec peu de végétation et quelques formations géologiques. Espace ouvert et hostile, idéal pour une rencontre sous un soleil de plomb ou une embuscade de bandits du désert.',
    tags: ['exterieur', 'desert', 'plaine', 'montagne', 'voyage', 'combat'],
    ambiances: ['desert', 'aride', 'jour'],
    typesDefis: ['combat', 'fuite', 'exploration'],
  },

  // Pages 57-58 : Grande zone extérieure herbeuse / plaine de bataille
  {
    id: 'BM3-57-58',
    volume: 3,
    pages: [57, 58],
    nom: 'Open Battlefield',
    nomFr: 'Plaine de bataille',
    description: 'Une vaste plaine herbeuse dégagée, idéale pour un grand combat ou une charge de cavalerie. Le terrain le plus ouvert des trois volumes — aucun obstacle, visibilité totale, tout se joue sur les positions.',
    tags: ['exterieur', 'plaine', 'combat', 'voyage'],
    ambiances: ['plaine', 'guerre', 'jour'],
    typesDefis: ['combat', 'fuite'],
  },

  // Pages 59-60 : Terrain rocheux sombre / falaises ou montagne
  {
    id: 'BM3-59-60',
    volume: 3,
    pages: [59, 60],
    nom: 'Dark Rocky Terrain',
    nomFr: 'Terrain rocheux sombre',
    description: 'Un terrain de roche sombre et accidenté — falaise, piton rocheux ou entrée de grotte. Ambiance menaçante renforcée par les tons sombres. Pour une rencontre dans un environnement minéral hostile.',
    tags: ['exterieur', 'montagne', 'souterrain', 'exploration', 'combat'],
    ambiances: ['montagne', 'sombre', 'frisson'],
    typesDefis: ['combat', 'exploration', 'fuite'],
  },
];
