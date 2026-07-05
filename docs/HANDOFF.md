# HANDOFF — 2026-07-05

## Features actives

| Feature | Fichier | Statut |
| ------- | ------- | ------ |
| Refonte responsive + nav + **gate PWA** | docs/features/12-responsive.md | **À VALIDER** (branche `feat/nav-redesign`, PR vers `master`) |
| Rappels push **migrés vers QStash** | docs/features/06-notifications.md | À CONFIGURER (vars Vercel + test preview) |
| Chantier rôles + accès + desktop (épics 7→11) | docs/features/07-roles.md … 11-listing-public.md | À VALIDER |

Épics DONE : 1 · 3 · 4 · 5 · 6 · 7→12 (livrés, à valider). Branche `feat/nav-redesign` = 4 commits en avance sur `master`.

## Reprendre ici

Merger la PR `feat/nav-redesign` → `master` (nav + gate PWA + QStash), puis **config prod Vercel** : `QSTASH_URL` / `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` (plan pay-as-you-go) + `BETTER_AUTH_URL=https://benevoles.acgb.ch` + clés VAPID. Puis **test QStash bout-en-bout sur un preview** (QStash n'atteint pas localhost). Rappel rôles : 1er super admin promu en DB.
Commit : [b0efc02] feat(reminders): migration cron Vercel → QStash (rappels événementiels)
