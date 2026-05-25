import type {
  ActDetail,
  ActDetailChatRequest,
  ActDetailStep,
  GameplayType,
  ScenarioData,
} from '@antre-du-maitre/shared';

type ScenarioAct = ScenarioData['actes'][number];
type ActDetailWorkflowResult = {
  scenario: ScenarioData;
  reply: string;
  suggestions: string[];
};

const ACT_DETAIL_STEPS: ActDetailStep[] = [
  'OBJECTIF',
  'VOIES',
  'MODULE',
  'SCENES',
  'TIMING',
  'VALIDATION',
];

export function ensureActDetails(scenario: ScenarioData): ScenarioData {
  return {
    ...scenario,
    actes: scenario.actes.map((acte) =>
      acte.detailsMJ ? acte : addGeneratedActDetail(scenario, acte),
    ),
  };
}

export function needsActDetails(scenario: ScenarioData): boolean {
  return scenario.actes.some((acte) => !acte.detailsMJ);
}

export function runActDetailWorkflow(input: {
  scenario: ScenarioData;
  actNumber: number;
  request: ActDetailChatRequest;
}): ActDetailWorkflowResult {
  const scenario = ensureActDetails(input.scenario);
  const act = scenario.actes.find((candidate) => candidate.numero === input.actNumber);

  if (!act?.detailsMJ) {
    throw new Error(`Unknown act: ${input.actNumber}`);
  }

  const updatedDetail = updateActDetail({
    detail: act.detailsMJ,
    message: input.request.message?.trim(),
    action: input.request.action,
  });
  const updatedScenario = {
    ...scenario,
    actes: scenario.actes.map((candidate) =>
      candidate.numero === input.actNumber
        ? {
            ...candidate,
            detailsMJ: updatedDetail,
          }
        : candidate,
    ),
  };

  return {
    scenario: updatedScenario,
    reply: buildWorkflowReply(updatedDetail),
    suggestions: buildWorkflowSuggestions(updatedDetail),
  };
}

function addGeneratedActDetail(
  scenario: ScenarioData,
  acte: ScenarioAct,
): ScenarioAct {
  return {
    ...acte,
    detailsMJ: generateActDetail(scenario, acte),
  };
}

function generateActDetail(
  scenario: ScenarioData,
  acte: ScenarioAct,
): ActDetail {
  const rencontres = scenario.rencontres.filter(
    (rencontre) => rencontre.acteNumero === acte.numero,
  );
  const typePrincipal = inferGameplayType(acte, rencontres);
  const typesSecondaires = inferSecondaryTypes(acte, typePrincipal);
  const sceneCount = acte.dureeEstimeeMin >= 45 ? 3 : 2;
  const scenes = [
    {
      titre: 'Accroche de scene',
      type: typePrincipal,
      statut: 'OBLIGATOIRE_SOUPLE' as const,
      objectifMJ: 'Donner aux joueurs une direction claire et un choix concret.',
      deroule: buildOpeningBeat(scenario, acte),
      relanceAntiBlocage:
        'Si les joueurs hesitent, proposer une piste visible ou faire parler un PNJ.',
    },
    {
      titre: 'Tension ou complication',
      type: typePrincipal,
      statut: 'CONSEQUENCE' as const,
      objectifMJ: 'Faire monter la pression sans bloquer la table.',
      deroule: buildComplicationBeat(acte),
      relanceAntiBlocage:
        "Si la scene bloque, transformer l'obstacle en cout plutot qu'en mur.",
    },
    ...(sceneCount >= 3
      ? [
          {
            titre: "Resolution de l'acte",
            type: typePrincipal,
            statut: 'OBLIGATOIRE_SOUPLE' as const,
            objectifMJ:
              'Conclure avec une information, une victoire ou un nouveau probleme.',
            deroule: buildResolutionBeat(acte),
            relanceAntiBlocage:
              "Donner la transition vers l'acte suivant meme en cas de reussite partielle.",
          },
        ]
      : []),
  ];

  return {
    status: 'TODO',
    currentStep: 'OBJECTIF',
    objectif: {
      principal: `Faire avancer les heros dans "${acte.titre}".`,
      enjeu: acte.description,
      typePrincipal,
      typesSecondaires,
      dureeCibleMin: acte.dureeEstimeeMin,
      reussiteComplete: buildCompleteSuccess(acte),
      reussitePartielle: buildPartialSuccess(acte),
      echecInteressant: buildInterestingFailure(acte),
      bonusOptionnel: buildOptionalBonus(scenario, acte),
    },
    voies: buildGameplayPaths(acte, typePrincipal, typesSecondaires),
    moduleSpecialise: buildSpecializedModule(scenario, acte, typePrincipal, rencontres),
    scenes,
    indices: buildClues(scenario, acte),
    choixConsequences: buildChoices(acte),
    transitions: buildTransitions(scenario, acte),
    preparation: buildPreparation(acte, rencontres),
    notesImpro: buildImproNotes(acte, rencontres),
    timing: {
      ordreConseille: scenes.map((scene) => scene.titre),
      versionCourte:
        "Garder uniquement l'accroche, un choix fort et la transition.",
      versionStandard:
        "Jouer l'accroche, une voie de gameplay, la complication puis la resolution.",
      versionLongue:
        'Laisser explorer deux voies, ajouter une consequence et donner un bonus optionnel.',
      aCouperSiBesoin: [
        'Une voie secondaire',
        'Une fausse piste ou une complication non essentielle',
      ],
      aGarderAbsolument: [
        `L'objectif principal de l'acte ${acte.numero}`,
        'La transition vers la suite',
      ],
    },
    syntheseMJ: buildActSummary(acte, typePrincipal),
    notesUtilisateur: [],
  };
}

function updateActDetail(input: {
  detail: ActDetail;
  message?: string;
  action: ActDetailChatRequest['action'];
}): ActDetail {
  const notesUtilisateur = input.message
    ? [...input.detail.notesUtilisateur, input.message]
    : input.detail.notesUtilisateur;

  if (input.action === 'REOPEN') {
    return {
      ...input.detail,
      status: 'IN_PROGRESS',
      currentStep: 'OBJECTIF',
      notesUtilisateur,
    };
  }

  if (input.action === 'VALIDATE') {
    return {
      ...input.detail,
      status: 'VALIDATED',
      currentStep: 'VALIDATION',
      notesUtilisateur,
      syntheseMJ: appendUserNote(input.detail.syntheseMJ, input.message),
    };
  }

  const nextStep = getNextActDetailStep(input.detail.currentStep);

  return {
    ...input.detail,
    status: 'IN_PROGRESS',
    currentStep: nextStep,
    notesUtilisateur,
    notesImpro: input.message
      ? [...input.detail.notesImpro, `Note MJ : ${input.message}`]
      : input.detail.notesImpro,
  };
}

function getNextActDetailStep(step: ActDetailStep): ActDetailStep {
  const currentIndex = ACT_DETAIL_STEPS.indexOf(step);
  return ACT_DETAIL_STEPS[Math.min(currentIndex + 1, ACT_DETAIL_STEPS.length - 1)] ?? 'VALIDATION';
}

function buildWorkflowReply(detail: ActDetail): string {
  if (detail.status === 'VALIDATED') {
    return "Acte valide. La synthese et le todo peuvent maintenant s'appuyer dessus.";
  }

  const labels: Record<ActDetailStep, string> = {
    OBJECTIF: "On cadre l'objectif de l'acte.",
    VOIES: 'On choisit les voies que les joueurs peuvent emprunter.',
    MODULE: `On travaille le module ${detail.moduleSpecialise.type}.`,
    SCENES: 'On transforme les voies en scenes jouables.',
    TIMING: "On regle le rythme et ce qu'il faut couper si besoin.",
    VALIDATION: "On relit l'acte avant validation.",
  };

  return labels[detail.currentStep];
}

function buildWorkflowSuggestions(detail: ActDetail): string[] {
  if (detail.status === 'VALIDATED') {
    return ['Reouvrir cet acte', 'Detailler un autre acte', 'Generer le todo'];
  }

  if (detail.currentStep === 'MODULE') {
    return [`Plus ${detail.moduleSpecialise.type}`, 'Ajouter une alternative', 'Passer aux scenes'];
  }

  return ['Avancer', 'Ajouter une note MJ', 'Valider cet acte'];
}

function buildOpeningBeat(scenario: ScenarioData, acte: ScenarioAct): string {
  const place = scenario.lieu?.nom ? ` dans ${scenario.lieu.nom}` : '';
  return `Reformuler l'objectif de l'acte${place}, puis demander aux joueurs comment ils abordent : ${acte.description}`;
}

function inferGameplayType(
  acte: ScenarioAct,
  rencontres: ScenarioData['rencontres'],
): GameplayType {
  const text = `${acte.type} ${acte.titre} ${acte.description}`.toLowerCase();

  if (text.includes('combat') || rencontres.length > 0) return 'combat';
  if (text.includes('enquete') || text.includes('indice')) return 'enquete';
  if (text.includes('enigme')) return 'enigme';
  if (text.includes('roleplay') || text.includes('negociation')) return 'roleplay';
  if (text.includes('fuite') || text.includes('poursuite')) return 'fuite';
  if (text.includes('infiltration') || text.includes('discretion')) return 'infiltration';

  return 'exploration';
}

function inferSecondaryTypes(
  acte: ScenarioAct,
  typePrincipal: GameplayType,
): GameplayType[] {
  const text = `${acte.type} ${acte.titre} ${acte.description} ${acte.options.join(' ')}`.toLowerCase();
  const candidates: GameplayType[] = [
    'enquete',
    'combat',
    'exploration',
    'roleplay',
    'enigme',
    'fuite',
    'infiltration',
  ];

  return candidates.filter((type) => {
    if (type === typePrincipal) return false;
    if (type === 'enquete') return text.includes('interroger') || text.includes('indice');
    if (type === 'roleplay') return text.includes('convaincre') || text.includes('parler');
    if (type === 'exploration') return text.includes('fouiller') || text.includes('chercher');
    if (type === 'fuite') return text.includes('fuir') || text.includes('poursuite');
    return text.includes(type);
  }).slice(0, 2);
}

function buildCompleteSuccess(acte: ScenarioAct): string {
  return `Les joueurs atteignent l'objectif de "${acte.titre}" et gagnent un avantage clair pour la suite.`;
}

function buildPartialSuccess(acte: ScenarioAct): string {
  return `Les joueurs avancent vers la suite de l'acte ${acte.numero}, mais avec un cout, un retard ou une menace.`;
}

function buildInterestingFailure(acte: ScenarioAct): string {
  return `L'histoire continue, mais la situation devient plus dangereuse ou moins confortable.`;
}

function buildOptionalBonus(scenario: ScenarioData, acte: ScenarioAct): string {
  return scenario.antagoniste
    ? `Obtenir un indice bonus sur ${scenario.antagoniste.nom}.`
    : `Obtenir une information bonus liee a "${acte.titre}".`;
}

function buildGameplayPaths(
  acte: ScenarioAct,
  typePrincipal: GameplayType,
  typesSecondaires: GameplayType[],
) {
  const pathTypes = [typePrincipal, ...typesSecondaires].slice(0, 3);

  return pathTypes.map((type, index) => ({
    id: `voie-${index + 1}`,
    label: getPathLabel(type),
    type,
    actionJoueurs: getPathAction(type, acte),
    gain: getPathGain(type, acte),
    risque: getPathRisk(type),
    preparationMJ: getPathPreparation(type),
  }));
}

function getPathLabel(type: GameplayType): string {
  const labels: Record<GameplayType, string> = {
    enquete: 'Suivre les indices',
    combat: 'Affronter ou neutraliser',
    exploration: 'Explorer prudemment',
    roleplay: 'Convaincre ou negocier',
    enigme: 'Comprendre la logique',
    fuite: "Gagner du temps ou s'echapper",
    infiltration: 'Passer sans etre repere',
  };

  return labels[type];
}

function getPathAction(type: GameplayType, acte: ScenarioAct): string {
  if (acte.options.length > 0) return acte.options[0] ?? getPathLabel(type);

  const actions: Record<GameplayType, string> = {
    enquete: 'Interroger, observer et recouper les indices.',
    combat: 'Choisir une tactique, utiliser le terrain et gerer la menace.',
    exploration: 'Choisir une route, fouiller et prendre des risques mesures.',
    roleplay: 'Comprendre le PNJ, choisir un levier et obtenir son aide.',
    enigme: 'Tester une hypothese, demander un indice ou contourner avec un cout.',
    fuite: 'Avancer vite, eviter les obstacles et accepter des pertes mineures.',
    infiltration: 'Observer les rondes, creer une diversion et rester discret.',
  };

  return actions[type];
}

function getPathGain(type: GameplayType, acte: ScenarioAct): string {
  const gains: Record<GameplayType, string> = {
    enquete: "Une verite ou une direction claire pour continuer l'acte.",
    combat: 'La menace est repoussee, vaincue ou transformee en avantage.',
    exploration: 'Une nouvelle zone, un raccourci ou une decouverte utile.',
    roleplay: 'Une information, une alliance ou un passage facilite.',
    enigme: 'Un acces, un secret ou un avantage narratif.',
    fuite: 'Les heros restent en vie et atteignent la prochaine position.',
    infiltration: 'Les heros progressent sans declencher toute la menace.',
  };

  return `${gains[type]} (${acte.titre})`;
}

function getPathRisk(type: GameplayType): string {
  const risks: Record<GameplayType, string> = {
    enquete: 'Perdre du temps ou attirer une mauvaise attention.',
    combat: 'Blessures, ressources consommees ou danger qui augmente.',
    exploration: 'Declencher un piege, se perdre ou arriver en retard.',
    roleplay: 'Braquer le PNJ ou devoir promettre quelque chose.',
    enigme: 'Declencher une alarme, perdre du temps ou accepter un cout.',
    fuite: 'Perdre un objet, separer le groupe ou arriver fatigue.',
    infiltration: 'Etre repere et transformer la scene en poursuite.',
  };

  return risks[type];
}

function getPathPreparation(type: GameplayType): string[] {
  const preparation: Record<GameplayType, string[]> = {
    enquete: ['3 indices', '1 relance anti-blocage', '1 fausse piste legere'],
    combat: ['objectif du combat', 'terrain', 'mecanique speciale simple'],
    exploration: ['zones', 'obstacles', 'decouvertes'],
    roleplay: ['motivation du PNJ', 'leviers', 'reaction si brusque'],
    enigme: ['solution', 'indices progressifs', 'contournement possible'],
    fuite: ['compteur', 'obstacles', 'cout de reussite partielle'],
    infiltration: ['rondes', 'indices de securite', 'consequence si repere'],
  };

  return preparation[type];
}

function buildSpecializedModule(
  scenario: ScenarioData,
  acte: ScenarioAct,
  type: GameplayType,
  rencontres: ScenarioData['rencontres'],
) {
  const builders: Record<GameplayType, () => ActDetail['moduleSpecialise']> = {
    enquete: () => ({
      type,
      focus: 'Eviter le blocage en donnant plusieurs indices vers la meme verite.',
      elements: [
        { label: 'Question centrale', value: `Que doivent comprendre les joueurs dans "${acte.titre}" ?` },
        { label: 'Verite', value: acte.description },
        { label: 'Regle des 3 indices', value: buildClues(scenario, acte).join(' / ') },
        { label: 'Anti-blocage', value: 'Si deux pistes echouent, un PNJ ou un detail visible donne la direction.' },
      ],
    }),
    combat: () => ({
      type,
      focus: 'Rendre le combat tactique avec un objectif, un terrain et une issue alternative.',
      elements: [
        { label: 'Objectif du combat', value: rencontres.length ? rencontres.map((rencontre) => rencontre.contexte).join(' / ') : `Survivre a "${acte.titre}".` },
        { label: 'Mecanique speciale', value: 'A chaque round pair, ajouter une pression simple : terrain difficile, danger qui approche ou avantage revelable.' },
        { label: 'Tactique ennemie', value: 'Les adversaires cherchent un avantage clair plutot que de frapper au hasard.' },
        { label: 'Issue alternative', value: 'Prevoir une negociation, une fuite ou une faiblesse exploitable.' },
      ],
    }),
    exploration: () => ({
      type,
      focus: 'Transformer le lieu en choix de routes, dangers et decouvertes.',
      elements: [
        { label: 'Zones', value: 'Entree / obstacle / decouverte / sortie.' },
        { label: 'Choix', value: 'Route rapide mais risquee, route prudente mais plus lente.' },
        { label: 'Danger', value: 'Un risque progresse si les joueurs trainent.' },
      ],
    }),
    roleplay: () => ({
      type,
      focus: 'Donner au PNJ une envie, une peur et des leviers clairs.',
      elements: [
        { label: 'Desir', value: 'Ce que le PNJ veut obtenir ou eviter.' },
        { label: 'Levier', value: 'Ce qui peut le convaincre sans forcer.' },
        { label: 'Reaction', value: "Ce qu'il fait si les heros le brusquent." },
      ],
    }),
    enigme: () => ({
      type,
      focus: 'Preparer solution, logique, indices progressifs et contournement.',
      elements: [
        { label: 'Solution', value: 'Une reponse simple que le MJ peut expliquer.' },
        { label: 'Indices', value: 'Indice discret, indice clair, indice quasi direct.' },
        { label: 'Contournement', value: 'Forcer ou contourner doit marcher, mais avec un cout.' },
      ],
    }),
    fuite: () => ({
      type,
      focus: 'Creer une scene dynamique avec compteur et obstacles.',
      elements: [
        { label: 'Compteur', value: '3 segments avant que la menace rattrape les heros.' },
        { label: 'Obstacles', value: 'Un obstacle physique, un choix, une perte possible.' },
        { label: 'Reussite partielle', value: "Les heros s'en sortent, mais perdent du temps ou un objet." },
      ],
    }),
    infiltration: () => ({
      type,
      focus: 'Permettre discretion, diversion et consequence si repere.',
      elements: [
        { label: 'Securite', value: 'Qui surveille, ou, et avec quelle faiblesse.' },
        { label: 'Diversion', value: 'Une option simple pour deplacer la menace.' },
        { label: 'Si repere', value: 'Transformer en fuite ou negociation, pas en blocage.' },
      ],
    }),
  };

  return builders[type]();
}

function buildActSummary(acte: ScenarioAct, type: GameplayType): string {
  return `Acte ${acte.numero} (${type}) : viser une reussite complete, accepter une reussite partielle, et toujours garder une relance pour continuer sans bloquer.`;
}

function appendUserNote(summary: string, note?: string): string {
  return note ? `${summary} Note de validation : ${note}` : summary;
}

function buildComplicationBeat(acte: ScenarioAct): string {
  const option = acte.options[0];
  return option
    ? `Utiliser "${option}" comme premiere piste, puis ajouter un obstacle simple si les joueurs hesitent.`
    : 'Introduire un obstacle lisible : temoin reticent, danger proche, passage bloque ou choix moral.';
}

function buildResolutionBeat(acte: ScenarioAct): string {
  return acte.pointDeCoupure
    ? 'Finir sur une revelation ou une menace claire, puis proposer le point de coupure.'
    : "Donner une recompense narrative claire et orienter vers l'acte suivant.";
}

function buildClues(scenario: ScenarioData, acte: ScenarioAct): string[] {
  const clues = [
    `Un detail du lieu confirme que "${acte.titre}" est lie a la quete principale.`,
  ];

  if (scenario.antagoniste) {
    clues.push(
      `Une trace ou un temoignage pointe vers ${scenario.antagoniste.nom}.`,
    );
  }

  if (acte.options.length > 0) {
    clues.push(`Une option visible pour les joueurs : ${acte.options[0]}.`);
  }

  return clues;
}

function buildChoices(acte: ScenarioAct): string[] {
  if (acte.options.length === 0) {
    return [
      'Approche directe : avancer vite, mais declencher une complication.',
      'Approche prudente : obtenir un avantage, mais perdre du temps.',
    ];
  }

  return acte.options.slice(0, 3).map((option) => {
    return `${option} -> preparer une consequence positive et un cout possible.`;
  });
}

function buildTransitions(scenario: ScenarioData, acte: ScenarioAct): string[] {
  const nextAct = scenario.actes.find(
    (candidate) => candidate.numero === acte.numero + 1,
  );

  if (!nextAct) {
    return [
      "Clore l'aventure sur la recompense, la question morale ou la scene de retour.",
    ];
  }

  return [
    `Transition naturelle vers l'acte ${nextAct.numero} : ${nextAct.titre}.`,
    "Si les joueurs partent dans une autre direction, recycler l'indice principal dans leur nouvelle piste.",
  ];
}

function buildPreparation(
  acte: ScenarioAct,
  rencontres: ScenarioData['rencontres'],
): string[] {
  const preparation = [
    `Relire le resume de l'acte ${acte.numero} et noter son objectif en une phrase.`,
  ];

  if (acte.options.length > 0) {
    preparation.push(
      'Preparer les reponses aux options que les joueurs verront en premier.',
    );
  }

  for (const rencontre of rencontres) {
    preparation.push(
      `Preparer ${rencontre.nombre} x ${rencontre.monsterId} pour : ${rencontre.contexte}`,
    );
  }

  return preparation;
}

function buildImproNotes(
  acte: ScenarioAct,
  rencontres: ScenarioData['rencontres'],
): string[] {
  const notes = [
    'Si le rythme baisse, faire arriver une information claire ou une menace visible.',
  ];

  if (rencontres.length > 0) {
    notes.push(
      'Le combat peut devenir une negociation, une fuite ou une embuscade selon les choix des joueurs.',
    );
  }

  if (acte.notesMJ) {
    notes.push(acte.notesMJ);
  }

  return notes;
}
