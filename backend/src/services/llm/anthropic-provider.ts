import Anthropic from '@anthropic-ai/sdk';
import type {
  ProposedWorldEntity,
  ScenarioChatResponse,
  ScenarioData,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { getNextScenarioStep } from '../../domain/scenario-state.js';
import { writeLlmErrorLog } from '../llm-error-log.js';
import type {
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
    const raw = await this.createJsonMessage({
      system: SCENARIO_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 2_400,
    });
    const parsed = await parseAndValidateLlmResponse({
      kind: 'scenario-chat',
      schema: scenarioResponseSchema,
      raw,
      prompt,
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

    return {
      reply: parsed.reply,
      suggestions: toTriple(parsed.suggestions ?? []),
      scenarioUpdate: parsed.scenarioUpdate as Partial<ScenarioData> | null,
      proposedEntities: normalizeProposedEntities(
        parsed.proposedEntities ?? [],
        'CREATION',
      ),
      stepComplete: parsed.stepComplete,
      nextStep: parsed.stepComplete ? expectedNextStep : null,
    };
  }

  async createSessionDebriefTurn(
    input: SessionDebriefInput,
  ): Promise<SessionDebriefResponse> {
    const prompt = buildDebriefUserPrompt(input);
    const raw = await this.createJsonMessage({
      system: DEBRIEF_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 1_600,
    });
    const parsed = await parseAndValidateLlmResponse({
      kind: 'session-debrief',
      schema: debriefResponseSchema,
      raw,
      prompt,
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
      suggestions: toTriple(parsed.suggestions ?? []),
      proposedEntities: normalizeProposedEntities(
        parsed.proposedEntities ?? [],
        'DEBRIEF',
      ),
      debriefComplete: parsed.debriefComplete,
    };
  }

  private async createJsonMessage(input: {
    system: string;
    user: string;
    maxTokens: number;
  }) {
    const message = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: input.maxTokens,
      temperature: 0.4,
      system: input.system,
      messages: [
        {
          role: 'user',
          content: input.user,
        },
      ],
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
}

const SCENARIO_SYSTEM_PROMPT = `Tu es Merlin, assistant de création d'aventures Chroniques Oubliées Mini pour une jeune MJ.
Tu dois aider à créer une aventure claire, jouable et bienveillante.

Contraintes produit :
- Réponds en français, ton simple et encourageant sans être bébé.
- Tu peux utiliser quelques emojis dans le texte de reply ou les suggestions si cela rend le ton plus vivant, sans en abuser.
- Une étape de création à la fois. Ne saute pas plusieurs étapes.
- Tu peux piocher dans le bestiaire CoF DRS fourni quand l'étape parle de l'antagoniste.
- Ne prépare pas les Battle Mats dans ce workflow : elles seront choisies dans les workflows d'acte et la todo.
- Les entités durables du monde doivent être proposées, pas ajoutées silencieusement.
- Après validation finale, le scénario doit contenir une sensation, un lieu riche, une quête structurée, un antagoniste/cause, un objectif héros, des actes, quelques PNJs, une durée et une fin.

Tu dois répondre uniquement avec un objet JSON valide, sans markdown, sans texte autour.
Schéma :
{
  "reply": "message court adressé à l'enfant",
  "suggestions": ["option 1", "option 2", "option 3"],
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
  "suggestions": ["option 1", "option 2", "option 3"],
  "proposedEntities": [
    { "type": "LIEU|PNJ|FACTION|EVENEMENT|REGLE", "name": "...", "description": "...", "tags": ["..."], "source": "DEBRIEF" }
  ],
  "debriefComplete": true ou false
}`;

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

async function parseAndValidateLlmResponse<T>(input: {
  kind: 'scenario-chat' | 'session-debrief';
  schema: z.ZodType<T>;
  raw: string;
  prompt: string;
  context: Record<string, unknown>;
}): Promise<T> {
  try {
    return input.schema.parse(parseJsonObject(input.raw));
  } catch (error) {
    await writeLlmErrorLog({
      kind: input.kind,
      provider: 'anthropic',
      model: env.ANTHROPIC_MODEL,
      error,
      prompt: input.prompt,
      rawResponse: input.raw,
      context: input.context,
    });

    throw error;
  }
}

function toTriple(values: string[]): [string, string, string] {
  return [values[0] ?? 'Continuer', values[1] ?? 'Changer un détail', values[2] ?? 'Aide-moi'];
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
