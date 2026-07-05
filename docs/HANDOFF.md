# HANDOFF — 2026-07-05

## Features actives

| Feature | Fichier | Statut |
| ------- | ------- | ------ |
| Refonte responsive + nav + gate PWA + **fix boucle + polish nav/rôles/rappels** | docs/features/12-responsive.md | **À VALIDER** (branche `feat/nav-redesign`, PR vers `master`) |
| Rappels push **migrés vers QStash** | docs/features/06-notifications.md | À CONFIGURER (vars Vercel + test preview) |
| Rate-limit magic links (transverse Auth) | docs/features/12-responsive.md (session 2026-07-05) | Migration `0007` appliquée ✅ |

Épics DONE : 1 · 3 · 4 · 5 · 6 · 7→12 (livrés, à valider). Branche `feat/nav-redesign` en avance sur `master`.

## Reprendre ici

Valider sur device réel PWA le dernier lot nav (chip vue, focus onglet `/t/…`, cloche→/compte→Activer les rappels, bandeau « Gérer » sur ses tournois, badge rond). Puis merger `feat/nav-redesign` → `master` et **config prod Vercel** : env `QSTASH_*` / `BETTER_AUTH_URL=https://benevoles.acgb.ch` / clés VAPID + **migration `0007` (`rate_limit`) sur base PROD** + vérifier `PROTOTYPE_MODE` absent en prod.
Commit : [0f27f0f] feat(nav): onglet parent actif, chip de vue, badge rond, rappels /compte, raccourci gestion
