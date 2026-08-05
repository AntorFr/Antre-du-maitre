import { z } from 'zod';

// Schémas Zod des réponses JSON attendues du LLM. Partagés par tous les
// providers (Anthropic API directe, Claude Agent SDK) : le contrat est le
// même, seul le transport change.

export const proposedWorldEntitySchema = z.object({
  type: z.enum(['LIEU', 'PNJ', 'FACTION', 'EVENEMENT', 'REGLE']),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1_000),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  source: z.enum(['CREATION', 'DEBRIEF', 'MANUAL']),
});

export const scenarioResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  scenarioUpdate: z.record(z.string(), z.unknown()).nullable().default(null),
  proposedEntities: z.array(proposedWorldEntitySchema).default([]),
  // Chaîne libre tolérée (le modèle invente parfois un nom hors enum) : la
  // valeur est filtrée contre SCENARIO_SECTIONS au point d'appel, avec repli
  // sur la première section incomplète.
  focusSection: z.string().nullable().default(null),
  validationRequested: z.boolean().default(false),
});

export type ScenarioResponsePayload = z.input<typeof scenarioResponseSchema>;

export const debriefResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  proposedEntities: z.array(proposedWorldEntitySchema).default([]),
  debriefComplete: z.boolean(),
});

export const gameplayTypeSchema = z.enum([
  'enquete',
  'combat',
  'exploration',
  'roleplay',
  'enigme',
  'fuite',
  'infiltration',
]);

export const actDetailStepSchema = z.enum([
  'OBJECTIF',
  'VOIES',
  'MODULE',
  'SCENES',
  'TIMING',
  'VALIDATION',
]);

export const actDetailSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'VALIDATED']),
  currentStep: actDetailStepSchema,
  objectif: z.object({
    principal: z.string().min(1),
    enjeu: z.string().min(1),
    typePrincipal: gameplayTypeSchema,
    typesSecondaires: z.array(gameplayTypeSchema).default([]),
    dureeCibleMin: z.number().int().positive(),
    reussiteComplete: z.string().min(1),
    reussitePartielle: z.string().min(1),
    echecInteressant: z.string().min(1),
    bonusOptionnel: z.string().min(1),
  }),
  voies: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: gameplayTypeSchema,
        actionJoueurs: z.string().min(1),
        gain: z.string().min(1),
        risque: z.string().min(1),
        preparationMJ: z.array(z.string().min(1)).default([]),
      }),
    )
    .min(1),
  moduleSpecialise: z.object({
    type: gameplayTypeSchema,
    focus: z.string().min(1),
    elements: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
        }),
      )
      .min(1),
  }),
  scenes: z
    .array(
      z.object({
        titre: z.string().min(1),
        type: gameplayTypeSchema.optional(),
        statut: z
          .enum(['OBLIGATOIRE_SOUPLE', 'OPTIONNELLE', 'CONSEQUENCE'])
          .optional(),
        objectifMJ: z.string().min(1),
        deroule: z.string().min(1),
        relanceAntiBlocage: z.string().min(1).optional(),
      }),
    )
    .min(1),
  indices: z.array(z.string().min(1)).default([]),
  choixConsequences: z.array(z.string().min(1)).default([]),
  transitions: z.array(z.string().min(1)).default([]),
  preparation: z.array(z.string().min(1)).default([]),
  notesImpro: z.array(z.string().min(1)).default([]),
  timing: z.object({
    ordreConseille: z.array(z.string().min(1)).min(1),
    versionCourte: z.string().min(1),
    versionStandard: z.string().min(1),
    versionLongue: z.string().min(1),
    aCouperSiBesoin: z.array(z.string().min(1)).default([]),
    aGarderAbsolument: z.array(z.string().min(1)).default([]),
  }),
  syntheseMJ: z.string().min(1),
  notesUtilisateur: z.array(z.string().min(1)).default([]),
});

export const actDetailResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  actUpdate: z
    .object({
      titre: z.string().min(1).max(120).optional(),
      type: z.string().min(1).max(80).optional(),
      roleDansLHistoire: z
        .enum([
          'depart',
          'exploration',
          'probleme',
          'revelation',
          'confrontation',
          'resolution',
        ])
        .optional(),
      description: z.string().min(1).max(2_000).optional(),
      lieu: z.string().min(1).max(120).optional(),
      obstaclePrincipal: z.string().min(1).max(500).optional(),
      informationApprise: z.string().min(1).max(500).optional(),
      options: z.array(z.string().min(1).max(160)).min(1).max(8).optional(),
      dureeEstimeeMin: z.number().int().positive().optional(),
      pointDeCoupure: z.boolean().optional(),
      notesMJ: z.string().min(1).max(1_000).optional(),
    })
    .nullable()
    .default(null),
  detail: actDetailSchema,
});

export const actDetailPatchResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  // Le modèle nomme souvent la *section* qu'il a modifiée (INDICES, CHOIX,
  // CHOIX_CONSEQUENCES…) plutôt qu'une des 6 étapes du workflow. On accepte donc
  // n'importe quelle chaîne ici — au lieu de faire échouer tout le parse (et de
  // jeter un detailUpdate parfaitement valide) — puis on filtre les valeurs
  // hors-enum au point d'appel. Les sections réellement modifiées sont de toute
  // façon re-déduites du detailUpdate par inferChangedActDetailSections.
  changedSections: z.array(z.string()).default([]),
  actUpdate: actDetailResponseSchema.shape.actUpdate,
  detailUpdate: z.record(z.string(), z.unknown()).nullable().default(null),
});
