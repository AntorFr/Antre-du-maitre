# Status — L'Antre du Maître

> MàJ : 2026-08-07

**v0.5.3 — correctif détail d'acte :** le panneau « Déroulé » d'un acte affichait
« Cet acte sera initialisé au prochain chargement » sans jamais s'initialiser —
`GET /api/scenarios/:id` ne générait les `detailsMJ` que si le scénario était
`COMPLETE` ou entièrement rempli (reste de la machine à étapes, resté en place
lors du passage au workflow libre en v0.5.2). Le squelette MJ est désormais créé
dès qu'un acte existe, quel que soit l'état des autres sections : le message du
front redevient vrai, un rechargement suffit.

**État :** Les 4 chantiers du plan sont livrés (non déployés) :
1. **Workflow libre** — fiche en 9 sections dérivées des données, plus de
   machine à étapes ; titre provisoire à la création, Merlin en propose un
   adapté en fin de conception (`scenarioUpdate.title`).
2. **Responsive mobile** — toutes les pages (AppShell plein écran + safe-areas,
   volets empilés sur mobile, grilles fluides, nav horizontale scrollable).
3. **Provider `claude-agent`** — abonnement Claude Max via le SDK agent +
   fenêtre admin « Abonnement Claude » (setup-token piloté, testée en
   conteneur ; capture du token final à confirmer au premier vrai passage).
4. **Multi-systèmes** — `gameSystem` sur le scénario (COF_MINI défaut, DND),
   prompts paramétrés (bestiaire DRS et Battle Mats réservés à CoF), choix du
   système à la création, todo/PDF adaptés.

Bonus : lanceur de dés plein écran (d4→d100, animation culbute + rebond,
vibration, critiques mis en scène) accessible partout via le bandeau.

Côté agent-pods : fenêtre « Connexion Claude » livrée ET déployée
(agent-gw 0.56.0, manifestes alfred + skippy bumpés, ArgoCD sync).

**Prochaines étapes :**

- [x] Déployé en prod : v0.5.2 (workflow libre, mobile, multi-systèmes, dés,
      hors-ligne PWA, fenêtre abonnement). Provider `claude-agent` actif.
- [x] **Abonnement Claude Max branché** : token OAuth (1 an) capturé et
      stocké dans `/data/claude/oauth-token` (volume, 600). Survit aux
      redéploiements. Rollback LLM = `LLM_PROVIDER: "anthropic"`.
- [ ] Tester en prod : création D&D de bout en bout, dés sur mobile,
      lecture hors ligne d'un scénario déjà ouvert.
- [ ] Créer les comptes Authelia enfants dans `parents`/famille selon besoin
      pour l'Antre du Maître (Laurine, Émilie, Timothée existent déjà)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
