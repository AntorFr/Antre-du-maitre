import type {
  WorldEntity,
  WorldEntityProposal,
} from '@antre-du-maitre/shared';
import { useEffect, useMemo, useState } from 'react';

import { Icon, type IconName } from '../components/Icon';
import { api, ApiError } from '../lib/api';

type WorldProps = {
  token: string;
  refreshKey: number;
};

type FilterType = 'ALL' | WorldEntity['type'];

type WorldTypeMeta = {
  icon: IconName;
  label: string;
  plural: string;
  style: string;
};

const TYPE_ORDER: WorldEntity['type'][] = [
  'LIEU',
  'PNJ',
  'FACTION',
  'EVENEMENT',
  'REGLE',
];

const TYPE_META: Record<WorldEntity['type'], WorldTypeMeta> = {
  LIEU: {
    icon: 'location',
    label: 'Lieu',
    plural: 'Lieux',
    style: 'bg-emerald-100 text-emerald-700',
  },
  PNJ: {
    icon: 'user',
    label: 'PNJ',
    plural: 'PNJs',
    style: 'bg-sky-100 text-sky-700',
  },
  FACTION: {
    icon: 'users',
    label: 'Faction',
    plural: 'Factions',
    style: 'bg-rose-100 text-rose-700',
  },
  EVENEMENT: {
    icon: 'zap',
    label: 'Événement',
    plural: 'Événements',
    style: 'bg-amber-100 text-amber-700',
  },
  REGLE: {
    icon: 'book',
    label: 'Règle',
    plural: 'Règles',
    style: 'bg-wizard-100 text-wizard-700',
  },
};

const SOURCE_LABELS: Record<WorldEntity['source'], string> = {
  CREATION: 'Création Merlin',
  DEBRIEF: 'Debrief session',
  MANUAL: 'Ajout manuel',
};

export function World({ token, refreshKey }: WorldProps) {
  const [entities, setEntities] = useState<WorldEntity[]>([]);
  const [proposals, setProposals] = useState<WorldEntityProposal[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .getWorld(token)
      .then(({ world }) => {
        if (cancelled) return;

        setEntities(world.entities);
        setProposals(world.proposals);
      })
      .catch((caughtError) => {
        if (cancelled) return;

        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : 'Impossible de charger le monde.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, token]);

  useEffect(() => {
    if (
      selectedProposalId &&
      proposals.some((proposal) => proposal.id === selectedProposalId)
    ) {
      return;
    }

    setSelectedProposalId(proposals[0]?.id ?? null);
  }, [proposals, selectedProposalId]);

  const filteredEntities = useMemo(
    () =>
      filter === 'ALL'
        ? entities
        : entities.filter((entity) => entity.type === filter),
    [entities, filter],
  );

  const entityCounts = useMemo(
    () =>
      entities.reduce<Record<FilterType, number>>(
        (acc, entity) => {
          acc.ALL += 1;
          acc[entity.type] += 1;
          return acc;
        },
        {
          ALL: 0,
          LIEU: 0,
          PNJ: 0,
          FACTION: 0,
          EVENEMENT: 0,
          REGLE: 0,
        },
      ),
    [entities],
  );

  const proposalCounts = useMemo(
    () =>
      proposals.reduce<Record<WorldEntity['type'], number>>(
        (acc, proposal) => {
          acc[proposal.type] += 1;
          return acc;
        },
        {
          LIEU: 0,
          PNJ: 0,
          FACTION: 0,
          EVENEMENT: 0,
          REGLE: 0,
        },
      ),
    [proposals],
  );

  const selectedProposal =
    proposals.find((proposal) => proposal.id === selectedProposalId) ?? null;

  async function acceptProposal(proposalId: string) {
    setError(null);
    setBusyProposalId(proposalId);

    try {
      const { entity } = await api.acceptWorldProposal(token, proposalId);
      setEntities((current) => [entity, ...current]);
      setProposals((current) =>
        current.filter((proposal) => proposal.id !== proposalId),
      );
      setFilter(entity.type);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible d’ajouter cette proposition.',
      );
    } finally {
      setBusyProposalId(null);
    }
  }

  async function rejectProposal(proposalId: string) {
    setError(null);
    setBusyProposalId(proposalId);

    try {
      await api.rejectWorldProposal(token, proposalId);
      setProposals((current) =>
        current.filter((proposal) => proposal.id !== proposalId),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible d’ignorer cette proposition.',
      );
    } finally {
      setBusyProposalId(null);
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/10 px-[18px] py-3">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.18em] text-wizard-600">
            Monde persistant
          </p>
          <h2 className="truncate text-[18px] font-semibold text-slate-950">
            Canon validé et propositions Merlin
          </h2>
        </div>
        <div className="ml-auto grid min-w-[360px] grid-cols-2 gap-2">
          <WorldMetric label="Canon" value={`${entities.length}`} />
          <WorldMetric label="À valider" value={`${proposals.length}`} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] overflow-hidden">
        <aside className="space-y-3 overflow-y-auto border-r border-black/10 bg-[#f7f6f1] px-[18px] py-4">
          <article className="rounded-xl bg-white p-4 ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                  File de validation
                </p>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">
                  Les éléments proposés ne deviennent canon qu’après validation.
                </p>
              </div>
              <span className="rounded-full bg-wizard-100 px-3 py-1 text-[12px] font-medium text-wizard-700">
                {proposals.length}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {TYPE_ORDER.map((type) => (
                <div
                  className="rounded-lg bg-[#f5f5f3] px-2 py-1.5 text-center"
                  key={type}
                  title={TYPE_META[type].plural}
                >
                  <Icon
                    name={TYPE_META[type].icon}
                    className="mx-auto h-4 w-4 text-slate-600"
                  />
                  <p className="text-[11px] font-medium text-slate-700">
                    {proposalCounts[type]}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <div className="space-y-2">
            {isLoading ? (
              <div className="rounded-xl bg-white p-4 text-[13px] text-slate-500 ring-1 ring-black/10">
                Chargement du monde…
              </div>
            ) : null}

            {!isLoading && proposals.length === 0 ? (
              <div className="rounded-xl bg-white p-4 ring-1 ring-black/10">
                <p className="text-[13px] font-medium text-slate-900">
                  Rien à valider
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">
                  Les prochaines propositions apparaîtront après une création ou
                  un debrief de session.
                </p>
              </div>
            ) : null}

            {proposals.map((proposal) => (
              <ProposalListButton
                active={proposal.id === selectedProposalId}
                busy={busyProposalId === proposal.id}
                key={proposal.id}
                onClick={() => setSelectedProposalId(proposal.id)}
                proposal={proposal}
              />
            ))}
          </div>

          <article className="rounded-xl bg-white p-4 ring-1 ring-black/10">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Filtrer le canon
            </p>
            <div className="mt-3 space-y-1.5">
              <FilterButton
                active={filter === 'ALL'}
                count={entityCounts.ALL}
                icon="spark"
                label="Tous"
                onClick={() => setFilter('ALL')}
              />
              {TYPE_ORDER.map((type) => (
                <FilterButton
                  active={filter === type}
                  count={entityCounts[type]}
                  icon={TYPE_META[type].icon}
                  key={type}
                  label={TYPE_META[type].plural}
                  onClick={() => setFilter(type)}
                />
              ))}
            </div>
          </article>
        </aside>

        <main className="flex min-w-0 flex-col overflow-hidden bg-white">
          <div className="shrink-0 border-b border-black/10 px-[18px] py-4">
            {selectedProposal ? (
              <ProposalReview
                busy={busyProposalId === selectedProposal.id}
                onAccept={() => void acceptProposal(selectedProposal.id)}
                onReject={() => void rejectProposal(selectedProposal.id)}
                proposal={selectedProposal}
              />
            ) : (
              <div className="rounded-xl bg-[#f5f5f3] px-4 py-4">
                <p className="text-[13px] font-medium text-slate-900">
                  Aucune proposition sélectionnée
                </p>
                <p className="mt-1 text-[12px] leading-5 text-slate-500">
                  Le canon reste stable tant qu’une proposition n’est pas
                  acceptée.
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-[18px] py-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Canon du monde
              </p>
              <p className="mt-1 text-[13px] text-slate-600">
                {filter === 'ALL'
                  ? 'Tous les éléments validés.'
                  : `${TYPE_META[filter].plural} validés.`}
              </p>
            </div>
            <span className="rounded-full bg-[#f5f5f3] px-3 py-1.5 text-[12px] font-medium text-slate-600">
              {filteredEntities.length} élément
              {filteredEntities.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto px-[18px] py-4 xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full rounded-xl bg-[#f5f5f3] px-4 py-4 text-[13px] text-slate-500">
                Chargement du canon…
              </div>
            ) : null}

            {!isLoading &&
              filteredEntities.map((entity) => (
                <WorldEntityCard entity={entity} key={entity.id} />
              ))}
          </div>

          {!isLoading && filteredEntities.length === 0 ? (
            <div className="m-[18px] rounded-xl bg-[#f5f5f3] px-4 py-4 text-[13px] text-slate-500">
              Le monde est encore vide dans cette vue. Les propositions validées
              apparaîtront ici.
            </div>
          ) : null}
        </main>
      </div>

      {error ? (
        <p className="mx-[18px] mb-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ProposalListButton({
  active,
  busy,
  onClick,
  proposal,
}: {
  active: boolean;
  busy: boolean;
  onClick: () => void;
  proposal: WorldEntityProposal;
}) {
  const meta = TYPE_META[proposal.type];

  return (
    <button
      className={[
        'w-full rounded-xl p-3 text-left ring-1 transition disabled:cursor-wait disabled:opacity-70',
        active
          ? 'bg-white ring-wizard-300 shadow-sm'
          : 'bg-white/75 ring-black/10 hover:bg-white',
      ].join(' ')}
      disabled={busy}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.style}`}
        >
          <Icon name={meta.icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {proposal.name}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
            {proposal.description}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {meta.label} · {SOURCE_LABELS[proposal.source]}
          </p>
        </div>
      </div>
    </button>
  );
}

function ProposalReview({
  busy,
  onAccept,
  onReject,
  proposal,
}: {
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  proposal: WorldEntityProposal;
}) {
  const meta = TYPE_META[proposal.type];

  return (
    <article className="rounded-xl bg-[#f5f5f3] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
            <Icon name={meta.icon} className="h-4 w-4" />
            Proposition à valider · {meta.label}
          </p>
          <h3 className="mt-1 text-[18px] font-semibold text-slate-950">
            {proposal.name}
          </h3>
          <p className="mt-2 text-[13px] leading-6 text-slate-700">
            {proposal.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${meta.style}`}>
              {meta.label}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-black/10">
              {SOURCE_LABELS[proposal.source]}
            </span>
            {proposal.tags.map((tag) => (
              <span
                className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-black/10"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            className="rounded-lg bg-wizard-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-wizard-700 disabled:opacity-60"
            disabled={busy}
            onClick={onAccept}
          >
            Ajouter au canon
          </button>
          <button
            className="rounded-lg bg-white px-4 py-2 text-[13px] font-medium text-slate-600 ring-1 ring-black/10 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={busy}
            onClick={onReject}
          >
            Ignorer
          </button>
        </div>
      </div>
    </article>
  );
}

function WorldEntityCard({ entity }: { entity: WorldEntity }) {
  const meta = TYPE_META[entity.type];

  return (
    <article className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.style}`}
      >
        <Icon name={meta.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[13px] font-semibold text-slate-900">
          {entity.name}
        </h3>
        <p className="mt-1 line-clamp-4 text-[11px] leading-5 text-slate-600">
          {entity.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${meta.style}`}>
            {meta.label}
          </span>
          <span className="rounded-full bg-wizard-100 px-2 py-0.5 text-[10px] text-wizard-700">
            {SOURCE_LABELS[entity.source]}
          </span>
          {entity.tags.slice(0, 3).map((tag) => (
            <span
              className="rounded-full bg-[#f5f5f3] px-2 py-0.5 text-[10px] text-slate-500"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function FilterButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] transition',
        active
          ? 'bg-wizard-100 text-wizard-700'
          : 'bg-[#f5f5f3] text-slate-600 hover:bg-slate-100',
      ].join(' ')}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <Icon name={icon} className="h-4 w-4" />
        {label}
      </span>
      <span className="font-medium">{count}</span>
    </button>
  );
}

function WorldMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f5f5f3] px-3 py-2 text-right">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}
