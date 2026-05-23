export const GAMEPLAY_TYPES = [
  {
    id: 'combat',
    name: 'Combat',
    icon: '⚔️',
    description: 'Les héros affrontent des ennemis avec des dés !',
    conseil: "Un combat de boss à la fin, c'est toujours spectaculaire.",
    dureeEstimee: 20,
  },
  {
    id: 'enquete',
    name: 'Enquête',
    icon: '🔍',
    description: 'Les héros cherchent des indices et parlent aux gens.',
    conseil: 'Prévoir 2-3 indices différents pour mener au même endroit.',
    dureeEstimee: 15,
  },
  {
    id: 'enigme',
    name: 'Énigme',
    icon: '🧩',
    description: 'Les héros doivent résoudre une devinette ou un puzzle.',
    conseil: 'Toujours avoir une solution de secours si les joueurs bloquent.',
    dureeEstimee: 10,
  },
  {
    id: 'negociation',
    name: 'Négociation',
    icon: '🤝',
    description: 'Les héros doivent convaincre quelqu’un avec les mots.',
    conseil: 'Donner un vrai enjeu au PNJ pour qu’il résiste un peu.',
    dureeEstimee: 10,
  },
  {
    id: 'exploration',
    name: 'Exploration',
    icon: '🗺️',
    description: 'Les héros traversent un lieu dangereux ou inconnu.',
    conseil: 'Ajouter un piège ou une surprise pour pimenter l’exploration.',
    dureeEstimee: 15,
  },
  {
    id: 'fuite',
    name: 'Fuite / Poursuite',
    icon: '🏃',
    description: 'Les héros doivent s’échapper ou poursuivre quelqu’un !',
    conseil: 'Garder le rythme rapide, peu de jets de dés.',
    dureeEstimee: 10,
  },
] as const;

export type GameplayTypeId = (typeof GAMEPLAY_TYPES)[number]['id'];

