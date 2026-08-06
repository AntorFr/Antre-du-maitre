# Status — L'Antre du Maître

> MàJ : 2026-08-06

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

- [ ] Déployer l'Antre (bump image → chart → manifeste tantive) : inclut le
      fix act-detail v0.3.2 jamais déployé + les 4 chantiers.
      Abonnement en prod : panneau Admin → « Abonnement Claude » (ou secret
      `CLAUDE_CODE_OAUTH_TOKEN`) + `LLM_PROVIDER=claude-agent`.
- [ ] Valider le premier passage réel de la fenêtre setup-token (capture du
      token final — deux filets en place).
- [ ] Tester une création D&D de bout en bout avec le provider réel.
- [ ] Créer les comptes Authelia enfants dans `parents`/famille selon besoin
      pour l'Antre du Maître (Laurine, Émilie, Timothée existent déjà)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
