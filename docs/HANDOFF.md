# HANDOFF — 2026-07-02

## Features actives

| Feature                      | Fichier                        | Statut                                                              |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| Fondation rôles              | docs/features/07-roles.md      | EN COURS (démarrage — modèle 3 rôles + table demandes)             |
| Auth magic link              | docs/features/02-auth.md       | EN ATTENTE (gelé — connexion simple en place, magic link plus tard) |

Epics DONE : 1 (socle) · 3 (tournois) · 4 (inscription) · 5 (suivi) · 6 (push). **MVP complet.**
Chantier post-MVP planifié (7→12) : rôles → admin → demande orga → navbar/switch → listing public → responsive desktop/iPad. Voir `docs/PLAN.md`.

## Reprendre ici

Chantier rôles + accès + desktop planifié et validé (ordre + décisions produit dans PLAN.md).
**Prochaine étape : Epic 7 — fondation rôles.** Migration enum `role` (super_admin/organizer/volunteer) + table `organizer_request`, refactor de tous les call-sites `isOrganizer`, retrait du toggleRole libre. Détail et pièges : `docs/features/07-roles.md`.
