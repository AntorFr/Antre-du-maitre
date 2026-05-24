# L'Antre du Maître

PWA iPad de création guidée de scénarios CoF Mini.

## Structure

```txt
Dockerfile        Image unique : API Fastify + PWA React servie en statique
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

En développement Vite, le frontend appelle par défaut
`http://localhost:3001/api`. En build Docker/production, il appelle `/api`,
servi par le même processus Fastify.

## Docker unique

L'image Docker unique construit le backend et le frontend, puis sert :

- `/api/*` via Fastify
- la PWA React pour toutes les autres routes

Build :

```bash
docker build -t antre-du-maitre .
```

Run avec SQLite persisté dans un volume :

```bash
docker run --rm \
  --name antre-du-maitre \
  --env-file .env \
  -e DATABASE_URL=file:/data/antre.db \
  -e LLM_ERROR_LOG_DIR=/data/logs \
  -p 3001:3001 \
  -v antre-data:/data \
  antre-du-maitre
```

Puis ouvrir :

```txt
http://localhost:3001
```

Sur iPad, utiliser l'adresse réseau du Mac, par exemple :

```txt
http://192.168.x.x:3001
```

Au démarrage du container, les migrations Prisma sont appliquées et le seed
garantit les comptes admin/enfant. Le volume `antre-data` conserve la base
SQLite entre deux lancements.

Les erreurs de réponse LLM invalide sont également conservées dans le volume :

```txt
/data/logs/llm-errors-YYYY-MM-DD.jsonl
```

Pour lire les derniers problèmes :

```bash
docker exec antre-du-maitre sh -lc 'tail -n 5 /data/logs/llm-errors-$(date +%F).jsonl'
```

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

Si le LLM renvoie un JSON mal formé ou un objet qui ne respecte pas le schéma,
le backend écrit un log JSONL local avec le contexte, le prompt et la réponse
brute :

- dev local : `logs/llm-errors/llm-errors-YYYY-MM-DD.jsonl`
- Docker : `/data/logs/llm-errors-YYYY-MM-DD.jsonl`

Ces fichiers sont ignorés par Git.

## Bestiaire DRS

Pour charger quelques monstres de développement sans réseau :

```bash
npm run drs:import:fixture --workspace @antre-du-maitre/backend
```

Pour importer depuis le DRS CoF :

```bash
npm run drs:import --workspace @antre-du-maitre/backend
```
