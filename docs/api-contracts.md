# L'Antre du Maître — Contrats API

Toutes les routes applicatives sont préfixées par `/api`.

## Authentification

```txt
POST /auth/login
GET  /auth/me
POST /auth/logout
GET  /auth/config          -> { oidcEnabled }
GET  /auth/oidc/login      -> 302 vers Authelia (Authorization Code + PKCE)
GET  /auth/oidc/callback   -> 302 vers /#oidc-token=... (ou /#oidc-error=1)
```

## Utilisateurs

```txt
GET    /users
POST   /users
DELETE /users/:id
PUT    /users/:id/password
```

- Les routes utilisateurs sont réservées à l'admin, sauf changement ultérieur explicite.

## Scénarios

```txt
GET    /scenarios
POST   /scenarios
GET    /scenarios/:id
DELETE /scenarios/:id
GET    /scenarios/:id/export.pdf
POST   /scenarios/:id/chat
GET    /scenarios/:id/acts/:number/detail
POST   /scenarios/:id/acts/:number/detail/chat
POST   /scenarios/:id/npcs/:name/combat-sheet
```

### `POST /scenarios/:id/chat`

```ts
type ScenarioChatRequest = {
  message: string;
  voiceInput: boolean;
};

type ScenarioChatResponse = {
  reply: string;
  suggestions: string[];
  scenarioUpdate: Partial<ScenarioData> | null;
  proposedEntities: ProposedWorldEntity[];
  stepComplete: boolean;
  nextStep: ScenarioStep | null;
};
```

### Détail des actes

Le détail des actes suit le même principe que la création globale : le backend
pilote le workflow, le LLM propose, puis le backend valide avant persistance.

```ts
type ActDetailChatRequest = {
  message: string;
  voiceInput: boolean;
};

type ActDetailChatResponse = {
  reply: string;
  suggestions: string[];
  actDetailUpdate: Partial<ActDetail> | null;
  todoPreview: TodoItem[];
  detailComplete: boolean;
};
```

### Fiche de combat PNJ

```ts
type NpcCombatSheetRequest = {
  expectedLevel?: number;
  roleInFight?: string;
  baseMonsterId?: string;
};

type NpcCombatSheetResponse = {
  sheet: NpcCombatSheet;
  source: 'DRS_MONSTER' | 'LLM_GENERATED' | 'MANUAL';
  assumptions: string[];
};
```

## Todo

```txt
GET    /scenarios/:id/todo
POST   /scenarios/:id/todo/generate
POST   /scenarios/:id/todo
PUT    /scenarios/:id/todo/:itemId
DELETE /scenarios/:id/todo/:itemId
```

## Sessions et debriefs

```txt
GET  /scenarios/:id/sessions
POST /scenarios/:id/sessions/:number/mark-played
POST /scenarios/:id/sessions/:number/debrief
```

### `POST /scenarios/:id/sessions/:number/debrief`

```ts
type SessionDebriefRequest = {
  message: string;
};

type SessionDebriefResponse = {
  reply: string;
  suggestions: string[];
  proposedEntities: ProposedWorldEntity[];
  debriefComplete: boolean;
  session: ScenarioSession;
};
```

Les entités issues du debrief sont créées comme propositions du monde. Leur
validation reste centralisée via `POST /world/proposals/:id/accept` ou
`POST /world/proposals/:id/reject`.

## Monde

```txt
GET    /world
POST   /world/entities
PUT    /world/entities/:id
DELETE /world/entities/:id
GET    /world/proposals
POST   /world/proposals/:id/accept
POST   /world/proposals/:id/reject
GET    /world/proposals/:id/duplicates
POST   /world/proposals/:id/merge/:entityId
POST   /world/entities/:id/merge/:duplicateId
```

## Référentiels CoF

```txt
GET /cof/monsters
GET /cof/monsters/:id
GET /cof/profiles
GET /cof/rules
GET /cof/battlemats
GET /cof/battlemats/:volume
```

## Administration transverse

```txt
GET /admin/users/:userId/scenarios
GET /admin/users/:userId/world
POST /admin/users/:userId/world/entities
```

Les modifications transverses réutilisent ensuite les routes métier normales
avec les droits admin :

- `GET /scenarios/:id`
- `DELETE /scenarios/:id`
- `POST /scenarios/:id/chat`
- `PUT /world/entities/:id`
- `DELETE /world/entities/:id`
- `POST /world/proposals/:id/accept`
- `POST /world/proposals/:id/reject`

## Règles de permission

| Ressource | Enfant | Admin |
| --- | --- | --- |
| Son propre monde | lecture + modification | lecture + modification |
| Ses propres scénarios | lecture + modification via flux autorisés | lecture + modification |
| Données d'un autre utilisateur | interdit | lecture + modification |
| Comptes utilisateurs | interdit | lecture + modification |

## Principes de réponse

- Les erreurs métier utilisent des codes HTTP explicites.
- Les payloads sont validés côté backend avant traitement.
- Les réponses LLM structurées sont validées avant persistance.
- Les changements de scénario passent par des commandes métier, pas par des `PUT` génériques sur toute la ressource.
