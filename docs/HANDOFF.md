# HANDOFF — 2026-06-24

## Features actives

| Feature              | Fichier                   | Statut                              |
| -------------------- | ------------------------- | ----------------------------------- |
| Suivi du remplissage | docs/features/05-suivi.md | **EN COURS** (valider rendu impression + mobile) |
| Auth magic link      | docs/features/02-auth.md  | EN ATTENTE (prod : domaine Resend)  |

Epics DONE : 1 (socle) · 3 (tournois — + UX presets/date picker le 24/06) · 4 (inscription) · 6 (push). **MVP fonctionnellement complet.**

## Reprendre ici

Epic 5 — code livré (planning desktop/mobile + impression A4 paysage 2 formats). Reste : Jonathan valide l'aperçu PDF « par poste » et la bascule mobile, puis passer DONE. Sinon : finir Epic 2 (domaine Resend) et préparer le déploiement Vercel (VAPID + `CRON_SECRET`, onboarding PWA iOS).
Commit : [758d3f1] feat(suivi) · [1255901] feat(tournoi)
