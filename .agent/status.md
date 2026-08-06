# Status — L'Antre du Maître

> MàJ : 2026-08-06 (soir)

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

- [x] Déployé : v0.4.0 taguée (image CI) + manifeste tantive bumpé, avec
      bascule `LLM_PROVIDER=claude-agent` (abonnement Claude Max).
      `ANTHROPIC_API_KEY` reste au coffre : rollback = repasser le provider
      à `anthropic`.
- [ ] ⚠️ Juste après le rollout : Admin → « Abonnement Claude » pour générer
      le token (sans lui, Merlin ne répond pas en prod). Ce premier passage
      valide aussi la capture du token (deux filets en place).
- [ ] v0.4.1 (fix résolution binaire Claude Code) et v0.5.0 (mode hors
      ligne : shell + dés + lecture scénarios) taguées — builds bloqués par
      la PANNE MAJEURE GitHub Actions du 2026-08-06 ; bumps k8s commités en
      local (0.4.1 puis 0.5.0), à pousser dès les images publiées.
- [ ] Tester une création D&D + le lanceur de dés sur mobile en prod.
- [ ] Tester une création D&D de bout en bout avec le provider réel.
- [ ] Créer les comptes Authelia enfants dans `parents`/famille selon besoin
      pour l'Antre du Maître (Laurine, Émilie, Timothée existent déjà)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
