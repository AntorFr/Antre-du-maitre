# L'Antre du Maître — Plan d'implémentation

## Principe de livraison

Le développement commence par un **MVP vertical** :

1. authentification ;
2. création guidée ;
3. validation des entités proposées ;
4. fiche scénario ;
5. todo de préparation.

Le reste de l'architecture est préparé dès le départ pour éviter les réécritures, mais il ne doit pas retarder ce premier flux utilisable.

## Phases

### Phase 1 — Fondations

- monorepo ;
- Prisma + SQLite local ;
- React/Vite/Tailwind/PWA ;
- auth JWT ;
- rôles et permissions ;
- types partagés ;
- provider LLM réel + mock.

### Phase 2 — Référentiels

- Battle Mats existantes ;
- types de gameplay ;
- structure CoF Mini ;
- modèle `Monster` ;
- importeur DRS ;
- endpoints de consultation.

### Phase 3 — Cœur scénario backend

- CRUD scénario ;
- machine d'état des 10 étapes ;
- service de chat ;
- validation des réponses LLM ;
- propositions d'entités monde ;
- estimation de durée ;
- génération des sessions planifiées ;
- génération du todo.

### Phase 4 — Premier flux vertical frontend

- login ;
- layout iPad paysage ;
- écran de création vocal ;
- suggestions ;
- validation légère des entités ;
- fiche scénario ;
- todo interactif.

### Phase 5 — Monde et admin

- écran monde ;
- validation / rejet des propositions ;
- édition manuelle ;
- vues admin ;
- modification transverse par l'admin.

### Phase 6 — Sessions et debrief

- sessions jouées ;
- debrief vocal par session ;
- propositions issues du debrief ;
- évolution du monde ;
- transitions de statut scénario.

### Phase 7 — Finition MVP

- export PDF ;
- états d'erreur ;
- empty states ;
- polish Safari iPad ;
- manifeste PWA ;
- seed de démo ;
- tests d'intégration.

## Première séquence de tickets

1. Initialiser le monorepo.
2. Configurer Prisma avec SQLite local.
3. Poser le schéma Prisma.
4. Implémenter l'auth JWT et les rôles.
5. Créer les types partagés.
6. Intégrer les Battle Mats existantes.
7. Poser le modèle `Monster` et l'importeur DRS.
8. Ajouter l'abstraction `LlmProvider`.
9. Implémenter le CRUD scénario minimal.
10. Implémenter la machine d'état.
11. Implémenter `/chat` avec le provider mock.
12. Construire le layout frontend iPad.
13. Brancher le login.
14. Construire l'écran de création.
15. Générer le todo à la validation finale.
