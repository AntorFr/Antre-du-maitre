import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Hors-ligne : le shell complet est pré-caché — l'appli (et donc le
        // lanceur de dés, 100 % client) se lance sans réseau.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Lecture hors ligne des scénarios (détail, todo, sessions) :
            // NetworkFirst — frais en ligne, dernière version vue sinon.
            // GET uniquement (défaut Workbox) : le chat Merlin et toute
            // écriture restent réseau. Cache purgé au logout (iPad partagé),
            // cf. clearOfflineCaches().
            urlPattern: /\/api\/scenarios/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'antre-scenarios',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
      manifest: {
        name: "L'Antre du Maître",
        short_name: 'Antre du Maître',
        description: 'Création guidée de scénarios CoF Mini avec Merlin.',
        lang: 'fr',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        background_color: '#EEEDFE',
        theme_color: '#2A1F5C',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
