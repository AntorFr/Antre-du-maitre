import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/auth.js';
import { createUserWithWorld, hashPassword } from '../services/users.js';
import { toAuthUser } from '../utils/users.js';

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/);

const createUserSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8).max(200),
  role: z.nativeEnum(Role).default(Role.CHILD),
});

const passwordUpdateSchema = z.object({
  password: z.string().min(8).max(200),
});

export async function registerUserRoutes(app: FastifyInstance) {
  app.get(
    '/api/users',
    {
      preHandler: requireAdmin,
    },
    async () => {
      const users = await prisma.user.findMany({
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          world: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              scenarios: true,
            },
          },
        },
      });

      return {
        users: users.map((user) => ({
          ...toAuthUser(user),
          scenarioCount: user._count.scenarios,
        })),
      };
    },
  );

  app.post(
    '/api/users',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed = createUserSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid user payload.',
          issues: parsed.error.issues,
        });
      }

      try {
        const user = await createUserWithWorld(parsed.data);

        return reply.code(201).send({
          user: toAuthUser(user),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.code(409).send({
            message: 'Username already exists.',
          });
        }

        throw error;
      }
    },
  );

  app.put(
    '/api/users/:id/password',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = passwordUpdateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid password payload.',
          issues: parsed.error.issues,
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!existingUser) {
        return reply.code(404).send({
          message: 'User not found.',
        });
      }

      await prisma.user.update({
        where: {
          id,
        },
        data: {
          password: await hashPassword(parsed.data.password),
        },
      });

      return reply.code(204).send();
    },
  );

  app.delete(
    '/api/users/:id',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (id === request.user.sub) {
        return reply.code(400).send({
          message: 'You cannot delete your own account.',
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!existingUser) {
        return reply.code(404).send({
          message: 'User not found.',
        });
      }

      await prisma.user.delete({
        where: {
          id,
        },
      });

      return reply.code(204).send();
    },
  );
}

