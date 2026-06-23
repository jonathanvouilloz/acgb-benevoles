# HANDOFF — 2026-06-23

## Features actives

| Feature              | Fichier                           | Statut                                |
| -------------------- | --------------------------------- | ------------------------------------- |
| Suivi du remplissage | docs/features/05-suivi.md         | **EN COURS** (code complet, à tester) |
| Push notifications   | docs/features/06-notifications.md | EN ATTENTE                            |
| Auth magic link      | docs/features/02-auth.md          | EN COURS (prod : domaine Resend)      |

Epics DONE : 1 (socle) · 3 (tournois/postes/créneaux) · 4 (inscription bénévole).

## Reprendre ici

Epic 5 — Suivi du remplissage : **code livré** (route lecture seule `/tournois/[id]/suivi`, service gardé ownership, bandeau de synthèse). Prochaine étape = test manuel du parcours orga ; si OK → Epic 5 DONE puis démarrer Epic 6 (Push notifications & rappels).
Commit : feat(tracking): add organizer fill-tracking view
