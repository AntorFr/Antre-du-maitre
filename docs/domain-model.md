# L'Antre du Maître — Modèle de domaine

## Vue d'ensemble

Le domaine est organisé autour de six agrégats :

1. `User`
2. `World`
3. `Scenario`
4. `ScenarioSession`
5. `WorldEntity` / `WorldEntityProposal`
6. `Monster`

## Utilisateurs et permissions

### `User`

- `ADMIN`
  - peut gérer les comptes ;
  - peut lire et modifier tous les mondes et scénarios.
- `CHILD`
  - ne peut accéder qu'à son propre monde et à ses propres scénarios.

### Règle d'autorisation

Tous les accès métier passent par un contrôle de portée :

- propriétaire direct ;
- ou admin.

## Monde persistant

### `World`

- Un monde unique par utilisateur.
- Contient les entités validées.

### `WorldEntity`

Une entité validée représente un fait persistant du monde :

- `LIEU`
- `PNJ`
- `FACTION`
- `EVENEMENT`
- `REGLE`

Chaque entité conserve :

- sa source (`CREATION`, `DEBRIEF`, `MANUAL`) ;
- éventuellement le scénario et la session à l'origine de son apparition.

### `WorldEntityProposal`

Les propositions sont un sas avant écriture définitive :

- `PENDING`
- `ACCEPTED`
- `REJECTED`

Elles sont générées :

- pendant la création ;
- après chaque debrief ;
- puis validées explicitement par l'utilisateur.

## Scénarios

### `Scenario`

Un scénario contient :

- les données structurées complètes (`data`) ;
- l'historique de conversation (`chatHistory`) ;
- le todo de préparation ;
- les sessions planifiées puis jouées.

### Statuts

- `DRAFT` : en cours de création ;
- `COMPLETE` : prêt à jouer ;
- `IN_PROGRESS` : au moins une session jouée, mais pas toutes ;
- `PLAYED` : toutes les sessions prévues sont jouées.

### Édition

- En V1, les changements passent par le chat.
- Pas de formulaire d'édition libre de la fiche validée.

## Sessions

### `ScenarioSession`

Une session réelle reprend une partie du plan de `sessionning`, mais vit séparément de `scenario.data`.

Elle porte :

- son numéro ;
- les actes prévus ;
- la durée prévue ;
- son statut (`PLANNED`, `PLAYED`) ;
- la date réelle de jeu ;
- l'historique et le résumé du debrief.

## Todo

### `TodoItem`

- Rattaché à un scénario.
- Groupé par catégorie :
  - `FICHES_MONSTRES`
  - `FICHES_PNJS`
  - `CARTES`
  - `DEROULEMENTS`
  - `AUTRE`

## Référentiels de jeu

### Battle Mats

Le format canonique est celui des fichiers déjà fournis :

- `id` comme `BM1-27-28`
- `volume`
- `pages`
- `nom`
- `nomFr`
- `description`
- `tags`
- `ambiances`
- `typesDefis`

### Bestiaire DRS

Le bestiaire complet est importé dans une table `Monster`.

Les champs structurés minimaux sont :

- identité (`id`, `slug`, `name`) ;
- provenance (`source`, `sourceUrl`) ;
- métadonnées (`nc`, `family`, `category`, `environment`, `archetype`, `size`) ;
- stats ;
- attaques ;
- capacités ;
- charge utile brute d'import pour audit et réimport.

## Principes d'architecture

1. Le backend est la source de vérité métier.
2. Les schémas partagés évitent les divergences entre frontend, backend et prompts.
3. Les providers LLM sont interchangeables.
4. Les prompts consomment des extraits ciblés de référentiels, pas les corpus entiers bruts.
