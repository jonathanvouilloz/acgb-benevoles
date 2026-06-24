# HANDOFF — 2026-06-24

## Features actives

| Feature              | Fichier                   | Statut                                             |
| -------------------- | ------------------------- | -------------------------------------------------- |
| Suivi du remplissage | docs/features/05-suivi.md | **EN COURS** (suivi v2.1 livré — valider le rendu) |
| Auth magic link      | docs/features/02-auth.md  | EN ATTENTE (prod : domaine Resend)                 |

Epics DONE : 1 (socle) · 3 (tournois) · 4 (inscription) · 6 (push). **MVP fonctionnellement complet.**

## Reprendre ici

Epic 5 — suivi v2.1 livré (édition swap/move, contacts + tel obligatoire, export xlsx, notes, impression matrice par jour). Reste : Jonathan valide sur le tournoi démo (seed `npx tsx scripts/seed-demo.ts`), puis Epic 5 DONE. Sinon : finir Epic 2 (domaine Resend) + déploiement Vercel.
Commit : feat(suivi): édition orga (swap/move), contacts, export xlsx, notes, impression robuste
