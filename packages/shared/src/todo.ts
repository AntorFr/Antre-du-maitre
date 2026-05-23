export type TodoCategory =
  | 'FICHES_MONSTRES'
  | 'FICHES_PNJS'
  | 'CARTES'
  | 'DEROULEMENTS'
  | 'AUTRE';

export interface TodoItem {
  id: string;
  scenarioId: string;
  category: TodoCategory;
  label: string;
  done: boolean;
  order: number;
  createdAt: string;
}

