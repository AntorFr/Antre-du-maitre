import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';

const updateTodoItemSchema = z.object({
  done: z.boolean(),
});

export async function registerTodoRoutes(app: FastifyInstance) {
  app.get(
    '/api/scenarios/:id/todo',
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
          message: 'You cannot access this todo.',
        });
      }

      const items = await prisma.todoItem.findMany({
        where: {
          scenarioId: id,
        },
        orderBy: {
          order: 'asc',
        },
      });

      return {
        items,
      };
    },
  );

  app.put(
    '/api/scenarios/:id/todo/:itemId',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id, itemId } = request.params as { id: string; itemId: string };
      const parsed = updateTodoItemSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid todo payload.',
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
          message: 'You cannot update this todo.',
        });
      }

      const existingItem = await prisma.todoItem.findFirst({
        where: {
          id: itemId,
          scenarioId: scenario.id,
        },
      });

      if (!existingItem) {
        return reply.code(404).send({
          message: 'Todo item not found.',
        });
      }

      const item = await prisma.todoItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          done: parsed.data.done,
        },
      });

      return {
        item,
      };
    },
  );
}
