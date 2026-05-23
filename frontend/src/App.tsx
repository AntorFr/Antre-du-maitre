import { AppShell } from './components/AppShell';
import { useSession } from './hooks/useSession';
import { Login } from './pages/Login';
import { Create } from './pages/Create';
import { Scenario } from './pages/Scenario';
import { Todo } from './pages/Todo';
import { World } from './pages/World';
import { Admin } from './pages/Admin';
import type { ScenarioSummary } from '@antre-du-maitre/shared';
import type { AppView } from './types/navigation';
import { useState } from 'react';

export function App() {
  const { session, isHydrating, login, logout } = useSession();
  const [activeView, setActiveView] = useState<AppView>('create');
  const [activeScenario, setActiveScenario] =
    useState<ScenarioSummary | null>(null);
  const [worldRefreshKey, setWorldRefreshKey] = useState(0);

  if (isHydrating) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Ouverture de l'antre…
      </main>
    );
  }

  if (!session) {
    return <Login onLogin={login} />;
  }

  let content = (
    <Create
      token={session.token}
      onScenarioChange={setActiveScenario}
      onWorldProposal={() => setWorldRefreshKey((current) => current + 1)}
      onScenarioComplete={() => setActiveView('scenario')}
    />
  );

  if (activeView === 'scenario') {
    content = (
      <Scenario
        token={session.token}
        scenario={activeScenario}
        onCreateScenario={() => setActiveView('create')}
        onScenarioChange={setActiveScenario}
        onWorldProposal={() => setWorldRefreshKey((current) => current + 1)}
        onPrepareTodo={() => setActiveView('todo')}
      />
    );
  }

  if (activeView === 'todo') {
    content = (
      <Todo
        token={session.token}
        scenario={activeScenario}
        onCreateScenario={() => setActiveView('create')}
        onOpenScenario={() => setActiveView('scenario')}
      />
    );
  }

  if (activeView === 'world') {
    content = <World token={session.token} refreshKey={worldRefreshKey} />;
  }

  if (activeView === 'admin' && session.user.role === 'ADMIN') {
    content = (
      <Admin
        token={session.token}
        currentUserId={session.user.id}
        onOpenScenario={(scenario) => {
          setActiveScenario(scenario);
          setActiveView('scenario');
        }}
      />
    );
  }

  return (
    <AppShell
      user={session.user}
      activeView={activeView}
      onNavigate={setActiveView}
      onLogout={logout}
    >
      {content}
    </AppShell>
  );
}
