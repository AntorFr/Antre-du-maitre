# Status — L'Antre du Maître

> MàJ : 2026-07-20

**État :** SSO OIDC via Authelia déployé (v0.2.0, tantive, merlin.berard.me).
Fix (non encore déployé) : le workflow « détailler un acte » plantait
silencieusement — le LLM renvoyait dans `changedSections` des noms de *sections*
(INDICES, CHOIX…) hors des 6 étapes, ce qui faisait échouer tout le parse Zod et
jeter un `detailUpdate` valide. Schéma rendu tolérant + erreur désormais visible
dans le panneau d'acte côté frontend.

**Prochaines étapes :**

- [ ] Déployer le fix act-detail (bump image → chart → manifeste tantive)
- [x] Login OIDC validé en prod (Sébastien connecté en ADMIN via `parents`)
- [x] Migration merlin→Sébastien faite via l'UI de transfert, compte `merlin`
      supprimé (v0.3.1 : seed enfant conditionnel pour qu'il ne renaisse pas)
- [ ] Créer les comptes Authelia enfants dans `parents`/famille selon besoin
      pour l'Antre du Maître (Laurine, Émilie, Timothée existent déjà)
- [ ] Créer les comptes Authelia des autres membres de la famille (enfant +
      parent 2) — hashes à générer, pas encore dans `authelia-users`
- [ ] Envisager la suppression des comptes locaux `DEV_*` en prod une fois le
      SSO validé
