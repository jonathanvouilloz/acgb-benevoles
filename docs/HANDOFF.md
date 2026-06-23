# HANDOFF — 2026-06-23

## Features actives

| Feature | Fichier | Statut |
|---------|---------|--------|
| Auth magic link | docs/features/02-auth.md | **EN COURS** |
| Tournois, postes & créneaux | docs/features/03-tournois.md | EN ATTENTE |
| Inscription bénévole | docs/features/04-inscription.md | EN ATTENTE |
| Suivi du remplissage | docs/features/05-suivi.md | EN ATTENTE |
| Push notifications | docs/features/06-notifications.md | EN ATTENTE |

Epic 1 (socle technique & design) : **DONE** → docs/features/01-socle.md.

## Reprendre ici

Epic 2 — Auth magic link : flow de connexion testé OK. Reste à vérifier la déconnexion + le passage `is_organizer = true` en DB, puis enchaîner sur l'Epic 3.
Commit : [36ebdfe] feat(auth): magic link login (Better Auth + Resend)
