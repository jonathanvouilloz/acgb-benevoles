# HANDOFF — 2026-07-03

## Features actives

| Feature | Fichier | Statut |
| ------- | ------- | ------ |
| Refonte responsive + nav (pill flottante, cloche notifs, logo) | docs/features/12-responsive.md | **EN COURS** (branche `feat/nav-redesign`, à valider) |
| Chantier rôles + accès + desktop (épics 7→11) | docs/features/07-roles.md … 11-listing-public.md | À VALIDER |
| Auth magic link | docs/features/02-auth.md | EN ATTENTE (gelé) |

Épics DONE : 1 · 3 · 4 · 5 · 6 (MVP). Épics 7→12 livrés, **à valider**.

## Reprendre ici

Redesign nav (bottom bar « pill flottante » + cloche notifications créneaux + logo ACGB) livré sur `feat/nav-redesign` — `check` + `build` verts. **Prochain : test manuel Jonathan** (glisse pastille, badge/cloche avec créneau <48h, switch de vue, safe-area PWA, logo/favicon), puis merge.
Rappel avant de tester les rôles : promouvoir le 1er super admin en DB (`UPDATE "user" SET role='super_admin' WHERE email='jonathan.vouilloz@gmail.com';`).
Commit : [c78424c] feat(nav): bottom bar pill flottante + cloche notifications créneaux + logo
