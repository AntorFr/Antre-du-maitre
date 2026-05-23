# L'Antre du Maître

PWA iPad de création guidée de scénarios CoF Mini.

## Structure

```txt
backend/          API Fastify, Prisma, orchestration LLM
frontend/         PWA React/Vite
packages/shared/  Types partagés frontend/backend
docs/             Décisions produit, domaine, contrats API
files/            Artefacts initiaux fournis (spec, mockup, Battle Mats)
```

## Démarrage local

1. Copier `.env.example` vers `.env` à la racine du projet.
   La base locale est SQLite :

   ```env
   DATABASE_URL=file:./dev.db
   ```

   Le fichier SQLite est créé par Prisma dans `backend/prisma/dev.db`.
   Le backend lit uniquement le `.env` racine.

2. Installer les dépendances :

   ```bash
   npm install
   ```

3. Générer Prisma, créer la base puis lancer les services voulus :

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run dev:backend
   npm run dev:frontend
   ```

Le seed crée par défaut deux comptes de développement :

- `admin / admin12345`
- `merlin / merlin12345`

Ces identifiants sont configurables via les variables `DEV_*` de `.env`.

## LLM

Le développement local utilise le mock par défaut :

```env
LLM_PROVIDER=mock
```

Pour tester le provider réel :

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

Le provider réel répond en JSON strict pour conserver la machine d'état du
scénario côté backend.

## Bestiaire DRS

Pour charger quelques monstres de développement sans réseau :

```bash
npm run drs:import:fixture --workspace @antre-du-maitre/backend
```

Pour importer depuis le DRS CoF :

```bash
npm run drs:import --workspace @antre-du-maitre/backend
```
