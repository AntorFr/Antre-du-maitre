import type { FastifyInstance } from 'fastify';
import { EntityType, WorldEntitySource } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/auth.js';
import { toScenarioSummary } from '../utils/scenarios.js';

const createWorldEntitySchema = z.object({
  type: z.nativeEnum(EntityType),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2_000),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
});

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/users/:userId/scenarios',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return reply.code(404).send({
          message: 'User not found.',
        });
      }

      const scenarios = await prisma.scenario.findMany({
        where: {
          userId,
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

  app.get(
    '/api/admin/users/:userId/world',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const world = await prisma.world.findUnique({
        where: {
          userId,
        },
        include: {
          entities: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          proposals: {
            where: {
              status: 'PENDING',
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!world) {
        return reply.code(404).send({
          message: 'World not found.',
        });
      }

      return {
        world,
      };
    },
  );

  app.post(
    '/api/admin/users/:userId/world/entities',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const parsed = createWorldEntitySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid world entity payload.',
          issues: parsed.error.issues,
        });
      }

      const world = await prisma.world.findUnique({
        where: {
          userId,
        },
      });

      if (!world) {
        return reply.code(404).send({
          message: 'World not found.',
        });
      }

      const entity = await prisma.worldEntity.create({
        data: {
          worldId: world.id,
          ...parsed.data,
          source: WorldEntitySource.MANUAL,
        },
      });

      return reply.code(201).send({
        entity,
      });
    },
  );
}
