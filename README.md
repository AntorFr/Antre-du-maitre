# L'Antre du Maître

PWA (iPad et mobile) de création guidée de scénarios JDR — Chroniques
Oubliées Mini et Donjons & Dragons.

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

Le seed garantit toujours le compte admin local (`admin / admin12345`,
configurable via `DEV_ADMIN_*`) — c'est le secours si le SSO est indisponible.
Le compte enfant de dev (`merlin / merlin12345` dans `.env.example`) n'est créé
que si `DEV_CHILD_USERNAME` **et** `DEV_CHILD_PASSWORD` sont définis : en
production SSO, ne pas les définir.

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
garantit le compte admin local (+ le compte enfant si `DEV_CHILD_*` sont
définis). Le volume `antre-data` conserve la base SQLite entre deux lancements.

Les erreurs de réponse LLM invalide sont également conservées dans le volume :

```txt
/data/logs/llm-errors-YYYY-MM-DD.jsonl
```

Pour lire les derniers problèmes :

```bash
docker exec antre-du-maitre sh -lc 'tail -n 5 /data/logs/llm-errors-$(date +%F).jsonl'
```

## Authentification

Deux modes coexistent :

- **Login local** (dev) : comptes username/mot de passe stockés dans la base
  (seed `DEV_*`), session JWT 30 jours. C'est le seul mode quand les variables
  OIDC sont absentes.
- **SSO OIDC (Authelia)** : en production, tout le monde (parents et enfant)
  se connecte via Authelia. L'app est cliente OIDC (Authorization Code + PKCE) :

  ```env
  OIDC_ISSUER=https://auth.berard.me
  OIDC_CLIENT_ID=merlin
  OIDC_CLIENT_SECRET=...
  OIDC_REDIRECT_URI=https://merlin.berard.me/api/auth/oidc/callback
  OIDC_ADMIN_GROUP=parents
  ```

  Les quatre premières variables activent le mode (toutes ou aucune). Au
  callback, l'utilisateur est provisionné automatiquement (username =
  `preferred_username`) et son rôle est resynchronisé à chaque login depuis
  les groupes Authelia : membre de `OIDC_ADMIN_GROUP` → `ADMIN`, sinon
  `CHILD`. La session émise est le même JWT que le login local.

  Quand le SSO est actif, la page de connexion n'affiche qu'un bouton
  « Se connecter » (sans jargon) ; le login local reste accessible en
  dépannage derrière un lien discret.

## LLM

Trois providers, sélectionnés par `LLM_PROVIDER` (mock par défaut en dev) :

```env
LLM_PROVIDER=mock
```

**API Anthropic directe** (facturée à la clé API) :

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

**Claude Agent SDK** — consomme l'abonnement Claude (Pro/Max) au lieu d'une
clé API. Le SDK embarque le runtime Claude Code (aucune installation
supplémentaire) et sert de simple tuyau vers le modèle : un tour unique, aucun
outil, prompt système custom.

```env
LLM_PROVIDER=claude-agent
ANTHROPIC_MODEL=claude-sonnet-4-6
# Prod/Docker : token OAuth d'abonnement, généré une fois (valable 1 an) :
#   claude setup-token
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```

En dev local, `CLAUDE_CODE_OAUTH_TOKEN` est inutile si la machine est déjà
connectée via `claude login` (le runtime réutilise ces credentials).

Alternative sans terminal : la page **Admin** propose un panneau « Abonnement
Claude » qui pilote `claude setup-token` côté backend — le backend génère
l'URL d'autorisation, l'admin l'ouvre, autorise, puis colle le code affiché.
Le token est stocké dans `/data/claude/oauth-token` (jamais renvoyé au
client) et pris en compte immédiatement par le provider `claude-agent`, sans
redémarrage. Le TUI de `setup-token` exigeant un terminal, le backend le
lance sous `script(1)` (util-linux, présent dans l'image).

Tous les providers répondent en JSON strict, validé côté backend (schémas Zod
partagés). Avec le provider `anthropic`, le prompt système, volumineux et
stable, est mis en cache Anthropic (`cache_control`) pour réduire la latence
et le coût des tours successifs.

### Streaming des réponses

La création de scénario expose une variante SSE `POST /api/scenarios/:id/chat/stream`
qui diffuse le texte de Merlin au fil de sa génération, puis envoie la réponse
finale structurée (`event: done`). L'endpoint `POST .../chat` classique reste
disponible et sert de repli. Le provider mock streame aussi en développement.

### Réessai sur JSON invalide

Si le LLM renvoie un JSON mal formé ou non conforme au schéma, le backend
réessaie (jusqu'à 3 tentatives) en renvoyant au modèle sa réponse fautive avec
une consigne de correction. Le log d'erreur JSONL n'est écrit qu'après l'échec
de toutes les tentatives, avec le contexte, le prompt et la réponse brute :

- dev local : `logs/llm-errors/llm-errors-YYYY-MM-DD.jsonl`
- Docker : `/data/logs/llm-errors-YYYY-MM-DD.jsonl`

Ces fichiers sont ignorés par Git.

## Saisie vocale

Les zones de chat (création, détail d'acte, debrief) proposent une dictée via la
Web Speech API du navigateur (Safari iPad). La reconnaissance est locale : aucun
audio n'est envoyé au serveur. Le bouton micro se masque si le navigateur ne
supporte pas la dictée.

## Bestiaire DRS

Pour charger quelques monstres de développement sans réseau :

```bash
npm run drs:import:fixture --workspace @antre-du-maitre/backend
```

Pour importer depuis le DRS CoF :

```bash
npm run drs:import --workspace @antre-du-maitre/backend
```
