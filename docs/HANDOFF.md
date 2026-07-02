# HANDOFF — 2026-07-02

## Features actives

| Feature                        | Fichier                          | Statut                                                       |
| ------------------------------ | -------------------------------- | ----------------------------------------------------------- |
| Chantier rôles + accès + desktop | docs/features/07-roles.md … 12-responsive.md | À VALIDER (code livré, migrations + test à faire) |
| Auth magic link                | docs/features/02-auth.md         | EN ATTENTE (gelé — connexion simple en place)               |

Epics DONE : 1 · 3 · 4 · 5 · 6 (MVP). Épics 7→12 livrés le 2026-07-02, **à valider**.

## Reprendre ici

Chantier **rôles (super_admin/organizer/volunteer) + espace admin + demande orga + navbar/switch de vue + listing public + refonte responsive desktop/iPad** livré en 6 commits (épics 7→12). `npm run check` et `npm run build` verts.

**Avant de tester — étapes manuelles (côté Jonathan) :**

1. Appliquer les migrations : `npx drizzle-kit migrate` (0005 puis 0006).
2. Promouvoir le 1er super admin :
   `UPDATE "user" SET role = 'super_admin' WHERE email = 'jonathan.vouilloz@gmail.com';`
3. Tester : rôles/gardes, `/admin`, demande orga depuis `/compte`, switch de vue, `/tournois-publics`, responsive desktop/iPad/mobile.

Une fois validé → passer les statuts 7-12 en DONE dans `docs/PLAN.md`. Détail par epic dans `docs/features/07..12`.
Rappel global : fin d'epic → proposer `/epic-recap` (ne pas lancer sans accord).
