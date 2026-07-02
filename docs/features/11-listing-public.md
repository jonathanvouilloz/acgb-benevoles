# Epic 11 — Listing tournois public

**Complexité** : M
**Statut** : À VALIDER (livré 2026-07-02)

## Livré

- `/tournois-publics` : **accès libre** (même non connecté), tournois groupés En cours / À venir / Terminés (par date).
- Lien « Tournois » dans la navbar (visible par tous) + CTA sur l'accueil visiteur et l'état vide bénévole.
- Chaque carte pointe vers `/t/[token]` (inscription — connexion requise seulement pour s'inscrire).

## Carte du code

- `src/lib/server/services/tournament-service.ts` — `listPublicTournaments()` (nom orga, aucune coordonnée).
- `src/routes/tournois-publics/+page.{server.ts,svelte}` — aucune garde ; regroupement par phase.
- `src/lib/tournament-status.ts` + `PhaseBadge` (partagés epic 8).

## Notes

- Pas de données de contact exposées publiquement (seulement le nom de l'organisateur, déjà visible sur `/t/[token]`).
- Grille responsive `sm:grid-cols-2 lg:grid-cols-3` (epic 12).
