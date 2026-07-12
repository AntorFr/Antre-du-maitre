# Status — L'Antre du Maître

> MàJ : 2026-07-11

**État :** SSO OIDC via Authelia implémenté (Authorization Code + PKCE, rôle
piloté par le groupe `parents`) et **déployé en v0.2.0** sur tantive
(merlin.berard.me) ; client `merlin` accepté par Authelia, login local conservé
pour le dev.

**Prochaines étapes :**

- [x] Login OIDC validé en prod (Sébastien connecté en ADMIN via `parents`)
- [x] Migration merlin→Sébastien faite via l'UI de transfert, compte `merlin`
      supprimé (v0.3.1 : seed enfant conditionnel pour qu'il ne renaisse pas)
- [ ] Créer les comptes Authelia enfants dans `parents`/famille selon besoin
      pour l'Antre du Maître (Laurine, Émilie, Timothée existent déjà)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
