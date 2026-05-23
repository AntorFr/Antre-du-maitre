import type { ScenarioData } from '@antre-du-maitre/shared';
import type { TodoCategory } from '@prisma/client';

export type GeneratedTodoItem = {
  category: TodoCategory;
  label: string;
  order: number;
};

export function generateMockTodoItems(
  scenario: ScenarioData,
): GeneratedTodoItem[] {
  const items: GeneratedTodoItem[] = [];
  let order = 1;

  if (scenario.antagoniste) {
    items.push({
      category: 'FICHES_PNJS',
      label: `Préparer l'antagoniste : ${scenario.antagoniste.nom}`,
      order: order++,
    });
  }

  for (const pnj of scenario.pnjs) {
    items.push({
      category: 'FICHES_PNJS',
      label: `Préparer la fiche PNJ : ${pnj.nom}`,
      order: order++,
    });
  }

  for (const rencontre of scenario.rencontres) {
    items.push({
      category: 'FICHES_MONSTRES',
      label: `Préparer ${rencontre.nombre} × ${rencontre.monsterId}`,
      order: order++,
    });

    if (rencontre.carteBattleMat) {
      items.push({
        category: 'CARTES',
        label: `Sortir ${rencontre.carteBattleMat.id} — ${rencontre.carteBattleMat.nom}`,
        order: order++,
      });
    }
  }

  if (scenario.gameplay?.types.includes('enquete')) {
    items.push({
      category: 'DEROULEMENTS',
      label: 'Préparer 3 indices qui mènent à la solution.',
      order: order++,
    });
  }

  if (scenario.gameplay?.types.includes('enigme')) {
    items.push({
      category: 'DEROULEMENTS',
      label: "Préparer une aide si l'énigme bloque les joueurs.",
      order: order++,
    });
  }

  items.push(
    {
      category: 'DEROULEMENTS',
      label: 'Relire les actes et les options si les joueurs changent de plan.',
      order: order++,
    },
    {
      category: 'AUTRE',
      label: 'Préparer les dés, pions et feuilles utiles.',
      order: order++,
    },
  );

  return items;
}

