# HANDOFF — 2026-06-23

## Features actives

| Feature              | Fichier                           | Statut       |
| -------------------- | --------------------------------- | ------------ |
| Inscription bénévole | docs/features/04-inscription.md   | **EN ATTENTE** |
| Suivi du remplissage | docs/features/05-suivi.md         | EN ATTENTE   |
| Push notifications   | docs/features/06-notifications.md | EN ATTENTE   |
| Auth magic link      | docs/features/02-auth.md          | EN COURS (prod : domaine Resend) |

Epics DONE : 1 (socle) · 3 (tournois/postes/créneaux). Auth (2) : code OK, reste vérif domaine prod.

## Reprendre ici

Epic 4 — Inscription bénévole : construire la vue publique `/t/[shareToken]` (lecture tournoi + postes/créneaux + places restantes) et l'inscription créneau par créneau (`available` / `maybe`, unicité shift+user). Les services orga et le `share_token` sont en place (Epic 3).
Commit : [066b201] docs: wrap session Epic 3 (tournois/postes/créneaux)
