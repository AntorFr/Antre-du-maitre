import { GAME_SYSTEMS } from '@antre-du-maitre/shared';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import {
  createEmptyScenarioData,
  normalizeScenarioData,
} from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import {
  ensureActDetails,
  needsActDetails,
} from '../services/act-details.js';
import { createLlmProvider } from '../services/llm/index.js';
import { renderScenarioPdf } from '../services/scenario-pdf.js';
import { toScenarioDetail, toScenarioSummary } from '../utils/scenarios.js';

const createScenarioSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  gameSystem: z.enum(GAME_SYSTEMS).optional(),
});
const actDetailChatSchema = z.object({
  message: z.string().trim().max(2_000).optional(),
  step: z
    .enum(['OBJECTIF', 'VOIES', 'MODULE', 'SCENES', 'TIMING', 'VALIDATION'])
    .optional(),
  action: z.enum(['ADVANCE', 'VALIDATE', 'REOPEN']),
});

export async function registerScenarioRoutes(app: FastifyInstance) {
  const llmProvider = createLlmProvider();

  app.get(
    '/api/scenarios',
    {
      preHandler: authenticate,
    },
    async (request) => {
      const scenarios = await prisma.scenario.findMany({
        where: {
          userId: request.user.sub,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return {
        scenarios: scenarios.map(toScenarioSummary),
      };
    },
  );

  app.post(
    '/api/scenarios',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = createScenarioSchema.safeParse(request.body ?? {});

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid scenario payload.',
          issues: parsed.error.issues,
        });
      }

      const title = parsed.data.title ?? 'Nouvelle aventure';
      const data = createEmptyScenarioData(parsed.data.gameSystem);
      data.title = title;

      const scenario = await prisma.scenario.create({
        data: {
          userId: request.user.sub,
          title,
          data: data as unknown as Prisma.InputJsonValue,
          chatHistory: [] as Prisma.InputJsonValue,
        },
      });

      return reply.code(201).send({
        scenario: toScenarioSummary(scenario),
      });
    },
  );

  app.get(
    '/api/scenarios/:id/export.pdf',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const scenario = await prisma.scenario.findUnique({
        where: {
          id,
        },
        include: {
          sessions: {
            orderBy: {
              number: 'asc',
            },
          },
          todoItems: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });

      if (!scenario) {
        return reply.code(404).send({
          message: 'Scenario not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, scenario.userId)) {
        return reply.code(403).send({
          message: 'You cannot export this scenario.',
        });
      }

      const pdf = await renderScenarioPdf(scenario);
      const filename = `${slugifyFilename(scenario.title)}.pdf`;

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Length', pdf.length)
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(pdf);
    },
  );

  app.get(
    '/api/scenarios/:id',
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
          message: 'You cannot access this scenario.',
        });
      }

      const normalizedData = normalizeScenarioData(scenario.data);
      // Workflow libre : détailler un acte ne dépend plus de la validation du
      // scénario. Dès qu'un acte existe, son squelette MJ est disponible — sinon
      // le panneau « Déroulé » promettait une initialisation qui n'arrivait
      // jamais tant qu'une section restait incomplète.
      const detailedData = ensureActDetails(normalizedData);
      const scenarioDetail = {
        ...toScenarioDetail(scenario),
        data: detailedData,
      };

      if (
        needsActDetails(normalizedData) ||
        JSON.stringify(detailedData) !== JSON.stringify(normalizedData)
      ) {
        await prisma.scenario.update({
          where: {
            id: scenario.id,
          },
          data: {
            data: detailedData as unknown as Prisma.InputJsonValue,
          },
        });
      }

      return {
        scenario: scenarioDetail,
      };
    },
  );

  app.post(
    '/api/scenarios/:id/acts/:number/detail/chat',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id, number } = request.params as { id: string; number: string };
      const actNumber = Number(number);
      const parsed = actDetailChatSchema.safeParse(request.body ?? {});

      if (!parsed.success || !Number.isInteger(actNumber)) {
        return reply.code(400).send({
          message: 'Invalid act detail payload.',
          issues: parsed.success ? [] : parsed.error.issues,
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
          message: 'You cannot update this act detail.',
        });
      }

      let result;
      try {
        const scenarioData = ensureActDetails(normalizeScenarioData(scenario.data));

        result = await llmProvider.createActDetailTurn({
          scenario: scenarioData,
          scenarioId: scenario.id,
          userId: scenario.userId,
          actNumber,
          request: parsed.data,
        });
      } catch (error) {
        request.log.error(
          {
            error,
            scenarioId: scenario.id,
            actNumber,
            action: parsed.data.action,
          },
          'Act detail LLM workflow failed.',
        );

        return reply.code(502).send({
          message:
            error instanceof Error
              ? error.message
              : 'Act detail workflow failed.',
        });
      }
      const updatedScenario = await prisma.scenario.update({
        where: {
          id: scenario.id,
        },
        data: {
          data: result.scenario as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        reply: result.reply,
        suggestions: result.suggestions,
        changedSections: result.changedSections,
        scenario: {
          ...toScenarioDetail(updatedScenario),
          data: result.scenario,
        },
      };
    },
  );

  app.delete(
    '/api/scenarios/:id',
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
          message: 'You cannot delete this scenario.',
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.worldEntityProposal.deleteMany({
          where: {
            scenarioId: id,
            status: 'PENDING',
          },
        });

        await tx.scenario.delete({
          where: {
            id,
          },
        });
      });

      return reply.code(204).send();
    },
  );
}

function slugifyFilename(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'scenario';
}
