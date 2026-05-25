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

export type GameplayType =
  | 'enquete'
  | 'combat'
  | 'exploration'
  | 'roleplay'
  | 'enigme'
  | 'fuite'
  | 'infiltration';

export type ActDetailStatus = 'TODO' | 'IN_PROGRESS' | 'VALIDATED';

export type ActDetailStep =
  | 'OBJECTIF'
  | 'VOIES'
  | 'MODULE'
  | 'SCENES'
  | 'TIMING'
  | 'VALIDATION';

export interface ActObjective {
  principal: string;
  enjeu: string;
  typePrincipal: GameplayType;
  typesSecondaires: GameplayType[];
  dureeCibleMin: number;
  reussiteComplete: string;
  reussitePartielle: string;
  echecInteressant: string;
  bonusOptionnel: string;
}

export interface ActGameplayPath {
  id: string;
  label: string;
  type: GameplayType;
  actionJoueurs: string;
  gain: string;
  risque: string;
  preparationMJ: string[];
}

export interface ActSpecializedModule {
  type: GameplayType;
  focus: string;
  elements: Array<{
    label: string;
    value: string;
  }>;
}

export interface ActTiming {
  ordreConseille: string[];
  versionCourte: string;
  versionStandard: string;
  versionLongue: string;
  aCouperSiBesoin: string[];
  aGarderAbsolument: string[];
}

export interface ActDetail {
  status: ActDetailStatus;
  currentStep: ActDetailStep;
  objectif: ActObjective;
  voies: ActGameplayPath[];
  moduleSpecialise: ActSpecializedModule;
  scenes: Array<{
    titre: string;
    type?: GameplayType;
    statut?: 'OBLIGATOIRE_SOUPLE' | 'OPTIONNELLE' | 'CONSEQUENCE';
    objectifMJ: string;
    deroule: string;
    relanceAntiBlocage?: string;
  }>;
  indices: string[];
  choixConsequences: string[];
  transitions: string[];
  preparation: string[];
  notesImpro: string[];
  timing: ActTiming;
  syntheseMJ: string;
  notesUtilisateur: string[];
}

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
    detailsMJ?: ActDetail;
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

export interface ActDetailChatRequest {
  message?: string;
  action: 'ADVANCE' | 'VALIDATE' | 'REOPEN';
}

export interface ActDetailChatResponse {
  reply: string;
  suggestions: string[];
  scenario: ScenarioDetail;
}

export interface CreateScenarioRequest {
  title?: string;
}
