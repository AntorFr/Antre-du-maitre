import { Role } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      message: 'Authentication required.',
    });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await authenticate(request, reply);

  if (reply.sent) {
    return;
  }

  if (request.user.role !== Role.ADMIN) {
    return reply.code(403).send({
      message: 'Admin access required.',
    });
  }
}

export function canAccessOwnedResource(
  actor: { sub: string; role: Role },
  ownerId: string,
) {
  return actor.role === Role.ADMIN || actor.sub === ownerId;
}

