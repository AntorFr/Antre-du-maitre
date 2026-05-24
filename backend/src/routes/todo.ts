import type { Scenario } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { normalizeScenarioData } from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { generateMockTodoItems } from '../services/todo.js';

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

      await ensureGeneratedTodoItems(scenario);

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

async function ensureGeneratedTodoItems(scenario: Scenario) {
  if (scenario.status === 'DRAFT') return;

  const existingItems = await prisma.todoItem.findMany({
    where: {
      scenarioId: scenario.id,
    },
    select: {
      id: true,
      category: true,
      label: true,
      order: true,
    },
  });

  const existingKeys = new Set(
    existingItems.map((item) => `${item.category}:${item.label}`),
  );
  const nextOrder =
    existingItems.reduce((highest, item) => Math.max(highest, item.order), 0) +
    1;
  const generatedItems = generateMockTodoItems(
    normalizeScenarioData(scenario.data),
  );
  const missingItems = [];

  for (const item of generatedItems) {
    if (existingKeys.has(`${item.category}:${item.label}`)) continue;

    const existingMapChoice = findExistingBattleMatChoice(
      existingItems,
      item.label,
    );
    if (existingMapChoice) {
      await prisma.todoItem.update({
        where: {
          id: existingMapChoice.id,
        },
        data: {
          label: item.label,
        },
      });
      continue;
    }

    missingItems.push(item);
  }

  if (missingItems.length === 0) return;

  await prisma.todoItem.createMany({
    data: missingItems.map((item, index) => ({
      scenarioId: scenario.id,
      category: item.category,
      label: item.label,
      order: nextOrder + index,
    })),
  });
}

function findExistingBattleMatChoice(
  existingItems: Array<{
    id: string;
    category: string;
    label: string;
  }>,
  nextLabel: string,
) {
  const acteMatch = nextLabel.match(/^Choisir une Battle Mat pour l'acte \d+/);
  if (!acteMatch) return null;

  return (
    existingItems.find(
      (item) =>
        item.category === 'CARTES' && item.label.startsWith(acteMatch[0]),
    ) ?? null
  );
}
