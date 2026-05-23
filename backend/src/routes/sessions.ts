import type { SessionDebriefResponse } from '@antre-du-maitre/shared';
import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { normalizeScenarioData } from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { createLlmProvider } from '../services/llm/index.js';
import { buildWorldSummary } from '../services/world-summary.js';

const debriefRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
});

type DebriefHistoryEntry = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  suggestions?: string[];
};

function readDebriefHistory(value: Prisma.JsonValue | null): DebriefHistoryEntry[] {
  return Array.isArray(value) ? (value as DebriefHistoryEntry[]) : [];
}

export async function registerSessionRoutes(app: FastifyInstance) {
  const llmProvider = createLlmProvider();

  app.get(
    '/api/scenarios/:id/sessions',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
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
          message: 'You cannot access these sessions.',
        });
      }

      const sessions = await prisma.scenarioSession.findMany({
        where: {
          scenarioId: id,
        },
        orderBy: {
          number: 'asc',
        },
      });

      return {
        sessions,
      };
    },
  );

  app.post(
    '/api/scenarios/:id/sessions/:number/mark-played',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id, number } = request.params as { id: string; number: string };
      const sessionNumber = Number.parseInt(number, 10);

      if (!Number.isFinite(sessionNumber)) {
        return reply.code(400).send({
          message: 'Invalid session number.',
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
          message: 'You cannot update this session.',
        });
      }

      const existingSession = await prisma.scenarioSession.findUnique({
        where: {
          scenarioId_number: {
            scenarioId: scenario.id,
            number: sessionNumber,
          },
        },
      });

      if (!existingSession) {
        return reply.code(404).send({
          message: 'Session not found.',
        });
      }

      const session = await prisma.scenarioSession.update({
        where: {
          id: existingSession.id,
        },
        data: {
          status: 'PLAYED',
          playedAt: new Date(),
        },
      });

      await syncScenarioPlayStatus(scenario.id);

      return {
        session,
      };
    },
  );

  app.post(
    '/api/scenarios/:id/sessions/:number/debrief',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id, number } = request.params as { id: string; number: string };
      const sessionNumber = Number.parseInt(number, 10);
      const parsed = debriefRequestSchema.safeParse(request.body);

      if (!Number.isFinite(sessionNumber)) {
        return reply.code(400).send({
          message: 'Invalid session number.',
        });
      }

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid debrief payload.',
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
          message: 'You cannot debrief this session.',
        });
      }

      const session = await prisma.scenarioSession.findUnique({
        where: {
          scenarioId_number: {
            scenarioId: scenario.id,
            number: sessionNumber,
          },
        },
      });

      if (!session) {
        return reply.code(404).send({
          message: 'Session not found.',
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

      const response = await llmProvider.createSessionDebriefTurn({
        message: parsed.data.message,
        scenario: normalizeScenarioData(scenario.data),
        sessionNumber,
        worldSummary: buildWorldSummary(world.entities),
      });

      const updatedSession = await persistDebriefTurn({
        scenarioId: scenario.id,
        worldId: world.id,
        sessionId: session.id,
        sessionNumber,
        currentHistory: session.debriefHistory,
        userMessage: parsed.data.message,
        response,
      });

      await syncScenarioPlayStatus(scenario.id);

      return {
        ...response,
        session: updatedSession,
      };
    },
  );
}

async function persistDebriefTurn(input: {
  scenarioId: string;
  worldId: string;
  sessionId: string;
  sessionNumber: number;
  currentHistory: Prisma.JsonValue | null;
  userMessage: string;
  response: SessionDebriefResponse;
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const nextHistory = [
    ...readDebriefHistory(input.currentHistory),
    {
      role: 'user' as const,
      content: input.userMessage,
      createdAt: nowIso,
    },
    {
      role: 'assistant' as const,
      content: input.response.reply,
      suggestions: input.response.suggestions,
      createdAt: nowIso,
    },
  ];

  return prisma.$transaction(async (tx) => {
    const session = await tx.scenarioSession.update({
      where: {
        id: input.sessionId,
      },
      data: {
        debriefHistory: nextHistory as unknown as Prisma.InputJsonValue,
        ...(input.response.debriefComplete
          ? {
              status: 'PLAYED' as const,
              playedAt: now,
              debriefSummary: {
                completedAt: nowIso,
                lastMessage: input.userMessage,
              },
            }
          : {}),
      },
    });

    if (input.response.proposedEntities.length > 0) {
      await tx.worldEntityProposal.createMany({
        data: input.response.proposedEntities.map((entity) => ({
          worldId: input.worldId,
          scenarioId: input.scenarioId,
          sessionId: input.sessionId,
          type: entity.type,
          name: entity.name,
          description: entity.description,
          tags: entity.tags,
          source: entity.source,
        })),
      });
    }

    return session;
  });
}

async function syncScenarioPlayStatus(scenarioId: string) {
  const sessions = await prisma.scenarioSession.findMany({
    where: {
      scenarioId,
    },
    select: {
      status: true,
    },
  });

  if (sessions.length === 0) return;

  const hasPlayedSession = sessions.some((session) => session.status === 'PLAYED');
  const allSessionsPlayed = sessions.every((session) => session.status === 'PLAYED');

  if (!hasPlayedSession) return;

  await prisma.scenario.update({
    where: {
      id: scenarioId,
    },
    data: {
      status: allSessionsPlayed ? 'PLAYED' : 'IN_PROGRESS',
    },
  });
}
