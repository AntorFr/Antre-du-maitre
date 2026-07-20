import type { ScenarioSession, ScenarioSummary } from '@antre-du-maitre/shared';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { FormattedText } from '../components/FormattedText';
import { Icon, type IconName } from '../components/Icon';
import { MicButton } from '../components/MicButton';
import { api, ApiError } from '../lib/api';

type ScenarioProps = {
  token: string;
  scenario: ScenarioSummary | null;
  initialPanel?: ScenarioPanel;
  onCreateScenario: () => void;
  onScenarioChange: (scenario: ScenarioSummary) => void;
  onWorldProposal: () => void;
};

type ScenarioPanel = 'run' | 'act-detail' | 'acts' | 'sessions';
type ScenarioAct = ScenarioSummary['data']['actes'][number];
type ScenarioEncounter = ScenarioSummary['data']['rencontres'][number];
type ScenarioPnj = ScenarioSummary['data']['pnjs'][number];
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
  initialPanel = 'run',
  onCreateScenario,
  onScenarioChange,
  onWorldProposal,
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
  const [actDetailSuggestions, setActDetailSuggestions] = useState<
    Record<number, string[]>
  >({});
  const [actDetailChangedSections, setActDetailChangedSections] = useState<
    Record<number, ActWorkflowStep[]>
  >({});
  const [actDetailPendingMessages, setActDetailPendingMessages] = useState<
    Record<number, string | undefined>
  >({});
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
  const [isOpeningActDetail, setIsOpeningActDetail] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActivePanel(initialPanel);
    setSelectedActNumber(scenario?.data.actes[0]?.numero ?? null);
    setError(null);
  }, [initialPanel, scenario?.id]);

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

  async function submitActWorkflow(
    actNumber: number,
    action: 'ADVANCE' | 'VALIDATE' | 'REOPEN',
    messageOverride?: string,
    stepOverride?: ActWorkflowStep,
  ) {
    if (!scenario) return;

    const message =
      messageOverride?.trim() ||
      actDetailInputs[actNumber]?.trim() ||
      undefined;

    setError(null);
    setBusyActNumber(actNumber);
    setActDetailPendingMessages((current) => ({
      ...current,
      [actNumber]: message,
    }));
    setActDetailInputs((current) =>
      message
        ? {
            ...current,
            [actNumber]: '',
          }
        : current,
    );

    try {
      const response = await api.chatActDetail(token, scenario.id, actNumber, {
        action,
        message,
        step: stepOverride,
      });

      onScenarioChange(response.scenario);
      setActDetailReplies((current) => ({
        ...current,
        [actNumber]: response.reply,
      }));
      setActDetailSuggestions((current) => ({
        ...current,
        [actNumber]: response.suggestions,
      }));
      setActDetailChangedSections((current) => ({
        ...current,
        [actNumber]: response.changedSections,
      }));
    } catch (caughtError) {
      if (message) {
        setActDetailInputs((current) => ({
          ...current,
          [actNumber]: message,
        }));
      }
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Impossible d'avancer le detail de cet acte.",
      );
    } finally {
      setBusyActNumber(null);
      setActDetailPendingMessages((current) => ({
        ...current,
        [actNumber]: undefined,
      }));
    }
  }

  async function openActDetail(actNumber: number) {
    if (!scenario) return;

    setSelectedActNumber(actNumber);
    setIsOpeningActDetail(true);
    setError(null);

    try {
      const { scenario: detailedScenario } = await api.getScenario(
        token,
        scenario.id,
      );

      onScenarioChange(detailedScenario);
      setActivePanel('act-detail');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "Impossible d'ouvrir le détail de cet acte.",
      );
    } finally {
      setIsOpeningActDetail(false);
    }
  }

  if (!scenario) {
    return (
      <EmptyState
        title="Aucun scénario sélectionné"
        text="Crée une aventure ou ouvre un scénario depuis l'accueil."
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

  if (activePanel === 'act-detail') {
    return (
      <section className="flex h-full flex-col overflow-hidden bg-white">
        <Breadcrumb
          current={
            selectedAct
              ? `Acte ${selectedAct.numero} · ${selectedAct.titre}`
              : 'Détail acte'
          }
          onBack={() => setActivePanel('run')}
        />
        <ActReviewPanel
          act={selectedAct}
          encounters={selectedAct ? encountersForAct(selectedAct.numero) : []}
          onEditWithMerlin={() => setActivePanel('acts')}
          pnjs={data.pnjs}
        />
      </section>
    );
  }

  if (activePanel === 'acts') {
    return (
      <section className="flex h-full flex-col overflow-hidden bg-white">
        <Breadcrumb
          current={
            selectedAct
              ? `Déroulé · Acte ${selectedAct.numero}`
              : 'Déroulé · Acte'
          }
          onBack={() => setActivePanel('run')}
        />
        <ActWorkflowPanel
          acts={data.actes}
          busyActNumber={busyActNumber}
          error={error}
          changedSections={
            selectedAct ? actDetailChangedSections[selectedAct.numero] : undefined
          }
          input={selectedAct ? (actDetailInputs[selectedAct.numero] ?? '') : ''}
          onAdvance={(actNumber, message, step) =>
            void submitActWorkflow(actNumber, 'ADVANCE', message, step)
          }
          onInputChange={(actNumber, value) =>
            setActDetailInputs((current) => ({
              ...current,
              [actNumber]: value,
            }))
          }
          onReopen={(actNumber) => void submitActWorkflow(actNumber, 'REOPEN')}
          onSelectAct={setSelectedActNumber}
          onValidate={(actNumber) => void submitActWorkflow(actNumber, 'VALIDATE')}
          pendingMessage={
            selectedAct ? actDetailPendingMessages[selectedAct.numero] : undefined
          }
          reply={selectedAct ? actDetailReplies[selectedAct.numero] : undefined}
          selectedAct={selectedAct}
          suggestionsOverride={
            selectedAct ? actDetailSuggestions[selectedAct.numero] : undefined
          }
        />
      </section>
    );
  }

  if (activePanel === 'sessions') {
    return (
      <section className="flex h-full flex-col overflow-hidden bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#faf9f5] px-[18px] py-4">
          <div className="mx-auto max-w-[1000px]">
            <SectionHeader
              kicker="Sessions"
              title={`${sessions.length} session${sessions.length > 1 ? 's' : ''} prévue${sessions.length > 1 ? 's' : ''}`}
              action={null}
            />
            {sessions.length ? (
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
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
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#faf9f5]">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-5 px-6 py-5">
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700 ring-1 ring-rose-100">
              {error}
            </p>
          ) : null}

          <section className="grid gap-5 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
                {data.lieu?.nom ?? 'Aventure'} · {data.ambiance ?? 'Sensation'}
              </p>
              <div className="mt-2 flex items-start gap-3">
                <h1 className="min-w-0 flex-1 text-[24px] font-bold leading-tight text-slate-950">
                  {scenario.title}
                </h1>
                <StatusPill status={scenario.status} />
              </div>
              <p className="mt-3 max-w-[680px] text-[13px] leading-6 text-slate-600">
                {data.quete?.phraseSimple ??
                  data.lieu?.description ??
                  'Les grandes lignes du scénario apparaîtront ici quand Merlin aura terminé la création.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-black/15 bg-[#f5f5f3] px-3 text-[12px] font-medium text-slate-600 transition hover:bg-white"
                  onClick={onCreateScenario}
                >
                  <Icon name="magic" className="h-4 w-4" />
                  Modifier avec Merlin
                </button>
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-black/15 bg-[#f5f5f3] px-3 text-[12px] font-medium text-slate-600 transition hover:bg-white disabled:opacity-60"
                  disabled={isExportingPdf}
                  onClick={exportPdf}
                >
                  <Icon name="note" className="h-4 w-4" />
                  {isExportingPdf ? 'Export…' : 'Générer le PDF'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <OverviewMetric
                icon="clock"
                label="Durée"
                value={totalDuration ? `~${totalDuration} min` : 'À définir'}
              />
              <OverviewMetric
                icon="scenario"
                label="Actes"
                value={`${data.actes.length}`}
              />
              <OverviewMetric
                icon="users"
                label="PNJs"
                value={`${data.pnjs.length}`}
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewInfoCard icon="location" label="Lieu principal">
              {data.lieu ? (
                <>
                  <p className="font-medium text-slate-900">{data.lieu.nom}</p>
                  <p className="mt-1 text-slate-600">{data.lieu.description}</p>
                </>
              ) : (
                'Pas encore défini.'
              )}
            </OverviewInfoCard>

            <OverviewInfoCard icon="skull" label="Antagoniste">
              {data.antagoniste ? (
                <>
                  <p className="font-medium text-slate-900">
                    {data.antagoniste.nom}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {data.antagoniste.motivation ??
                      data.antagoniste.description}
                  </p>
                </>
              ) : (
                'Pas encore défini.'
              )}
            </OverviewInfoCard>
          </div>

          <OverviewInfoCard icon="spark" label="Quête principale">
            {data.quete ? (
              <>
                <p className="font-medium text-slate-900">
                  {data.quete.phraseSimple}
                </p>
                <dl className="mt-3 grid gap-2 md:grid-cols-2">
                  <QuestLine label="Ce qui ne va pas" value={data.quete.ceQuiNeVaPas} />
                  <QuestLine label="Pourquoi c'est grave" value={data.quete.pourquoiCestGrave} />
                  <QuestLine label="Pourquoi maintenant" value={data.quete.pourquoiMaintenant} />
                  <QuestLine
                    label="Si personne n'agit"
                    value={data.quete.ceQuiArriveSiPersonneNagit}
                  />
                </dl>
              </>
            ) : (
              'Pas encore définie.'
            )}
          </OverviewInfoCard>

          <OverviewInfoCard icon="star" label="Objectif des héros">
            {data.objectifDesHeros ? (
              <>
                <p className="font-medium text-slate-900">
                  {data.objectifDesHeros.phraseSimple}
                </p>
                <p className="mt-1 text-slate-600">
                  {data.objectifDesHeros.objectifVisible}
                </p>
                <p className="mt-1 text-slate-600">
                  Réussite : {data.objectifDesHeros.signeDeReussite}
                </p>
              </>
            ) : (
              'Pas encore défini.'
            )}
          </OverviewInfoCard>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/10">
            <SectionHeader
              kicker="Personnages"
              title={`${data.pnjs.length} PNJ${data.pnjs.length > 1 ? 's' : ''} peuplent l'aventure`}
              action={
                <button className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-black/15 bg-[#f5f5f3] px-3 text-[12px] font-medium text-slate-600 transition hover:bg-white">
                  <Icon name="users" className="h-3.5 w-3.5" />
                  Ajouter un PNJ
                </button>
              }
            />
            {data.pnjs.length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {data.pnjs.map((pnj) => (
                  <PnjOverviewCard key={pnj.nom} pnj={pnj} />
                ))}
              </div>
            ) : (
              <EmptyInline text="Aucun PNJ défini." />
            )}
          </section>

          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/10">
            <SectionHeader
              kicker="Déroulé"
              title={`${data.actes.length} acte${data.actes.length > 1 ? 's' : ''} pour guider la partie`}
              action={null}
            />
            {data.actes.length ? (
              <div className="mt-3 space-y-2">
                {data.actes.map((acte) => (
                  <ActOverviewRow
                    act={acte}
                    encounterCount={encountersForAct(acte.numero).length}
                    key={acte.numero}
                    busy={isOpeningActDetail && selectedActNumber === acte.numero}
                    onOpen={() => void openActDetail(acte.numero)}
                  />
                ))}
              </div>
            ) : (
              <EmptyInline text="Le déroulé sera généré pendant la création." />
            )}
          </section>

          {data.fin || data.recompense || data.notesMJ ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.fin ? (
                <OverviewInfoCard icon="star" label="Fin satisfaisante">
                  <p className="font-medium text-slate-900">
                    {data.fin.conditionDeVictoire}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {data.fin.sceneDeResolution}
                  </p>
                </OverviewInfoCard>
              ) : null}
              {data.recompense || data.notesMJ ? (
                <OverviewInfoCard icon="gem" label="Récompense & notes">
                  {data.recompense ? (
                    <p className="text-slate-600">{data.recompense}</p>
                  ) : null}
                  {data.notesMJ ? (
                    <p className="mt-2 text-slate-600">{data.notesMJ}</p>
                  ) : null}
                </OverviewInfoCard>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Breadcrumb({
  current,
  onBack,
}: {
  current: string;
  onBack: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-black/10 bg-[#f7f6f1] px-[18px] py-2">
      <button
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-slate-500 transition hover:bg-white hover:text-wizard-700"
        onClick={onBack}
      >
        <Icon name="scenario" className="h-3.5 w-3.5" />
        Vue d'ensemble
      </button>
      <span className="text-[11px] text-slate-400">/</span>
      <span className="text-[12px] font-medium text-slate-800">{current}</span>
    </div>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[#f5f5f3] px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Icon name={icon} className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-[18px] font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function OverviewInfoCard({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: IconName;
  label: string;
}) {
  return (
    <section className="rounded-xl bg-white p-4 text-[13px] leading-6 shadow-sm ring-1 ring-black/10">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-wizard-600">
        <Icon name={icon} className="h-4 w-4" />
        {label}
      </p>
      <div className="text-slate-600">{children}</div>
    </section>
  );
}

function SectionHeader({
  action,
  kicker,
  title,
}: {
  action: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
          {kicker}
        </p>
        <h2 className="mt-1 text-[17px] font-semibold text-slate-950">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function PnjOverviewCard({ pnj }: { pnj: ScenarioPnj }) {
  return (
    <article className="rounded-lg bg-[#f5f5f3] p-3 text-[13px] leading-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wizard-100 text-wizard-700">
          <Icon name="user" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{pnj.nom}</p>
          <p className="mt-0.5 text-[12px] text-wizard-600">
            {pnj.fonctionNarrative ?? pnj.role}
          </p>
          <p className="mt-1 line-clamp-3 text-slate-600">
            {pnj.description || pnj.attitude || 'À compléter.'}
          </p>
        </div>
      </div>
    </article>
  );
}

function ActOverviewRow({
  act,
  busy,
  encounterCount,
  onOpen,
}: {
  act: ScenarioAct;
  busy: boolean;
  encounterCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      className="grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-start gap-3 rounded-lg bg-[#f5f5f3] px-3 py-3 text-left transition hover:bg-wizard-50 hover:ring-1 hover:ring-wizard-200"
      disabled={busy}
      onClick={onOpen}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-wizard-600 text-[12px] font-semibold text-white">
        {act.numero}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-slate-950">{act.titre}</p>
        <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-600">
          {act.description}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
        <span>{act.dureeEstimeeMin} min</span>
        {encounterCount ? <span>{encounterCount} rencontre(s)</span> : null}
        <span className="font-medium text-wizard-600">
          {busy ? 'Ouverture…' : 'Détailler'}
        </span>
      </div>
    </button>
  );
}

function ActReviewPanel({
  act,
  encounters,
  onEditWithMerlin,
  pnjs,
}: {
  act: ScenarioAct | null;
  encounters: ScenarioEncounter[];
  onEditWithMerlin: () => void;
  pnjs: ScenarioPnj[];
}) {
  if (!act) {
    return <EmptyPanel text="Aucun acte à afficher." />;
  }

  const detail = act.detailsMJ;
  const actPnjs = findPnjsForAct(act, pnjs);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <section className="grid shrink-0 grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-5 border-b border-black/10 bg-white px-7 py-5">
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[2.5px] border-wizard-200 bg-gradient-to-br from-wizard-500 to-wizard-700 text-[28px] font-bold text-white shadow-[0_4px_12px_rgba(83,74,183,0.25)]">
          {act.numero}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wizard-600">
            Acte {act.numero} · {act.type || act.roleDansLHistoire || 'Déroulé'}
          </p>
          <h2 className="mt-1 text-[22px] font-bold leading-tight text-slate-950">
            {act.titre}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-wizard-50 px-3 py-1 text-[11px] font-semibold text-wizard-700">
              <Icon name="spark" className="h-3 w-3" />
              {detail?.objectif.typePrincipal ?? act.type ?? 'À préciser'} dominant
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500">
              <Icon name="clock" className="h-3.5 w-3.5" />
              ~{act.dureeEstimeeMin} min
            </span>
            {act.lieu ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500">
                <Icon name="location" className="h-3.5 w-3.5 text-emerald-700" />
                {act.lieu}
              </span>
            ) : null}
          </div>
        </div>
        <button
          className="inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-lg bg-wizard-600 px-5 text-[13px] font-semibold text-white shadow-[0_2px_6px_rgba(83,74,183,0.25)] transition hover:bg-wizard-700"
          onClick={onEditWithMerlin}
        >
          <Icon name="magic" className="h-4 w-4" />
          Modifier avec Merlin
        </button>
      </section>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#faf9f5] px-7 py-5">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
          <section className="rounded-xl border-l-4 border-wizard-600 bg-white px-5 py-4 shadow-sm ring-1 ring-black/10">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-wizard-600">
              <Icon name="star" className="h-3.5 w-3.5" />
              Objectif MJ
            </p>
            <p className="mt-2 text-[15px] font-medium leading-7 text-slate-950">
              {detail?.objectif.principal ?? act.description}
            </p>
            <p className="mt-3 border-t border-black/10 pt-3 text-[13px] italic leading-6 text-slate-500">
              <span className="font-semibold text-slate-700">Enjeu narratif :</span>{' '}
              {detail?.objectif.enjeu ??
                act.obstaclePrincipal ??
                act.informationApprise ??
                act.notesMJ ??
                'À préciser avec Merlin.'}
            </p>
          </section>

          {detail?.voies.length ? (
            <section className="flex flex-col gap-3">
              <ActSectionTitle
                icon="map"
                kicker="Voies offertes aux joueurs"
                help="Différentes manières d'aborder l'acte selon les choix de la table."
              />
              <div className="grid gap-3 md:grid-cols-3">
                {detail.voies.slice(0, 3).map((voie, index) => (
                  <article
                    className="relative min-h-[120px] rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/10"
                    key={voie.id}
                  >
                    <span className="absolute -top-2 left-4 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-[#faf9f5] bg-wizard-600 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-wizard-50 text-wizard-700">
                        <Icon name={voieIcon(index)} className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-[13px] font-semibold text-slate-950">
                        {voie.label}
                      </p>
                    </div>
                    <p className="mt-2 text-[12px] leading-6 text-slate-500">
                      {voie.actionJoueurs}
                    </p>
                    {voie.preparationMJ.length ? (
                      <div className="mt-3 rounded-lg bg-[#f5f5f3] px-3 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                          À jouer côté MJ
                        </p>
                        <ul className="mt-1 space-y-1">
                          {voie.preparationMJ.slice(0, 3).map((item) => (
                            <li
                              className="text-[11px] leading-5 text-slate-600"
                              key={item}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : act.options.length ? (
            <section className="flex flex-col gap-3">
              <ActSectionTitle
                icon="map"
                kicker="Voies offertes aux joueurs"
                help="Différentes manières d'aborder l'acte selon les choix de la table."
              />
              <div className="grid gap-3 md:grid-cols-3">
                {act.options.slice(0, 3).map((option, index) => (
                  <article
                    className="relative min-h-[110px] rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/10"
                    key={option}
                  >
                    <span className="absolute -top-2 left-4 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-[#faf9f5] bg-wizard-600 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-[13px] font-semibold text-slate-950">
                      {option}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <ActSectionTitle
              actionLabel="Ajouter"
              icon="battle"
              kicker="Rencontres clés"
            />
            {encounters.length ? (
              <div className="flex flex-col gap-2">
                {encounters.map((encounter, index) => (
                  <article
                    className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/10"
                    key={`${encounter.monsterId}-${index}`}
                  >
                    <span className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                      <Icon name="battle" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        Rencontre · acte {encounter.acteNumero}
                      </p>
                      <p className="mt-0.5 text-[13.5px] font-semibold text-slate-950">
                        {encounter.monsterId}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        {encounter.contexte}
                      </p>
                    </div>
                    <div className="text-right text-[11px] font-medium text-slate-500">
                      <p>{encounter.nombre} adversaire(s)</p>
                      {encounter.carteBattleMat ? (
                        <p className="mt-1">{encounter.carteBattleMat.nom}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyInline text="Aucune rencontre dédiée à cet acte pour le moment." />
            )}
          </section>

          {detail?.scenes.length ? (
            <section className="flex flex-col gap-3">
              <ActSectionTitle
                icon="scenario"
                kicker="Découpage MJ"
                help="Scènes séquentielles"
              />
              <div className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/10">
                {detail.scenes.map((scene, index) => (
                  <div
                    className="relative grid grid-cols-[26px_minmax(0,1fr)] gap-4 py-2"
                    key={`${scene.titre}-${scene.objectifMJ}`}
                  >
                    {index < detail.scenes.length - 1 ? (
                      <span className="absolute bottom-[-10px] left-[13px] top-8 w-px bg-wizard-200" />
                    ) : null}
                    <span className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full border border-wizard-200 bg-wizard-50 text-[11px] font-bold text-wizard-700">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] font-semibold text-slate-950">
                        {scene.titre}{' '}
                        <span className="ml-2 text-[10px] font-medium text-slate-400">
                          +{Math.round((act.dureeEstimeeMin / detail.scenes.length) * index)} min
                        </span>
                      </p>
                      <p className="mt-1 text-[12px] leading-6 text-slate-500">
                        {scene.deroule}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {detail ? (
            <section className="flex flex-col gap-3">
              <ActSectionTitle icon="clock" kicker="Timing & coupes" />
              <div className="grid gap-3 md:grid-cols-3">
                <TimingBox icon="clock" label="Durée prévue" value={`~${act.dureeEstimeeMin} min`} />
                <TimingBox icon="zap" label="Tempo" value={detail.objectif.typePrincipal} />
                <TimingBox icon="scenario" label="Acte suivant" value={`Acte ${act.numero + 1}`} />
              </div>
              <div className="flex gap-3 rounded-lg bg-gradient-to-br from-amber-50 to-white px-4 py-3 text-amber-900 ring-1 ring-amber-200">
                <Icon name="todo" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                    Point de coupe possible
                  </p>
                  <p className="mt-1 text-[12px] font-medium leading-6">
                    {act.pointDeCoupure
                      ? detail.timing.versionCourte
                      : detail.timing.aCouperSiBesoin.join(', ') ||
                        'À définir avec Merlin.'}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <ActSectionTitle icon="users" kicker="PNJs présents dans cet acte" />
            {actPnjs.length ? (
              <div className="flex flex-wrap gap-2">
                {actPnjs.map((pnj) => (
                  <span
                    className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[12.5px] font-medium text-slate-950 shadow-sm ring-1 ring-black/10"
                    key={pnj.nom}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-wizard-200 bg-gradient-to-br from-wizard-500 to-wizard-700 text-[10px] font-bold text-white">
                      {initials(pnj.nom)}
                    </span>
                    {pnj.nom}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyInline text="Aucun PNJ clairement associé à cet acte." />
            )}
          </section>

          <div className="flex gap-3 rounded-lg bg-wizard-50 px-4 py-3 text-[13px] leading-6 text-wizard-900 ring-1 ring-wizard-100">
            <Icon name="magic" className="mt-0.5 h-4 w-4 shrink-0 text-wizard-700" />
            <p>
              Cet acte est préparé via le workflow Merlin en 6 étapes. Pour
              modifier n'importe quel élément, lance le bouton{' '}
              <span className="font-semibold">Modifier avec Merlin</span> en haut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActSectionTitle({
  actionLabel,
  help,
  icon,
  kicker,
}: {
  actionLabel?: string;
  help?: string;
  icon: IconName;
  kicker: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wizard-50 text-wizard-600">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-wizard-600">
          {kicker}
          {help ? (
            <span className="ml-2 normal-case tracking-normal text-slate-500">
              — {help}
            </span>
          ) : null}
        </p>
      </div>
      {actionLabel ? (
        <button className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-black/15 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-wizard-50 hover:text-wizard-700">
          <Icon name="spark" className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}

function TimingBox({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white px-4 py-3 text-center shadow-sm ring-1 ring-black/10">
      <Icon name={icon} className="mx-auto h-4 w-4 text-wizard-600" />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[14px] font-bold text-slate-950">{value}</p>
    </div>
  );
}

function findPnjsForAct(act: ScenarioAct, pnjs: ScenarioPnj[]) {
  const haystack = [
    act.titre,
    act.description,
    act.lieu,
    act.obstaclePrincipal,
    act.informationApprise,
    act.notesMJ,
    ...(act.options ?? []),
    ...(act.detailsMJ?.scenes.map((scene) => scene.deroule) ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return pnjs.filter((pnj) =>
    pnj.nom
      .toLowerCase()
      .split(/\s+/)
      .some((part) => part.length > 2 && haystack.includes(part)),
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function voieIcon(index: number): IconName {
  return index === 0 ? 'users' : index === 1 ? 'search' : 'zap';
}

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-lg bg-[#f5f5f3] px-4 py-6 text-center text-[13px] text-slate-500">
      {text}
    </div>
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
  changedSections,
  error,
  input,
  onAdvance,
  onInputChange,
  onReopen,
  onSelectAct,
  onValidate,
  pendingMessage,
  reply,
  selectedAct,
  suggestionsOverride,
}: {
  acts: ScenarioAct[];
  busyActNumber: number | null;
  changedSections?: ActWorkflowStep[];
  error?: string | null;
  input: string;
  onAdvance: (
    actNumber: number,
    message?: string,
    step?: ActWorkflowStep,
  ) => void;
  onInputChange: (actNumber: number, value: string) => void;
  onReopen: (actNumber: number) => void;
  onSelectAct: (actNumber: number) => void;
  onValidate: (actNumber: number) => void;
  pendingMessage?: string;
  reply?: string;
  selectedAct: ScenarioAct | null;
  suggestionsOverride?: string[];
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

  if (!detail) {
    return <EmptyPanel text="Cet acte sera initialisé au prochain chargement." />;
  }

  const busy = busyActNumber === selectedAct.numero;
  const validatedCount = acts.filter(
    (acte) => acte.detailsMJ?.status === 'VALIDATED',
  ).length;
  const currentStepIndex = ACT_WORKFLOW_STEPS.findIndex(
    (item) => item.step === detail.currentStep,
  );
  const progressPct = Math.round(
    ((Math.max(currentStepIndex, 0) + 1) / ACT_WORKFLOW_STEPS.length) * 100,
  );
  const suggestions = suggestionsOverride?.length
    ? suggestionsOverride
    : buildActWorkflowSuggestions(detail, viewedStep);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <ol className="flex items-center bg-[#f5f5f3] px-4 py-2">
        {ACT_WORKFLOW_STEPS.map((stepMeta, index) => {
          const state =
            detail.status === 'VALIDATED' || index < currentStepIndex
              ? 'done'
              : index === currentStepIndex
                ? 'active'
                : 'todo';
          const selected = viewedStep === stepMeta.step;

          return (
            <li className="flex min-w-0 flex-1 items-center" key={stepMeta.step}>
              <button
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
                onClick={() => setViewedStep(stepMeta.step)}
              >
                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                    state === 'done'
                      ? 'border-wizard-300 bg-wizard-100 text-wizard-700'
                      : state === 'active'
                        ? 'border-wizard-600 bg-wizard-600 text-white'
                        : 'border-black/10 bg-white text-slate-400',
                    selected ? 'ring-2 ring-wizard-200 ring-offset-1' : '',
                  ].join(' ')}
                >
                  {state === 'done' ? (
                    <Icon name="check" className="h-3.5 w-3.5" />
                  ) : state === 'active' ? (
                    <Icon name="spark" className="h-3.5 w-3.5" />
                  ) : null}
                </span>
                <span
                  className={[
                    'max-w-16 truncate text-center text-[9px]',
                    state === 'active' || selected
                      ? 'font-medium text-wizard-600'
                      : 'text-slate-500',
                  ].join(' ')}
                >
                  {stepMeta.label}
                </span>
              </button>
              {index < ACT_WORKFLOW_STEPS.length - 1 ? (
                <div className="mb-4 h-px flex-1 bg-black/10" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="shrink-0 border-b border-black/10 bg-white px-[18px] py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-lg bg-[#f5f5f3] px-4 py-2">
            <span className="whitespace-nowrap text-[12px] text-slate-500">
              Focus Merlin
            </span>
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-wizard-600"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-[12px] font-medium text-wizard-600">
              {Math.max(currentStepIndex, 0) + 1} / {ACT_WORKFLOW_STEPS.length}
            </span>
          </div>

          <div className="flex min-w-[280px] flex-wrap gap-2">
            {acts.map((acte) => (
              <button
                className={[
                  'inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium transition',
                  acte.numero === selectedAct.numero
                    ? 'border-wizard-300 bg-wizard-50 text-wizard-700'
                    : 'border-black/15 bg-[#f5f5f3] text-slate-600 hover:bg-white',
                ].join(' ')}
                key={acte.numero}
                onClick={() => onSelectAct(acte.numero)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px]">
                  {acte.numero}
                </span>
                <span className="max-w-28 truncate">{acte.titre}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#faf9f5] px-[18px] py-4">
        <div className="mx-auto flex max-w-[840px] flex-col gap-3">
          <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-wizard-600">
                  Acte {selectedAct.numero} avec Merlin
                </p>
                <h3 className="mt-1 text-[20px] font-semibold leading-7 text-slate-950">
                  {selectedAct.titre}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-600">
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
                {validatedCount} / {acts.length} validés
              </span>
            </div>
          </section>

          <ActMerlinConversation
            isMerlinWorking={busy}
            changedSections={changedSections}
            detail={detail}
            onViewStep={setViewedStep}
            pendingMessage={pendingMessage}
            reply={reply}
            selectedAct={selectedAct}
            viewedStep={viewedStep}
          />

          {!busy ? (
            <ActSuggestionPanel
              detail={detail}
              onAdvance={(message) =>
                onAdvance(selectedAct.numero, message, viewedStep)
              }
              onReopen={() => onReopen(selectedAct.numero)}
              onValidate={() => onValidate(selectedAct.numero)}
              suggestions={suggestions}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="shrink-0 border-t border-rose-100 bg-rose-50 px-[18px] py-2 text-[12px] text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex shrink-0 gap-2 border-t border-black/10 bg-white px-[18px] py-3">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAdvance(selectedAct.numero, undefined, viewedStep);
          }}
        >
          <MicButton
            disabled={busy || detail.status === 'VALIDATED'}
            onTranscript={(transcript) =>
              onInputChange(selectedAct.numero, transcript)
            }
          />
          <input
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-black/15 bg-[#f5f5f3] px-4 text-[13px] outline-none ring-wizard-300 transition focus:ring-4"
            disabled={busy || detail.status === 'VALIDATED'}
            onChange={(event) =>
              onInputChange(selectedAct.numero, event.target.value)
            }
            placeholder={
              busy
                ? 'Merlin prépare la réponse…'
                : "Écris une réponse à Merlin pour détailler l'acte…"
            }
            value={input}
          />
          <button
            className="min-h-11 rounded-lg bg-wizard-600 px-5 text-[13px] font-medium text-white transition hover:bg-wizard-700 disabled:opacity-60"
            disabled={busy || detail.status === 'VALIDATED'}
          >
            {busy ? 'Merlin…' : 'Envoyer'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ActSuggestionPanel({
  detail,
  onAdvance,
  onReopen,
  onValidate,
  suggestions,
}: {
  detail: NonNullable<ScenarioAct['detailsMJ']>;
  onAdvance: (message?: string) => void;
  onReopen: () => void;
  onValidate: () => void;
  suggestions: string[];
}) {
  function handleSuggestion(suggestion: string) {
    const normalized = suggestion
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

    if (normalized.includes('reouvrir')) {
      onReopen();
      return;
    }

    if (normalized.includes('valider')) {
      onValidate();
      return;
    }

    onAdvance(normalized === 'avancer' ? undefined : suggestion);
  }

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-[12px] font-semibold text-slate-900">
        Suggestions de réponse
      </p>
      <p className="mt-1 text-[12px] text-slate-500">
        ou écris librement en bas
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            className="group flex min-h-[58px] items-center gap-3 rounded-lg border border-black/10 bg-[#f5f5f3] px-3 py-2 text-left transition hover:border-wizard-200 hover:bg-wizard-50"
            disabled={
              detail.status === 'VALIDATED' &&
              !suggestion.toLowerCase().includes('reouvrir')
            }
            key={suggestion}
            onClick={() => handleSuggestion(suggestion)}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-wizard-600 ring-1 ring-black/10 group-hover:ring-wizard-200">
              <Icon name={actSuggestionIcon(suggestion)} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-slate-900">
                {suggestion}
              </span>
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Merlin adapte la suite.
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function buildActWorkflowSuggestions(
  detail: NonNullable<ScenarioAct['detailsMJ']>,
  step: ActWorkflowStep,
) {
  const lastUserNote =
    detail.notesUtilisateur[detail.notesUtilisateur.length - 1] ??
    detail.objectif.principal;
  const context = summarizeActSuggestionContext(lastUserNote);

  if (detail.status === 'VALIDATED') {
    return ["Réouvrir l'acte"];
  }

  switch (step) {
    case 'OBJECTIF':
      return [
        context
          ? `Clarifier l'objectif : ${context}`
          : 'Clarifier l’objectif de cet acte',
        context
          ? `Ajouter un enjeu lié à ${context}`
          : 'Ajouter un enjeu plus clair',
        'Prévoir une réussite partielle concrète',
        "Rendre l'échec intéressant à jouer",
      ];
    case 'VOIES':
      return [
        context
          ? `Trouver une piste autour de ${context}`
          : 'Ajouter une piste concrète',
        'Ajouter une voie discrète',
        'Ajouter une voie sociale',
        'Prévoir une voie risquée',
      ];
    case 'MODULE':
      return [
        'Avancer',
        `Plus ${detail.moduleSpecialise.type}`,
        'Ajouter une alternative',
        'Rendre la scène plus interactive',
      ];
    case 'SCENES':
      return [
        'Avancer',
        'Ajouter une scène courte',
        'Ajouter une relance anti-blocage',
        'Rendre une scène plus visuelle',
      ];
    case 'TIMING':
      return [
        'Avancer',
        'Prévoir une version courte',
        'Renforcer ce qui est essentiel',
        'Prévoir quoi couper',
      ];
    case 'VALIDATION':
      return [
        "Valider l'acte",
        'Ajouter une note MJ',
        'Simplifier le déroulé',
        'Renforcer la transition',
      ];
  }
}

function summarizeActSuggestionContext(value: string) {
  const normalized = value
    .replace(/^non\s+/i, '')
    .replace(/^notes données à merlin\s+/i, '')
    .trim();

  if (!normalized) return '';

  if (
    normalized.toLowerCase().includes('grange') ||
    normalized.toLowerCase().includes('souvenir')
  ) {
    return 'le réveil sans souvenir dans la grange';
  }

  return normalized.length > 46 ? `${normalized.slice(0, 43).trim()}...` : normalized;
}

function getActWorkflowStepLabel(step: ActWorkflowStep) {
  return (
    ACT_WORKFLOW_STEPS.find((stepMeta) => stepMeta.step === step)?.label ?? step
  );
}

function actSuggestionIcon(suggestion: string): IconName {
  const lower = suggestion.toLowerCase();
  if (lower.includes('valider')) return 'check';
  if (lower.includes('reouvrir')) return 'magic';
  if (lower.includes('voie')) return 'map';
  if (lower.includes('scene') || lower.includes('visuel')) return 'scenario';
  if (lower.includes('court') || lower.includes('timing')) return 'clock';
  if (lower.includes('risque') || lower.includes('echec')) return 'battle';
  return 'spark';
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
  changedSections,
  detail,
  isMerlinWorking,
  onViewStep,
  pendingMessage,
  reply,
  selectedAct,
  viewedStep,
}: {
  changedSections?: ActWorkflowStep[];
  detail: NonNullable<ScenarioAct['detailsMJ']>;
  isMerlinWorking: boolean;
  onViewStep: (step: ActWorkflowStep) => void;
  pendingMessage?: string;
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

      {detail.notesUtilisateur.map((note, index) => (
        <ChatBubble key={`${note}-${index}`} role="user">
          <p className="text-[13px] leading-6 text-slate-700">{note}</p>
        </ChatBubble>
      ))}

      {reply ? (
        <ChatBubble role="assistant">
          <p className="text-[14px] leading-7 text-slate-800">{reply}</p>
        </ChatBubble>
      ) : null}

      {changedSections?.length ? (
        <ChangedSectionsNotice
          onSelect={onViewStep}
          sections={changedSections}
        />
      ) : null}

      {pendingMessage ? (
        <ChatBubble role="user">
          <p className="text-[13px] leading-6 text-slate-700">
            {pendingMessage}
          </p>
        </ChatBubble>
      ) : null}

      {isMerlinWorking ? <ActMerlinWorkingBubble /> : null}
    </div>
  );
}

function ChangedSectionsNotice({
  onSelect,
  sections,
}: {
  onSelect: (step: ActWorkflowStep) => void;
  sections: ActWorkflowStep[];
}) {
  const uniqueSections = sections.filter(
    (section, index, array) => array.indexOf(section) === index,
  );

  return (
    <ChatBubble role="assistant">
      <p className="text-[12px] font-semibold text-wizard-700">
        Merlin a modifié
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {uniqueSections.map((section) => (
          <button
            className="rounded-lg border border-wizard-200 bg-white px-3 py-1.5 text-[12px] font-medium text-wizard-700 transition hover:bg-wizard-50"
            key={section}
            onClick={() => onSelect(section)}
            type="button"
          >
            {getActWorkflowStepLabel(section)}
          </button>
        ))}
      </div>
    </ChatBubble>
  );
}

function ActMerlinWorkingBubble() {
  return (
    <ChatBubble role="assistant">
      <div className="flex items-center gap-3 text-wizard-700">
        <div className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-wizard-600 [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-wizard-600 [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-wizard-600" />
        </div>
        <div>
          <p className="text-[13px] font-medium">
            Merlin ajuste le détail de l'acte…
          </p>
          <p className="text-[11px] text-wizard-500">
            La réponse arrive automatiquement.
          </p>
        </div>
      </div>
    </ChatBubble>
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
              {voie.preparationMJ.length ? (
                <div className="mt-3 rounded bg-white px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                    À jouer côté MJ
                  </p>
                  <ul className="mt-1 space-y-1">
                    {voie.preparationMJ.map((item) => (
                      <li className="text-[11px] leading-5 text-slate-600" key={item}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
      <div className="mt-2 flex items-center gap-2">
        <MicButton
          className="flex min-h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#f5f5f3] text-slate-500 transition hover:bg-white hover:text-wizard-700 disabled:opacity-50"
          disabled={busy}
          onTranscript={(transcript) => onInputChange(transcript)}
        />
        <button
          className="rounded-full bg-wizard-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
          disabled={busy || !input.trim()}
          onClick={onSubmitDebrief}
        >
          Envoyer le debrief
        </button>
      </div>

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

function QuestLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div>
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd>{value}</dd>
    </div>
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
