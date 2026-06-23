# PLAN — Bénévoles ACGB

Plan d'exécution maître. Statuts : `TODO` · `EN COURS` · `DONE`.

## Epics

| #   | Epic                               | Complexité | Statut   | Détail                                                       |
| --- | ---------------------------------- | ---------- | -------- | ------------------------------------------------------------ |
| 1   | Socle technique & design           | M          | DONE     | [features/01-socle.md](features/01-socle.md)                 |
| 2   | Auth magic link                    | M          | EN COURS | [features/02-auth.md](features/02-auth.md)                   |
| 3   | Tournois, postes & créneaux (orga) | L          | DONE     | [features/03-tournois.md](features/03-tournois.md)           |
| 4   | Inscription bénévole               | M          | TODO     | [features/04-inscription.md](features/04-inscription.md)     |
| 5   | Suivi du remplissage (orga)        | S          | TODO     | [features/05-suivi.md](features/05-suivi.md)                 |
| 6   | Push notifications & rappels       | M          | TODO     | [features/06-notifications.md](features/06-notifications.md) |

## Ordre d'exécution

1 → 2 → 3 → 4 → 5 → 6

Logique : on pose le socle + design, puis l'auth (prérequis de tout flux identifié), puis la création de structure côté orga, puis l'inscription côté bénévole, puis la vue de suivi, et enfin les notifications (qui dépendent des inscriptions existantes).

## Prochaines étapes prioritaires

- [x] Epic 1 : socle SvelteKit + Neon/Drizzle (6 tables migrées) + Tailwind + PWA + design system. **DONE**.
- [ ] Epic 2 : Auth magic link (Better Auth + Resend).

## Archive

_(epics DONE déplacés ici — non relus par /resume-project)_
