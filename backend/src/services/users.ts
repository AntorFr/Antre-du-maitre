import bcrypt from 'bcrypt';
import type { Role } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

const PASSWORD_SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createUserWithWorld(input: {
  username: string;
  password: string;
  role: Role;
}) {
  const password = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      username: input.username,
      password,
      role: input.role,
      world: {
        create: {},
      },
    },
    include: {
      world: {
        select: {
          id: true,
        },
      },
    },
  });
}

