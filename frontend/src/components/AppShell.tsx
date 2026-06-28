import type { AuthUser, ScenarioSummary } from '@antre-du-maitre/shared';
import type { ReactNode } from 'react';
import type { AppView, ScenarioTab } from '../types/navigation';
import { Icon, type IconName } from './Icon';

type AppShellProps = {
  user: AuthUser;
  activeView: AppView;
  scenario: ScenarioSummary | null;
  scenarioTab: ScenarioTab;
  onOpenAdmin: () => void;
  onOpenHub: () => void;
  onNavigateScenarioTab: (tab: ScenarioTab) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  user,
  activeView,
  scenario,
  scenarioTab,
  onOpenAdmin,
  onOpenHub,
  onNavigateScenarioTab,
  onLogout,
  children,
}: AppShellProps) {
  const isScenarioContext = activeView === 'scenario' && scenario;
  const contextLabel = isScenarioContext
    ? scenario.title
    : activeView === 'create'
      ? 'Création guidée'
      : activeView === 'admin'
        ? 'Administration'
        : 'Accueil';

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f0eff5] p-3 text-slate-950 md:p-6">
      <section className="flex h-[calc(100vh-1.5rem)] min-h-[560px] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.10)] ring-1 ring-black/10 md:h-[calc(100vh-3rem)]">
        <header className="flex h-12 shrink-0 items-center gap-3 bg-wizard-900 px-4 text-wizard-100">
          <button
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-wizard-300 bg-wizard-600 text-sm transition hover:bg-wizard-500"
            onClick={onOpenHub}
            title="Accueil"
          >
            <Icon name="magic" className="h-4 w-4" />
          </button>

          {activeView !== 'hub' ? (
            <button
              className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium text-wizard-100 transition hover:bg-white/15 sm:inline-flex"
              onClick={onOpenHub}
            >
              Accueil
            </button>
          ) : null}

          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium">
              L'Antre du Maître
              <span className="ml-1 text-[11px] font-normal text-wizard-300">
                · {contextLabel}
              </span>
            </div>
          </div>

          {scenario ? (
            <div className="hidden min-w-0 items-center gap-2 rounded-full bg-wizard-600 px-3 py-1 text-[11px] text-wizard-100 md:flex">
              <Icon name={scenario.status === 'COMPLETE' ? 'check' : 'spark'} className="h-3.5 w-3.5" />
              <span className="truncate">{scenarioStatusLabel(scenario.status)}</span>
            </div>
          ) : null}

          <div className="flex-1" />

          <details className="relative">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-wizard-100 transition hover:bg-white/15">
              {user.username.slice(0, 2).toUpperCase()}
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl bg-white p-2 text-slate-700 shadow-xl ring-1 ring-black/10">
              <div className="px-3 py-2">
                <p className="truncate text-[13px] font-medium text-slate-900">
                  {user.username}
                </p>
                <p className="text-[11px] text-slate-500">{user.role}</p>
              </div>
              {user.role === 'ADMIN' ? (
                <MenuButton icon="admin" label="Administration" onClick={onOpenAdmin} />
              ) : null}
              <MenuButton icon="logout" label="Se déconnecter" onClick={onLogout} />
            </div>
          </details>
        </header>

        {isScenarioContext ? (
          <nav className="flex shrink-0 items-center gap-2 border-b border-black/10 bg-white px-4 py-2">
            <ScenarioTabButton
              active={scenarioTab === 'overview'}
              icon="scenario"
              label="Vue d'ensemble"
              onClick={() => onNavigateScenarioTab('overview')}
            />
            <ScenarioTabButton
              active={scenarioTab === 'preparation'}
              icon="todo"
              label="Préparation"
              onClick={() => onNavigateScenarioTab('preparation')}
            />
            <ScenarioTabButton
              active={scenarioTab === 'sessions'}
              icon="clock"
              label="Sessions"
              onClick={() => onNavigateScenarioTab('sessions')}
            />
          </nav>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </section>
    </main>
  );
}

function ScenarioTabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'flex min-h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition',
        active
          ? 'bg-wizard-600 text-white'
          : 'bg-[#f5f5f3] text-slate-600 hover:bg-wizard-50 hover:text-wizard-700',
      ].join(' ')}
      onClick={onClick}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-slate-100"
      onClick={onClick}
    >
      <Icon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

function scenarioStatusLabel(status: ScenarioSummary['status']) {
  if (status === 'COMPLETE') return 'Complet';
  if (status === 'IN_PROGRESS') return 'En cours';
  return 'Brouillon';
}
