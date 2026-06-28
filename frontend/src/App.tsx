import { AppShell } from './components/AppShell';
import { useSession } from './hooks/useSession';
import { Login } from './pages/Login';
import { Hub } from './pages/Hub';
import { Create } from './pages/Create';
import { Scenario } from './pages/Scenario';
import { Todo } from './pages/Todo';
import { Admin } from './pages/Admin';
import type { ScenarioSummary } from '@antre-du-maitre/shared';
import type { AppView, HubSection, ScenarioTab } from './types/navigation';
import { useState } from 'react';

export function App() {
  const { session, isHydrating, login, logout } = useSession();
  const [activeView, setActiveView] = useState<AppView>('hub');
  const [hubSection, setHubSection] = useState<HubSection>('scenarios');
  const [scenarioTab, setScenarioTab] = useState<ScenarioTab>('overview');
  const [createStartsEmpty, setCreateStartsEmpty] = useState(false);
  const [createScenarioId, setCreateScenarioId] = useState<string | null>(null);
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

  function openHub(section: HubSection = 'scenarios') {
    setHubSection(section);
    setActiveView('hub');
  }

  function openScenario(scenario: ScenarioSummary, tab: ScenarioTab = 'overview') {
    setActiveScenario(scenario);
    setScenarioTab(tab);
    setActiveView('scenario');
  }

  function resumeScenarioWorkflow(scenario: ScenarioSummary) {
    setActiveScenario(scenario);
    setCreateStartsEmpty(false);
    setCreateScenarioId(scenario.id);
    setActiveView('create');
  }

  function openScenarioTab(tab: ScenarioTab) {
    setScenarioTab(tab);
    setActiveView('scenario');
  }

  let content = (
    <Hub
      token={session.token}
      section={hubSection}
      worldRefreshKey={worldRefreshKey}
      onCreateScenario={() => {
        setActiveScenario(null);
        setCreateStartsEmpty(true);
        setCreateScenarioId(null);
        setActiveView('create');
      }}
      onOpenScenario={(scenario) => {
        if (scenario.status === 'DRAFT') {
          resumeScenarioWorkflow(scenario);
          return;
        }

        openScenario(scenario);
      }}
      onSectionChange={setHubSection}
    />
  );

  if (activeView === 'create') {
    content = (
      <Create
        token={session.token}
        initialScenarioId={createScenarioId}
        startEmpty={createStartsEmpty}
        onScenarioChange={setActiveScenario}
        onOpenScenario={() => {
          setCreateStartsEmpty(false);
          setCreateScenarioId(null);
          setScenarioTab('overview');
          setActiveView('scenario');
        }}
        onWorldProposal={() => setWorldRefreshKey((current) => current + 1)}
        onScenarioComplete={() => {
          setCreateStartsEmpty(false);
          setCreateScenarioId(null);
          setScenarioTab('overview');
          setActiveView('scenario');
        }}
      />
    );
  }

  if (activeView === 'scenario') {
    content =
      scenarioTab === 'preparation' ? (
        <Todo
          token={session.token}
          scenario={activeScenario}
          onCreateScenario={() => {
            setCreateStartsEmpty(false);
            setCreateScenarioId(activeScenario?.id ?? null);
            setActiveView('create');
          }}
          onOpenScenario={() => openScenarioTab('overview')}
        />
      ) : (
        <Scenario
          token={session.token}
          scenario={activeScenario}
          initialPanel={scenarioTab === 'sessions' ? 'sessions' : 'run'}
          onCreateScenario={() => {
            setCreateStartsEmpty(false);
            setCreateScenarioId(activeScenario?.id ?? null);
            setActiveView('create');
          }}
          onScenarioChange={setActiveScenario}
          onWorldProposal={() => setWorldRefreshKey((current) => current + 1)}
        />
      );
  }

  if (activeView === 'admin' && session.user.role === 'ADMIN') {
    content = (
      <Admin
        token={session.token}
        currentUserId={session.user.id}
        onOpenScenario={(scenario) => {
          openScenario(scenario);
        }}
      />
    );
  }

  return (
    <AppShell
      user={session.user}
      activeView={activeView}
      scenario={activeScenario}
      scenarioTab={scenarioTab}
      onOpenAdmin={() => setActiveView('admin')}
      onOpenHub={() => openHub()}
      onNavigateScenarioTab={openScenarioTab}
      onLogout={logout}
    >
      {content}
    </AppShell>
  );
}
