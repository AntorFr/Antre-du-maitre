export const SCENARIO_STEPS = [
  'STEP_1_AMBIANCE',
  'STEP_2_LIEU',
  'STEP_3_QUETE',
  'STEP_4_MECHANT',
  'STEP_5_PNJS',
  'STEP_6_GAMEPLAY',
  'STEP_7_ACTES',
  'STEP_8_RENCONTRES',
  'STEP_9_DUREE',
  'STEP_10_RECAP',
] as const;

export type ScenarioStep = (typeof SCENARIO_STEPS)[number];

export type Ambiance = 'mystere' | 'humour' | 'action' | 'frisson';

export type ScenarioStatus = 'DRAFT' | 'COMPLETE' | 'IN_PROGRESS' | 'PLAYED';

export type PnjRole = 'allie' | 'neutre' | 'ennemi';

export interface ScenarioData {
  currentStep: ScenarioStep;
  title: string;
  ambiance?: Ambiance;
  lieu?: {
    nom: string;
    description: string;
  };
  quete?: string;
  antagoniste?: {
    nom: string;
    nature: string;
    monsterId?: string;
    motivation: string;
  };
  pnjs: Array<{
    nom: string;
    role: PnjRole;
    description: string;
    motivation: string;
  }>;
  gameplay?: {
    types: string[];
    notes: string;
  };
  actes: Array<{
    numero: number;
    titre: string;
    type: string;
    description: string;
    options: string[];
    dureeEstimeeMin: number;
    pointDeCoupure: boolean;
    notesMJ: string;
  }>;
  rencontres: Array<{
    monsterId: string;
    nombre: number;
    acteNumero: number;
    contexte: string;
    carteBattleMat?: {
      id: string;
      volume: 1 | 2 | 3;
      pages: [number, number];
      nom: string;
      description: string;
    };
    recompense?: string;
  }>;
  sessionning?: {
    dureeTotaleEstimeeMin: number;
    nombreSessionsRecommande: number;
    sessions: Array<{
      numero: number;
      actesInclus: number[];
      dureeEstimeeMin: number;
      resumeAccroche: string;
    }>;
  };
  recompense?: string;
  notesMJ?: string;
}

export interface ScenarioSummary {
  id: string;
  title: string;
  status: ScenarioStatus;
  data: ScenarioData;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioChatHistoryEntry {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  voiceInput?: boolean;
  suggestions?: string[];
}

export interface ScenarioDetail extends ScenarioSummary {
  chatHistory: ScenarioChatHistoryEntry[];
}

export interface ScenarioChatRequest {
  message: string;
  voiceInput: boolean;
}

export interface CreateScenarioRequest {
  title?: string;
}
