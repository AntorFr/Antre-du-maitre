import '@fastify/jwt';

import type { Role } from '@prisma/client';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      username: string;
      role: Role;
    };
    user: {
      sub: string;
      username: string;
      role: Role;
    };
  }
}

