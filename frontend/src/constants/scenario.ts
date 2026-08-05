import type { ScenarioSection } from '@antre-du-maitre/shared';

export const SECTION_LABELS: Record<ScenarioSection, string> = {
  SENSATION: 'Sensation',
  LIEU: 'Lieu',
  QUETE: 'Quête',
  ANTAGONISTE: 'Antagoniste',
  OBJECTIF_HEROS: 'Objectif',
  ACTES: 'Actes',
  PNJS: 'PNJs',
  DUREE: 'Durée',
  FIN: 'Fin',
};

export const SECTION_QUESTIONS: Record<ScenarioSection, string> = {
  SENSATION: 'Quelle sensation veux-tu donner à ton aventure ?',
  LIEU: 'Où se déroule surtout cette aventure ?',
  QUETE: 'Quel est le problème central de cette aventure ?',
  ANTAGONISTE: 'Quelle est la cause du problème ?',
  OBJECTIF_HEROS: 'Que doivent réussir les héros ?',
  ACTES: "Quelles sont les grandes étapes de l'aventure ?",
  PNJS: 'Quels PNJs importants faut-il préparer ?',
  DUREE: 'Quelle durée et quel rythme veux-tu pour la partie ?',
  FIN: 'Quelle fin satisfaisante veux-tu créer ?',
};
