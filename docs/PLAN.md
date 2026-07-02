# PLAN — Bénévoles ACGB

Plan d'exécution maître. Statuts : `TODO` · `EN COURS` · `DONE`.

## Epics

| #   | Epic                               | Complexité | Statut   | Détail                                                       |
| --- | ---------------------------------- | ---------- | -------- | ------------------------------------------------------------ |
| 1   | Socle technique & design           | M          | DONE     | [features/01-socle.md](features/01-socle.md)                 |
| 2   | Auth magic link                    | M          | EN COURS | [features/02-auth.md](features/02-auth.md)                   |
| 3   | Tournois, postes & créneaux (orga) | L          | DONE     | [features/03-tournois.md](features/03-tournois.md)           |
| 4   | Inscription bénévole               | M          | DONE     | [features/04-inscription.md](features/04-inscription.md)     |
| 5   | Suivi du remplissage (orga)        | S          | DONE     | [features/05-suivi.md](features/05-suivi.md)                 |
| 6   | Push notifications & rappels       | M          | DONE     | [features/06-notifications.md](features/06-notifications.md) |
| 7   | Fondation rôles (admin/orga/bénév) | M          | EN COURS | [features/07-roles.md](features/07-roles.md)                 |
| 8   | Espace super admin (`/admin`)      | L          | TODO     | [features/08-admin.md](features/08-admin.md)                 |
| 9   | Demande organisateur (bénévole)    | S          | TODO     | [features/09-demande-orga.md](features/09-demande-orga.md)   |
| 10  | Rôle en navbar + switch de vue     | S          | TODO     | [features/10-navbar-role.md](features/10-navbar-role.md)     |
| 11  | Listing tournois public            | M          | TODO     | [features/11-listing-public.md](features/11-listing-public.md) |
| 12  | Refonte responsive desktop/iPad    | L          | TODO     | [features/12-responsive.md](features/12-responsive.md)       |

## Ordre d'exécution

1 → 2 → 3 → 4 → 5 → 6 → **7 → 8 → 9 → 10 → 11 → 12**

Logique MVP (1-6) : socle + design, auth, structure orga, inscription bénévole, suivi, notifications.

Chantier post-MVP (7-12) — refonte rôles + accès + desktop :
- **7 (fondation)** en premier : le modèle de rôles conditionne 8, 9, 10.
- **8, 9, 10** construisent sur cette fondation (admin, demandes, navbar/switch).
- **11 (listing public)** autonome, sans dépendance forte.
- **12 (responsive)** en dernier : une fois la navbar définitive (badge rôle + switch) et toutes les pages connues, on refait le desktop/iPad proprement.

### Décisions produit validées (2026-07-02)

- 3 rôles : `super_admin` · `organizer` · `volunteer`. Un `organizer` peut aussi agir en bénévole (même compte).
- La promotion organisateur passe par une **demande** validée par le super admin (fini le self-toggle libre).
- **Listing tournois public** : visible même sans connexion ; connexion requise seulement pour s'inscrire.
- **1er super admin** : promotion manuelle en DB (pas de code de seed).
- **Switch orga↔bénévole** : simple toggle de vue (préférence UI), aucun changement d'état/permission.

## Prochaines étapes prioritaires

- [x] Epic 1 : socle SvelteKit + Neon/Drizzle (6 tables migrées) + Tailwind + PWA + design system. **DONE**.
- [ ] Epic 2 : Auth magic link (Better Auth + Resend).

## Archive

_(epics DONE déplacés ici — non relus par /resume-project)_
