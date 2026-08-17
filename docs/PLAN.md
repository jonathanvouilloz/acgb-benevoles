# PLAN — Bénévoles ACGB

Plan d'exécution maître. Statuts : `TODO` · `EN COURS` · `DONE`.

## Epics

| #   | Epic                               | Complexité | Statut   | Détail                                                       |
| --- | ---------------------------------- | ---------- | -------- | ------------------------------------------------------------ |
| 1   | Socle technique & design           | M          | DONE     | [features/01-socle.md](features/01-socle.md)                 |
| 2   | Auth magic link                    | M          | DONE     | [features/02-auth.md](features/02-auth.md)                   |
| 3   | Tournois, postes & créneaux (orga) | L          | DONE     | [features/03-tournois.md](features/03-tournois.md)           |
| 4   | Inscription bénévole               | M          | DONE     | [features/04-inscription.md](features/04-inscription.md)     |
| 5   | Suivi du remplissage (orga)        | S          | DONE     | [features/05-suivi.md](features/05-suivi.md)                 |
| 6   | Push notifications & rappels       | M          | DONE     | [features/06-notifications.md](features/06-notifications.md) — QStash actif en prod, à tester |
| 7   | Fondation rôles (admin/orga/bénév) | M          | À VALIDER | [features/07-roles.md](features/07-roles.md)                 |
| 8   | Espace super admin (`/admin`)      | L          | À VALIDER | [features/08-admin.md](features/08-admin.md)                 |
| 9   | Demande organisateur (bénévole)    | S          | À VALIDER | [features/09-demande-orga.md](features/09-demande-orga.md)   |
| 10  | Rôle en navbar + switch de vue     | S          | À VALIDER | [features/10-navbar-role.md](features/10-navbar-role.md)     |
| 11  | Listing tournois public            | M          | À VALIDER | [features/11-listing-public.md](features/11-listing-public.md) |
| 12  | Refonte responsive desktop/iPad    | L          | À VALIDER | [features/12-responsive.md](features/12-responsive.md)       |
| 13  | Retours Anne : consignes, chevauchements, places restantes | M | À VALIDER | [features/13-retours-anne-lisibilite.md](features/13-retours-anne-lisibilite.md) — migration `0009` à appliquer |
| 14  | Affectations orga : inscrire, retirer, tracer | L | TODO | [features/14-affectations-orga.md](features/14-affectations-orga.md) |

> **À VALIDER** = code livré (check + build verts), en attente de test manuel Jonathan sur les 6 épics (7→12) en conditions réelles. Étapes de déploiement ci-dessous.

### ✅ Étapes de déploiement (faites le 2026-08-04)

- [x] Migrations `0005`→`0008` appliquées sur Neon prod (`npx drizzle-kit migrate`).
- [x] 1er super admin confirmé en DB (`jonathan.vouilloz@gmail.com` → `super_admin`).
- [x] Domaine `acgb.ch` vérifié sur Resend ; `RESEND_API_KEY` + `EMAIL_FROM=noreply@acgb.ch` ajoutés sur Vercel Production **et** Preview (absents jusqu'ici — blocage identifié en session).
- [x] `PROTOTYPE_MODE` retiré de Production et Preview.
- [x] `BETTER_AUTH_URL=https://benevoles.acgb.ch` confirmé (Production + Preview).
- [x] Nouveau déploiement Production déclenché (les env vars Vercel ne s'appliquent qu'aux nouveaux builds) — `benevoles.acgb.ch` tourne sur le build à jour.
- [x] Fumée testée en prod : bandeau « Mode démo » disparu, connexion réelle par email (`/login` → `/login/sent` sans erreur), rôle `super_admin` affiché dans le menu compte.

### Reste à valider manuellement (Jonathan)

- [ ] Recevoir et cliquer le magic link réel envoyé à `jonathan.vouilloz@gmail.com` (test de connexion lancé en session, à confirmer côté boîte mail).
- [ ] Parcours complet des 3 rôles (bénévole → demande promotion → approbation admin → organisateur crée un tournoi → bénévole s'inscrit) — cf. checklist détaillée dans `docs/features/07-roles.md` à `12-responsive.md`.
- [ ] Retester les rappels QStash de bout en bout (désinscription/réinscription sur un créneau réel, vérifier 2 messages *delivered* dans Upstash → QStash → Logs).
- [ ] Une fois tout validé sans écart : statuts 7-12 → `DONE`.

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
- [x] Epic 2 : Auth magic link (Better Auth + Resend). **DONE** (2026-08-04).

## Archive

_(epics DONE déplacés ici — non relus par /resume-project)_
