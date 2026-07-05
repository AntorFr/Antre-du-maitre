import type { HubSection, ScenarioTab } from '../types/navigation';

/**
 * Représentation de l'écran courant, synchronisée avec l'URL du navigateur.
 * Chaque route correspond à un chemin réel : le bouton précédent/suivant, le
 * rafraîchissement et les favoris fonctionnent donc nativement sur iPad.
 */
export type Route =
  | { view: 'hub'; section: HubSection }
  | { view: 'create'; scenarioId: string | null }
  | { view: 'scenario'; scenarioId: string; tab: ScenarioTab }
  | { view: 'admin' };

export function buildPath(route: Route): string {
  switch (route.view) {
    case 'hub':
      return route.section === 'world' ? '/monde' : '/';
    case 'create':
      return route.scenarioId ? `/creer/${route.scenarioId}` : '/creer';
    case 'scenario':
      if (route.tab === 'preparation') {
        return `/scenario/${route.scenarioId}/preparation`;
      }
      if (route.tab === 'sessions') {
        return `/scenario/${route.scenarioId}/sessions`;
      }
      return `/scenario/${route.scenarioId}`;
    case 'admin':
      return '/admin';
  }
}

export function parseLocation(pathname: string): Route {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { view: 'hub', section: 'scenarios' };
  }

  const [first, second, third] = segments;

  if (first === 'monde') {
    return { view: 'hub', section: 'world' };
  }

  if (first === 'admin') {
    return { view: 'admin' };
  }

  if (first === 'creer') {
    return { view: 'create', scenarioId: second ?? null };
  }

  if (first === 'scenario' && second) {
    const tab: ScenarioTab =
      third === 'preparation'
        ? 'preparation'
        : third === 'sessions'
          ? 'sessions'
          : 'overview';
    return { view: 'scenario', scenarioId: second, tab };
  }

  return { view: 'hub', section: 'scenarios' };
}
