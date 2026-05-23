import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { createEmptyScenarioData } from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { renderScenarioPdf } from '../services/scenario-pdf.js';
import { toScenarioDetail, toScenarioSummary } from '../utils/scenarios.js';

const createScenarioSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
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

      return {
        scenario: toScenarioDetail(scenario),
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
