# HANDOFF — 2026-06-23

## Features actives

| Feature                     | Fichier                           | Statut       |
| --------------------------- | --------------------------------- | ------------ |
| Tournois, postes & créneaux | docs/features/03-tournois.md      | **EN COURS** |
| Auth magic link             | docs/features/02-auth.md          | EN COURS     |
| Inscription bénévole        | docs/features/04-inscription.md   | EN ATTENTE   |
| Suivi du remplissage        | docs/features/05-suivi.md         | EN ATTENTE   |
| Push notifications          | docs/features/06-notifications.md | EN ATTENTE   |

Epic 1 (socle technique & design) : **DONE** → docs/features/01-socle.md.

## Reprendre ici

Epic 3 — Tournois/postes/créneaux : code complet (check/lint/build verts). Reste la **validation manuelle** du parcours orga (`is_organizer=true`, créer tournoi → postes → créneaux → édition/suppression → 403), puis DONE + Epic 4.
Commit : [293fa16] feat(orga): UI gestion tournois, postes & créneaux
