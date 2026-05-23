import {
  SCENARIO_STEPS,
  type ScenarioData,
  type ScenarioStep,
} from '@antre-du-maitre/shared';

type ScenarioSessionPlan = NonNullable<ScenarioData['sessionning']>['sessions'];

const scenarioStepOrder = new Map(
  SCENARIO_STEPS.map((step, index) => [step, index]),
);

export function createEmptyScenarioData(): ScenarioData {
  return {
    currentStep: 'STEP_1_AMBIANCE',
    title: '',
    pnjs: [],
    actes: [],
    rencontres: [],
  };
}

export function normalizeScenarioData(value: unknown): ScenarioData {
  const candidate = isRecord(value) ? value : {};
  const currentStep = readScenarioStep(candidate.currentStep);
  const normalized: ScenarioData = {
    ...(candidate as Partial<ScenarioData>),
    currentStep,
    title: readString(candidate.title),
    ambiance: readAmbiance(candidate.ambiance),
    lieu: normalizeLieu(candidate.lieu),
    quete: readOptionalString(candidate.quete),
    antagoniste: normalizeAntagoniste(candidate.antagoniste),
    pnjs: normalizePnjs(candidate.pnjs),
    gameplay: normalizeGameplay(candidate.gameplay),
    actes: normalizeActes(candidate.actes),
    rencontres: normalizeRencontres(candidate.rencontres),
    recompense: readOptionalString(candidate.recompense),
    notesMJ: readOptionalString(candidate.notesMJ),
  };

  const sessionning = normalizeSessionning(candidate.sessionning);
  if (sessionning) {
    normalized.sessionning = sessionning;
  } else {
    delete normalized.sessionning;
  }

  return normalized;
}

export function getNextScenarioStep(step: ScenarioStep): ScenarioStep | null {
  const index = scenarioStepOrder.get(step);

  if (index === undefined) {
    throw new Error(`Unknown scenario step: ${step}`);
  }

  return SCENARIO_STEPS[index + 1] ?? null;
}

export function canTransitionToScenarioStep(
  currentStep: ScenarioStep,
  nextStep: ScenarioStep | null,
): boolean {
  if (nextStep === null) {
    return currentStep === 'STEP_10_RECAP';
  }

  return getNextScenarioStep(currentStep) === nextStep;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number')
    : [];
}

function readScenarioStep(value: unknown): ScenarioStep {
  return typeof value === 'string' &&
    (SCENARIO_STEPS as readonly string[]).includes(value)
    ? (value as ScenarioStep)
    : 'STEP_1_AMBIANCE';
}

function readAmbiance(value: unknown): ScenarioData['ambiance'] {
  return value === 'mystere' ||
    value === 'humour' ||
    value === 'action' ||
    value === 'frisson'
    ? value
    : undefined;
}

function readPnjRole(value: unknown): ScenarioData['pnjs'][number]['role'] {
  return value === 'allie' || value === 'neutre' || value === 'ennemi'
    ? value
    : 'neutre';
}

function normalizeLieu(value: unknown): ScenarioData['lieu'] {
  if (!isRecord(value)) return undefined;

  return {
    nom: readString(value.nom, 'Lieu sans nom'),
    description: readString(value.description),
  };
}

function normalizeAntagoniste(value: unknown): ScenarioData['antagoniste'] {
  if (!isRecord(value)) return undefined;

  return {
    nom: readString(value.nom, 'Antagoniste sans nom'),
    nature: readString(value.nature),
    monsterId: readOptionalString(value.monsterId),
    motivation: readString(value.motivation),
  };
}

function normalizePnjs(value: unknown): ScenarioData['pnjs'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): ScenarioData['pnjs'] => {
    if (!isRecord(item)) return [];

    return [
      {
        nom: readString(item.nom, 'PNJ sans nom'),
        role: readPnjRole(item.role),
        description: readString(item.description),
        motivation: readString(item.motivation),
      },
    ];
  });
}

function normalizeGameplay(value: unknown): ScenarioData['gameplay'] {
  if (!isRecord(value)) return undefined;

  return {
    types: readStringArray(value.types),
    notes: readString(value.notes),
  };
}

function normalizeActes(value: unknown): ScenarioData['actes'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index): ScenarioData['actes'] => {
    if (!isRecord(item)) return [];

    return [
      {
        numero: readNumber(item.numero, index + 1),
        titre: readString(item.titre, `Acte ${index + 1}`),
        type: readString(item.type),
        description: readString(item.description),
        options: readStringArray(item.options),
        dureeEstimeeMin: readNumber(item.dureeEstimeeMin),
        pointDeCoupure: readBoolean(item.pointDeCoupure),
        notesMJ: readString(item.notesMJ),
      },
    ];
  });
}

function normalizeRencontres(value: unknown): ScenarioData['rencontres'] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): ScenarioData['rencontres'] => {
    if (!isRecord(item)) return [];

    const rencontre: ScenarioData['rencontres'][number] = {
      monsterId: readString(item.monsterId, 'monstre-a-definir'),
      nombre: readNumber(item.nombre, 1),
      acteNumero: readNumber(item.acteNumero, 1),
      contexte: readString(item.contexte),
      recompense: readOptionalString(item.recompense),
    };

    const carteBattleMat = normalizeBattleMat(item.carteBattleMat);
    if (carteBattleMat) {
      rencontre.carteBattleMat = carteBattleMat;
    }

    return [rencontre];
  });
}

function normalizeBattleMat(
  value: unknown,
): ScenarioData['rencontres'][number]['carteBattleMat'] {
  if (!isRecord(value)) return undefined;

  const pages = readNumberArray(value.pages);
  if (pages.length < 2) return undefined;
  const firstPage = pages[0] ?? 1;
  const secondPage = pages[1] ?? firstPage;

  const volume = value.volume === 1 || value.volume === 2 || value.volume === 3
    ? value.volume
    : 1;

  return {
    id: readString(value.id, 'battle-mat'),
    volume,
    pages: [firstPage, secondPage],
    nom: readString(value.nom, 'Carte Battle Mat'),
    description: readString(value.description),
  };
}

function normalizeSessionning(value: unknown): ScenarioData['sessionning'] {
  if (!isRecord(value)) return undefined;

  const sessions = Array.isArray(value.sessions)
    ? value.sessions.flatMap((item, index): ScenarioSessionPlan => {
        if (!isRecord(item)) return [];

        return [
          {
            numero: readNumber(item.numero, index + 1),
            actesInclus: readNumberArray(item.actesInclus),
            dureeEstimeeMin: readNumber(item.dureeEstimeeMin),
            resumeAccroche: readString(item.resumeAccroche),
          },
        ];
      })
    : [];

  return {
    dureeTotaleEstimeeMin: readNumber(value.dureeTotaleEstimeeMin),
    nombreSessionsRecommande: readNumber(
      value.nombreSessionsRecommande,
      sessions.length,
    ),
    sessions,
  };
}
