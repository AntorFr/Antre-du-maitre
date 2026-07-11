# Status — L'Antre du Maître

> MàJ : 2026-07-11

**État :** SSO OIDC via Authelia implémenté (Authorization Code + PKCE, rôle
piloté par le groupe `parents`), en plus du login local conservé pour le dev.
Release v0.2.0 à déployer sur tantive (merlin.berard.me).

**Prochaines étapes :**

- [ ] Vérifier le login OIDC de bout en bout en prod (client `merlin` déclaré
      dans Authelia, groupe `parents`)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
