import { randomBytes } from 'node:crypto';

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

/**
 * Provisionne / met à jour un utilisateur authentifié via OIDC (Authelia).
 * Le rôle est re-synchronisé à chaque login ; le mot de passe local ne sert
 * jamais pour ces comptes -> valeur aléatoire jetée après hachage.
 */
export async function upsertOidcUser(input: { username: string; role: Role }) {
  const existing = await prisma.user.findUnique({
    where: {
      username: input.username,
    },
    include: {
      world: {
        select: {
          id: true,
        },
      },
    },
  });

  if (existing) {
    if (existing.role === input.role) {
      return existing;
    }

    return prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        role: input.role,
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

  return createUserWithWorld({
    username: input.username,
    password: randomBytes(32).toString('hex'),
    role: input.role,
  });
}

