# Status — L'Antre du Maître

> MàJ : 2026-07-11

**État :** SSO OIDC via Authelia implémenté (Authorization Code + PKCE, rôle
piloté par le groupe `parents`) et **déployé en v0.2.0** sur tantive
(merlin.berard.me) ; client `merlin` accepté par Authelia, login local conservé
pour le dev.

**Prochaines étapes :**

- [ ] Tester le login OIDC dans un vrai navigateur (bouton Authelia → retour
      connecté en ADMIN pour un membre de `parents`)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
