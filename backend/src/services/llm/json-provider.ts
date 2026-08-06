import {
  computeScenarioSections,
  type ActDetail,
  type ActDetailStep,
  type ScenarioChatResponse,
  type ScenarioData,
  type SessionDebriefResponse,
} from '@antre-du-maitre/shared';
import { z } from 'zod';

import { normalizeScenarioData } from '../../domain/scenario-state.js';
import {
  composeScenarioChatResponse,
  normalizeProposedEntities,
  toSuggestionList,
} from './scenario-response.js';
import { writeLlmErrorLog } from '../llm-error-log.js';
import { extractReplyValue, parseJsonObject } from './json.js';
import {
  buildActDetailSystemPrompt,
  buildActDetailUserPrompt,
  buildDebriefSystemPrompt,
  buildDebriefUserPrompt,
  buildScenarioSystemPrompt,
  buildScenarioUserPrompt,
  resolveGameSystem,
} from './prompts.js';
import {
  actDetailPatchResponseSchema,
  actDetailStepSchema,
  debriefResponseSchema,
  scenarioResponseSchema,
} from './schemas.js';
import type { LlmTextTransport, LlmTransportMessage } from './transport.js';
import type {
  ActDetailInput,
  ActDetailTurnResponse,
  LlmProvider,
  ScenarioChatInput,
  SessionDebriefInput,
} from './types.js';

/**
 * Provider LLM générique : construit les prompts, appelle un transport texte
 * (API Anthropic directe, Claude Agent SDK…) et valide les réponses JSON.
 */
export class JsonLlmProvider implements LlmProvider {
  constructor(private readonly transport: LlmTextTransport) {}

  async createScenarioTurn(
    input: ScenarioChatInput,
  ): Promise<ScenarioChatResponse> {
    const sections = computeScenarioSections(input.scenario);
    const prompt = buildScenarioUserPrompt(input, sections);

    const parsed = await this.createValidatedJsonMessage({
      system: buildScenarioSystemPrompt(resolveGameSystem(input.scenario)),
      user: prompt,
      maxTokens: 4_000,
      kind: 'scenario-chat',
      schema: scenarioResponseSchema,
      onReplyDelta: input.onReplyDelta,
      context: {
        scenarioId: input.scenarioId,
        userId: input.userId,
        scenarioTitle: input.scenario.title,
        sections,
        focusSection: input.focusSection,
        userMessage: input.message,
        voiceInput: input.voiceInput,
      },
    });

    return composeScenarioChatResponse(
      {
        reply: parsed.reply,
        suggestions: parsed.suggestions ?? [],
        scenarioUpdate: parsed.scenarioUpdate as Partial<ScenarioData> | null,
        proposedEntities: normalizeProposedEntities(
          parsed.proposedEntities ?? [],
          'CREATION',
        ),
        focusSection: parsed.focusSection,
        validationRequested: parsed.validationRequested,
      },
      input.scenario,
    );
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
      system: buildActDetailSystemPrompt(resolveGameSystem(input.scenario)),
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
        parsedSections: (parsed.changedSections ?? []).filter(
          (section): section is ActDetailStep =>
            (actDetailStepSchema.options as readonly string[]).includes(section),
        ),
      }),
      scenario,
    };
  }

  async createSessionDebriefTurn(
    input: SessionDebriefInput,
  ): Promise<SessionDebriefResponse> {
    const prompt = buildDebriefUserPrompt(input);
    const parsed = await this.createValidatedJsonMessage({
      system: buildDebriefSystemPrompt(resolveGameSystem(input.scenario)),
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

  /**
   * Appelle le modèle et valide la réponse JSON contre un schéma. En cas de
   * JSON malformé ou non conforme, réessaie en renvoyant au modèle sa réponse
   * fautive avec une consigne de correction. N'écrit le log d'erreur qu'après
   * l'échec de toutes les tentatives.
   *
   * Si `onReplyDelta` est fourni, la première tentative diffuse le champ
   * `reply` au fil de la génération (les tentatives de correction restent
   * silencieuses : le texte déjà diffusé sera remplacé par la réponse finale).
   */
  private async createValidatedJsonMessage<T>(input: {
    system: string;
    user: string;
    maxTokens: number;
    schema: z.ZodType<T>;
    kind: 'scenario-chat' | 'act-detail' | 'session-debrief';
    context: Record<string, unknown>;
    onReplyDelta?: (replySoFar: string) => void;
  }): Promise<T> {
    const maxAttempts = 3;
    let lastError: unknown;
    let lastRaw = '';
    let messages: LlmTransportMessage[] = [
      { role: 'user', content: input.user },
    ];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let raw: string;
      const onReplyDelta = attempt === 1 ? input.onReplyDelta : undefined;
      let lastReply = '';

      try {
        raw = await this.transport.complete({
          system: input.system,
          messages,
          maxTokens: input.maxTokens,
          onTextDelta: onReplyDelta
            ? (rawTextSoFar) => {
                const reply = extractReplyValue(rawTextSoFar);

                if (reply !== null && reply !== lastReply) {
                  lastReply = reply;
                  onReplyDelta(reply);
                }
              }
            : undefined,
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
      provider: this.transport.name,
      model: this.transport.model,
      error: lastError,
      prompt: input.user,
      rawResponse: lastRaw,
      context: input.context,
    });

    throw lastError;
  }
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
