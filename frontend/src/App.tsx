import { AppShell } from './components/AppShell';
import { useSession } from './hooks/useSession';
import { Login } from './pages/Login';
import { Hub } from './pages/Hub';
import { Create } from './pages/Create';
import { Scenario } from './pages/Scenario';
import { Todo } from './pages/Todo';
import { Admin } from './pages/Admin';
import { api } from './lib/api';
import { clearOfflineCaches } from './lib/offline';
import { buildPath, parseLocation, type Route } from './lib/router';
import type { ScenarioSummary } from '@antre-du-maitre/shared';
import type { HubSection, ScenarioTab } from './types/navigation';
import { useCallback, useEffect, useState } from 'react';

export function App() {
  const { session, isHydrating, login, logout } = useSession();
  const [route, setRoute] = useState<Route>(() =>
    parseLocation(window.location.pathname),
  );
  const [activeScenario, setActiveScenario] =
    useState<ScenarioSummary | null>(null);
  const [worldRefreshKey, setWorldRefreshKey] = useState(0);

  // Navigation : on écrit dans l'historique du navigateur puis on met à jour
  // l'état local. Le bouton précédent est géré par l'écouteur popstate.
  const navigate = useCallback(
    (next: Route, options?: { replace?: boolean }) => {
      const path = buildPath(next);

      if (path !== window.location.pathname) {
        if (options?.replace) {
          window.history.replaceState({}, '', path);
        } else {
          window.history.pushState({}, '', path);
        }
      }

      setRoute(next);
    },
    [],
  );

  useEffect(() => {
    const onPopState = () => setRoute(parseLocation(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Un accès direct à /admin sans droits repart vers le hub.
  useEffect(() => {
    if (session && route.view === 'admin' && session.user.role !== 'ADMIN') {
      navigate({ view: 'hub', section: 'scenarios' }, { replace: true });
    }
  }, [session, route, navigate]);

  // Sur accès direct ou rafraîchissement d'une route scénario, on ne dispose
  // que de l'identifiant : on recharge le scénario complet.
  useEffect(() => {
    if (!session || route.view !== 'scenario') {
      return;
    }

    if (activeScenario?.id === route.scenarioId) {
      return;
    }

    let cancelled = false;

    api
      .getScenario(session.token, route.scenarioId)
      .then(({ scenario }) => {
        if (!cancelled) {
          setActiveScenario(scenario);
        }
      })
      .catch(() => {
        if (!cancelled) {
          navigate({ view: 'hub', section: 'scenarios' }, { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, route, activeScenario, navigate]);

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
    navigate({ view: 'hub', section });
  }

  function openScenarioTab(tab: ScenarioTab) {
    if (!activeScenario) {
      return;
    }

    navigate({ view: 'scenario', scenarioId: activeScenario.id, tab });
  }

  const scenarioTab: ScenarioTab =
    route.view === 'scenario' ? route.tab : 'overview';
  const hubSection = route.view === 'hub' ? route.section : 'scenarios';

  let content = (
    <Hub
      token={session.token}
      section={hubSection}
      worldRefreshKey={worldRefreshKey}
      onCreateScenario={() => {
        setActiveScenario(null);
        navigate({ view: 'create', scenarioId: null });
      }}
      onOpenScenario={(scenario) => {
        setActiveScenario(scenario);

        if (scenario.status === 'DRAFT') {
          navigate({ view: 'create', scenarioId: scenario.id });
          return;
        }

        navigate({ view: 'scenario', scenarioId: scenario.id, tab: 'overview' });
      }}
      onSectionChange={(section) => navigate({ view: 'hub', section })}
    />
  );

  if (route.view === 'create') {
    content = (
      <Create
        token={session.token}
        initialScenarioId={route.scenarioId}
        startEmpty={route.scenarioId === null}
        onScenarioChange={setActiveScenario}
        onOpenScenario={() => {
          if (activeScenario) {
            navigate({
              view: 'scenario',
              scenarioId: activeScenario.id,
              tab: 'overview',
            });
          }
        }}
        onWorldProposal={() => setWorldRefreshKey((current) => current + 1)}
        onScenarioComplete={() => {
          if (activeScenario) {
            navigate({
              view: 'scenario',
              scenarioId: activeScenario.id,
              tab: 'overview',
            });
          }
        }}
      />
    );
  }

  if (route.view === 'scenario') {
    content =
      route.tab === 'preparation' ? (
        <Todo
          token={session.token}
          scenario={activeScenario}
          onCreateScenario={() =>
            navigate({
              view: 'create',
              scenarioId: activeScenario?.id ?? null,
            })
          }
          onOpenScenario={() => openScenarioTab('overview')}
        />
      ) : (
        <Scenario
          token={session.token}
          scenario={activeScenario}
          initialPanel={route.tab === 'sessions' ? 'sessions' : 'run'}
          onCreateScenario={() =>
            navigate({
              view: 'create',
              scenarioId: activeScenario?.id ?? null,
            })
          }
          onScenarioChange={setActiveScenario}
          onWorldProposal={() => setWorldRefreshKey((current) => current + 1)}
        />
      );
  }

  if (route.view === 'admin' && session.user.role === 'ADMIN') {
    content = (
      <Admin
        token={session.token}
        currentUserId={session.user.id}
        onOpenScenario={(scenario) => {
          setActiveScenario(scenario);
          navigate({
            view: 'scenario',
            scenarioId: scenario.id,
            tab: 'overview',
          });
        }}
      />
    );
  }

  return (
    <AppShell
      user={session.user}
      activeView={route.view}
      scenario={activeScenario}
      scenarioTab={scenarioTab}
      onOpenAdmin={() => navigate({ view: 'admin' })}
      onOpenHub={() => openHub()}
      onNavigateScenarioTab={openScenarioTab}
      onLogout={() => {
        void clearOfflineCaches();
        logout();
        navigate({ view: 'hub', section: 'scenarios' }, { replace: true });
      }}
    >
      {content}
    </AppShell>
  );
}
