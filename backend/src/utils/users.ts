import type { AuthUser } from '@antre-du-maitre/shared';
import type { Role, User, World } from '@prisma/client';

export type UserWithWorld = User & {
  world: Pick<World, 'id'> | null;
};

export function toAuthUser(user: UserWithWorld): AuthUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role satisfies Role,
    worldId: user.world?.id ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

