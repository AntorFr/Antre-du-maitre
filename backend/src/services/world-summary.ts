import type { WorldEntity } from '@prisma/client';

import { readStringArray } from '../utils/json-fields.js';

export function buildWorldSummary(entities: WorldEntity[]) {
  if (entities.length === 0) {
    return 'Aucune entité validée pour le moment.';
  }

  return entities
    .map(
      (entity) =>
        `${entity.type} | ${entity.name} | ${entity.description} | tags: ${readStringArray(entity.tags).join(', ')}`,
    )
    .join('\n');
}
