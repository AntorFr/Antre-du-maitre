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
  runActDetailWorkflow,
} from '../services/act-details.js';
import { renderScenarioPdf } from '../services/scenario-pdf.js';
import { toScenarioDetail, toScenarioSummary } from '../utils/scenarios.js';

const createScenarioSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});
const actDetailChatSchema = z.object({
  message: z.string().trim().max(2_000).optional(),
  action: z.enum(['ADVANCE', 'VALIDATE', 'REOPEN']),
});

export async function registerScenarioRoutes(app: FastifyInstance) {
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
      const data = createEmptyScenarioData();
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
      const detailedData =
        scenario.status === 'DRAFT'
          ? normalizedData
          : ensureActDetails(normalizedData);
      const scenarioDetail = {
        ...toScenarioDetail(scenario),
        data: detailedData,
      };

      if (scenario.status !== 'DRAFT' && needsActDetails(normalizedData)) {
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
        result = runActDetailWorkflow({
          scenario: normalizeScenarioData(scenario.data),
          actNumber,
          request: parsed.data,
        });
      } catch (error) {
        return reply.code(404).send({
          message:
            error instanceof Error ? error.message : 'Act detail not found.',
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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'scenario';
}
