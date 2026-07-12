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

const transferScenarioSchema = z.object({
  targetUserId: z.string().min(1),
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

  // Transfère un scénario à un autre utilisateur : sessions et todos suivent
  // par cascade (FK scenarioId) ; les entités et propositions de monde issues
  // de ce scénario déménagent vers le monde du nouveau propriétaire.
  app.post(
    '/api/admin/scenarios/:scenarioId/transfer',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { scenarioId } = request.params as { scenarioId: string };
      const parsed = transferScenarioSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid transfer payload.',
          issues: parsed.error.issues,
        });
      }

      const scenario = await prisma.scenario.findUnique({
        where: {
          id: scenarioId,
        },
        include: {
          user: {
            include: {
              world: true,
            },
          },
        },
      });

      if (!scenario) {
        return reply.code(404).send({
          message: 'Scenario not found.',
        });
      }

      if (scenario.userId === parsed.data.targetUserId) {
        return reply.code(400).send({
          message: 'Scenario already belongs to this user.',
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: {
          id: parsed.data.targetUserId,
        },
        include: {
          world: true,
        },
      });

      if (!targetUser) {
        return reply.code(404).send({
          message: 'Target user not found.',
        });
      }

      const sourceWorldId = scenario.user.world?.id ?? null;

      const [movedEntities, movedProposals, updatedScenario] =
        await prisma.$transaction(async (tx) => {
          // Filet de sécurité : un monde existe normalement dès la création
          // du compte, mais on ne transfère jamais vers un monde absent.
          const targetWorld =
            targetUser.world ??
            (await tx.world.create({
              data: {
                userId: targetUser.id,
              },
            }));

          const entities = sourceWorldId
            ? await tx.worldEntity.updateMany({
                where: {
                  worldId: sourceWorldId,
                  sourceScenarioId: scenarioId,
                },
                data: {
                  worldId: targetWorld.id,
                },
              })
            : { count: 0 };

          const proposals = sourceWorldId
            ? await tx.worldEntityProposal.updateMany({
                where: {
                  worldId: sourceWorldId,
                  scenarioId,
                },
                data: {
                  worldId: targetWorld.id,
                },
              })
            : { count: 0 };

          const moved = await tx.scenario.update({
            where: {
              id: scenarioId,
            },
            data: {
              userId: targetUser.id,
            },
          });

          return [entities.count, proposals.count, moved];
        });

      return {
        scenario: toScenarioSummary(updatedScenario),
        movedEntities,
        movedProposals,
      };
    },
  );
}
