import type { AuthUser } from '@antre-du-maitre/shared';
import type { ReactNode } from 'react';
import type { AppView } from '../types/navigation';
import { Icon, type IconName } from './Icon';

type AppShellProps = {
  user: AuthUser;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  user,
  activeView,
  onNavigate,
  onLogout,
  children,
}: AppShellProps) {
  const viewMeta = VIEW_META[activeView];

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f0eff5] p-3 text-slate-950 md:p-6">
      <section className="flex h-[calc(100vh-1.5rem)] min-h-[560px] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.10)] ring-1 ring-black/10 md:h-[calc(100vh-3rem)]">
        <header className="flex h-12 shrink-0 items-center gap-3 bg-wizard-900 px-4 text-wizard-100">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-wizard-300 bg-wizard-600 text-sm">
            <Icon name="magic" className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium">
              L'Antre du Maître
              <span className="ml-1 text-[11px] font-normal text-wizard-300">
                · CoF Mini
              </span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="hidden items-center gap-2 text-xs text-wizard-300 sm:flex">
            <Icon name="clock" className="h-3.5 w-3.5" />
            <span>{viewMeta.context}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-wizard-600 px-3 py-1 text-[11px] text-wizard-100">
            <Icon name={viewMeta.icon} className="h-3.5 w-3.5" />
            <span>{viewMeta.status}</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="flex w-16 shrink-0 flex-col items-center gap-0.5 bg-wizard-950 py-2">
            <NavButton
              active={activeView === 'create'}
              icon="magic"
              label="Créer"
              onClick={() => onNavigate('create')}
            />
            <NavButton
              active={activeView === 'scenario'}
              icon="scenario"
              label="Scén."
              onClick={() => onNavigate('scenario')}
            />
            <NavButton
              active={activeView === 'todo'}
              icon="todo"
              label="Todo"
              onClick={() => onNavigate('todo')}
            />
            <NavButton
              active={activeView === 'world'}
              icon="world"
              label="Monde"
              onClick={() => onNavigate('world')}
            />
            {user.role === 'ADMIN' ? (
              <NavButton
                active={activeView === 'admin'}
                icon="admin"
                label="Admin"
                onClick={() => onNavigate('admin')}
              />
            ) : null}

            <div className="mt-auto w-8 border-t border-white/10 pt-2" />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-[10px] font-medium text-wizard-300"
              title={`${user.username} · ${user.role}`}
            >
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <button
              className="mt-1 flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[9px] text-wizard-300 transition hover:bg-white/10 hover:text-wizard-100"
              onClick={onLogout}
              title="Se déconnecter"
            >
              <Icon name="logout" className="h-5 w-5" />
              Sortir
            </button>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </section>
    </main>
  );
}

function NavButton({
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
        'flex h-[52px] w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[9px] transition',
        active
          ? 'bg-wizard-600 text-wizard-100'
          : 'text-[#7F77DD] hover:bg-white/10 hover:text-wizard-100',
      ].join(' ')}
      onClick={onClick}
      title={label}
    >
      <Icon name={icon} className="h-5 w-5" />
      {label}
    </button>
  );
}

const VIEW_META = {
  create: {
    icon: 'magic',
    status: 'Création en cours',
    context: 'Aventure guidée',
  },
  scenario: {
    icon: 'scenario',
    status: 'Scénario',
    context: 'Fiche MJ',
  },
  todo: {
    icon: 'todo',
    status: 'Préparation',
    context: 'Todo de partie',
  },
  world: {
    icon: 'world',
    status: 'Mon monde',
    context: 'Mémoire persistante',
  },
  admin: {
    icon: 'admin',
    status: 'Administration',
    context: 'Lecture + modification',
  },
} satisfies Record<AppView, { icon: IconName; status: string; context: string }>;
