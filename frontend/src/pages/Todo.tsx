import type { ScenarioSummary, TodoItem } from '@antre-du-maitre/shared';
import { useEffect, useMemo, useState } from 'react';

import { Icon, type IconName } from '../components/Icon';
import { api, ApiError } from '../lib/api';

type TodoProps = {
  token: string;
  scenario: ScenarioSummary | null;
  onCreateScenario: () => void;
  onOpenScenario: () => void;
};

type TodoCategoryMeta = {
  icon: IconName;
  label: string;
  helper: string;
  style: string;
};

const CATEGORY_ORDER: TodoItem['category'][] = [
  'FICHES_MONSTRES',
  'FICHES_PNJS',
  'CARTES',
  'DEROULEMENTS',
  'AUTRE',
];
const DEFAULT_CATEGORY: TodoItem['category'] = 'FICHES_MONSTRES';

const CATEGORY_META: Record<TodoItem['category'], TodoCategoryMeta> = {
  FICHES_MONSTRES: {
    icon: 'monster',
    label: 'Monstres',
    helper: 'Stat blocks, capacités et PV prêts à jouer.',
    style: 'bg-wizard-100 text-wizard-700',
  },
  FICHES_PNJS: {
    icon: 'users',
    label: 'PNJs',
    helper: 'Noms, motivations et accroches rapides.',
    style: 'bg-sky-100 text-sky-700',
  },
  CARTES: {
    icon: 'map',
    label: 'Cartes Battle Mats',
    helper: 'Volumes, pages et plans nécessaires.',
    style: 'bg-emerald-100 text-emerald-700',
  },
  DEROULEMENTS: {
    icon: 'scenario',
    label: 'Déroulements & options',
    helper: 'Scènes, indices, choix et points de coupure.',
    style: 'bg-amber-100 text-amber-700',
  },
  AUTRE: {
    icon: 'todo',
    label: 'Autre',
    helper: 'Tout ce qui ne rentre pas dans les autres blocs.',
    style: 'bg-[#f5f5f3] text-slate-600',
  },
};

export function Todo({
  token,
  scenario,
  onCreateScenario,
  onOpenScenario,
}: TodoProps) {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [activeCategory, setActiveCategory] =
    useState<TodoItem['category']>('FICHES_MONSTRES');
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenario) {
      setItems([]);
      return;
    }

    let cancelled = false;

    api
      .listTodo(token, scenario.id)
      .then(({ items: loadedItems }) => {
        if (!cancelled) {
          setItems(loadedItems);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof ApiError
              ? caughtError.message
              : 'Impossible de charger le todo.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scenario, token]);

  const groupedItems = useMemo(
    () =>
      items.reduce<Record<TodoItem['category'], TodoItem[]>>(
        (groups, item) => {
          groups[item.category].push(item);
          return groups;
        },
        {
          FICHES_MONSTRES: [],
          FICHES_PNJS: [],
          CARTES: [],
          DEROULEMENTS: [],
          AUTRE: [],
        },
      ),
    [items],
  );

  const categoryStats = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => {
        const categoryItems = groupedItems[category];
        const done = categoryItems.filter((item) => item.done).length;
        const total = categoryItems.length;

        return {
          category,
          done,
          total,
          progressPct: total ? Math.round((done / total) * 100) : 0,
        };
      }),
    [groupedItems],
  );

  const firstAvailableCategory =
    categoryStats.find((stat) => stat.total > 0)?.category ?? DEFAULT_CATEGORY;

  useEffect(() => {
    if (
      groupedItems[activeCategory].length === 0 &&
      firstAvailableCategory !== activeCategory
    ) {
      setActiveCategory(firstAvailableCategory);
    }
  }, [activeCategory, firstAvailableCategory, groupedItems]);

  const doneCount = items.filter((item) => item.done).length;
  const remainingCount = items.length - doneCount;
  const progressPct = items.length
    ? Math.round((doneCount / items.length) * 100)
    : 0;
  const nextItems = items.filter((item) => !item.done).slice(0, 4);
  const activeItems = groupedItems[activeCategory];
  const activeStats = categoryStats.find(
    (stat) => stat.category === activeCategory,
  );

  if (!scenario) {
    return (
      <EmptyState
        title="Aucun scénario sélectionné"
        text="Le todo se génère quand une aventure est finalisée."
        actionLabel="Créer une aventure"
        onAction={onCreateScenario}
      />
    );
  }

  const scenarioId = scenario.id;

  async function toggleTodoItem(item: TodoItem) {
    setError(null);
    setBusyItemId(item.id);

    const nextDone = !item.done;
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              done: nextDone,
            }
          : currentItem,
      ),
    );

    try {
      const { item: updatedItem } = await api.updateTodoItem(
        token,
        scenarioId,
        item.id,
        {
          done: nextDone,
        },
      );

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updatedItem.id ? updatedItem : currentItem,
        ),
      );
    } catch (caughtError) {
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? item : currentItem,
        ),
      );
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de mettre à jour cette tâche.',
      );
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/10 px-[18px] py-3">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.18em] text-wizard-600">
            Préparation de partie
          </p>
          <h2 className="truncate text-[18px] font-semibold text-slate-950">
            {scenario.title}
          </h2>
        </div>
        <div className="ml-auto grid min-w-[420px] grid-cols-3 gap-2">
          <PrepMetric label="Progression" value={`${progressPct}%`} />
          <PrepMetric label="Restant" value={`${remainingCount}`} />
          <PrepMetric label="Total" value={`${items.length}`} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] overflow-hidden">
        <aside className="space-y-3 overflow-y-auto border-r border-black/10 bg-[#f7f6f1] px-[18px] py-4">
          <article className="rounded-xl bg-white p-4 ring-1 ring-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                  Checklist MJ
                </p>
                <p className="mt-1 text-[13px] text-slate-600">
                  Coche ce qui est prêt avant de lancer la session.
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-wizard-100 text-[15px] font-semibold text-wizard-700">
                {progressPct}%
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-wizard-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </article>

          <div className="space-y-2">
            {categoryStats.map((stat) => (
              <CategoryButton
                active={activeCategory === stat.category}
                key={stat.category}
                onClick={() => setActiveCategory(stat.category)}
                stat={stat}
              />
            ))}
          </div>

          <article className="rounded-xl bg-white p-4 ring-1 ring-black/10">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              À préparer maintenant
            </p>
            {nextItems.length ? (
              <div className="mt-3 space-y-2">
                {nextItems.map((item) => (
                  <button
                    className="flex w-full items-start gap-2 rounded-lg bg-[#f5f5f3] px-3 py-2 text-left transition hover:bg-wizard-50"
                    key={item.id}
                    onClick={() => setActiveCategory(item.category)}
                  >
                    <Icon
                      name={CATEGORY_META[item.category].icon}
                      className="h-5 w-5 shrink-0 text-slate-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium text-slate-800">
                        {CATEGORY_META[item.category].label}
                      </span>
                      <span className="line-clamp-2 text-[11px] leading-5 text-slate-500">
                        {item.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] leading-5 text-emerald-700">
                Tout est coché. La partie est prête.
              </p>
            )}
          </article>
        </aside>

        <main className="flex min-w-0 flex-col overflow-hidden bg-white">
          <div className="shrink-0 border-b border-black/10 px-[18px] py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-wizard-600">
                  <Icon
                    name={CATEGORY_META[activeCategory].icon}
                    className="h-4 w-4"
                  />
                  {CATEGORY_META[activeCategory].label}
                </p>
                <p className="mt-1 text-[13px] text-slate-500">
                  {CATEGORY_META[activeCategory].helper}
                </p>
              </div>
              <div className="min-w-[220px] rounded-lg bg-[#f5f5f3] px-4 py-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-500">Catégorie</span>
                  <span className="font-medium text-wizard-600">
                    {activeStats?.done ?? 0} / {activeStats?.total ?? 0}
                  </span>
                </div>
                <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-wizard-600 transition-all"
                    style={{ width: `${activeStats?.progressPct ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
            {items.length === 0 ? (
              <div className="rounded-xl bg-[#f5f5f3] px-4 py-8 text-center text-[13px] text-slate-500">
                Le todo apparaîtra quand le scénario sera finalisé.
              </div>
            ) : activeItems.length ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {activeItems.map((item) => (
                  <TodoTaskCard
                    busy={busyItemId === item.id}
                    item={item}
                    key={item.id}
                    onToggle={() => void toggleTodoItem(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-[#f5f5f3] px-4 py-8 text-center text-[13px] text-slate-500">
                Aucune tâche dans cette catégorie.
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-black/10 px-[18px] py-3">
        <button
          className="rounded-lg border border-black/20 bg-[#f5f5f3] px-4 py-2 text-[13px] text-slate-600 transition hover:bg-white"
          onClick={onOpenScenario}
        >
          Retour scénario
        </button>
        <button
          className="rounded-lg border border-black/20 bg-[#f5f5f3] px-4 py-2 text-[13px] text-slate-600 transition hover:bg-white"
          onClick={onCreateScenario}
        >
          Création / aventures
        </button>
        {error ? (
          <p className="ml-auto rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
            {error}
          </p>
        ) : null}
      </footer>
    </section>
  );
}

function CategoryButton({
  active,
  onClick,
  stat,
}: {
  active: boolean;
  onClick: () => void;
  stat: {
    category: TodoItem['category'];
    done: number;
    total: number;
    progressPct: number;
  };
}) {
  const meta = CATEGORY_META[stat.category];

  return (
    <button
      className={[
        'w-full rounded-xl p-3 text-left ring-1 transition',
        active
          ? 'bg-white ring-wizard-300 shadow-sm'
          : 'bg-white/75 ring-black/10 hover:bg-white',
      ].join(' ')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] font-medium text-slate-900">
            <Icon name={meta.icon} className="h-4 w-4" />
            {meta.label}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">
            {meta.helper}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${meta.style}`}>
          {stat.done}/{stat.total}
        </span>
      </div>
      <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-wizard-600 transition-all"
          style={{ width: `${stat.progressPct}%` }}
        />
      </div>
    </button>
  );
}

function TodoTaskCard({
  busy,
  item,
  onToggle,
}: {
  busy: boolean;
  item: TodoItem;
  onToggle: () => void;
}) {
  const meta = CATEGORY_META[item.category];

  return (
    <button
      className={[
        'flex min-h-24 w-full items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-wait disabled:opacity-70',
        item.done
          ? 'border-emerald-100 bg-emerald-50'
          : 'border-black/10 bg-[#f5f5f3] hover:bg-white',
      ].join(' ')}
      disabled={busy}
      onClick={onToggle}
    >
      <span
        className={[
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[12px]',
          item.done
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-black/25 bg-white text-transparent',
        ].join(' ')}
      >
        <Icon name="check" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          <Icon name={meta.icon} className="h-3.5 w-3.5" /> {meta.label}
        </span>
        <span
          className={[
            'mt-1 block text-[13px] leading-6',
            item.done ? 'text-slate-400 line-through' : 'text-slate-800',
          ].join(' ')}
        >
          {item.label}
        </span>
      </span>
    </button>
  );
}

function PrepMetric({ label, value }: { label: string; value: string }) {
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
          <Icon name="todo" className="h-7 w-7 text-wizard-700" />
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
