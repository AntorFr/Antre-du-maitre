# L'Antre du Maître — Décisions produit

## Objectif du premier incrément

Le premier objectif est un **MVP vertical** réellement utilisable :

1. connexion ;
2. création guidée d'un scénario avec Merlin ;
3. validation légère des entités proposées pour le monde ;
4. fiche scénario ;
5. todo de préparation.

Le reste du produit doit être conçu dès le départ, mais il ne doit pas retarder ce premier flux complet.

## Décisions validées

| Sujet | Décision |
| --- | --- |
| Authentification | Tous les utilisateurs se connectent avec `username + password`. |
| Multi-utilisateur | Chaque utilisateur possède son propre monde et ses propres scénarios. |
| Admin | L'admin peut lire **et modifier** les mondes et scénarios de tous les utilisateurs. |
| Monde persistant | Les entités issues de la création ou d'un debrief sont proposées, puis validées avant insertion définitive. |
| Édition d'un scénario validé | Pas d'édition manuelle en V1 ; les changements passent par le chat. |
| Debrief | Un debrief est fait **après chaque session jouée**. |
| Battle Mats | Les fichiers TypeScript existants sont la source canonique. |
| Bestiaire | Merlin peut piocher librement dans **tout** le bestiaire DRS dès la création. |
| LLM | Le backend expose un provider réel Anthropic et un provider mock pour le développement et les tests. |
| PWA | L'application doit être installable ; le mode offline n'est pas un objectif V1. |
| UI | La maquette HTML est une référence graphique, pas un contrat d'interface final. La cible principale est l'iPad en paysage. |

## Conséquences produit

### Création de scénario

- La conversation est le chemin principal d'édition.
- Le backend garde la main sur la machine d'état ; le LLM propose du contenu, mais ne décide pas seul de la validité des transitions.
- Les changements importants du monde ne sont jamais persistés silencieusement.

### Scénarios joués

- Le découpage `sessionning` décrit le plan narratif.
- Les sessions réellement jouées sont persistées séparément afin d'y attacher :
  - leur statut ;
  - leur date réelle ;
  - leur historique de debrief ;
  - les entités proposées à l'issue de la session.
- Après le début d'une aventure jouée, les révisions passent par les debriefs et le monde persistant, pas par une édition libre des actes déjà vécus.

### Bestiaire

- Le catalogue complet DRS doit être disponible au moteur de création.
- Pour garder les prompts compacts, le backend récupère et injecte les fiches utiles à un instant donné au lieu d'envoyer tout le corpus brut à chaque appel.
- Les données importées conservent leur provenance.

## Non-objectifs V1

- Fonctionnement hors ligne.
- Édition manuelle complète d'une fiche scénario après validation.
- Synchronisation multi-appareil avancée.
- Marketplace de contenus ou publication externe.
- Interface admin sophistiquée au-delà de ce qui est nécessaire à la gestion familiale.
