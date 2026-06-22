# Epic 2 — Auth magic link

**Complexité** : M
**Statut** : TODO

## Description

Authentification sans mot de passe via magic link (Better Auth + Resend). Compte ultra-léger : email + nom au premier usage. La session doit persister (PWA reste connectée sur le téléphone).

## Tâches

- [ ] Better Auth configuré avec le plugin magic link.
- [ ] Envoi des magic links via Resend.
- [ ] Table `User` (id, email unique, name, is_organizer, created_at).
- [ ] Flow : saisie email → email envoyé → clic → connexion + création compte au premier usage.
- [ ] Persistance de session (cookie longue durée).
- [ ] Distinction organisateur / bénévole (`is_organizer`).
- [ ] Page de connexion + page « lien envoyé » + gestion lien expiré (renvoyer).

## Décisions techniques

- _(à remplir)_

## Notes & edge cases

- Email déjà connu → connexion sans recréer de compte.
- Lien expiré → message clair + bouton renvoyer.
- **V2 prioritaire** : SSO / réutilisation des comptes WordPress ACGB (acgb.ch). Garder l'abstraction auth assez propre pour brancher un provider externe plus tard.
