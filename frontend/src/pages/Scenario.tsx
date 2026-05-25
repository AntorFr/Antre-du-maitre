import type { ScenarioSession, ScenarioSummary } from '@antre-du-maitre/shared';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { FormattedText } from '../components/FormattedText';
import { Icon, type IconName } from '../components/Icon';
import { api, ApiError } from '../lib/api';

type ScenarioProps = {
  token: string;
  scenario: ScenarioSummary | null;
  onCreateScenario: () => void;
  onScenarioChange: (scenario: ScenarioSummary) => void;
  onWorldProposal: () => void;
  onPrepareTodo: () => void;
};

type ScenarioPanel = 'run' | 'acts' | 'sessions';
type ScenarioAct = ScenarioSummary['data']['actes'][number];
type ScenarioEncounter = ScenarioSummary['data']['rencontres'][number];
type ActWorkflowStep = NonNullable<ScenarioAct['detailsMJ']>['currentStep'];

const ACT_WORKFLOW_STEPS: Array<{
  step: ActWorkflowStep;
  label: string;
  helper: string;
}> = [
  {
    step: 'OBJECTIF',
    label: 'Objectif',
    helper: "Pourquoi l'acte existe.",
  },
  {
    step: 'VOIES',
    label: 'Voies',
    helper: 'Comment les joueurs avancent.',
  },
  {
    step: 'MODULE',
    label: 'Gameplay',
    helper: 'Le module adapte au type.',
  },
  {
    step: 'SCENES',
    label: 'Scenes',
    helper: 'Les moments jouables.',
  },
  {
    step: 'TIMING',
    label: 'Timing',
    helper: 'Version courte ou longue.',
  },
  {
    step: 'VALIDATION',
    label: 'Validation',
    helper: 'Synthese finale MJ.',
  },
];

export function Scenario({
  token,
  scenario,
  onCreateScenario,
  onScenarioChange,
  onWorldProposal,
  onPrepareTodo,
}: ScenarioProps) {
  const [sessions, setSessions] = useState<ScenarioSession[]>([]);
  const [activePanel, setActivePanel] = useState<ScenarioPanel>('run');
  const [selectedActNumber, setSelectedActNumber] = useState<number | null>(
    null,
  );
  const [actDetailInputs, setActDetailInputs] = useState<Record<number, string>>(
    {},
  );
  const [actDetailReplies, setActDetailReplies] = useState<Record<number, string>>(
    {},
  );
  const [busyActNumber, setBusyActNumber] = useState<number | null>(null);
  const [debriefInputs, setDebriefInputs] = useState<Record<number, string>>(
    {},
  );
  const [debriefReplies, setDebriefReplies] = useState<Record<number, string>>(
    {},
  );
  const [busySessionNumber, setBusySessionNumber] = useState<number | null>(
    null,
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isEditingWithMerlin, setIsEditingWithMerlin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActivePanel('run');
    setSelectedActNumber(scenario?.data.actes[0]?.numero ?? null);
    setError(null);
  }, [scenario?.id]);

  useEffect(() => {
    if (!scenario) {
      setSessions([]);
      return;
    }

    let cancelled = false;

    api
      .listSessions(token, scenario.id)
      .then(({ sessions: loadedSessions }) => {
        if (!cancelled) {
          setSessions(loadedSessions);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof ApiError
              ? caughtError.message
              : 'Impossible de charger les sessions.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scenario, token]);

  async function markPlayed(sessionNumber: number) {
    if (!scenario) return;

    setError(null);
    setBusySessionNumber(sessionNumber);

    try {
      const { session: updatedSession } = await api.markSessionPlayed(
        token,
        scenario.id,
        sessionNumber,
      );

      setSessions((current) =>
        current.map((session) =>
          session.id === updatedSession.id ? updatedSession : session,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de marquer cette session comme jouée.',
      );
    } finally {
      setBusySessionNumber(null);
    }
  }

  async function submitDebrief(sessionNumber: number) {
    if (!scenario) return;

    const message = debriefInputs[sessionNumber]?.trim();
    if (!message) return;

    setError(null);
    setBusySessionNumber(sessionNumber);

    try {
      const response = await api.debriefSession(
        token,
        scenario.id,
        sessionNumber,
        {
          message,
        },
      );

      setSessions((current) =>
        current.map((session) =>
          session.id === response.session.id ? response.session : session,
        ),
      );
      setDebriefReplies((current) => ({
        ...current,
        [sessionNumber]: response.reply,
      }));
      setDebriefInputs((current) => ({
        ...current,
        [sessionNumber]: '',
      }));

      if (response.proposedEntities.length > 0) {
        onWorldProposal();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible d’enregistrer le debrief.',
      );
    } finally {
      setBusySessionNumber(null);
    }
  }

  async function exportPdf() {
    if (!scenario) return;

    setError(null);
    setIsExportingPdf(true);

    try {
      const blob = await api.exportScenarioPdf(token, scenario.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `${slugifyFilename(scenario.title)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible d’exporter le PDF.',
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function editWithMerlin() {
    if (!scenario) return;

    const message = window.prompt(
      'Que veux-tu changer avec Merlin ?',
      'Ajuste ce scénario en gardant la structure existante.',
    )?.trim();

    if (!message) return;

    setError(null);
    setIsEditingWithMerlin(true);

    try {
      const response = await api.chat(token, scenario.id, {
        message,
        voiceInput: false,
      });
      const { scenario: updatedScenario } = await api.getScenario(
        token,
        scenario.id,
      );

      onScenarioChange(updatedScenario);

      if (response.proposedEntities.length > 0) {
        onWorldProposal();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de modifier ce scénario via Merlin.',
      );
    } finally {
      setIsEditingWithMerlin(false);
    }
  }

  async function submitActWorkflow(
    actNumber: number,
    action: 'ADVANCE' | 'VALIDATE' | 'REOPEN',
  ) {
    if (!scenario) return;

    setError(null);
    setBusyActNumber(actNumber);

    try {
      const response = await api.chatActDetail(token, scenario.id, actNumber, {
        action,
        message: actDetailInputs[actNumber]?.trim() || undefined,
      });

      onScenarioChange(response.scenario);
      setActDetailReplies((current) => ({
        ...current,
        [actNumber]: response.reply,
      }));
      setActDetailInputs((current) => ({
        ...current,
        [actNumber]: '',
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Impossible d'avancer le detail de cet acte.",
      );
    } finally {
      setBusyActNumber(null);
    }
  }

  if (!scenario) {
    return (
      <EmptyState
        title="Aucun scénario sélectionné"
        text="Crée une aventure ou ouvre un scénario depuis l’administration."
        actionLabel="Créer une aventure"
        onAction={onCreateScenario}
      />
    );
  }

  const { data } = scenario;
  const totalDuration = data.sessionning?.dureeTotaleEstimeeMin;
  const playedSessions = sessions.filter(
    (session) => session.status === 'PLAYED',
  ).length;
  const encountersForAct = (actNumber: number) =>
    data.rencontres.filter((rencontre) => rencontre.acteNumero === actNumber);
  const selectedAct =
    data.actes.find((acte) => acte.numero === selectedActNumber) ??
    data.actes[0] ??
    null;

  return (
    <section className="flex h-full flex-col overflow-hidden bg-white">
      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] overflow-hidden">
        <aside className="space-y-3 overflow-y-auto border-r border-black/10 bg-[#f7f6f1] px-[18px] py-4">
          <header className="rounded-xl bg-white p-4 ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-wizard-600">
                  Fiche MJ
                </p>
                <h2 className="mt-1 text-[20px] font-semibold leading-7 text-slate-950">
                  {scenario.title}
                </h2>
              </div>
              <StatusPill status={scenario.status} />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <InfoTile icon="spark" label="Ambiance" value={data.ambiance} />
              <InfoTile icon="users" label="PNJs" value={`${data.pnjs.length}`} />
              <InfoTile
                icon="clock"
                label="Durée"
                value={totalDuration ? `~${totalDuration} min` : '—'}
              />
            </div>
          </header>

          <SmallCard icon="location" label="Lieu">
            {data.lieu ? (
              <div>
                <p className="font-medium text-slate-900">{data.lieu.nom}</p>
                <p className="mt-1 text-slate-500">{data.lieu.description}</p>
              </div>
            ) : (
              'Pas encore défini.'
            )}
          </SmallCard>

          <SmallCard icon="spark" label="Quête principale">
            {data.quete ?? 'Pas encore définie.'}
          </SmallCard>

          <SmallCard icon="skull" label="Antagoniste">
            {data.antagoniste ? (
              <div>
                <p className="font-medium text-slate-900">
                  {data.antagoniste.nom}
                </p>
                <p className="mt-1 text-slate-500">
                  {data.antagoniste.nature} · {data.antagoniste.motivation}
                </p>
              </div>
            ) : (
              'Pas encore défini.'
            )}
          </SmallCard>

          <SmallCard icon="battle" label="Types de défis">
            <div className="flex flex-wrap gap-1.5">
              {(data.gameplay?.types.length
                ? data.gameplay.types
                : ['à définir']
              ).map((type) => (
                <span
                  className="rounded-full bg-wizard-100 px-2.5 py-1 text-[11px] font-medium text-wizard-700"
                  key={type}
                >
                  {type}
                </span>
              ))}
            </div>
            {data.gameplay?.notes ? (
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                {data.gameplay.notes}
              </p>
            ) : null}
          </SmallCard>

          <SmallCard icon="users" label="PNJs importants">
            {data.pnjs.length ? (
              <div className="space-y-2">
                {data.pnjs.map((pnj) => (
                  <div className="rounded-lg bg-white px-3 py-2" key={pnj.nom}>
                    <p className="text-[12px] font-medium text-slate-900">
                      {pnj.nom}{' '}
                      <span className="font-normal text-slate-400">
                        · {pnj.role}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                      {pnj.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              'Aucun PNJ défini.'
            )}
          </SmallCard>

          <SmallCard icon="clock" label="Sessions">
            {sessions.length ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px]">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-medium text-slate-900">
                    {playedSessions} / {sessions.length} jouée
                    {playedSessions > 1 ? 's' : ''}
                  </span>
                </div>
                {sessions.map((session) => (
                  <button
                    className="flex w-full gap-2 rounded-lg bg-white px-3 py-2 text-left transition hover:bg-wizard-50"
                    key={session.id}
                    onClick={() => setActivePanel('sessions')}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wizard-600 text-[11px] font-medium text-white">
                      {session.number}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-slate-800">
                        Actes {session.plannedActes.join(', ')} ·{' '}
                        {session.plannedDuration ?? '—'} min
                      </p>
                      {session.recapHook ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                          {session.recapHook}
                        </p>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              'Les sessions apparaîtront quand le scénario sera finalisé.'
            )}
          </SmallCard>
        </aside>

        <main className="flex min-w-0 flex-col overflow-hidden bg-white">
          <div className="shrink-0 border-b border-black/10 px-[18px] py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Mode jeu
                </p>
                <p className="mt-0.5 text-[13px] text-slate-600">
                  Déroulé lisible pendant la partie, puis debrief après chaque session.
                </p>
              </div>

              <div className="flex rounded-lg bg-[#f5f5f3] p-1">
                <PanelButton
                  active={activePanel === 'run'}
                  onClick={() => setActivePanel('run')}
                >
                  Déroulé
                </PanelButton>
                <PanelButton
                  active={activePanel === 'acts'}
                  onClick={() => {
                    setActivePanel('acts');
                    setSelectedActNumber(
                      selectedActNumber ?? data.actes[0]?.numero ?? null,
                    );
                  }}
                >
                  Détail actes
                </PanelButton>
                <PanelButton
                  active={activePanel === 'sessions'}
                  onClick={() => setActivePanel('sessions')}
                >
                  Sessions & debrief
                </PanelButton>
              </div>
            </div>
          </div>

          {activePanel === 'run' ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
              {data.actes.length ? (
                <div className="space-y-3">
                  {data.actes.map((acte) => (
                    <ActCard
                      act={acte}
                      encounters={encountersForAct(acte.numero)}
                      key={acte.numero}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPanel text="Le déroulé sera généré pendant la création." />
              )}

              {data.recompense || data.notesMJ ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {data.recompense ? (
                    <SmallCard icon="star" label="Récompense">
                      {data.recompense}
                    </SmallCard>
                  ) : null}
                  {data.notesMJ ? (
                    <SmallCard icon="note" label="Notes MJ globales">
                      {data.notesMJ}
                    </SmallCard>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : activePanel === 'acts' ? (
            <ActWorkflowPanel
              acts={data.actes}
              busyActNumber={busyActNumber}
              input={selectedAct ? (actDetailInputs[selectedAct.numero] ?? '') : ''}
              onAdvance={(actNumber) =>
                void submitActWorkflow(actNumber, 'ADVANCE')
              }
              onInputChange={(actNumber, value) =>
                setActDetailInputs((current) => ({
                  ...current,
                  [actNumber]: value,
                }))
              }
              onReopen={(actNumber) =>
                void submitActWorkflow(actNumber, 'REOPEN')
              }
              onSelectAct={setSelectedActNumber}
              onValidate={(actNumber) =>
                void submitActWorkflow(actNumber, 'VALIDATE')
              }
              reply={
                selectedAct ? actDetailReplies[selectedAct.numero] : undefined
              }
              selectedAct={selectedAct}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
              {sessions.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {sessions.map((session) => (
                    <SessionDebriefCard
                      busy={busySessionNumber === session.number}
                      input={debriefInputs[session.number] ?? ''}
                      key={session.id}
                      onInputChange={(value) =>
                        setDebriefInputs((current) => ({
                          ...current,
                          [session.number]: value,
                        }))
                      }
                      onMarkPlayed={() => void markPlayed(session.number)}
                      onSubmitDebrief={() => void submitDebrief(session.number)}
                      reply={debriefReplies[session.number]}
                      session={session}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPanel text="Disponible après génération des sessions." />
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-black/10 px-[18px] py-3">
        <button
          className="rounded-lg border border-black/20 bg-[#f5f5f3] px-4 py-2 text-[13px] text-slate-600 transition hover:bg-white disabled:opacity-60"
          onClick={onCreateScenario}
        >
          Création / aventures
        </button>
        <button
          className="rounded-lg border border-black/20 bg-[#f5f5f3] px-4 py-2 text-[13px] text-slate-600 transition hover:bg-white disabled:opacity-60"
          disabled={isExportingPdf}
          onClick={exportPdf}
        >
          {isExportingPdf ? 'Export…' : 'Exporter PDF'}
        </button>
        <button
          className="rounded-lg border border-black/20 bg-[#f5f5f3] px-4 py-2 text-[13px] text-slate-600 transition hover:bg-white disabled:opacity-60"
          disabled={isEditingWithMerlin}
          onClick={editWithMerlin}
        >
          {isEditingWithMerlin ? 'Merlin…' : 'Modifier via Merlin'}
        </button>
        {scenario.status === 'COMPLETE' || scenario.status === 'IN_PROGRESS' ? (
          <button
            className="rounded-lg bg-wizard-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-wizard-700"
            onClick={onPrepareTodo}
          >
            Préparer la partie
          </button>
        ) : null}
        {error ? (
          <p className="ml-auto rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {error}
          </p>
        ) : null}
      </footer>
    </section>
  );
}

function PanelButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'rounded-md px-3 py-1.5 text-[12px] font-medium transition',
        active
          ? 'bg-white text-wizard-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-900',
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActWorkflowPanel({
  acts,
  busyActNumber,
  input,
  onAdvance,
  onInputChange,
  onReopen,
  onSelectAct,
  onValidate,
  reply,
  selectedAct,
}: {
  acts: ScenarioAct[];
  busyActNumber: number | null;
  input: string;
  onAdvance: (actNumber: number) => void;
  onInputChange: (actNumber: number, value: string) => void;
  onReopen: (actNumber: number) => void;
  onSelectAct: (actNumber: number) => void;
  onValidate: (actNumber: number) => void;
  reply?: string;
  selectedAct: ScenarioAct | null;
}) {
  const detail = selectedAct?.detailsMJ;
  const [viewedStep, setViewedStep] = useState<ActWorkflowStep>(
    detail?.currentStep ?? 'OBJECTIF',
  );

  useEffect(() => {
    setViewedStep(detail?.currentStep ?? 'OBJECTIF');
  }, [detail?.currentStep, selectedAct?.numero]);

  if (!selectedAct) {
    return <EmptyPanel text="Aucun acte à détailler." />;
  }

  const busy = busyActNumber === selectedAct.numero;
  const validatedCount = acts.filter(
    (acte) => acte.detailsMJ?.status === 'VALIDATED',
  ).length;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)] overflow-hidden bg-white">
      <aside className="overflow-y-auto border-r border-black/10 bg-[#f7f6f1] px-[18px] py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
          Workflow actes
        </p>
        <p className="mt-1 text-[12px] text-slate-500">
          {validatedCount} / {acts.length} validés
        </p>
        <div className="mt-3 space-y-2">
          {acts.map((acte) => (
            <button
              className={[
                'w-full rounded-lg px-3 py-2 text-left ring-1 transition',
                acte.numero === selectedAct.numero
                  ? 'bg-white ring-wizard-300 shadow-sm'
                  : 'bg-white/80 ring-black/10 hover:bg-white',
              ].join(' ')}
              key={acte.numero}
              onClick={() => onSelectAct(acte.numero)}
            >
              <span className="block text-[12px] font-semibold text-slate-900">
                Acte {acte.numero}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[11px] text-slate-500">
                {acte.titre}
              </span>
              <span
                className={[
                  'mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px]',
                  acte.detailsMJ?.status === 'VALIDATED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : acte.detailsMJ?.status === 'IN_PROGRESS'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500',
                ].join(' ')}
              >
                {acte.detailsMJ?.status ?? 'TODO'}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {detail ? (
        <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden">
          <header className="border-b border-black/10 px-[18px] py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-wizard-600">
                  Acte {selectedAct.numero} avec Merlin
                </p>
                <h3 className="mt-1 truncate text-[20px] font-semibold text-slate-950">
                  {selectedAct.titre}
                </h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-slate-500">
                  {selectedAct.description}
                </p>
              </div>
              <span
                className={[
                  'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium',
                  detail.status === 'VALIDATED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : detail.status === 'IN_PROGRESS'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {detail.status}
              </span>
            </div>
          </header>

          <div className="border-b border-black/10 bg-[#f7f6f1] px-[18px] py-3">
            <div className="grid grid-cols-6 gap-2">
              {ACT_WORKFLOW_STEPS.map((stepMeta, index) => {
                const active = viewedStep === stepMeta.step;
                const current = detail.currentStep === stepMeta.step;
                const reached =
                  ACT_WORKFLOW_STEPS.findIndex(
                    (item) => item.step === detail.currentStep,
                  ) >= index || detail.status === 'VALIDATED';

                return (
                  <button
                    className={[
                      'min-h-[74px] rounded-lg px-2 py-2 text-left ring-1 transition',
                      active
                        ? 'bg-white ring-wizard-300 shadow-sm'
                        : 'bg-white/70 ring-black/10 hover:bg-white',
                    ].join(' ')}
                    key={stepMeta.step}
                    onClick={() => setViewedStep(stepMeta.step)}
                  >
                    <span
                      className={[
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                        current
                          ? 'bg-wizard-600 text-white'
                          : reached
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400',
                      ].join(' ')}
                    >
                      {index + 1}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-slate-900">
                      {stepMeta.label}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-slate-500">
                      {stepMeta.helper}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] overflow-hidden">
            <main className="min-h-0 overflow-y-auto px-[18px] py-4">
              <ActMerlinConversation
                detail={detail}
                reply={reply}
                selectedAct={selectedAct}
                viewedStep={viewedStep}
              />
            </main>
            <aside className="min-h-0 overflow-y-auto border-l border-black/10 bg-[#f7f6f1] px-[18px] py-4">
              <ActStepSummary detail={detail} step={viewedStep} />
            </aside>
          </div>

          <footer className="border-t border-black/10 bg-white px-[18px] py-3">
            <textarea
              className="min-h-20 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-wizard-400"
              disabled={busy}
              onChange={(event) =>
                onInputChange(selectedAct.numero, event.target.value)
              }
              placeholder="Réponds à Merlin pour cet acte : ajoute une voie, rends le combat plus tactique, simplifie l'enquête..."
              value={input}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-black/20 bg-white px-3 py-2 text-[12px] text-slate-700 disabled:opacity-60"
                disabled={busy || detail.status === 'VALIDATED'}
                onClick={() => onAdvance(selectedAct.numero)}
              >
                Avancer avec Merlin
              </button>
              <button
                className="rounded-lg bg-wizard-600 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-60"
                disabled={busy}
                onClick={() =>
                  detail.status === 'VALIDATED'
                    ? onReopen(selectedAct.numero)
                    : onValidate(selectedAct.numero)
                }
              >
                {detail.status === 'VALIDATED'
                  ? "Réouvrir l'acte"
                  : "Valider l'acte"}
              </button>
            </div>
          </footer>
        </div>
      ) : (
        <EmptyPanel text="Cet acte sera initialisé au prochain chargement." />
      )}
    </div>
  );
}

function WorkflowSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <h4 className="text-[13px] font-semibold text-slate-950">{title}</h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ActMerlinConversation({
  detail,
  reply,
  selectedAct,
  viewedStep,
}: {
  detail: NonNullable<ScenarioAct['detailsMJ']>;
  reply?: string;
  selectedAct: ScenarioAct;
  viewedStep: ActWorkflowStep;
}) {
  const stepMeta =
    ACT_WORKFLOW_STEPS.find((item) => item.step === viewedStep) ??
    ACT_WORKFLOW_STEPS[0]!;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <ChatBubble role="assistant">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-wizard-600">
          Merlin · {stepMeta.label}
        </p>
        <p className="mt-2 text-[14px] leading-7 text-slate-800">
          {getActStepPrompt(detail, selectedAct, viewedStep)}
        </p>
      </ChatBubble>

      <ActStepContent detail={detail} step={viewedStep} />

      {detail.notesUtilisateur.length ? (
        <ChatBubble role="user">
          <p className="text-[12px] font-semibold text-slate-900">
            Notes données à Merlin
          </p>
          <ul className="mt-2 space-y-1">
            {detail.notesUtilisateur.map((note, index) => (
              <li className="text-[13px] leading-6 text-slate-700" key={`${note}-${index}`}>
                {note}
              </li>
            ))}
          </ul>
        </ChatBubble>
      ) : null}

      {reply ? (
        <ChatBubble role="assistant">
          <p className="text-[14px] leading-7 text-slate-800">{reply}</p>
        </ChatBubble>
      ) : null}
    </div>
  );
}

function ChatBubble({
  children,
  role,
}: {
  children: ReactNode;
  role: 'assistant' | 'user';
}) {
  return (
    <div
      className={[
        'max-w-[88%] rounded-xl px-4 py-3 ring-1',
        role === 'assistant'
          ? 'self-start bg-wizard-50 ring-wizard-100'
          : 'self-end bg-[#f5f5f3] ring-black/10',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function ActStepContent({
  detail,
  step,
}: {
  detail: NonNullable<ScenarioAct['detailsMJ']>;
  step: ActWorkflowStep;
}) {
  if (step === 'OBJECTIF') {
    return (
      <WorkflowSection title="Objectif de l'acte">
        <p className="text-[13px] leading-6 text-slate-700">
          {detail.objectif.principal}
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <InfoLine label="Réussite complète" value={detail.objectif.reussiteComplete} />
          <InfoLine label="Réussite partielle" value={detail.objectif.reussitePartielle} />
          <InfoLine label="Échec intéressant" value={detail.objectif.echecInteressant} />
          <InfoLine label="Bonus optionnel" value={detail.objectif.bonusOptionnel} />
        </div>
      </WorkflowSection>
    );
  }

  if (step === 'VOIES') {
    return (
      <WorkflowSection title="Voies possibles des joueurs">
        <div className="grid gap-2 md:grid-cols-2">
          {detail.voies.map((voie) => (
            <div className="rounded-lg bg-[#f5f5f3] p-3" key={voie.id}>
              <p className="text-[12px] font-semibold text-slate-900">
                {voie.label}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">
                {voie.actionJoueurs}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                Gain : {voie.gain}
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                Risque : {voie.risque}
              </p>
            </div>
          ))}
        </div>
      </WorkflowSection>
    );
  }

  if (step === 'MODULE') {
    return (
      <WorkflowSection title={`Module ${detail.moduleSpecialise.type}`}>
        <p className="text-[13px] leading-6 text-slate-700">
          {detail.moduleSpecialise.focus}
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {detail.moduleSpecialise.elements.map((element) => (
            <InfoLine
              key={`${element.label}-${element.value}`}
              label={element.label}
              value={element.value}
            />
          ))}
        </div>
      </WorkflowSection>
    );
  }

  if (step === 'SCENES') {
    return (
      <WorkflowSection title="Scènes jouables">
        <div className="space-y-2">
          {detail.scenes.map((scene) => (
            <div className="rounded-lg bg-[#f5f5f3] p-3" key={`${scene.titre}-${scene.objectifMJ}`}>
              <p className="text-[12px] font-semibold text-slate-900">
                {scene.titre}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {scene.objectifMJ}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-slate-700">
                {scene.deroule}
              </p>
              {scene.relanceAntiBlocage ? (
                <p className="mt-2 rounded bg-white px-2 py-1 text-[11px] text-wizard-700">
                  Relance : {scene.relanceAntiBlocage}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </WorkflowSection>
    );
  }

  if (step === 'TIMING') {
    return (
      <WorkflowSection title="Timing MJ">
        <div className="grid gap-2 md:grid-cols-3">
          <InfoLine label="Court" value={detail.timing.versionCourte} />
          <InfoLine label="Standard" value={detail.timing.versionStandard} />
          <InfoLine label="Long" value={detail.timing.versionLongue} />
        </div>
      </WorkflowSection>
    );
  }

  return (
    <WorkflowSection title="Synthèse MJ">
      <p className="text-[13px] leading-6 text-slate-700">
        {detail.syntheseMJ}
      </p>
    </WorkflowSection>
  );
}

function ActStepSummary({
  detail,
  step,
}: {
  detail: NonNullable<ScenarioAct['detailsMJ']>;
  step: ActWorkflowStep;
}) {
  const items =
    step === 'OBJECTIF'
      ? [
          detail.objectif.reussiteComplete,
          detail.objectif.reussitePartielle,
          detail.objectif.echecInteressant,
        ]
      : step === 'VOIES'
        ? detail.voies.map((voie) => voie.label)
        : step === 'MODULE'
          ? detail.moduleSpecialise.elements.map((element) => element.label)
          : step === 'SCENES'
            ? detail.scenes.map((scene) => scene.titre)
            : step === 'TIMING'
              ? detail.timing.aGarderAbsolument
              : [detail.syntheseMJ];

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
        À vérifier
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li className="rounded-lg bg-white px-3 py-2 text-[12px] leading-5 text-slate-600 ring-1 ring-black/10" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getActStepPrompt(
  detail: NonNullable<ScenarioAct['detailsMJ']>,
  selectedAct: ScenarioAct,
  step: ActWorkflowStep,
) {
  const prompts: Record<ActWorkflowStep, string> = {
    OBJECTIF:
      `On commence par clarifier l'objectif de l'acte "${selectedAct.titre}". Dis-moi si tu veux une réussite plus héroïque, plus dangereuse, ou plus mystérieuse.`,
    VOIES:
      "Regardons les différentes voies possibles. Les joueurs doivent pouvoir réussir complètement, partiellement, ou avancer avec un coût.",
    MODULE:
      `Cet acte est surtout ${detail.moduleSpecialise.type}. On peut renforcer les mécaniques propres à ce type de gameplay.`,
    SCENES:
      "On transforme les voies en scènes jouables. Chaque scène doit avoir une relance si les joueurs bloquent.",
    TIMING:
      "Maintenant on prépare le rythme : version courte, standard, longue, et ce qu'il faut couper si la partie ralentit.",
    VALIDATION:
      "Dernière repasse : vérifie que tu saurais lancer l'acte, improviser si les joueurs partent ailleurs, et le conclure.",
  };

  return prompts[step];
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f5f5f3] px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[12px] leading-5 text-slate-700">{value}</p>
    </div>
  );
}

function ActCard({
  act,
  encounters,
}: {
  act: ScenarioAct;
  encounters: ScenarioEncounter[];
}) {
  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
            Acte {act.numero} · {act.type}
          </p>
          <h3 className="mt-1 text-[16px] font-semibold text-slate-950">
            {act.titre}
          </h3>
        </div>
        <div className="shrink-0 rounded-full bg-[#f5f5f3] px-3 py-1 text-[11px] font-medium text-slate-600">
          ~{act.dureeEstimeeMin} min
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-6 text-slate-700">
        {act.description}
      </p>

      {act.options.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {act.options.map((option) => (
            <span
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600"
              key={option}
            >
              {option}
            </span>
          ))}
        </div>
      ) : null}

      {act.notesMJ ? (
        <div className="mt-3 rounded-lg border-l-[3px] border-wizard-600 bg-wizard-100 px-3 py-2 text-[12px] leading-5 text-wizard-700">
          {act.notesMJ}
        </div>
      ) : null}

      {act.detailsMJ ? <ActDetailPanel detail={act.detailsMJ} /> : null}

      {encounters.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {encounters.map((rencontre, index) => (
            <EncounterCard encounter={rencontre} key={index} />
          ))}
        </div>
      ) : null}

      {act.pointDeCoupure ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
          Point de coupure possible après cet acte.
        </p>
      ) : null}
    </article>
  );
}

function ActDetailPanel({
  detail,
}: {
  detail: NonNullable<ScenarioAct['detailsMJ']>;
}) {
  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {detail.scenes.length ? (
        <div className="rounded-lg bg-[#f5f5f3] p-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Scenes MJ
          </p>
          <div className="mt-2 space-y-2">
            {detail.scenes.map((scene) => (
              <div key={`${scene.titre}-${scene.objectifMJ}`}>
                <p className="text-[12px] font-semibold text-slate-900">
                  {scene.titre}
                </p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                  {scene.objectifMJ}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-700">
                  {scene.deroule}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <ActDetailList title="Indices" items={detail.indices} />
        <ActDetailList title="Choix" items={detail.choixConsequences} />
        <ActDetailList title="Transitions" items={detail.transitions} />
        <ActDetailList title="Preparation" items={detail.preparation} />
        <ActDetailList title="Impro" items={detail.notesImpro} />
      </div>
    </div>
  );
}

function ActDetailList({ items, title }: { items: string[]; title: string }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li className="text-[11px] leading-5 text-slate-600" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EncounterCard({ encounter }: { encounter: ScenarioEncounter }) {
  return (
    <div className="rounded-lg bg-[#f5f5f3] px-3 py-2 text-[12px] text-slate-700">
      <p className="font-medium text-slate-900">
        {encounter.nombre} × {encounter.monsterId}
      </p>
      <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
        {encounter.contexte}
      </p>
      {encounter.carteBattleMat ? (
        <p className="mt-1 text-[11px] font-medium text-wizard-600">
          Battle Mat V{encounter.carteBattleMat.volume} p.
          {encounter.carteBattleMat.pages.join('-')} ·{' '}
          {encounter.carteBattleMat.nom}
        </p>
      ) : null}
      {encounter.recompense ? (
        <p className="mt-1 text-[11px] text-slate-500">
          Récompense : {encounter.recompense}
        </p>
      ) : null}
    </div>
  );
}

function SessionDebriefCard({
  busy,
  input,
  onInputChange,
  onMarkPlayed,
  onSubmitDebrief,
  reply,
  session,
}: {
  busy: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onMarkPlayed: () => void;
  onSubmitDebrief: () => void;
  reply?: string;
  session: ScenarioSession;
}) {
  return (
    <article className="rounded-xl border border-black/10 bg-[#f5f5f3] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
            Session {session.number}
          </p>
          <p className="mt-1 text-[13px] font-medium text-slate-900">
            Actes {session.plannedActes.join(', ')} ·{' '}
            {session.plannedDuration ?? '—'} min
          </p>
        </div>
        <span
          className={[
            'rounded-full px-2.5 py-1 text-[10px] font-medium',
            session.status === 'PLAYED'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-200 text-slate-600',
          ].join(' ')}
        >
          {session.status === 'PLAYED' ? 'Jouée' : 'Prévue'}
        </span>
      </div>

      {session.recapHook ? (
        <p className="mt-2 text-[12px] leading-5 text-slate-600">
          {session.recapHook}
        </p>
      ) : null}

      {session.status !== 'PLAYED' ? (
        <button
          className="mt-3 rounded-full bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
          disabled={busy}
          onClick={onMarkPlayed}
        >
          Marquer jouée
        </button>
      ) : null}

      <textarea
        className="mt-3 min-h-24 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px] outline-none ring-wizard-200 transition focus:ring-4"
        placeholder="Ce qui s’est passé, ce qui a changé dans le monde…"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
      />
      <button
        className="mt-2 rounded-full bg-wizard-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
        disabled={busy || !input.trim()}
        onClick={onSubmitDebrief}
      >
        Envoyer le debrief
      </button>

      {reply ? (
        <div className="mt-3 rounded-lg bg-wizard-100 px-3 py-2 text-[11px] leading-5 text-wizard-700">
          <FormattedText compact text={reply} />
        </div>
      ) : null}
    </article>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-[#f5f5f3] px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] text-slate-500">
        <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-slate-900">
        {value ?? '—'}
      </p>
    </div>
  );
}

function SmallCard({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg bg-white px-4 py-3 text-[12px] leading-5 text-slate-700 ring-1 ring-black/10">
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
        <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      </p>
      {children}
    </article>
  );
}

function StatusPill({ status }: { status: ScenarioSummary['status'] }) {
  return (
    <span
      className={[
        'rounded-full px-2.5 py-1 text-[10px] font-medium',
        status === 'COMPLETE'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'PLAYED'
            ? 'bg-indigo-100 text-indigo-700'
            : status === 'IN_PROGRESS'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600',
      ].join(' ')}
    >
      {scenarioStatusLabel(status)}
    </span>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-[#f5f5f3] px-4 py-5 text-center text-[13px] text-slate-500">
      {text}
    </p>
  );
}

function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-white p-8">
      <div className="max-w-md rounded-xl bg-[#f5f5f3] p-6 text-center ring-1 ring-black/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-wizard-100 text-2xl">
          <Icon name="scenario" className="h-7 w-7 text-wizard-700" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">{text}</p>
        <button
          className="mt-5 rounded-lg bg-wizard-600 px-4 py-2 text-[13px] font-medium text-white"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function scenarioStatusLabel(status: ScenarioSummary['status']) {
  if (status === 'COMPLETE') return 'Prêt';
  if (status === 'PLAYED') return 'Joué';
  if (status === 'IN_PROGRESS') return 'En cours';
  return 'Brouillon';
}

function slugifyFilename(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'scenario';
}
