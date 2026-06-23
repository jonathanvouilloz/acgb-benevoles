# Epic 4 — Inscription bénévole

**Complexité** : M
**Statut** : EN COURS (code complet — prêt à tester)

## Description

Côté bénévole : via le lien partagé, voir le tournoi (postes, créneaux, places restantes) et s'inscrire créneau par créneau avec un statut `disponible` / `peut-être`. Pouvoir changer de statut ou se désinscrire.

## Tâches

- [x] Table `Signup` (id, shift_id, user_id, status, created_at) + unicité (shift_id + user_id). _(déjà migrée Epic 1)_
- [x] Page publique tournoi via `share_token` (lecture) — `/t/[token]`.
- [x] Affichage des places restantes par créneau (recalcul à chaque `load`).
- [x] Inscription : choix créneau + statut (`available` / `maybe`).
- [x] Inscription sur plusieurs créneaux.
- [x] Changement de statut + désinscription (libère la place).
- [x] Connexion requise pour s'inscrire (magic link — `requireLogin` + `redirect` vers /login).

## Décisions techniques

- **Confirmé** : les `maybe` sont affichées mais ne consomment pas de place ; seules les `available` comptent dans la capacité.
- **Noms visibles** : la page publique liste les prénoms/noms des inscrits sous chaque créneau (décision produit).
- **Capacité atomique** : INSERT/UPDATE conditionnel SQL en une requête (neon-http sans transactions) → impossible de surréserver la dernière place. Voir `src/lib/server/services/signup-service.ts`.
- **Retour après login** : `/t/[token]` → `/login?redirect=…` → `callbackURL` du magic link → retour sur le créneau. Helper `safeRedirect` anti open-redirect.

## Carte du code

- `src/lib/schemas/signup.ts` — Zod (`statusSchema`, `signupSchema`).
- `src/lib/server/services/signup-service.ts` — lecture par token + create/change/delete (capacité atomique).
- `src/routes/t/[token]/+page.server.ts` — `load` public + actions `signup` / `changeStatus` / `unregister`.
- `src/routes/t/[token]/+page.svelte` + `src/lib/components/tournament/VolunteerShiftRow.svelte` — vue bénévole.
- `src/lib/server/auth-guard.ts` — `requireLogin`, `safeRedirect`.
- `src/routes/login/` — threading du `redirect` dans le `callbackURL`.

## Notes & edge cases

- Créneau complet (places `available` atteintes) → inscription `available` bloquée.
- Désinscription → place libérée immédiatement.
- Un même bénévole ne peut pas s'inscrire deux fois au même créneau.
