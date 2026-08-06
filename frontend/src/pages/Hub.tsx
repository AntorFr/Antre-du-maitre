import {
  DEFAULT_GAME_SYSTEM,
  GAME_SYSTEM_LABELS,
  type ScenarioSummary,
} from '@antre-du-maitre/shared';
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '../components/Icon';
import { api, ApiError } from '../lib/api';
import type { HubSection } from '../types/navigation';
import { World } from './World';

type HubProps = {
  token: string;
  section: HubSection;
  worldRefreshKey: number;
  onCreateScenario: () => void;
  onOpenScenario: (scenario: ScenarioSummary) => void;
  onSectionChange: (section: HubSection) => void;
};

export function Hub({
  token,
  section,
  worldRefreshKey,
  onCreateScenario,
  onOpenScenario,
  onSectionChange,
}: HubProps) {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    api
      .listScenarios(token)
      .then(({ scenarios: loadedScenarios }) => {
        if (!cancelled) {
          setScenarios(loadedScenarios);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof ApiError
              ? caughtError.message
              : 'Impossible de charger les scénarios.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const filteredScenarios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return scenarios;

    return scenarios.filter((scenario) =>
      scenario.title.toLowerCase().includes(normalizedSearch),
    );
  }, [scenarios, search]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:grid md:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="shrink-0 border-b border-black/10 bg-[#f7f6f1] px-4 py-2 md:flex md:min-h-0 md:flex-col md:border-b-0 md:border-r md:py-4">
        <div className="flex gap-1 md:block md:space-y-1">
          <HubNavButton
            active={section === 'scenarios'}
            icon="scenario"
            label="Mes scénarios"
            onClick={() => onSectionChange('scenarios')}
          />
          <HubNavButton
            active={section === 'world'}
            icon="world"
            label="Mon monde"
            onClick={() => onSectionChange('world')}
          />
        </div>

        <article className="mt-auto hidden rounded-xl bg-white p-4 ring-1 ring-black/10 md:block">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
            Reprendre
          </p>
          <p className="mt-2 text-[13px] leading-5 text-slate-600">
            Ouvre un scénario pour accéder à sa vue d'ensemble, sa préparation
            et ses sessions.
          </p>
        </article>
      </aside>

      {section === 'world' ? (
        <World token={token} refreshKey={worldRefreshKey} />
      ) : (
        <main className="flex min-h-0 flex-col overflow-hidden bg-[#faf9f5]">
          <header className="shrink-0 border-b border-black/10 bg-white px-[18px] py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <p className="text-[12px] uppercase tracking-[0.18em] text-wizard-600">
                  Bibliothèque
                </p>
                <h1 className="truncate text-[22px] font-semibold text-slate-950">
                  Mes scénarios
                </h1>
              </div>
              <div className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-black/10 bg-[#f5f5f3] px-3 py-2 sm:ml-auto sm:w-auto sm:min-w-[280px]">
                <Icon name="search" className="h-4 w-4 text-slate-400" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
                  placeholder="Rechercher une aventure"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
            {error ? (
              <p className="mb-3 rounded-lg bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button
                className="flex min-h-[190px] flex-col justify-between rounded-xl border border-dashed border-wizard-300 bg-white p-4 text-left transition hover:border-wizard-500 hover:bg-wizard-50"
                onClick={onCreateScenario}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wizard-600 text-white">
                  <Icon name="magic" className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[17px] font-semibold text-slate-950">
                    Créer une aventure
                  </span>
                  <span className="mt-2 block text-[13px] leading-5 text-slate-500">
                    Lance le workflow guidé avec Merlin.
                  </span>
                </span>
              </button>

              {isLoading ? (
                <div className="rounded-xl bg-white p-5 text-[13px] text-slate-500 ring-1 ring-black/10">
                  Chargement des scénarios…
                </div>
              ) : null}

              {!isLoading && filteredScenarios.length === 0 ? (
                <div className="rounded-xl bg-white p-5 text-[13px] text-slate-500 ring-1 ring-black/10">
                  Aucun scénario ne correspond à cette recherche.
                </div>
              ) : null}

              {filteredScenarios.map((scenario) => (
                <ScenarioLibraryCard
                  key={scenario.id}
                  scenario={scenario}
                  onOpen={() => onOpenScenario(scenario)}
                />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function HubNavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: 'scenario' | 'world';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] font-medium transition',
        active
          ? 'bg-wizard-600 text-white'
          : 'text-slate-600 hover:bg-white hover:text-wizard-700',
      ].join(' ')}
      onClick={onClick}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

function ScenarioLibraryCard({
  scenario,
  onOpen,
}: {
  scenario: ScenarioSummary;
  onOpen: () => void;
}) {
  const duration = scenario.data.sessionning?.dureeTotaleEstimeeMin;
  const isDraft = scenario.status === 'DRAFT';

  return (
    <button
      className="min-h-[190px] rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
            {scenarioStatusLabel(scenario.status)}
            <span className="ml-1.5 normal-case tracking-normal text-slate-400">
              · {GAME_SYSTEM_LABELS[scenario.data.gameSystem ?? DEFAULT_GAME_SYSTEM]}
            </span>
          </p>
          <h2 className="mt-1 line-clamp-2 text-[18px] font-semibold leading-6 text-slate-950">
            {scenario.title}
          </h2>
        </div>
        {duration ? (
          <span className="shrink-0 rounded-full bg-wizard-100 px-2.5 py-1 text-[11px] font-medium text-wizard-700">
            ~{duration} min
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        <MiniField label="Lieu" value={scenario.data.lieu?.nom} />
        <MiniField label="Quête" value={scenario.data.quete?.phraseSimple} />
      </div>

      <p className="mt-4 flex items-center gap-1 text-[12px] font-medium text-wizard-600">
        <Icon name={isDraft ? 'magic' : 'scenario'} className="h-3.5 w-3.5" />
        {isDraft ? 'Reprendre avec Merlin' : 'Ouvrir le scénario'}
      </p>
    </button>
  );
}

function MiniField({ label, value }: { label: string; value?: string }) {
  return (
    <p className="rounded-lg bg-[#f5f5f3] px-3 py-2 text-[12px] leading-5 text-slate-600">
      <span className="font-medium text-slate-900">{label} : </span>
      {value ?? 'À définir'}
    </p>
  );
}

function scenarioStatusLabel(status: ScenarioSummary['status']) {
  if (status === 'COMPLETE') return 'Complet';
  if (status === 'IN_PROGRESS') return 'En cours';
  return 'Brouillon';
}
