// Cache hors-ligne des scénarios (service worker, cf. vite.config.ts).
// Purgé au logout : l'iPad est partagé entre comptes, la dernière version
// vue par un utilisateur ne doit pas ressortir pour le suivant.

const SCENARIO_CACHE_NAME = 'antre-scenarios';

export async function clearOfflineCaches(): Promise<void> {
  try {
    await caches.delete(SCENARIO_CACHE_NAME);
  } catch {
    // Pas de Cache API (vieux navigateur, contexte non sécurisé) : rien à purger.
  }
}
