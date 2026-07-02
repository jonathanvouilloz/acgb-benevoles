# Epic 12 — Refonte responsive desktop/iPad

**Complexité** : L
**Statut** : À VALIDER (livré 2026-07-02)

## Livré

- **Navbar dédiée** (`components/nav/Navbar.svelte`) : sticky, desktop = liens inline + actions (badge rôle / switch de vue, compte, déconnexion) ; mobile = brand + bouton menu → panneau déroulant empilé (ferme à la navigation).
- **Shell layout** (`+layout.svelte`) : fin de la colonne 640 unique → **largeur de contenu adaptée par route** (`contentMax`).
  - Formulaires/lecture (accueil, compte, login) → `max-w-2xl`.
  - `/t/[token]` & `/tournois/[id]` → `max-w-3xl`.
  - Listings (`/tournois`, `/tournois-publics`, `/admin/*`) → `max-w-5xl`.
  - `/suivi` → `max-w-[95vw]` (la page centre son propre chrome en `max-w-5xl`).
- **Listings en grilles** multi-colonnes desktop (`sm:grid-cols-2 lg:grid-cols-3`).
- Doctrine mise à jour dans `docs/DESIGN.md` §5.

## Carte du code

- `src/lib/components/nav/Navbar.svelte` — navbar responsive (snippets `navLink`, `viewToggle`).
- `src/routes/+layout.svelte` — shell + `contentMax(path)`.
- Grilles : `tournois/+page.svelte`, `tournois-publics/+page.svelte`, `admin/tournois/+page.svelte`.

## Pièges / à surveiller au test

- `resolve()` de `$app/paths` exige des **routes typées** : les hrefs passés à un snippet doivent être résolus au call-site (`navLink(resolve('/x'), …)`), pas dans le snippet.
- `/tournois/[id]` (gestion) et `/t/[token]` gardés en `max-w-3xl` (conçus mobile-first) : un vrai layout desktop dédié reste à approfondir si besoin (colonnes, sidebar).
- `/suivi` inchangée (déjà desktop-only, largeur gérée en interne).
- Build + `npm run check` verts après livraison.
