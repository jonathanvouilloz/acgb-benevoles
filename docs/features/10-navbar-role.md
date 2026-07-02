# Epic 10 — Rôle en navbar + switch de vue

**Complexité** : S
**Statut** : À VALIDER (livré 2026-07-02)

## Livré

- **Badge de rôle** dans la navbar (bénévole) ou **toggle de vue** (comptes à accès organisateur).
- **Switch de vue** organisateur ↔ bénévole : préférence UI (cookie), aucune permission modifiée.
  - En vue bénévole : accès orga/admin masqués (aperçu fidèle), toggle pour revenir.
  - L'accueil respecte le mode de vue (agenda bénévole en vue bénévole).

## Carte du code

- `src/lib/server/view-mode.ts` — `getViewMode(cookies, role)`, cookie `view`.
- `src/routes/set-view/+server.ts` — POST qui bascule le cookie et redirige (réservé accès orga).
- `src/routes/+layout.server.ts` — expose `viewMode`.
- `src/routes/+page.server.ts` / `+page.svelte` — accueil selon `volunteerView`.
- Navbar définitive dans epic 12 (`components/nav/Navbar.svelte`).

## Notes

- Le libellé du bouton indique l'action (destination) : « Voir en bénévole » / « Revenir en organisateur ».
- Permissions inchangées : les gardes restent basées sur le rôle, pas sur la vue.
