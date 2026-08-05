# Status — L'Antre du Maître

> MàJ : 2026-08-06

**État :** Deux chantiers livrés (non déployés) : provider LLM `claude-agent`
(Claude Agent SDK, consomme l'abonnement Claude Max via
`CLAUDE_CODE_OAUTH_TOKEN`, transports interchangeables avec l'API Anthropic) et
**workflow de création libre** (fiche en 9 sections dérivées des données, plus
de machine à étapes : Merlin remplit plusieurs sections par tour, checklist
cliquable côté front, validation quand tout est complet). zod migré en v4.
Smoke tests OK (mock bout-en-bout + appel réel Agent SDK).

**Plan restant (chantiers 2 et 4) :**

- [ ] **Responsive mobile** — s'inspirer de la PWA agent-gw : layout chat
      mobile-first, panneau résumé escamotable, safe-areas, media queries
      (`styles.css`, `AppShell`, `Create`, `Scenario`).
- [ ] **Multi-systèmes de jeu** (D&D / CoF Mini…) — abstraction `GameSystem`
      (prompts par système, bestiaire, terminologie, sections paramétrables),
      champ `gameSystem` sur le scénario. La refonte en sections rend ça
      direct : les définitions de sections deviennent par-système.

**Prochaines étapes :**

- [ ] Déployer (bump image → chart → manifeste tantive) : inclut le fix
      act-detail (v0.3.2, jamais déployé) + les deux chantiers du jour.
      Pour activer l'abonnement en prod : `claude setup-token` puis secret
      `CLAUDE_CODE_OAUTH_TOKEN` + `LLM_PROVIDER=claude-agent`.
- [ ] Créer les comptes Authelia enfants dans `parents`/famille selon besoin
      pour l'Antre du Maître (Laurine, Émilie, Timothée existent déjà)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
