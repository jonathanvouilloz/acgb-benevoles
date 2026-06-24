# HANDOFF — 2026-06-24

## Features actives

| Feature              | Fichier                         | Statut                                                      |
| -------------------- | ------------------------------- | ----------------------------------------------------------- |
| Suivi du remplissage | docs/features/05-suivi.md       | **EN COURS** (matrice : popovers + 90vw — valider le rendu) |
| Inscription bénévole | docs/features/04-inscription.md | EN ATTENTE (sélection refondue — valider le rendu)          |
| Auth magic link      | docs/features/02-auth.md        | EN ATTENTE (prod : domaine Resend)                          |

Epics DONE : 1 (socle) · 3 (tournois) · 4 (refondu) · 6 (push). **MVP fonctionnellement complet.**

## Reprendre ici

Epic 5 — valider sur le tournoi démo (`npx tsx scripts/seed-demo.ts`) : popovers matrice (clic cellule + clic nom), navbar contrainte + matrice ~90vw, et la nouvelle sélection bénévole filtrable sur `/t/[token]`. Si OK → Epic 5 DONE, puis finir Epic 2 (domaine Resend) + déploiement Vercel.
Commit : [9088805] feat(suivi): popover de consultation (cellule + carte bénévole) et largeur matrice
