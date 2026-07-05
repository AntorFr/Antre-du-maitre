import Anthropic from '@anthropic-ai/sdk';
import type {
  ActDetail,
  ActDetailStep,
  ProposedWorldEntity,
  ScenarioChatResponse,
  ScenarioData,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';
import { z } from 'zod';

import { env } from '../../config/env.js';
import {
  getNextScenarioStep,
  normalizeScenarioData,
} from '../../domain/scenario-state.js';
import { writeLlmErrorLog } from '../llm-error-log.js';
import type {
  ActDetailInput,
  ActDetailTurnResponse,
  LlmProvider,
  ScenarioChatInput,
  SessionDebriefInput,
} from './types.js';

const proposedWorldEntitySchema = z.object({
  type: z.enum(['LIEU', 'PNJ', 'FACTION', 'EVENEMENT', 'REGLE']),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1_000),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  source: z.enum(['CREATION', 'DEBRIEF', 'MANUAL']),
});

const scenarioResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  scenarioUpdate: z.record(z.unknown()).nullable(),
  proposedEntities: z.array(proposedWorldEntitySchema).default([]),
  stepComplete: z.boolean(),
});

const debriefResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  proposedEntities: z.array(proposedWorldEntitySchema).default([]),
  debriefComplete: z.boolean(),
});

const gameplayTypeSchema = z.enum([
  'enquete',
  'combat',
  'exploration',
  'roleplay',
  'enigme',
  'fuite',
  'infiltration',
]);

const actDetailStepSchema = z.enum([
  'OBJECTIF',
  'VOIES',
  'MODULE',
  'SCENES',
  'TIMING',
  'VALIDATION',
]);

const actDetailSchema = z.object({
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

const actDetailResponseSchema = z.object({
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

const actDetailPatchResponseSchema = z.object({
  reply: z.string().min(1),
  suggestions: z.array(z.string().min(1)).default([]),
  changedSections: z.array(actDetailStepSchema).default([]),
  actUpdate: actDetailResponseSchema.shape.actUpdate,
  detailUpdate: z.record(z.unknown()).nullable().default(null),
});

export class AnthropicLlmProvider implements LlmProvider {
  private readonly client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    }

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  async createScenarioTurn(
    input: ScenarioChatInput,
  ): Promise<ScenarioChatResponse> {
    const expectedNextStep = getNextScenarioStep(input.scenario.currentStep);
    const prompt = buildScenarioUserPrompt(input, expectedNextStep);

    if (input.onReplyDelta) {
      const streamed = await this.streamScenarioJson({
        prompt,
        onReplyDelta: input.onReplyDelta,
      });

      if (streamed) {
        return buildScenarioResponse(streamed, expectedNextStep);
      }
      // Le streaming a échoué (JSON invalide) : on retombe sur l'appel
      // non-streaming, qui réessaie puis journalise en cas d'échec.
    }

    const parsed = await this.createValidatedJsonMessage({
      system: SCENARIO_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 2_400,
      kind: 'scenario-chat',
      schema: scenarioResponseSchema,
      context: {
        scenarioId: input.scenarioId,
        userId: input.userId,
        scenarioTitle: input.scenario.title,
        currentStep: input.scenario.currentStep,
        expectedNextStep,
        userMessage: input.message,
        voiceInput: input.voiceInput,
      },
    });

    return buildScenarioResponse(parsed, expectedNextStep);
  }

  /**
   * Variante streaming du tour de scénario : diffuse le texte de `reply` au
   * fil de la génération. Renvoie la charge utile validée, ou `null` si le
   * JSON final est invalide (l'appelant retombe alors sur le mode standard).
   */
  private async streamScenarioJson(input: {
    prompt: string;
    onReplyDelta: (replySoFar: string) => void;
  }): Promise<ScenarioResponsePayload | null> {
    try {
      const stream = this.client.messages.stream({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 2_400,
        temperature: 0.4,
        system: [
          {
            type: 'text',
            text: SCENARIO_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: input.prompt }],
      });

      let lastReply = '';

      stream.on('text', (_delta, snapshot) => {
        const reply = extractReplyValue(snapshot);

        if (reply !== null && reply !== lastReply) {
          lastReply = reply;
          input.onReplyDelta(reply);
        }
      });

      const finalMessage = await stream.finalMessage();
      const text = finalMessage.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return scenarioResponseSchema.parse(parseJsonObject(text));
    } catch {
      return null;
    }
  }

  async createActDetailTurn(
    input: ActDetailInput,
  ): Promise<ActDetailTurnResponse> {
    const act = input.scenario.actes.find(
      (candidate) => candidate.numero === input.actNumber,
    );

    if (!act?.detailsMJ) {
      throw new Error(`Unknown act: ${input.actNumber}`);
    }

    const prompt = buildActDetailUserPrompt(input);
    const parsed = await this.createValidatedJsonMessage({
      system: ACT_DETAIL_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 6_400,
      kind: 'act-detail',
      schema: actDetailPatchResponseSchema,
      context: {
        scenarioId: input.scenarioId,
        userId: input.userId,
        scenarioTitle: input.scenario.title,
        actNumber: input.actNumber,
        action: input.request.action,
        step: input.request.step,
        userMessage: input.request.message,
      },
    });
    const detail = normalizeActDetailForResponse(
      mergeDeep(act.detailsMJ, parsed.detailUpdate ?? {}) as ActDetail,
      input,
    );
    const scenario = normalizeScenarioData({
      ...input.scenario,
      actes: input.scenario.actes.map((candidate) =>
        candidate.numero === input.actNumber
          ? applyActUpdate(candidate, parsed.actUpdate, detail)
          : candidate,
      ),
    });

    return {
      reply: parsed.reply,
      suggestions: toSuggestionList(parsed.suggestions ?? []),
      changedSections: inferChangedActDetailSections({
        actUpdate: parsed.actUpdate,
        detailUpdate: parsed.detailUpdate,
        fallbackStep: detail.currentStep,
        parsedSections: parsed.changedSections ?? [],
      }),
      scenario,
    };
  }

  async createSessionDebriefTurn(
    input: SessionDebriefInput,
  ): Promise<SessionDebriefResponse> {
    const prompt = buildDebriefUserPrompt(input);
    const parsed = await this.createValidatedJsonMessage({
      system: DEBRIEF_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 1_600,
      kind: 'session-debrief',
      schema: debriefResponseSchema,
      context: {
        scenarioId: input.scenarioId,
        userId: input.userId,
        scenarioTitle: input.scenario.title,
        currentStep: input.scenario.currentStep,
        sessionNumber: input.sessionNumber,
        userMessage: input.message,
      },
    });

    return {
      reply: parsed.reply,
      suggestions: toSuggestionList(parsed.suggestions ?? []),
      proposedEntities: normalizeProposedEntities(
        parsed.proposedEntities ?? [],
        'DEBRIEF',
      ),
      debriefComplete: parsed.debriefComplete,
    };
  }

  private async createJsonMessage(input: {
    system: string;
    messages: Anthropic.MessageParam[];
    maxTokens: number;
  }) {
    const message = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: input.maxTokens,
      temperature: 0.4,
      // Le prompt système est volumineux et stable : on le met en cache
      // Anthropic pour réduire latence et coût des tours successifs.
      system: [
        {
          type: 'text',
          text: input.system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: input.messages,
    });

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Anthropic returned no text content.');
    }

    return text;
  }

  /**
   * Appelle le modèle et valide la réponse JSON contre un schéma. En cas de
   * JSON malformé ou non conforme, réessaie en renvoyant au modèle sa réponse
   * fautive avec une consigne de correction. N'écrit le log d'erreur qu'après
   * l'échec de toutes les tentatives.
   */
  private async createValidatedJsonMessage<T>(input: {
    system: string;
    user: string;
    maxTokens: number;
    schema: z.ZodType<T>;
    kind: 'scenario-chat' | 'act-detail' | 'session-debrief';
    context: Record<string, unknown>;
  }): Promise<T> {
    const maxAttempts = 3;
    let lastError: unknown;
    let lastRaw = '';
    let messages: Anthropic.MessageParam[] = [
      { role: 'user', content: input.user },
    ];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let raw: string;

      try {
        raw = await this.createJsonMessage({
          system: input.system,
          messages,
          maxTokens: input.maxTokens,
        });
      } catch (error) {
        // Erreur réseau/API : on réessaie avec la même requête.
        lastError = error;
        continue;
      }

      lastRaw = raw;

      try {
        return input.schema.parse(parseJsonObject(raw));
      } catch (error) {
        lastError = error;
        // On renvoie au modèle sa réponse fautive avec une consigne de
        // correction pour le tour suivant.
        messages = [
          { role: 'user', content: input.user },
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content:
              "Ta réponse précédente n'était pas un objet JSON valide et conforme au schéma demandé. Renvoie uniquement un objet JSON valide, sans texte ni markdown autour.",
          },
        ];
      }
    }

    await writeLlmErrorLog({
      kind: input.kind,
      provider: 'anthropic',
      model: env.ANTHROPIC_MODEL,
      error: lastError,
      prompt: input.user,
      rawResponse: lastRaw,
      context: input.context,
    });

    throw lastError;
  }
}

const SCENARIO_SYSTEM_PROMPT = `Tu es Merlin, assistant de création d'aventures Chroniques Oubliées Mini pour un(e) jeune MJ.
Tu dois aider à créer une aventure claire, jouable.

Contraintes produit :
- Réponds en français, ton simple et encourageant sans être bébé.
- Ton mature mais adapté aux jeunes : évite les sujets sensibles comme le sexe ou la drogue, sans infantiliser le contenu. La violence de type JDR est autorisée.
- Tu peux proposer jusqu'à 6 suggestions courtes quand cela aide l'enfant à choisir.
- Les suggestions doivent être concrètes et adaptées au scénario en cours : réutilise les noms, lieux, problèmes ou PNJs déjà créés quand c'est pertinent.
- Évite les suggestions génériques si tu peux proposer une option plus vivante liée à l'aventure.
- Tu peux utiliser quelques emojis dans le texte de reply ou les suggestions si cela rend le ton plus vivant, sans en abuser.
- Une étape de création à la fois. Ne saute pas plusieurs étapes.
- Si stepComplete=true, les suggestions doivent aider à répondre à la prochaine étape, pas répéter l'étape qui vient d'être terminée.
- Si stepComplete=true, termine toujours reply par une question claire pour introduire la prochaine étape.
- Tu peux piocher dans le bestiaire CoF DRS fourni quand l'étape parle de l'antagoniste.
- Ne prépare pas les Battle Mats dans ce workflow : elles seront choisies dans les workflows d'acte et la todo.
- Les entités durables du monde doivent être proposées, pas ajoutées silencieusement.
- Après validation finale, le scénario doit contenir une sensation, un lieu riche, une quête structurée, un antagoniste/cause, un objectif héros, des actes, quelques PNJs, une durée et une fin.

Tu dois répondre uniquement avec un objet JSON valide, sans markdown, sans texte autour.
Schéma :
{
  "reply": "message court adressé à l'enfant",
  "suggestions": ["option contextualisée 1", "option contextualisée 2", "option contextualisée 3"],
  "scenarioUpdate": { "champs partiels de ScenarioData à modifier" } ou null,
  "proposedEntities": [
    { "type": "LIEU|PNJ|FACTION|EVENEMENT|REGLE", "name": "...", "description": "...", "tags": ["..."], "source": "CREATION" }
  ],
  "stepComplete": true ou false
}`;

const DEBRIEF_SYSTEM_PROMPT = `Tu es Merlin, assistant de debrief après une session jouée de Chroniques Oubliées Mini.
Tu dois aider à transformer ce qui s'est passé en mémoire du monde.

Contraintes produit :
- Réponds en français, avec une synthèse courte.
- Tu peux utiliser quelques emojis si cela rend le debrief plus clair ou chaleureux, sans en abuser.
- Propose les changements durables du monde comme propositions à valider.
- N'invente pas de lourdes conséquences si le joueur ne les a pas données.
- Source des entités proposées : DEBRIEF.

Tu dois répondre uniquement avec un objet JSON valide, sans markdown, sans texte autour.
Schéma :
{
  "reply": "message court de synthèse",
  "suggestions": ["option 1", "option 2", "option 3", "option 4", "option 5"],
  "proposedEntities": [
    { "type": "LIEU|PNJ|FACTION|EVENEMENT|REGLE", "name": "...", "description": "...", "tags": ["..."], "source": "DEBRIEF" }
  ],
  "debriefComplete": true ou false
}`;

const ACT_DETAIL_SYSTEM_PROMPT = `Tu es Merlin, assistant de préparation MJ pour Chroniques Oubliées Mini.
Tu aides à détailler un acte déjà créé afin qu'il devienne jouable à table.

Contraintes produit :
- Réponds en français, avec un ton clair, concret et encourageant.
- Tu t'adresses au MJ, pas aux personnages.
- Respecte le scénario existant : ne change pas la quête globale, le lieu principal ou les autres actes.
- Le message utilisateur doit vraiment modifier le détail de l'acte quand il contient une demande.
- Les suggestions doivent changer selon le contenu de l'acte, l'étape courante et la demande utilisateur. Évite les suggestions génériques répétées.
- Prépare du matériel jouable : objectifs MJ, voies d'action, scènes, indices, conséquences, relances anti-blocage, timing.
- Reste compact : 2 à 3 voies, 2 à 3 scènes, 3 à 5 indices, 3 choix/conséquences maximum, 3 éléments de préparation maximum.
- Ne crée pas de contenu sensible inadapté à un jeune public. La violence de JDR héroïque reste autorisée.
- Si l'utilisateur valide, passe status à VALIDATED et currentStep à VALIDATION.
- Si l'utilisateur rouvre, passe status à IN_PROGRESS et currentStep à OBJECTIF.
- Sinon, currentStep est seulement le prochain focus utile pour l'interface : tu peux le garder, avancer, revenir en arrière ou sauter vers une autre section.
- Une même réponse peut modifier plusieurs sections si la demande utilisateur touche plusieurs sujets.
- changedSections doit lister toutes les sections réellement modifiées par actUpdate ou detailUpdate.
- Préserve les notes utilisateur existantes et ajoute le nouveau message dans notesUtilisateur s'il est non vide.

Tu dois répondre uniquement avec un objet JSON valide, sans markdown, sans texte autour.
Schéma :
{
  "reply": "message court expliquant ce qui a changé et la prochaine décision utile",
  "suggestions": ["suggestion contextualisée 1", "suggestion contextualisée 2", "suggestion contextualisée 3"],
  "changedSections": ["OBJECTIF", "VOIES", "MODULE"],
  "actUpdate": { "titre": "...", "description": "...", "type": "...", "options": ["..."], "notesMJ": "..." } ou null,
  "detailUpdate": { "champs partiels de ActDetail à modifier" } ou null
}

detailUpdate est un patch, pas un ActDetail complet :
- Mets uniquement les champs qui changent.
- Pour remplacer une liste entière, fournis la liste complète du champ concerné.
- Pour modifier l'étape, fournis "currentStep".
- Pour modifier status, fournis "status".
- Pour modifier objectif, fournis seulement les sous-champs utiles dans "objectif".
- Pour modifier moduleSpecialise, scènes, voies, indices, choixConsequences, transitions, preparation, notesImpro ou timing, fournis seulement ces champs.
- N'inclus jamais un champ inchangé.
- Réponse compacte obligatoire.`;

function buildScenarioUserPrompt(
  input: ScenarioChatInput,
  expectedNextStep: ScenarioChatResponse['nextStep'],
) {
  return `Message utilisateur : ${input.message}
Entrée vocale : ${input.voiceInput ? 'oui' : 'non'}
Étape actuelle : ${input.scenario.currentStep}
Prochaine étape attendue si l'étape est complète : ${expectedNextStep ?? 'FIN'}

Scénario actuel JSON :
${safeStringify(input.scenario)}

Résumé du monde persistant :
${input.worldSummary || 'Aucune entité validée pour le moment.'}

Candidats monstres CoF DRS disponibles pour cette étape :
${safeStringify(input.monsterCatalog)}

Règles par étape :
- STEP_1_SENSATION : choisir ambiance parmi mystere, humour, action, frisson, merveilleux, exploration. Question à poser : "Quelle sensation veux-tu donner à ton aventure ? Elle peut être mystérieuse, drôle, pleine d’action, un peu inquiétante, merveilleuse ou héroïque." Propose les choix : Mystère, Humour, Action, Frisson doux, Merveilleux, Exploration.
- STEP_2_LIEU : créer un lieu riche {nom, type, imageForte, particulariteMagique, dangerPrincipal, endroitSecret optionnel, description} et proposer une entité LIEU.
- STEP_3_QUETE : définir quete comme problème central structuré {phraseSimple, ceQuiNeVaPas, pourquoiCestGrave, pourquoiMaintenant, ceQuiArriveSiPersonneNagit}. L'urgence doit rester douce et adaptée aux enfants.
- STEP_4_ANTAGONISTE : définir antagoniste comme cause du problème {type, nom, description, nature, monsterId optionnel, motivation, ceQuIlVeut, faiblesseOuSolution}. Ne force pas un méchant classique : créature incomprise, malentendu ou magie déréglée sont bienvenus.
- STEP_5_OBJECTIF_HEROS : définir objectifDesHeros {phraseSimple, objectifVisible, signeDeReussite}.
- STEP_6_ACTES : produire 3 à 5 grandes étapes dans actes, avec roleDansLHistoire, description, lieu optionnel, obstaclePrincipal ou informationApprise, options et durée estimée. Ne détaille pas encore les mécaniques de combat ou les Battle Mats.
- STEP_7_PNJS : ajouter jusqu'à 3 PNJs importants dans pnjs. Chaque PNJ a nom, role parmi allie/neutre/ennemi, fonctionNarrative, attitude, motivation, particularite, informationOuService.
- STEP_8_DUREE : produire sessionning réaliste et équilibrer actes[].dureeEstimeeMin.
- STEP_9_FIN : produire fin {conditionDeVictoire, sceneDeResolution, recompense, petiteSurpriseFinale optionnel} et recopier recompense si utile.
- STEP_10_RECAP : finaliser notesMJ, ne pas inventer un nouveau scénario. Gameplay détaillé, rencontres, stats blocks et Battle Mats seront préparés ensuite dans les workflows d'acte et la todo.

Pour suggestions :
- Si l'étape est complète, propose 3 à 6 réponses possibles pour la prochaine étape attendue.
- Ces réponses doivent être contextualisées avec le scénario actuel quand il contient déjà un lieu, une quête, un antagoniste, des actes ou des PNJs.
- Exemple : après un lieu de forêt, préfère "L'Arbre-Cœur se meurt" à "Un lieu devient dangereux".

Si le message suffit, stepComplete=true. Sinon stepComplete=false et scenarioUpdate=null ou partiel minimal.`;
}

function buildDebriefUserPrompt(input: SessionDebriefInput) {
  return `Message debrief utilisateur : ${input.message}
Session jouée : ${input.sessionNumber}

Scénario JSON :
${safeStringify(input.scenario)}

Résumé du monde persistant :
${input.worldSummary || 'Aucune entité validée pour le moment.'}

Produis des proposedEntities uniquement pour les faits durables : nouveau PNJ important, lieu changé, événement historique, faction, règle de monde.`;
}

function buildActDetailUserPrompt(input: ActDetailInput) {
  const act = input.scenario.actes.find(
    (candidate) => candidate.numero === input.actNumber,
  );

  return `Action demandée : ${input.request.action}
Focus affiché dans l'interface : ${input.request.step ?? act?.detailsMJ?.currentStep ?? 'OBJECTIF'}
Message utilisateur : ${input.request.message?.trim() || '(aucun message)'}

Acte ciblé JSON :
${safeStringify(act)}

Scénario complet JSON :
${safeStringify(buildActDetailScenarioContext(input.scenario, input.actNumber))}

Règles de mise à jour :
- Retourne toujours un detailUpdate partiel et compact, jamais un ActDetail complet.
- Le focus affiché est un indice de contexte, pas une contrainte d'ordre. Réponds d'abord au message utilisateur.
- Retourne actUpdate quand le titre, le résumé visible, le type, les options ou les notes générales de l'acte doivent changer.
- Réutilise le détail actuel comme base et modifie-le selon le message utilisateur.
- Si le message utilisateur corrige ou contredit le pitch actuel de l'acte, réécris actUpdate.description et les sections detail impactées pour suivre la nouvelle prémisse. Ne conserve pas une ancienne accroche incompatible.
- Exemple : si l'acte disait "les héros arrivent au village" et que l'utilisateur dit "non, ils se réveillent dans une grange sans souvenir", actUpdate.description doit raconter le réveil dans la grange et l'objectif de découvrir pourquoi ils sont là.
- Si le message demande une piste, une conséquence, un port, un PNJ, une scène ou un indice, fais apparaître ce changement dans les sections appropriées, pas seulement dans notesImpro.
- Si la demande touche plusieurs sections, modifie toutes les sections utiles dans le même patch et liste-les dans changedSections.
- Défini currentStep comme le prochain focus utile pour le MJ : il peut rester identique, sauter une étape, revenir en arrière ou aller directement vers VALIDATION si c'est cohérent.
- Les suggestions doivent proposer des retouches concrètes liées à cet acte, par exemple ajouter une piste précise, durcir une conséquence, raccourcir une scène, choisir une alternative. Évite "Avancer" seul si tu peux proposer une action plus contextualisée.
- Pour ADVANCE sans message, choisis l'amélioration la plus utile dans l'acte actuel puis place currentStep sur le focus suivant le plus pertinent.
- Pour VALIDATE, ne réécris pas tout : stabilise, synthétise et valide.
- Pour REOPEN, conserve le détail mais rends-le modifiable depuis OBJECTIF.`;
}

function buildActDetailScenarioContext(
  scenario: ScenarioData,
  actNumber: number,
) {
  return {
    title: scenario.title,
    currentStep: scenario.currentStep,
    lieu: scenario.lieu,
    quete: scenario.quete,
    antagoniste: scenario.antagoniste,
    objectifDesHeros: scenario.objectifDesHeros,
    fin: scenario.fin,
    pnjs: scenario.pnjs.map((pnj) => ({
      nom: pnj.nom,
      role: pnj.role,
      fonctionNarrative: pnj.fonctionNarrative,
      motivation: pnj.motivation,
      informationOuService: pnj.informationOuService,
    })),
    actes: scenario.actes.map((acte) => ({
      numero: acte.numero,
      titre: acte.titre,
      description: acte.description,
      roleDansLHistoire: acte.roleDansLHistoire,
      dureeEstimeeMin: acte.dureeEstimeeMin,
      isTarget: acte.numero === actNumber,
    })),
  };
}

function normalizeActDetailForResponse(
  detail: ActDetail,
  input: ActDetailInput,
): ActDetail {
  const userMessage = input.request.message?.trim();
  const notesUtilisateur = dedupeStrings(
    userMessage
      ? [...detail.notesUtilisateur, userMessage]
      : detail.notesUtilisateur,
  );

  return {
    ...detail,
    voies: detail.voies.slice(0, 3),
    scenes: detail.scenes.slice(0, 4),
    indices: detail.indices.slice(0, 5),
    choixConsequences: detail.choixConsequences.slice(0, 4),
    transitions: detail.transitions.slice(0, 3),
    preparation: detail.preparation.slice(0, 4),
    notesImpro: dedupeStrings(detail.notesImpro).slice(0, 4),
    timing: {
      ...detail.timing,
      ordreConseille: detail.timing.ordreConseille.slice(0, 5),
      aCouperSiBesoin: detail.timing.aCouperSiBesoin.slice(0, 3),
      aGarderAbsolument: detail.timing.aGarderAbsolument.slice(0, 3),
    },
    notesUtilisateur,
  };
}

function applyActUpdate(
  act: ScenarioData['actes'][number],
  update:
    | {
        titre?: string;
        type?: string;
        roleDansLHistoire?: ScenarioData['actes'][number]['roleDansLHistoire'];
        description?: string;
        lieu?: string;
        obstaclePrincipal?: string;
        informationApprise?: string;
        options?: string[];
        dureeEstimeeMin?: number;
        pointDeCoupure?: boolean;
        notesMJ?: string;
      }
    | null
    | undefined,
  detail: ActDetail,
): ScenarioData['actes'][number] {
  if (!update) {
    return {
      ...act,
      detailsMJ: detail,
    };
  }

  return {
    ...act,
    ...update,
    numero: act.numero,
    titre: update.titre?.trim() || act.titre,
    type: update.type?.trim() || act.type,
    description: update.description?.trim() || act.description,
    options: update.options?.length ? update.options : act.options,
    dureeEstimeeMin: update.dureeEstimeeMin ?? act.dureeEstimeeMin,
    pointDeCoupure: update.pointDeCoupure ?? act.pointDeCoupure,
    notesMJ: update.notesMJ?.trim() || act.notesMJ,
    detailsMJ: detail,
  };
}

function inferChangedActDetailSections(input: {
  actUpdate: unknown;
  detailUpdate: unknown;
  fallbackStep: ActDetailStep;
  parsedSections: ActDetailStep[];
}): ActDetailStep[] {
  const sections = new Set<ActDetailStep>(input.parsedSections);
  const detailUpdate = isRecord(input.detailUpdate) ? input.detailUpdate : {};

  if (input.actUpdate) {
    sections.add('OBJECTIF');
  }

  if ('objectif' in detailUpdate) {
    sections.add('OBJECTIF');
  }

  if ('voies' in detailUpdate) {
    sections.add('VOIES');
  }

  if (
    'moduleSpecialise' in detailUpdate ||
    'indices' in detailUpdate ||
    'choixConsequences' in detailUpdate ||
    'transitions' in detailUpdate ||
    'preparation' in detailUpdate ||
    'notesImpro' in detailUpdate
  ) {
    sections.add('MODULE');
  }

  if ('scenes' in detailUpdate) {
    sections.add('SCENES');
  }

  if ('timing' in detailUpdate) {
    sections.add('TIMING');
  }

  if ('syntheseMJ' in detailUpdate || detailUpdate.status === 'VALIDATED') {
    sections.add('VALIDATION');
  }

  if (sections.size === 0) {
    sections.add(input.fallbackStep);
  }

  return Array.from(sections).slice(0, 6);
}

function mergeDeep(base: unknown, patch: unknown): unknown {
  if (!isRecord(base) || !isRecord(patch)) {
    return patch;
  }

  const merged: Record<string, unknown> = {
    ...base,
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    merged[key] =
      isRecord(merged[key]) && isRecord(value)
        ? mergeDeep(merged[key], value)
        : value;
  }

  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function parseJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error('Anthropic response was not valid JSON.');
  }
}

type ScenarioResponsePayload = z.input<typeof scenarioResponseSchema>;

function buildScenarioResponse(
  parsed: ScenarioResponsePayload,
  expectedNextStep: ScenarioChatResponse['nextStep'],
): ScenarioChatResponse {
  return {
    reply: parsed.reply,
    suggestions: toSuggestionList(parsed.suggestions ?? []),
    scenarioUpdate: parsed.scenarioUpdate as Partial<ScenarioData> | null,
    proposedEntities: normalizeProposedEntities(
      parsed.proposedEntities ?? [],
      'CREATION',
    ),
    stepComplete: parsed.stepComplete,
    nextStep: parsed.stepComplete ? expectedNextStep : null,
  };
}

/**
 * Extrait la valeur (potentiellement partielle) du champ `reply` d'un JSON en
 * cours de génération, en décodant les échappements. Renvoie `null` tant que
 * le champ n'a pas commencé. Robuste aux fins de chaîne incomplètes.
 */
function extractReplyValue(raw: string): string | null {
  const keyIndex = raw.indexOf('"reply"');

  if (keyIndex < 0) {
    return null;
  }

  let i = keyIndex + '"reply"'.length;

  while (i < raw.length && raw[i] !== ':') {
    i += 1;
  }
  if (i >= raw.length) {
    return null;
  }
  i += 1;

  while (i < raw.length && /\s/.test(raw[i] ?? '')) {
    i += 1;
  }
  if (raw[i] !== '"') {
    return null;
  }
  i += 1;

  let result = '';

  while (i < raw.length) {
    const char = raw[i];

    if (char === undefined) {
      break;
    }

    if (char === '\\') {
      const next = raw[i + 1];

      if (next === undefined) {
        break; // échappement incomplet en fin de flux
      }

      switch (next) {
        case 'n':
          result += '\n';
          break;
        case 't':
          result += '\t';
          break;
        case 'r':
          result += '\r';
          break;
        case 'b':
          result += '\b';
          break;
        case 'f':
          result += '\f';
          break;
        case '"':
          result += '"';
          break;
        case '\\':
          result += '\\';
          break;
        case '/':
          result += '/';
          break;
        case 'u': {
          const hex = raw.slice(i + 2, i + 6);

          if (hex.length < 4) {
            return result; // séquence unicode incomplète
          }

          const code = Number.parseInt(hex, 16);

          if (Number.isNaN(code)) {
            return result;
          }

          result += String.fromCharCode(code);
          i += 6;
          continue;
        }
        default:
          result += next;
      }

      i += 2;
      continue;
    }

    if (char === '"') {
      return result; // guillemet fermant de la valeur
    }

    result += char;
    i += 1;
  }

  return result;
}

function toSuggestionList(values: string[]): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 6);

  return normalized.length > 0
    ? normalized
    : ['Continuer', 'Changer un détail', 'Aide-moi'];
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ');

    if (!trimmed || seen.has(key)) continue;

    seen.add(key);
    deduped.push(trimmed);
  }

  return deduped;
}

function normalizeProposedEntities(
  entities: Array<Omit<ProposedWorldEntity, 'tags'> & { tags?: string[] }>,
  source: ProposedWorldEntity['source'],
): ProposedWorldEntity[] {
  return entities.map((entity) => ({
    ...entity,
    tags: entity.tags ?? [],
    source,
  }));
}

function safeStringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}
