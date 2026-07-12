# Status — L'Antre du Maître

> MàJ : 2026-07-11

**État :** SSO OIDC via Authelia implémenté (Authorization Code + PKCE, rôle
piloté par le groupe `parents`) et **déployé en v0.2.0** sur tantive
(merlin.berard.me) ; client `merlin` accepté par Authelia, login local conservé
pour le dev.

**Prochaines étapes :**

- [x] Login OIDC validé en prod (Sébastien connecté en ADMIN via `parents`)
- [ ] v0.3.0 : transférer le scénario + monde du compte local `merlin` vers
      `Sébastien` via la nouvelle action « Transférer à… » de la vue admin
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
