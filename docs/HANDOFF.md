# HANDOFF — 2026-06-23

## Features actives

| Feature               | Fichier                           | Statut                              |
| --------------------- | --------------------------------- | ----------------------------------- |
| Auth magic link       | docs/features/02-auth.md          | EN COURS (prod : domaine Resend)    |
| Suivi du remplissage  | docs/features/05-suivi.md         | EN COURS (test manuel orga)         |

Epics DONE : 1 (socle) · 3 (tournois/postes/créneaux) · 4 (inscription) · 6 (push notifications). **MVP fonctionnellement complet.**

## Reprendre ici

Plus d'epic de dev actif : les 7 features du MVP sont codées. Restent deux finitions non bloquantes — Epic 2 (vérifier un domaine Resend pour la prod) et Epic 5 (valider le parcours suivi orga). Sinon : préparer le déploiement Vercel (vars VAPID + `CRON_SECRET`, onboarding « installer la PWA » iOS).
Commit : feat(push) — notifications & rappels (Epic 6)
