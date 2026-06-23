# Epic 4 — Inscription bénévole

**Complexité** : M
**Statut** : EN COURS (code complet — prêt à tester)

## Etat session 2026-06-23

**Fait :**

- Couche complète côté bénévole : `/t/[token]` (lecture publique) + inscription `available`/`maybe`, changement de statut, désinscription.
- `signup-service.ts` avec capacité **atomique** (INSERT/UPDATE conditionnel SQL — neon-http sans transactions).
- `requireLogin` + `safeRedirect` ajoutés ; flux `/login?redirect=…` threadé jusqu'au `callbackURL` du magic link (retour auto sur le créneau).
- Vue `+page.svelte` + `VolunteerShiftRow` : places restantes, **noms des inscrits**, badges StatusBadge, CTA déconnecté.
- `npm run check` (0 erreur) et `npm run build` verts. Aucune migration DB (table `signup` déjà migrée Epic 1).

**Prochain :** Test manuel par Jonathan (parcours bénévole de bout en bout, cf. Notes). Une fois validé → passer Epic 4 DONE et démarrer Epic 5 (Suivi du remplissage, orga).

**Pièges :** `db.execute(sql\`…\`)` neon-http renvoie un objet avec `.rows` (pas un array direct) — c'est ce qui porte le `RETURNING`. Le bouton « Me retirer » utilise `formaction="?/unregister"` à l'intérieur du form `?/changeStatus` (override du submitter).

**Commit :** [b9bd87f] docs: Epic 4 — code complet, prêt à tester

---

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

> Mise à jour : 2026-06-23

| Fichier | Rôle |
| --- | --- |
| `src/lib/schemas/signup.ts` | Zod des actions d'inscription (`statusSchema`, `signupSchema`, `shiftId` + `status`). |
| `src/lib/server/services/signup-service.ts` | Cœur de l'epic : lecture tournoi par `share_token` (compteurs + `myStatus` + noms), `createSignup` / `changeSignupStatus` / `deleteSignup` avec garde capacité atomique. |
| `src/routes/t/[token]/+page.server.ts` | `load` public (404 si token inconnu) + actions `signup` / `changeStatus` / `unregister` gardées par `requireLogin`. |
| `src/routes/t/[token]/+page.svelte` | Vue bénévole : en-tête tournoi, CTA déconnecté, postes → créneaux. |
| `src/lib/components/tournament/VolunteerShiftRow.svelte` | Ligne créneau : places restantes, liste des inscrits (noms + statut), boutons d'action (mini-forms `enhance`). |
| `src/lib/server/auth-guard.ts` | `requireLogin(locals, redirectTo)` + `safeRedirect` (anti open-redirect). |
| `src/routes/login/+page.server.ts` + `.svelte` | Lit `?redirect`, le valide, le passe en `callbackURL` du magic link. |

### Décisions clés

- Seuls les `available` consomment une place ; `maybe` affiché mais ne réserve pas.
- Capacité appliquée par requête SQL conditionnelle (pas de transaction sur neon-http) → pas de surréservation.
- Noms des inscrits visibles publiquement (décision produit).

## Notes & edge cases

- Créneau complet (places `available` atteintes) → inscription `available` bloquée.
- Désinscription → place libérée immédiatement.
- Un même bénévole ne peut pas s'inscrire deux fois au même créneau.
