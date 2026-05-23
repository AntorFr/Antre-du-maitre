import { EntityType, WorldEntitySource } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { readStringArray } from '../utils/json-fields.js';

const createEntitySchema = z.object({
  type: z.nativeEnum(EntityType),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2_000),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
});

const updateEntitySchema = createEntitySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided.',
);

async function getOwnedWorld(userId: string) {
  return prisma.world.findUnique({
    where: {
      userId,
    },
  });
}

export async function registerWorldRoutes(app: FastifyInstance) {
  app.get(
    '/api/world',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const world = await prisma.world.findUnique({
        where: {
          userId: request.user.sub,
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

  app.get(
    '/api/world/proposals',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const world = await getOwnedWorld(request.user.sub);

      if (!world) {
        return reply.code(404).send({
          message: 'World not found.',
        });
      }

      const proposals = await prisma.worldEntityProposal.findMany({
        where: {
          worldId: world.id,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        proposals,
      };
    },
  );

  app.post(
    '/api/world/entities',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const parsed = createEntitySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid world entity payload.',
          issues: parsed.error.issues,
        });
      }

      const world = await getOwnedWorld(request.user.sub);

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

  app.put(
    '/api/world/entities/:id',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateEntitySchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid world entity update.',
          issues: parsed.error.issues,
        });
      }

      const entity = await prisma.worldEntity.findUnique({
        where: {
          id,
        },
        include: {
          world: true,
        },
      });

      if (!entity) {
        return reply.code(404).send({
          message: 'World entity not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, entity.world.userId)) {
        return reply.code(403).send({
          message: 'You cannot edit this world entity.',
        });
      }

      const updatedEntity = await prisma.worldEntity.update({
        where: {
          id,
        },
        data: parsed.data,
      });

      return {
        entity: updatedEntity,
      };
    },
  );

  app.delete(
    '/api/world/entities/:id',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const entity = await prisma.worldEntity.findUnique({
        where: {
          id,
        },
        include: {
          world: true,
        },
      });

      if (!entity) {
        return reply.code(404).send({
          message: 'World entity not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, entity.world.userId)) {
        return reply.code(403).send({
          message: 'You cannot delete this world entity.',
        });
      }

      await prisma.worldEntity.delete({
        where: {
          id,
        },
      });

      return reply.code(204).send();
    },
  );

  app.post(
    '/api/world/proposals/:id/accept',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const proposal = await prisma.worldEntityProposal.findUnique({
        where: {
          id,
        },
        include: {
          world: true,
        },
      });

      if (!proposal) {
        return reply.code(404).send({
          message: 'World proposal not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, proposal.world.userId)) {
        return reply.code(403).send({
          message: 'You cannot accept this proposal.',
        });
      }

      if (proposal.status !== 'PENDING') {
        return reply.code(409).send({
          message: 'This proposal has already been reviewed.',
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const entity = await tx.worldEntity.create({
          data: {
            worldId: proposal.worldId,
            type: proposal.type,
            name: proposal.name,
            description: proposal.description,
            tags: readStringArray(proposal.tags),
            source: proposal.source,
            sourceScenarioId: proposal.scenarioId,
            sourceSessionId: proposal.sessionId,
          },
        });

        const reviewedProposal = await tx.worldEntityProposal.update({
          where: {
            id: proposal.id,
          },
          data: {
            status: 'ACCEPTED',
            reviewedAt: new Date(),
          },
        });

        return {
          entity,
          proposal: reviewedProposal,
        };
      });

      return result;
    },
  );

  app.post(
    '/api/world/proposals/:id/reject',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const proposal = await prisma.worldEntityProposal.findUnique({
        where: {
          id,
        },
        include: {
          world: true,
        },
      });

      if (!proposal) {
        return reply.code(404).send({
          message: 'World proposal not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, proposal.world.userId)) {
        return reply.code(403).send({
          message: 'You cannot reject this proposal.',
        });
      }

      if (proposal.status !== 'PENDING') {
        return reply.code(409).send({
          message: 'This proposal has already been reviewed.',
        });
      }

      const reviewedProposal = await prisma.worldEntityProposal.update({
        where: {
          id: proposal.id,
        },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
        },
      });

      return {
        proposal: reviewedProposal,
      };
    },
  );
}
