import type {
  ScenarioChatHistoryEntry,
  ScenarioData,
} from '@antre-du-maitre/shared';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import {
  canTransitionToScenarioStep,
  normalizeScenarioData,
} from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { createLlmProvider } from '../services/llm/index.js';
import { searchMonsters } from '../services/monsters.js';
import { generateMockTodoItems } from '../services/todo.js';
import { buildWorldSummary } from '../services/world-summary.js';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  voiceInput: z.boolean().default(false),
});

function readChatHistory(value: Prisma.JsonValue): ScenarioChatHistoryEntry[] {
  return Array.isArray(value)
    ? (value as unknown as ScenarioChatHistoryEntry[])
    : [];
}

export async function registerChatRoutes(app: FastifyInstance) {
  const llmProvider = createLlmProvider();

  app.post(
    '/api/scenarios/:id/chat',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = chatRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid chat payload.',
          issues: parsed.error.issues,
        });
      }

      const scenario = await prisma.scenario.findUnique({
        where: {
          id,
        },
      });

      if (!scenario) {
        return reply.code(404).send({
          message: 'Scenario not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, scenario.userId)) {
        return reply.code(403).send({
          message: 'You cannot access this scenario.',
        });
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
        return reply.code(409).send({
          message: 'Scenario owner has no world.',
        });
      }

      const currentData = normalizeScenarioData(scenario.data);
      const monsterCatalog = await buildMonsterCatalogForTurn({
        userMessage: parsed.data.message,
        currentStep: currentData.currentStep,
      });
      const response = await llmProvider.createScenarioTurn({
        message: parsed.data.message,
        voiceInput: parsed.data.voiceInput,
        scenarioId: scenario.id,
        userId: scenario.userId,
        scenario: currentData,
        worldSummary: buildWorldSummary(world.entities),
        monsterCatalog,
      });

      if (
        response.stepComplete &&
        !canTransitionToScenarioStep(currentData.currentStep, response.nextStep)
      ) {
        request.log.warn(
          {
            scenarioId: scenario.id,
            currentStep: currentData.currentStep,
            proposedNextStep: response.nextStep,
          },
          'Rejected invalid LLM step transition.',
        );

        return reply.code(502).send({
          message: 'Invalid step transition returned by LLM.',
        });
      }

      const nextData: ScenarioData = normalizeScenarioData({
        ...currentData,
        ...(response.scenarioUpdate ?? {}),
        currentStep:
          response.stepComplete && response.nextStep
            ? response.nextStep
            : currentData.currentStep,
      });

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
            data: nextData as unknown as Prisma.InputJsonValue,
            chatHistory: nextHistory as unknown as Prisma.InputJsonValue,
            ...(response.stepComplete &&
            currentData.currentStep === 'STEP_10_RECAP' &&
            response.nextStep === null
              ? { status: 'COMPLETE' }
              : {}),
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

        if (
          response.stepComplete &&
          currentData.currentStep === 'STEP_10_RECAP' &&
          response.nextStep === null
        ) {
          await tx.scenarioSession.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          if (nextData.sessionning) {
            await tx.scenarioSession.createMany({
              data: nextData.sessionning.sessions.map((session) => ({
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
            data: generateMockTodoItems(nextData).map((item) => ({
              scenarioId: scenario.id,
              ...item,
            })),
          });
        }
      });

      const scenarioPatch = {
        ...(response.scenarioUpdate ?? {}),
        ...(response.stepComplete && response.nextStep
          ? { currentStep: response.nextStep }
          : {}),
      };

      return {
        ...response,
        scenarioUpdate:
          Object.keys(scenarioPatch).length > 0 ? scenarioPatch : null,
      };
    },
  );
}

async function buildMonsterCatalogForTurn(input: {
  userMessage: string;
  currentStep: ScenarioData['currentStep'];
}) {
  if (
    input.currentStep !== 'STEP_4_MECHANT' &&
    input.currentStep !== 'STEP_8_RENCONTRES'
  ) {
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
