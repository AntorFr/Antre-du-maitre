import type {
  AuthUser,
  EntityType,
  ScenarioSummary,
  UserRole,
  WorldEntity,
  WorldEntityProposal,
} from '@antre-du-maitre/shared';
import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '../lib/api';

type AdminUser = AuthUser & { scenarioCount: number };

type AdminProps = {
  token: string;
  currentUserId: string;
  onOpenScenario: (scenario: ScenarioSummary) => void;
};

const TYPE_LABELS: Record<EntityType, string> = {
  LIEU: 'Lieu',
  PNJ: 'PNJ',
  FACTION: 'Faction',
  EVENEMENT: 'Événement',
  REGLE: 'Règle',
};

const TYPE_OPTIONS: EntityType[] = [
  'LIEU',
  'PNJ',
  'FACTION',
  'EVENEMENT',
  'REGLE',
];

export function Admin({ token, currentUserId, onOpenScenario }: AdminProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [entities, setEntities] = useState<WorldEntity[]>([]);
  const [proposals, setProposals] = useState<WorldEntityProposal[]>([]);
  const [newEntity, setNewEntity] = useState({
    type: 'LIEU' as EntityType,
    name: '',
    description: '',
  });
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'CHILD' as UserRole,
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  useEffect(() => {
    let cancelled = false;

    api
      .listUsers(token)
      .then(({ users: loadedUsers }) => {
        if (cancelled) return;

        setUsers(loadedUsers);
        setSelectedUserId((current) => current ?? loadedUsers[0]?.id ?? null);
      })
      .catch((caughtError) => {
        if (cancelled) return;

        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : 'Impossible de charger les utilisateurs.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedUserId) {
      setScenarios([]);
      setEntities([]);
      setProposals([]);
      return;
    }

    let cancelled = false;
    setError(null);
    setIsLoadingDetails(true);

    Promise.all([
      api.adminListUserScenarios(token, selectedUserId),
      api.adminGetUserWorld(token, selectedUserId),
    ])
      .then(([scenarioResult, worldResult]) => {
        if (cancelled) return;

        setScenarios(scenarioResult.scenarios);
        setEntities(worldResult.world.entities);
        setProposals(worldResult.world.proposals);
      })
      .catch((caughtError) => {
        if (cancelled) return;

        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : 'Impossible de charger les données de cet utilisateur.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, token]);

  async function deleteScenario(scenario: ScenarioSummary) {
    if (!window.confirm(`Supprimer le scénario « ${scenario.title} » ?`)) return;

    setBusyId(scenario.id);
    setError(null);

    try {
      await api.deleteScenario(token, scenario.id);
      setScenarios((current) =>
        current.filter((currentScenario) => currentScenario.id !== scenario.id),
      );
      setUsers((current) =>
        current.map((user) =>
          user.id === scenarioUserId(selectedUser)
            ? {
                ...user,
                scenarioCount: Math.max(0, user.scenarioCount - 1),
              }
            : user,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de supprimer ce scénario.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function editScenarioWithMerlin(scenario: ScenarioSummary) {
    const message = window.prompt(
      'Instruction pour Merlin',
      'Ajuste ce scénario en gardant la structure existante.',
    )?.trim();

    if (!message) return;

    setBusyId(scenario.id);
    setError(null);

    try {
      const response = await api.chat(token, scenario.id, {
        message,
        voiceInput: false,
      });
      const { scenario: updatedScenario } = await api.getScenario(
        token,
        scenario.id,
      );

      setScenarios((current) =>
        current.map((currentScenario) =>
          currentScenario.id === updatedScenario.id
            ? updatedScenario
            : currentScenario,
        ),
      );

      if (response.proposedEntities.length > 0 && selectedUserId) {
        const { world } = await api.adminGetUserWorld(token, selectedUserId);
        setEntities(world.entities);
        setProposals(world.proposals);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de modifier ce scénario via Merlin.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function transferScenario(
    scenario: ScenarioSummary,
    targetUserId: string,
  ) {
    const targetUser = users.find((user) => user.id === targetUserId);

    if (
      !targetUser ||
      !window.confirm(
        `Transférer « ${scenario.title} » (et son monde associé) à ${targetUser.username} ?`,
      )
    ) {
      return;
    }

    setBusyId(scenario.id);
    setError(null);

    try {
      await api.adminTransferScenario(token, scenario.id, targetUserId);

      setScenarios((current) =>
        current.filter((currentScenario) => currentScenario.id !== scenario.id),
      );
      setUsers((current) =>
        current.map((user) =>
          user.id === selectedUserId
            ? { ...user, scenarioCount: Math.max(0, user.scenarioCount - 1) }
            : user.id === targetUserId
              ? { ...user, scenarioCount: user.scenarioCount + 1 }
              : user,
        ),
      );

      // Les entités/propositions liées au scénario ont pu quitter ce monde.
      if (selectedUserId) {
        const { world } = await api.adminGetUserWorld(token, selectedUserId);
        setEntities(world.entities);
        setProposals(world.proposals);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de transférer ce scénario.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function acceptProposal(proposal: WorldEntityProposal) {
    setBusyId(proposal.id);
    setError(null);

    try {
      const { entity } = await api.acceptWorldProposal(token, proposal.id);
      setEntities((current) => [entity, ...current]);
      setProposals((current) =>
        current.filter((currentProposal) => currentProposal.id !== proposal.id),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible d’accepter cette proposition.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function rejectProposal(proposal: WorldEntityProposal) {
    setBusyId(proposal.id);
    setError(null);

    try {
      await api.rejectWorldProposal(token, proposal.id);
      setProposals((current) =>
        current.filter((currentProposal) => currentProposal.id !== proposal.id),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de rejeter cette proposition.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function renameEntity(entity: WorldEntity) {
    const name = window.prompt('Nouveau nom', entity.name)?.trim();
    if (!name || name === entity.name) return;

    setBusyId(entity.id);
    setError(null);

    try {
      const { entity: updatedEntity } = await api.updateWorldEntity(
        token,
        entity.id,
        {
          name,
        },
      );
      setEntities((current) =>
        current.map((currentEntity) =>
          currentEntity.id === updatedEntity.id ? updatedEntity : currentEntity,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de renommer cette entité.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEntity(entity: WorldEntity) {
    if (!window.confirm(`Supprimer « ${entity.name} » du monde ?`)) return;

    setBusyId(entity.id);
    setError(null);

    try {
      await api.deleteWorldEntity(token, entity.id);
      setEntities((current) =>
        current.filter((currentEntity) => currentEntity.id !== entity.id),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de supprimer cette entité.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createEntity() {
    if (!selectedUserId || !newEntity.name.trim() || !newEntity.description.trim()) {
      return;
    }

    setBusyId('new-entity');
    setError(null);

    try {
      const { entity } = await api.adminCreateWorldEntity(token, selectedUserId, {
        type: newEntity.type,
        name: newEntity.name.trim(),
        description: newEntity.description.trim(),
        tags: ['admin'],
      });
      setEntities((current) => [entity, ...current]);
      setNewEntity({
        type: 'LIEU',
        name: '',
        description: '',
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible d’ajouter cette entité.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function createUser() {
    if (!newUser.username.trim() || newUser.password.length < 8) {
      return;
    }

    setBusyId('new-user');
    setError(null);

    try {
      const { user } = await api.createUser(token, {
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
      });
      const adminUser: AdminUser = {
        ...user,
        scenarioCount: 0,
      };

      setUsers((current) => [...current, adminUser]);
      setSelectedUserId(user.id);
      setNewUser({
        username: '',
        password: '',
        role: 'CHILD',
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de créer cet utilisateur.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(user: AdminUser) {
    const password = window.prompt(
      `Nouveau mot de passe pour ${user.username}`,
      '',
    );

    if (!password) return;

    setBusyId(user.id);
    setError(null);

    try {
      await api.resetUserPassword(token, user.id, password);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de réinitialiser le mot de passe.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (user.id === currentUserId) {
      setError('Tu ne peux pas supprimer le compte admin connecté.');
      return;
    }

    if (
      !window.confirm(
        `Supprimer l’utilisateur « ${user.username} » et toutes ses données ?`,
      )
    ) {
      return;
    }

    setBusyId(user.id);
    setError(null);

    try {
      await api.deleteUser(token, user.id);
      setUsers((current) =>
        current.filter((currentUser) => currentUser.id !== user.id),
      );
      if (selectedUserId === user.id) {
        const nextUser = users.find((candidate) => candidate.id !== user.id);
        setSelectedUserId(nextUser?.id ?? null);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de supprimer cet utilisateur.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex h-full overflow-hidden bg-white">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-black/10 bg-[#f5f5f3] p-3">
        <p className="px-2 text-[12px] uppercase tracking-[0.18em] text-wizard-600">
          Administration
        </p>
        <h2 className="px-2 text-[18px] font-semibold text-slate-950">
          Utilisateurs
        </h2>

        <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-black/10">
          <p className="text-[12px] font-medium text-slate-700">
            Nouveau compte
          </p>
          <input
            className="mt-2 h-9 w-full rounded-lg border border-black/10 bg-[#f5f5f3] px-3 text-[12px]"
            placeholder="username"
            value={newUser.username}
            onChange={(event) =>
              setNewUser((current) => ({
                ...current,
                username: event.target.value,
              }))
            }
          />
          <input
            className="mt-2 h-9 w-full rounded-lg border border-black/10 bg-[#f5f5f3] px-3 text-[12px]"
            placeholder="mot de passe"
            type="password"
            value={newUser.password}
            onChange={(event) =>
              setNewUser((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
          />
          <div className="mt-2 flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-lg border border-black/10 bg-[#f5f5f3] px-2 text-[12px]"
              value={newUser.role}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                }))
              }
            >
              <option value="CHILD">Enfant</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              className="rounded-lg bg-wizard-600 px-3 py-2 text-[12px] font-medium text-white disabled:opacity-60"
              disabled={
                busyId === 'new-user' ||
                !newUser.username.trim() ||
                newUser.password.length < 8
              }
              onClick={createUser}
            >
              Créer
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">
            Username : lettres, chiffres, tirets et underscores. Mot de passe :
            8 caractères minimum.
          </p>
        </div>

        {isLoadingUsers ? (
          <p className="mt-4 px-2 text-[13px] text-slate-500">Chargement…</p>
        ) : (
          <div className="mt-4 space-y-2">
            {users.map((user) => (
              <button
                className={[
                  'w-full rounded-lg px-3 py-3 text-left transition',
                  selectedUserId === user.id
                    ? 'bg-wizard-600 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-black/10 hover:ring-black/20',
                ].join(' ')}
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium">
                    {user.username}
                  </span>
                  <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">
                    {user.role}
                  </span>
                </div>
                <p
                  className={[
                    'mt-1 text-[11px]',
                    selectedUserId === user.id ? 'text-wizard-100' : 'text-slate-500',
                  ].join(' ')}
                >
                  {user.scenarioCount} scénario(s)
                </p>
              </button>
            ))}
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-black/10 px-[18px] py-3">
          <div className="min-w-0">
            <p className="text-[12px] uppercase tracking-[0.18em] text-wizard-600">
              Lecture + modification
            </p>
            <h3 className="truncate text-[18px] font-semibold text-slate-950">
              {selectedUser ? selectedUser.username : 'Aucun utilisateur'}
            </h3>
          </div>
          {selectedUser ? (
            <div className="ml-auto flex gap-2">
              <button
                className="rounded-full bg-[#f5f5f3] px-3 py-1.5 text-[12px] font-medium text-slate-700 ring-1 ring-black/10 disabled:opacity-60"
                disabled={busyId === selectedUser.id}
                onClick={() => resetPassword(selectedUser)}
              >
                Reset mot de passe
              </button>
              <button
                className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-rose-700 ring-1 ring-rose-100 disabled:opacity-60"
                disabled={busyId === selectedUser.id || selectedUser.id === currentUserId}
                onClick={() => deleteUser(selectedUser)}
              >
                Supprimer utilisateur
              </button>
            </div>
          ) : null}
          {isLoadingDetails ? (
            <span className="text-[12px] text-slate-500">Chargement…</span>
          ) : null}
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden">
          <div className="space-y-4 overflow-y-auto px-[18px] py-4">
            <SectionTitle title="Scénarios" count={scenarios.length} />
            {scenarios.length ? (
              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <article
                    className="rounded-lg bg-[#f5f5f3] p-3"
                    key={scenario.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">
                          {scenario.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {scenario.status} · étape {scenario.data.currentStep}
                        </p>
                      </div>
                      <span className="rounded-full bg-wizard-100 px-2 py-0.5 text-[10px] font-medium text-wizard-700">
                        {scenario.data.sessionning?.dureeTotaleEstimeeMin
                          ? `${scenario.data.sessionning.dureeTotaleEstimeeMin} min`
                          : 'draft'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded-full bg-wizard-600 px-3 py-1.5 text-[12px] font-medium text-white"
                        onClick={() => onOpenScenario(scenario)}
                      >
                        Ouvrir
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 ring-1 ring-black/10 disabled:opacity-60"
                        disabled={busyId === scenario.id}
                        onClick={() => editScenarioWithMerlin(scenario)}
                      >
                        Modifier via Merlin
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-rose-700 ring-1 ring-rose-100 disabled:opacity-60"
                        disabled={busyId === scenario.id}
                        onClick={() => deleteScenario(scenario)}
                      >
                        Supprimer
                      </button>
                      <select
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 ring-1 ring-black/10 disabled:opacity-60"
                        disabled={busyId === scenario.id || users.length < 2}
                        value=""
                        onChange={(event) => {
                          if (event.target.value) {
                            void transferScenario(scenario, event.target.value);
                          }
                        }}
                      >
                        <option value="" disabled>
                          Transférer à…
                        </option>
                        {users
                          .filter((user) => user.id !== selectedUserId)
                          .map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.username}
                            </option>
                          ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyAdminState text="Aucun scénario pour cet utilisateur." />
            )}
          </div>

          <div className="space-y-4 overflow-y-auto border-l border-black/10 px-[18px] py-4">
            <SectionTitle title="Monde" count={entities.length} />

            <article className="rounded-lg bg-[#f5f5f3] p-3">
              <p className="text-[12px] font-medium text-slate-700">
                Ajouter une entité
              </p>
              <div className="mt-2 grid grid-cols-[8rem_1fr] gap-2">
                <select
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px]"
                  value={newEntity.type}
                  onChange={(event) =>
                    setNewEntity((current) => ({
                      ...current,
                      type: event.target.value as EntityType,
                    }))
                  }
                >
                  {TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px]"
                  placeholder="Nom"
                  value={newEntity.name}
                  onChange={(event) =>
                    setNewEntity((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <textarea
                className="mt-2 min-h-16 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[12px]"
                placeholder="Description"
                value={newEntity.description}
                onChange={(event) =>
                  setNewEntity((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <button
                className="mt-2 rounded-full bg-wizard-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
                disabled={
                  busyId === 'new-entity' ||
                  !newEntity.name.trim() ||
                  !newEntity.description.trim()
                }
                onClick={createEntity}
              >
                Ajouter au monde
              </button>
            </article>

            {proposals.length ? (
              <article>
                <SectionTitle title="Propositions à valider" count={proposals.length} />
                <div className="mt-2 space-y-2">
                  {proposals.map((proposal) => (
                    <div className="rounded-lg bg-wizard-100 p-3" key={proposal.id}>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-wizard-600">
                        {TYPE_LABELS[proposal.type]}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-slate-900">
                        {proposal.name}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-600">
                        {proposal.description}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          className="rounded-full bg-wizard-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
                          disabled={busyId === proposal.id}
                          onClick={() => acceptProposal(proposal)}
                        >
                          Ajouter
                        </button>
                        <button
                          className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 ring-1 ring-black/10 disabled:opacity-60"
                          disabled={busyId === proposal.id}
                          onClick={() => rejectProposal(proposal)}
                        >
                          Ignorer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {entities.length ? (
              <div className="grid gap-2">
                {entities.map((entity) => (
                  <article className="rounded-lg bg-[#f5f5f3] p-3" key={entity.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          {TYPE_LABELS[entity.type]} · {entity.source}
                        </p>
                        <p className="mt-1 truncate text-[13px] font-semibold text-slate-900">
                          {entity.name}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">
                          {entity.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 ring-1 ring-black/10 disabled:opacity-60"
                        disabled={busyId === entity.id}
                        onClick={() => renameEntity(entity)}
                      >
                        Renommer
                      </button>
                      <button
                        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-rose-700 ring-1 ring-rose-100 disabled:opacity-60"
                        disabled={busyId === entity.id}
                        onClick={() => deleteEntity(entity)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyAdminState text="Le monde de cet utilisateur est vide." />
            )}
          </div>
        </div>

        {error ? (
          <p className="mx-[18px] mb-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
      <span className="rounded-full bg-wizard-100 px-2.5 py-1 text-[11px] font-medium text-wizard-700">
        {count}
      </span>
    </div>
  );
}

function EmptyAdminState({ text }: { text: string }) {
  return (
    <p className="rounded-lg bg-[#f5f5f3] px-4 py-3 text-[12px] text-slate-500">
      {text}
    </p>
  );
}

function scenarioUserId(user: AdminUser | null) {
  return user?.id ?? '';
}
