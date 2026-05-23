# Spécification — L'Antre du Maître (CoF Mini)
> Plan de développement complet à destination d'un LLM codeur

---

## 1. Contexte et objectif

Construire une **Progressive Web App (PWA)** installable sur iPad, permettant à une enfant de 10 ans de créer des scénarios de jeu de rôle **Chroniques Oubliées Fantasy Mini** (CoF Mini) via une interface principalement **vocale**, guidée par un assistant IA à personnalité de Maître de Jeu.

L'application couvre trois phases du cycle de jeu :
1. **Préparation** — création guidée du scénario (histoire, gameplay, durée, matériel)
2. **Todo de préparation** — liste de tâches interactive générée automatiquement
3. **Debriefing post-session** — récit oral de la session → mise à jour du monde persistant

L'application est hébergée sur un cluster Kubernetes personnel, accessible uniquement en réseau local / VPN. Elle est multi-utilisateurs : un compte admin parent + des comptes enfants isolés (chacun avec son propre espace, son propre monde, ses propres scénarios).

Contexte joueurs : 2-3 joueurs, sessions cibles de 1h30 (budget 2h).

---

## 2. Stack technique

### Frontend
- **React 18 + Vite** (PWA via `vite-plugin-pwa`)
- **TypeScript**
- **TailwindCSS** pour le style
- **Web Speech API** (natif Safari iOS) pour la reconnaissance vocale et la synthèse vocale — pas de dépendance externe
- **React Query** pour la gestion des appels API
- Manifest PWA configuré pour installation iPad (icône, splash screen, `display: standalone`)

### Backend
- **Node.js + Fastify** (TypeScript)
- **Prisma ORM** + **PostgreSQL**
- **Anthropic SDK** (`@anthropic-ai/sdk`) pour les appels LLM
- **pdfkit** pour l'export PDF des fiches scénario
- **JWT** pour l'authentification (sessions longues 30 jours, usage familial)

### Infrastructure
- Deux **Dockerfiles** : un pour le frontend (Nginx servant le build Vite), un pour le backend (Node.js)
- **PostgreSQL** via un déploiement k8s dédié avec PersistentVolumeClaim
- Variables d'environnement : `ANTHROPIC_API_KEY`, `DATABASE_URL`, `JWT_SECRET`
- Le déploiement Helm est géré séparément ; fournir uniquement les Dockerfiles et un `docker-compose.yml` de développement local

---

## 3. Modèle de données (PostgreSQL via Prisma)

```prisma
model User {
  id        String     @id @default(uuid())
  username  String     @unique
  password  String     // bcrypt hash
  role      Role       @default(CHILD)
  createdAt DateTime   @default(now())
  world     World?
  scenarios Scenario[]
}

enum Role {
  ADMIN
  CHILD
}

model World {
  id       String        @id @default(uuid())
  userId   String        @unique
  user     User          @relation(fields: [userId], references: [id])
  entities WorldEntity[]
}

model WorldEntity {
  id          String      @id @default(uuid())
  worldId     String
  world       World       @relation(fields: [worldId], references: [id])
  type        EntityType
  name        String
  description String
  tags        String[]
  createdAt   DateTime    @default(now())
  scenarioId  String?     // entité créée lors de quel scénario
  source      String?     // 'CREATION' | 'DEBRIEF' | 'MANUAL'
}

enum EntityType {
  LIEU
  PNJ
  FACTION
  EVENEMENT
  REGLE
}

model Scenario {
  id          String         @id @default(uuid())
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  title       String
  status      ScenarioStatus @default(DRAFT)
  data        Json           // structure complète du scénario (voir section 6)
  chatHistory Json           // historique du dialogue de création
  todoItems   TodoItem[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

enum ScenarioStatus {
  DRAFT       // en cours de création
  COMPLETE    // fiche finalisée, prête à jouer
  PLAYED      // partie(s) jouée(s)
}

model TodoItem {
  id          String      @id @default(uuid())
  scenarioId  String
  scenario    Scenario    @relation(fields: [scenarioId], references: [id])
  category    TodoCategory
  label       String
  done        Boolean     @default(false)
  order       Int
  createdAt   DateTime    @default(now())
}

enum TodoCategory {
  FICHES_MONSTRES   // fiches stats à préparer
  FICHES_PNJS       // description PNJs à rédiger
  CARTES            // cartes Battle Mats à sortir
  DEROULEMENTS      // déroulés et options à penser
  AUTRE
}
```

---

## 4. Architecture des routes API (Fastify)

### Auth
```
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Utilisateurs (admin seulement)
```
GET    /api/users
POST   /api/users             body: { username, password, role }
DELETE /api/users/:id
PUT    /api/users/:id/password
```

### Scénarios
```
GET    /api/scenarios
POST   /api/scenarios
GET    /api/scenarios/:id
PUT    /api/scenarios/:id
DELETE /api/scenarios/:id
GET    /api/scenarios/:id/pdf
```

### Chat de création
```
POST /api/scenarios/:id/chat
  body: { message: string, voiceInput: boolean }
  → { reply: string, suggestions: string[], scenarioUpdate: Partial<ScenarioData> | null, stepComplete: boolean, nextStep: string | null }
```

### Todo de préparation
```
GET  /api/scenarios/:id/todo              → liste des TodoItems
POST /api/scenarios/:id/todo/generate     → (re)générer le todo via LLM
PUT  /api/scenarios/:id/todo/:itemId      body: { done: boolean } → cocher/décocher
POST /api/scenarios/:id/todo              body: { category, label } → ajouter item manuellement
DELETE /api/scenarios/:id/todo/:itemId
```

### Debriefing post-session
```
POST /api/scenarios/:id/debrief
  body: { message: string }
  → { reply: string, proposedEntities: ProposedEntity[] | null }
POST /api/scenarios/:id/debrief/validate
  body: { entities: NewWorldEntity[] }
```

### Base de connaissance du monde
```
GET    /api/world
POST   /api/world/entities
PUT    /api/world/entities/:id
DELETE /api/world/entities/:id
```

### Référence CoF Mini (données statiques)
```
GET /api/cof/monsters
GET /api/cof/profiles
GET /api/cof/rules
GET /api/cof/battlemats           → tous les volumes
GET /api/cof/battlemats/:volume   → volume 1, 2 ou 3
```

---

## 5. Système de chat guidé — logique backend

### Flux de création en étapes

```
STEP_1_AMBIANCE      → Quel ton ? (mystère / humour / action / frisson doux)
STEP_2_LIEU          → Où se passe l'aventure ?
STEP_3_QUETE         → Quelle est la mission des héros ?
STEP_4_MECHANT       → Qui est l'antagoniste ?
STEP_5_PNJS          → Qui vont-ils rencontrer en chemin ?
STEP_6_GAMEPLAY      → Quels types de défis ? (voir section 5bis)
STEP_7_ACTES         → Construction des actes avec jalons de durée
STEP_8_RENCONTRES    → Quels monstres / obstacles, sur quelles cartes Battle Mats ?
STEP_9_DUREE         → Estimation durée totale + découpage sessions si besoin
STEP_10_RECAP        → Relecture et validation → génération auto du todo
```

### Comportement du LLM à chaque étape

À chaque appel `/chat`, le backend :
1. Récupère `scenario.chatHistory` et `scenario.data`
2. Récupère un résumé condensé du monde (`world.entities`)
3. Construit le prompt système (voir section 7) avec le contexte courant
4. Appelle l'API Anthropic
5. Parse la réponse JSON structurée
6. Met à jour `scenario.data`
7. Extrait les nouvelles entités monde si pertinent
8. Retourne `{ reply, suggestions, scenarioUpdate, stepComplete, nextStep }`

Quand `STEP_10_RECAP` est validé, déclencher automatiquement `POST /todo/generate`.

### Format de réponse LLM

```json
{
  "reply": "Texte lu à voix haute — max 2 phrases courtes, langage enfant 10 ans",
  "suggestions": ["Option A", "Option B", "Option C"],
  "stepComplete": true,
  "nextStep": "STEP_6_GAMEPLAY",
  "extractedData": { "field": "lieu", "value": "La Forêt des Murmures" },
  "newWorldEntities": [
    { "type": "LIEU", "name": "La Forêt des Murmures", "description": "..." }
  ]
}
```

---

## 5bis. Guidage gameplay — types de défis

### Principe

À l'étape `STEP_6_GAMEPLAY`, l'assistant explique brièvement chaque type de défi disponible en CoF Mini, puis suggère une combinaison adaptée au scénario en cours. Le niveau de guidage est **équilibré** : l'assistant recommande avec une explication simple, et la MJ choisit.

### Les types de défis disponibles

```typescript
export const GAMEPLAY_TYPES = [
  {
    id: 'combat',
    name: 'Combat',
    icon: '⚔️',
    description: 'Les héros affrontent des ennemis avec des dés !',
    conseil: 'Un combat de boss à la fin, c\'est toujours spectaculaire.',
    dureeEstimee: 20, // minutes par rencontre combat avec 2-3 joueurs
  },
  {
    id: 'enquete',
    name: 'Enquête',
    icon: '🔍',
    description: 'Les héros cherchent des indices et parlent aux gens.',
    conseil: 'Prévoir 2-3 indices différents pour mener au même endroit.',
    dureeEstimee: 15,
  },
  {
    id: 'enigme',
    name: 'Énigme',
    icon: '🧩',
    description: 'Les héros doivent résoudre une devinette ou un puzzle.',
    conseil: 'Toujours avoir une solution de secours si les joueurs bloquent.',
    dureeEstimee: 10,
  },
  {
    id: 'negociation',
    name: 'Négociation',
    icon: '🤝',
    description: 'Les héros doivent convaincre quelqu\'un avec les mots.',
    conseil: 'Donner un vrai enjeu au PNJ pour qu\'il résiste un peu.',
    dureeEstimee: 10,
  },
  {
    id: 'exploration',
    name: 'Exploration',
    icon: '🗺️',
    description: 'Les héros traversent un lieu dangereux ou inconnu.',
    conseil: 'Ajouter un piège ou une surprise pour pimenter l\'exploration.',
    dureeEstimee: 15,
  },
  {
    id: 'fuite',
    name: 'Fuite / Poursuite',
    icon: '🏃',
    description: 'Les héros doivent s\'échapper ou poursuivre quelqu\'un !',
    conseil: 'Garder le rythme rapide, peu de jets de dés.',
    dureeEstimee: 10,
  },
]
```

### Suggestions de combinaisons selon l'ambiance

Le LLM propose une combinaison de 2-3 types selon l'ambiance choisie en STEP_1 :

| Ambiance | Combinaison recommandée | Explication pour la MJ |
|---|---|---|
| Mystère | Enquête + Énigme + (1 combat) | "On cherche d'abord, on réfléchit, puis on affronte !" |
| Action | Combat + Fuite + Exploration | "Ça bouge tout le temps, les dés chauffent !" |
| Humour | Négociation + Énigme + (1 combat raté comique) | "Les héros se débrouillent en parlant et en se trompant !" |
| Frisson doux | Exploration + Enquête + (1 combat de boss) | "On découvre, on a un peu peur, et on gagne à la fin !" |

---

## 6. Structure d'un scénario (champ `data` en JSON)

```typescript
interface ScenarioData {
  currentStep: string;
  title: string;
  ambiance: 'mystere' | 'humour' | 'action' | 'frisson';

  lieu: {
    nom: string;
    description: string;
  };

  quete: string;

  antagoniste: {
    nom: string;
    nature: string;
    monsterId?: string;
    motivation: string;
  };

  pnjs: Array<{
    nom: string;
    role: 'allie' | 'neutre' | 'ennemi';
    description: string;
    motivation: string;
  }>;

  gameplay: {
    types: string[];           // ids des types choisis ex: ['enquete', 'enigme', 'combat']
    notes: string;             // conseils spécifiques générés par le LLM
  };

  actes: Array<{
    numero: number;            // 1, 2, 3 (ou plus si multi-session)
    titre: string;
    type: string;              // id gameplay principal de cet acte
    description: string;       // déroulé narratif
    options: string[];         // 2-3 chemins possibles si les joueurs font autre chose
    dureeEstimeeMin: number;   // en minutes
    pointDeCoupure: boolean;   // peut-on finir la session ici ?
    notesMJ: string;           // conseils d'animation pour cet acte
  }>;

  rencontres: Array<{
    monsterId: string;
    nombre: number;
    acteNumero: number;        // dans quel acte a lieu cette rencontre
    contexte: string;
    carteBattleMat?: {
      volume: number;          // 1, 2 ou 3
      reference: string;       // ex: "BM2-047"
      nom: string;             // ex: "Carrefour en forêt"
      description: string;
    };
    recompense?: string;
  }>;

  sessionning: {
    dureeTotaleEstimeeMin: number;
    nombreSessionsRecommande: number;  // 1 si < 90min, 2 sinon
    sessions: Array<{
      numero: number;
      actesInclus: number[];          // numéros des actes
      dureeEstimeeMin: number;
      resumeAccroche: string;         // phrase de rappel pour commencer la session suivante
    }>;
  };

  recompense: string;
  notesMJ: string;
}
```

---

## 7. Gestion de la durée et du découpage multi-session

### Règle de calcul

Le LLM estime la durée totale à l'étape `STEP_9_DUREE` en additionnant :
- Durée de base par type de défi (voir `GAMEPLAY_TYPES.dureeEstimee`)
- Marge joueurs (×1.3 pour 2-3 joueurs novices)
- Buffer imprévus : +15 min fixe

Si la durée totale estimée dépasse **90 minutes**, l'assistant propose automatiquement un découpage en 2 sessions (rarement 3 pour CoF Mini).

### Critères de point de coupure

Un acte peut être marqué `pointDeCoupure: true` si :
- Il se termine par une résolution claire (même partielle)
- Les héros sont en sécurité ou dans un endroit logique pour faire une pause
- L'acte suivant commence par une nouvelle situation (pas en milieu de combat)

### Ce que le LLM génère à cette étape

```json
{
  "reply": "Ton aventure va durer environ 2h ! C'est un peu long pour une session. Je te propose de la couper en deux parties.",
  "suggestions": [
    "Couper après l'acte 2 (la découverte du donjon)",
    "Couper après l'acte 1 (le voyage en forêt)",
    "Garder en une seule session et raccourcir l'acte 2"
  ],
  "sessionning": {
    "dureeTotaleEstimeeMin": 120,
    "nombreSessionsRecommande": 2,
    "sessions": [
      { "numero": 1, "actesInclus": [1, 2], "dureeEstimeeMin": 60, "resumeAccroche": "Les héros ont découvert l'entrée du donjon et doivent maintenant y entrer..." },
      { "numero": 2, "actesInclus": [3, 4], "dureeEstimeeMin": 60, "resumeAccroche": "La dernière fois, nos héros avaient réussi à entrer dans le donjon..." }
    ]
  }
}
```

---

## 8. Todo de préparation

### Génération automatique

Déclenchée automatiquement après validation du `STEP_10_RECAP`. Le LLM analyse `scenario.data` complet et génère la liste de tâches. Elle peut aussi être régénérée manuellement.

### Catégories et contenu généré

Le LLM génère des `TodoItem` concrets et personnalisés, pas des items génériques.

**Exemples de génération pour un scénario "La Forêt des Murmures" :**

```
FICHES_MONSTRES
  ☐ Fiche monstre : Araignée géante (DEF 12, PV 8, ATT +3, DGT 1d6+poison)
  ☐ Fiche monstre : Esprit de la forêt (DEF 14, PV 12, ATT +4, DGT 1d8)

FICHES_PNJS
  ☐ Fiche PNJ : Vieille Maren (la forestière) — alliée, sait où est la clairière
  ☐ Fiche PNJ : Le Seigneur des Araignées — antagoniste, motivé par la vengeance

CARTES
  ☐ Sortir la carte BM1-023 "Chemin en forêt" (Vol. 1, p.23) — Acte 1 : arrivée
  ☐ Sortir la carte BM2-047 "Clairière mystérieuse" (Vol. 2, p.47) — Acte 3 : combat final

DEROULEMENTS
  ☐ Préparer 3 indices pour l'enquête (traces, rumeurs, lettre)
  ☐ Préparer l'énigme de la porte (3 solutions possibles)
  ☐ Penser à ce qui se passe si les joueurs évitent le combat final

AUTRE
  ☐ Imprimer la fiche de scénario PDF
  ☐ Préparer les dés et pions
```

### Interface du todo (frontend)

- Liste groupée par catégorie avec header coloré par catégorie
- Checkbox tactile (≥ 44px) pour cocher chaque item
- Barre de progression globale en haut ("5/12 tâches complétées")
- Bouton "Ajouter une tâche" par catégorie
- Bouton "Regénérer le todo" (avec confirmation, remet tout à zéro)
- Le todo est accessible depuis la fiche scénario

### Route de génération du todo (backend)

```typescript
// POST /api/scenarios/:id/todo/generate
// Le LLM reçoit le scenario.data complet + les données Battle Mats
// Il retourne un tableau de TodoItem à créer en base

const TODO_GENERATION_PROMPT = `
Tu es un assistant de préparation de jeu de rôle CoF Mini.
Analyse le scénario suivant et génère une liste de tâches concrètes et personnalisées
que la Maîtresse de Jeu doit préparer avant la partie.

SCÉNARIO : {scenarioData}
CARTES BATTLE MATS SÉLECTIONNÉES : {selectedBattleMats}

Génère des items concrets (cite les noms des monstres, PNJs, lieux réels du scénario).
Catégories : FICHES_MONSTRES, FICHES_PNJS, CARTES, DEROULEMENTS, AUTRE.
Réponds uniquement en JSON : { "items": [ { "category": "...", "label": "...", "order": 1 } ] }
`
```

---

## 9. Battle Mats — base de données des cartes

### Contexte

Les 3 volumes de Battle Mats sont des livres physiques. La base de données est saisie manuellement par le développeur dans un fichier TypeScript statique. Dans l'app, chaque carte est représentée par sa référence, son nom et une description textuelle — pas d'image.

### Structure des données

```typescript
// src/data/battle-mats.ts

export interface BattleMat {
  id: string;            // ex: 'BM1-023'
  volume: 1 | 2 | 3;
  reference: string;     // ex: 'BM1-023'
  pagePhysique: number;  // page dans le livre physique
  nom: string;           // ex: 'Chemin en forêt'
  description: string;   // description visuelle courte (2-3 phrases)
  tags: BattleMatTag[];  // pour le filtrage et la suggestion LLM
  ambiances: string[];   // ex: ['foret', 'nature', 'voyage']
}

export type BattleMatTag =
  | 'interieur' | 'exterieur'
  | 'foret' | 'donjon' | 'village' | 'montagne' | 'eau' | 'plaine' | 'souterrain' | 'batiment'
  | 'combat' | 'exploration' | 'rencontre'
  | 'jour' | 'nuit';

export const BATTLE_MATS: BattleMat[] = [
  // À remplir manuellement depuis les 3 volumes physiques
  {
    id: 'BM1-001',
    volume: 1,
    reference: 'BM1-001',
    pagePhysique: 1,
    nom: 'Carrefour de village',
    description: 'Une place centrale avec un puits, entourée de maisons en pierre. Idéal pour une rencontre ou une négociation en plein air.',
    tags: ['exterieur', 'village', 'rencontre'],
    ambiances: ['village', 'civilise', 'jour'],
  },
  // ... toutes les cartes des 3 volumes
]
```

> **Note pour le développeur** : saisir toutes les cartes des 3 volumes manuellement depuis les livres physiques. Prévoir environ 30-50 cartes par volume. La description doit être assez précise pour que le LLM puisse faire des suggestions pertinentes.

### Suggestion automatique de cartes par le LLM

À l'étape `STEP_8_RENCONTRES`, pour chaque rencontre, le LLM reçoit :
- Le contexte narratif de la rencontre
- La liste complète des Battle Mats (id + nom + description + tags)

Il suggère 2-3 cartes adaptées. La MJ choisit.

### Affichage dans l'app

Pour une carte sélectionnée, l'app affiche :
```
┌────────────────────────────────────────┐
│  🗺️ BM2-047 — Clairière mystérieuse   │
│  Volume 2, page 47                     │
│                                        │
│  Une grande clairière circulaire       │
│  entourée d'arbres anciens. Un vieux   │
│  chêne mort trône au centre.           │
│                                        │
│  Tags : extérieur • forêt • combat     │
└────────────────────────────────────────┘
```

---

## 10. Prompt système LLM

### Prompt de création (chat principal)

```
Tu es Merlin, le Maître de Jeu assistant de l'application "L'Antre du Maître".
Tu aides une jeune Maîtresse de Jeu de 10 ans à créer des aventures pour
Chroniques Oubliées Fantasy Mini (CoF Mini), pour 2-3 joueurs, sessions de 1h30.

TON PERSONNAGE :
- Enthousiaste, encourageant, un peu théâtral
- Vocabulaire simple, adapté à une enfant de 10 ans
- Tu valides toujours les idées avant de les enrichir ("Oh super idée !", "Excellent !")
- Tes réponses vocales font maximum 2 phrases courtes
- Expressions fantastiques bienvenues ("Par les dragons !", "Quelle aventure !")

CONNAISSANCE DU JEU :
- Contexte : 2-3 joueurs, sessions cibles de 1h30 (budget 2h max)
- Règles CoF Mini : [INSÉRER stats monstres, profils, règles depuis le PDF]
- Types de défis disponibles : [INSÉRER GAMEPLAY_TYPES]
- Cartes Battle Mats disponibles : {battleMatsListSummary}

MONDE ACTUEL :
{worldSummary}

SCÉNARIO EN COURS :
Étape : {currentStep}
Données collectées : {scenarioDataSummary}

GUIDAGE GAMEPLAY (étape STEP_6) :
Pour chaque type de défi que tu suggères, explique en une phrase pourquoi c'est bien
pour CE scénario précis. Ne pas juste lister, mais recommander avec raison.
Exemple : "L'enquête marche très bien ici parce que le village a plein de secrets !"

GESTION DE LA DURÉE (étape STEP_9) :
- Calcule la durée estimée en additionnant les durées des défis choisis × 1.3
- Ajoute 15 minutes de marge
- Si total > 90min : propose de couper en 2 sessions
- Indique quel acte est le meilleur point de coupure et pourquoi

CONTRAINTES DE RÉPONSE :
- Réponds TOUJOURS en JSON valide, sans markdown, sans backticks
- "reply" : naturel et oral, sera lu à voix haute
- "suggestions" : exactement 3 options courtes et concrètes
- Quand une étape est complète, indique nextStep
```

### Prompt de génération du todo (appel séparé, non vocal)

```
Tu es un assistant de préparation JDR CoF Mini.
Analyse le scénario et génère une liste de tâches CONCRÈTES et PERSONNALISÉES.
Cite les vrais noms des monstres, PNJs, lieux du scénario.
Pour les cartes, cite la référence exacte (ex: BM2-047).

SCÉNARIO COMPLET : {scenarioData}
CARTES SÉLECTIONNÉES : {selectedBattleMats}

Catégories : FICHES_MONSTRES, FICHES_PNJS, CARTES, DEROULEMENTS, AUTRE

Réponds uniquement en JSON :
{ "items": [ { "category": "FICHES_MONSTRES", "label": "Fiche monstre : Gobelin (DEF 12, PV 4...)", "order": 1 } ] }
```

---

## 11. Interface utilisateur — structure des écrans

### Écran de connexion
- Sélecteur de profil visuel (avatar + prénom) pour les enfants
- PIN 4 chiffres pour les enfants
- Lien "Connexion admin" séparé

### Écran — Mode Création (vocal)

**Zone haute (fond violet foncé) :**
- Avatar animé Merlin + anneau pulsant quand il parle
- Bulle de dialogue avec le texte de la réponse
- Indicateur de synthèse vocale en cours

**Zone centrale :**
- Barre de progression en étapes visuelles (icônes + labels courts)
- Zone de transcription vocale (texte grisé italique)
- 3 boutons de suggestions larges (≥ 44px)
- Mention "ou dis autre chose !"

**Zone basse :**
- Grand bouton microphone (appui long pour parler)
- Feedback visuel pendant l'écoute (ondes animées)

**Navigation bas d'écran (4 onglets) :**
- Créer (icône baguette)
- Mon scénario (icône parchemin)
- Mon monde (icône carte)
- Après la partie (icône étoile)

### Écran — Mon scénario

**Vue fiche scénario :**
- Résumé visuel par section (cards : Lieu, Quête, Antagoniste, Actes, Sessionning)
- Section Sessionning : timeline visuelle des sessions avec durées estimées
- Bouton "Télécharger la fiche PDF"
- Bouton "Préparer la partie" → navigue vers le Todo
- Bouton "On a joué cette aventure !" (si statut COMPLETE) → ouvre le Debriefing

**Vue liste scénarios :**
- Cards par scénario : titre + ambiance + statut + date
- Bouton "Nouvelle aventure"

### Écran — Mon todo de préparation

Accessible depuis la fiche scénario via "Préparer la partie".

- Barre de progression globale en haut (X/Y tâches)
- Liste groupée par catégorie avec badge coloré
  - 🟣 Fiches monstres
  - 🔵 Fiches PNJs
  - 🟤 Cartes Battle Mats
  - 🟡 Déroulements & options
  - ⚪ Autre
- Checkbox tactile par item (≥ 44px)
- Bouton "+" par catégorie pour ajouter un item
- Bouton "Regénérer" en haut à droite (avec confirmation)
- Items cochés visuellement barrés mais restent visibles

### Écran — Mon monde
- Liste des entités par type (Lieux / PNJs / Factions / Événements / Règles)
- Chaque entité : nom + description courte + badge type + badge source (Création / Debriefing / Manuel)
- Bouton d'ajout manuel
- Filtre par type

### Écran — Après la partie (debriefing post-session)

**Étape 1 — Marquer comme jouée**
- Bouton "On a joué cette aventure !" sur la fiche scénario
- Passe statut → PLAYED, ouvre le flux debriefing

**Étape 2 — Debriefing vocal guidé**
- Même interface que la création (Merlin + micro + synthèse)
- Questions posées :
  1. "Alors, comment s'est passée l'aventure ?"
  2. "Est-ce que les héros ont réussi leur quête ?"
  3. "Il s'est passé quelque chose de surprenant ?"
  4. "Est-ce qu'un personnage est devenu vraiment important ?"
  5. "Qu'est-ce qui a changé dans le monde ?"

**Étape 3 — Validation des entités monde**
- Le LLM propose des entités à ajouter ("Le gobelin Rokk est devenu un allié — ajouter au monde ?")
- Bouton "Ajouter" / "Ignorer" par entité proposée
- Les entités validées sont taguées `source: DEBRIEF`

### Écran Admin (parent)
- Liste des utilisateurs enfants avec bouton créer / supprimer
- Vue sur les scénarios de chaque enfant (lecture seule)
- Accès à la gestion du monde de chaque enfant

---

## 12. Export PDF de la fiche scénario

Généré côté backend avec **pdfkit**. Format A4.

```
┌─────────────────────────────────────────┐
│  [Titre de l'aventure]         CoF Mini │
│  Par [Prénom] — [Ambiance] — [Durée]    │
├─────────────────────────────────────────┤
│  RÉSUMÉ EN UNE PHRASE                   │
├──────────────┬──────────────────────────┤
│  LIEU        │  QUÊTE                   │
├──────────────┴──────────────────────────┤
│  L'ANTAGONISTE : Nom — Motivation       │
├─────────────────────────────────────────┤
│  PERSONNAGES IMPORTANTS (PNJs)          │
├─────────────────────────────────────────┤
│  GAMEPLAY : Enquête + Énigme + Combat   │
│  Conseil : [notesMJ.gameplay]           │
├─────────────────────────────────────────┤
│  DÉCOUPAGE SESSIONS                     │
│  Session 1 (~60min) : Actes 1-2         │
│  Session 2 (~60min) : Actes 3-4         │
├─────────────────────────────────────────┤
│  ACTE 1 — [Titre] (~20min)  ⏱          │
│  Déroulé : ...                          │
│  Options si les joueurs font X : ...    │
│  Conseils MJ : ...                      │
│  [Même structure pour chaque acte]      │
├─────────────────────────────────────────┤
│  RENCONTRES & MONSTRES                  │
│  [Monstre] x N — Acte X                 │
│  Carte : BM2-047 "Clairière" (Vol.2 p47)│
├─────────────────────────────────────────┤
│  RÉCOMPENSE                             │
│  NOTES GÉNÉRALES DU MAÎTRE DE JEU      │
└─────────────────────────────────────────┘
```

---

## 13. Données statiques CoF Mini

Fichier `backend/src/data/cof-mini.ts` — à saisir depuis le PDF CoF Mini.

```typescript
export const MONSTERS = [
  {
    id: 'gobelin',
    name: 'Gobelin',
    for: 8, dex: 14, con: 10, int: 8, sag: 8, cha: 6,
    def: 12, pv: 4, att: '+2', dgt: '1d6',
    description: 'Un petit être vert et malicieux.',
    tipsMJ: 'Jouer en groupe, fuient si leur chef tombe.',
    dureeEstimeeParCombat: 15, // minutes pour 2-3 joueurs
  },
  // ... 7 autres monstres
]

export const PROFILES = [
  { id: 'guerrier', name: 'Guerrier', emoji: '⚔️', description: '...' },
  { id: 'rodeur',   name: 'Rôdeur',   emoji: '🏹', description: '...' },
  // ...
]

export const RULES = {
  jet: "Lance 1d20 + modificateur. Si le résultat égale ou dépasse la Difficulté, c'est réussi.",
  critique: "20 naturel = réussite critique. 1 naturel = échec critique.",
  initiative: "Chacun lance 1d20 + mod DEX. Le plus haut commence.",
  combat: "Attaque : 1d20 + mod FOR ou DEX vs Défense de la cible. Si réussi, dégâts.",
}
```

> **Note pour le développeur** : ne pas inventer ces valeurs, les saisir depuis le PDF fourni.

---

## 14. Gestion de l'intégration vocale (frontend)

```typescript
// Hook useSpeech.ts

// Reconnaissance vocale
// window.SpeechRecognition || window.webkitSpeechRecognition
// lang: 'fr-FR', continuous: false, interimResults: true
// Déclenché par appui long sur le bouton micro
// Arrêt automatique au silence ou relâchement

// Synthèse vocale
// window.speechSynthesis
// Attendre l'événement 'voiceschanged' avant getVoices() (iOS)
// Voix cible : première voix fr-FR féminine disponible ('Amélie' si présente)
// pitch: 1.05, rate: 0.95
// Démarre automatiquement à la réception du champ "reply"
// Interrompre si l'utilisateur appuie sur le micro avant la fin
```

---

## 15. Sécurité

- JWT, expiration 30 jours
- Comptes enfants : filtre `userId` sur toutes les requêtes
- Admin : accès lecture sur les données enfants, pas de modification
- `ANTHROPIC_API_KEY` côté backend uniquement
- Mots de passe / PINs hashés bcrypt

---

## 16. Variables d'environnement

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@postgres:5432/cofmini
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=une-longue-chaine-aleatoire
PORT=3001
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=http://backend:3001
```

---

## 17. Structure des fichiers du projet

```
cofmini/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── hooks/
│       │   ├── useSpeech.ts
│       │   └── useApi.ts
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Create.tsx       # chat vocal de création
│       │   ├── Scenario.tsx     # fiche scénario + liste
│       │   ├── Todo.tsx         # liste de préparation interactive
│       │   ├── World.tsx        # base de connaissance
│       │   ├── Debrief.tsx      # debriefing post-session
│       │   └── Admin.tsx
│       └── components/
│           ├── MJAvatar.tsx
│           ├── SpeechBubble.tsx
│           ├── MicButton.tsx
│           ├── SuggestionCards.tsx
│           ├── ProgressSteps.tsx
│           ├── TodoList.tsx
│           ├── BattleMatCard.tsx
│           ├── SessionTimeline.tsx
│           └── NavBar.tsx
│
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── server.ts
│   │   ├── data/
│   │   │   ├── cof-mini.ts      # monstres, profils, règles (à remplir)
│   │   │   ├── battle-mats.ts   # cartes Battle Mats (à remplir)
│   │   │   └── gameplay-types.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── scenarios.ts
│   │   │   ├── chat.ts
│   │   │   ├── todo.ts
│   │   │   ├── world.ts
│   │   │   └── cof.ts
│   │   ├── services/
│   │   │   ├── llm.ts           # orchestration Anthropic (création + todo + debrief)
│   │   │   ├── pdf.ts           # génération PDF pdfkit
│   │   │   ├── todo.ts          # génération et gestion todo
│   │   │   └── world.ts         # extraction entités monde
│   │   └── middleware/
│   │       └── auth.ts
│   └── prisma/
│       └── schema.prisma
│
└── docker-compose.yml
```

---

## 18. Ordre de développement recommandé

```
Phase 1 — Fondations
  1. Setup Fastify + Prisma + PostgreSQL
  2. Auth JWT
  3. CRUD scénarios
  4. Données statiques : cof-mini.ts, gameplay-types.ts

Phase 2 — Cœur LLM création
  5. Route /chat avec prompt système complet
  6. Logique des 10 étapes (dont STEP_6_GAMEPLAY et STEP_9_DUREE)
  7. Extraction automatique entités monde
  8. CRUD world entities

Phase 3 — Todo & Battle Mats
  9. Données statiques battle-mats.ts (structure prête, contenu à remplir)
  10. Route /todo/generate avec prompt dédié
  11. CRUD TodoItems

Phase 4 — Frontend
  12. Setup React + Vite + PWA + Tailwind
  13. Connexion + sélecteur de profil
  14. Hook useSpeech
  15. Écran Create (chat vocal)
  16. Écran Scénario + SessionTimeline
  17. Écran Todo (liste interactive)
  18. Écran Monde
  19. Écran Debrief

Phase 5 — Polish
  20. Export PDF pdfkit (avec section sessionning et actes détaillés)
  21. Écran Admin
  22. Manifest PWA + icônes iPad
  23. Tests Safari iOS
```

---

## 19. Points d'attention spécifiques iPad / Safari

- Web Speech API : nécessite un **geste utilisateur** pour s'initialiser
- `speechSynthesis.getVoices()` : asynchrone sur iOS, attendre `voiceschanged`
- Manifest PWA : `"display": "standalone"` + `"apple-mobile-web-app-capable": "yes"`
- Boutons tactiles : zone de tap ≥ 44×44px (Apple HIG)
- Pas de `hover` states : tout feedback en `active` / `focus`
- Police minimum 16px pour éviter le zoom iOS sur les inputs
- `-webkit-overflow-scrolling: touch` sur les listes scrollables
