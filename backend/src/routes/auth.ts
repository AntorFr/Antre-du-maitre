import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { verifyPassword } from '../services/users.js';
import { toAuthUser } from '../utils/users.js';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid login payload.',
        issues: parsed.error.issues,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username: parsed.data.username,
      },
      include: {
        world: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
      return reply.code(401).send({
        message: 'Invalid username or password.',
      });
    }

    const token = await reply.jwtSign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
      },
      {
        sign: {
          expiresIn: '30d',
        },
      },
    );

    return {
      token,
      user: toAuthUser(user),
    };
  });

  app.get(
    '/api/auth/me',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: {
          id: request.user.sub,
        },
        include: {
          world: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({
          message: 'User not found.',
        });
      }

      return {
        user: toAuthUser(user),
      };
    },
  );

  app.post(
    '/api/auth/logout',
    {
      preHandler: authenticate,
    },
    async (_request, reply) => reply.code(204).send(),
  );
}
