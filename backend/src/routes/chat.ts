import {
  SCENARIO_SECTIONS,
  computeScenarioSections,
  deriveScenarioStep,
  isScenarioReadyToValidate,
  type ScenarioChatHistoryEntry,
  type ScenarioChatResponse,
  type ScenarioData,
} from '@antre-du-maitre/shared';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { normalizeScenarioData } from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { ensureActDetails } from '../services/act-details.js';
import { createLlmProvider } from '../services/llm/index.js';
import type { LlmProvider } from '../services/llm/types.js';
import { searchMonsters } from '../services/monsters.js';
import { generateMockTodoItems } from '../services/todo.js';
import { buildWorldSummary } from '../services/world-summary.js';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  voiceInput: z.boolean().default(false),
  focusSection: z.enum(SCENARIO_SECTIONS).optional(),
});

function readChatHistory(value: Prisma.JsonValue): ScenarioChatHistoryEntry[] {
  return Array.isArray(value)
    ? (value as unknown as ScenarioChatHistoryEntry[])
    : [];
}

type ScenarioChatResult =
  | { kind: 'ok'; response: ScenarioChatResponse }
  | { kind: 'error'; status: number; body: unknown };

export async function registerChatRoutes(app: FastifyInstance) {
  const llmProvider = createLlmProvider();

  app.post(
    '/api/scenarios/:id/chat',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const result = await runScenarioChat(llmProvider, request);

      if (result.kind === 'error') {
        return reply.code(result.status).send(result.body);
      }

      return result.response;
    },
  );

  // Variante SSE : diffuse le texte de Merlin au fil de l'eau, puis envoie la
  // réponse finale structurée. La persistance est identique au POST classique.
  app.post(
    '/api/scenarios/:id/chat/stream',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      reply.hijack();
      const raw = reply.raw;

      raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        // CORS : on reflète l'origine car le hijack court-circuite le plugin.
        'Access-Control-Allow-Origin': request.headers.origin ?? '*',
        Vary: 'Origin',
      });

      const send = (event: string, data: unknown) => {
        raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const result = await runScenarioChat(
          llmProvider,
          request,
          (replySoFar) => send('delta', { reply: replySoFar }),
        );

        if (result.kind === 'error') {
          send('error', result.body);
        } else {
          send('done', result.response);
        }
      } catch (error) {
        request.log.error(error);
        send('error', {
          message: 'Merlin ne peut pas répondre pour le moment.',
        });
      } finally {
        raw.end();
      }
    },
  );
}

async function runScenarioChat(
  llmProvider: LlmProvider,
  request: FastifyRequest,
  onReplyDelta?: (replySoFar: string) => void,
): Promise<ScenarioChatResult> {
  const { id } = request.params as { id: string };
  const parsed = chatRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return {
          kind: 'error',
          status: 400,
          body: {
            message: 'Invalid chat payload.',
            issues: parsed.error.issues,
          },
        };
      }

      const scenario = await prisma.scenario.findUnique({
        where: {
          id,
        },
      });

      if (!scenario) {
        return {
          kind: 'error',
          status: 404,
          body: { message: 'Scenario not found.' },
        };
      }

      if (!canAccessOwnedResource(request.user, scenario.userId)) {
        return {
          kind: 'error',
          status: 403,
          body: { message: 'You cannot access this scenario.' },
        };
      }

      const world = await prisma.world.findUnique({
        where: {
          userId: scenario.userId,
        },
        include: {
          entities: true,
        },
      });

      if (!world) {
        return {
          kind: 'error',
          status: 409,
          body: { message: 'Scenario owner has no world.' },
        };
      }

      const currentData = normalizeScenarioData(scenario.data);

      // Raccourci sans LLM : le scénario est complet et l'utilisateur envoie
      // un message de validation explicite.
      if (
        isScenarioReadyToValidate(currentData) &&
        isScenarioValidationMessage(parsed.data.message)
      ) {
        const persistedData = ensureActDetails({
          ...currentData,
          currentStep: deriveScenarioStep(currentData),
        });
        const now = new Date().toISOString();
        const responseReply =
          "C'est validé, ton aventure est prête à jouer ! Tu peux maintenant préparer les actes, les rencontres et les aides de partie.";
        const nextHistory = [
          ...readChatHistory(scenario.chatHistory),
          {
            role: 'user' as const,
            content: parsed.data.message,
            voiceInput: parsed.data.voiceInput,
            createdAt: now,
          },
          {
            role: 'assistant' as const,
            content: responseReply,
            suggestions: ['Voir la fiche', 'Préparer la partie'],
            createdAt: now,
          },
        ];

        await prisma.$transaction(async (tx) => {
          await tx.scenario.update({
            where: {
              id: scenario.id,
            },
            data: {
              data: persistedData as unknown as Prisma.InputJsonValue,
              chatHistory: nextHistory as unknown as Prisma.InputJsonValue,
              status: 'COMPLETE',
            },
          });

          await tx.scenarioSession.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          if (persistedData.sessionning) {
            await tx.scenarioSession.createMany({
              data: persistedData.sessionning.sessions.map((session) => ({
                scenarioId: scenario.id,
                number: session.numero,
                plannedActes: session.actesInclus,
                plannedDuration: session.dureeEstimeeMin,
                recapHook: session.resumeAccroche,
              })),
            });
          }

          await tx.todoItem.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          await tx.todoItem.createMany({
            data: generateMockTodoItems(persistedData).map((item) => ({
              scenarioId: scenario.id,
              ...item,
            })),
          });
        });

        return {
          kind: 'ok',
          response: {
            reply: responseReply,
            suggestions: ['Voir la fiche', 'Préparer la partie'],
            scenarioUpdate: null,
            proposedEntities: [],
            changedSections: [],
            focusSection: null,
            readyToValidate: true,
            validationRequested: true,
          },
        };
      }

      const monsterCatalog = await buildMonsterCatalogForTurn({
        userMessage: parsed.data.message,
        scenario: currentData,
        focusSection: parsed.data.focusSection,
      });
      const response = await llmProvider.createScenarioTurn({
        message: parsed.data.message,
        voiceInput: parsed.data.voiceInput,
        focusSection: parsed.data.focusSection,
        scenarioId: scenario.id,
        userId: scenario.userId,
        scenario: currentData,
        worldSummary: buildWorldSummary(world.entities),
        monsterCatalog,
        onReplyDelta,
      });

      const mergedData: ScenarioData = normalizeScenarioData({
        ...currentData,
        ...(response.scenarioUpdate ?? {}),
      });
      const nextData: ScenarioData = {
        ...mergedData,
        currentStep: deriveScenarioStep(mergedData),
      };
      const readyToValidate = isScenarioReadyToValidate(nextData);
      const isCompletingScenario =
        response.validationRequested && readyToValidate;
      const persistedData = isCompletingScenario
        ? ensureActDetails(nextData)
        : nextData;

      const now = new Date().toISOString();
      const nextHistory = [
        ...readChatHistory(scenario.chatHistory),
        {
          role: 'user' as const,
          content: parsed.data.message,
          voiceInput: parsed.data.voiceInput,
          createdAt: now,
        },
        {
          role: 'assistant' as const,
          content: response.reply,
          suggestions: response.suggestions,
          createdAt: now,
        },
      ];

      await prisma.$transaction(async (tx) => {
        await tx.scenario.update({
          where: {
            id: scenario.id,
          },
          data: {
            data: persistedData as unknown as Prisma.InputJsonValue,
            chatHistory: nextHistory as unknown as Prisma.InputJsonValue,
            ...(isCompletingScenario ? { status: 'COMPLETE' } : {}),
          },
        });

        if (response.proposedEntities.length > 0) {
          await tx.worldEntityProposal.createMany({
            data: response.proposedEntities.map((entity) => ({
              worldId: world.id,
              scenarioId: scenario.id,
              type: entity.type,
              name: entity.name,
              description: entity.description,
              tags: entity.tags,
              source: entity.source,
            })),
          });
        }

        if (isCompletingScenario) {
          await tx.scenarioSession.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          if (persistedData.sessionning) {
            await tx.scenarioSession.createMany({
              data: persistedData.sessionning.sessions.map((session) => ({
                scenarioId: scenario.id,
                number: session.numero,
                plannedActes: session.actesInclus,
                plannedDuration: session.dureeEstimeeMin,
                recapHook: session.resumeAccroche,
              })),
            });
          }

          await tx.todoItem.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          await tx.todoItem.createMany({
            data: generateMockTodoItems(persistedData).map((item) => ({
              scenarioId: scenario.id,
              ...item,
            })),
          });
        }
      });

      const scenarioPatch = {
        ...(response.scenarioUpdate ?? {}),
        ...(nextData.currentStep !== currentData.currentStep
          ? { currentStep: nextData.currentStep }
          : {}),
      };

      return {
        kind: 'ok',
        response: {
          ...response,
          readyToValidate,
          scenarioUpdate:
            Object.keys(scenarioPatch).length > 0 ? scenarioPatch : null,
        },
      };
}

function isScenarioValidationMessage(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');

  if (
    normalized.includes('ajust') ||
    normalized.includes('modifier') ||
    normalized.includes('changer') ||
    normalized.includes('avant le recap')
  ) {
    return false;
  }

  return (
    [
      'valider',
      'valide',
      'ok',
      'oui',
      "c'est bon",
      'cest bon',
      'terminer',
      'finaliser',
    ].includes(normalized) ||
    normalized.startsWith('oui ') ||
    normalized.includes('recap complet') ||
    normalized.includes('montre-moi le recap') ||
    normalized.includes('montre moi le recap') ||
    normalized.includes('valider le scenario') ||
    normalized.includes('finaliser le scenario')
  );
}

async function buildMonsterCatalogForTurn(input: {
  userMessage: string;
  scenario: ScenarioData;
  focusSection?: string;
}) {
  // Le bestiaire n'est fourni que quand l'antagoniste est encore en jeu :
  // section incomplète, ou focus explicite de l'utilisateur dessus.
  const antagonisteStatus = computeScenarioSections(input.scenario).ANTAGONISTE;

  if (antagonisteStatus === 'COMPLETE' && input.focusSection !== 'ANTAGONISTE') {
    return [];
  }

  const query = input.userMessage.trim();
  const matchingMonsters = query
    ? await searchMonsters({
        query,
        limit: 40,
      })
    : [];

  if (matchingMonsters.length > 0) {
    return matchingMonsters;
  }

  return searchMonsters({
    limit: 40,
  });
}
