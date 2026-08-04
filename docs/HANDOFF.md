# HANDOFF — 2026-08-04

## Features actives

| Feature | Fichier | Statut |
| ------- | ------- | ------ |
| Fondation rôles + admin + demande orga + navbar + listing public + responsive (épics 7-12) | docs/features/07-roles.md à 12-responsive.md | **Déployé en prod, QA manuelle restante** |
| Push notifications & rappels (QStash actif en prod) | docs/features/06-notifications.md | À retester après le déploiement rôles |
| Auth magic link (Resend branché, `PROTOTYPE_MODE` retiré) | docs/features/02-auth.md | **Déployé en prod** |

## Reprendre ici

Le modèle à 3 rôles (super_admin / organizer / volunteer) était déjà entièrement codé (épics 7-12, livrés le 2026-07-02) mais jamais déployé. En session du 2026-08-04 :

- Migrations `0005`→`0008` appliquées sur Neon prod, 1er super admin confirmé (`jonathan.vouilloz@gmail.com`).
- Domaine `acgb.ch` vérifié sur Resend ; `RESEND_API_KEY`/`EMAIL_FROM` ajoutés sur Vercel (absents jusque-là — sans ça, retirer `PROTOTYPE_MODE` aurait cassé la connexion pour tout le monde).
- `PROTOTYPE_MODE` retiré de Production + Preview, nouveau déploiement Production effectué (nécessaire pour que les env vars prennent effet), fumée testée en prod (connexion réelle email OK, rôle `super_admin` affiché).

**Reste à faire** : confirmer la réception du magic link réel, dérouler la checklist QA des 6 épics (bénévole → demande promotion → approbation → organisateur crée un tournoi → bénévole s'inscrit), retester les rappels QStash, puis passer les statuts 7-12 en DONE. Détail dans `docs/PLAN.md`.

Commit : (à venir — clôture docs de cette session)
