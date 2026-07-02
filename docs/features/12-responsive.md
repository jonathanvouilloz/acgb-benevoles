# Epic 12 — Refonte responsive desktop/iPad

**Complexité** : L
**Statut** : À VALIDER (livré 2026-07-02)

## État session 2026-07-02 (refonte navigation — bottom bar PWA)

**Fait :**

- **Bottom bar façon app native** (`components/nav/BottomNav.svelte`) sur mobile + tablette (`< lg`, 1024px), masquée en desktop (`lg:hidden`) et à l'impression (`print:hidden`). Onglets adaptés rôle/vue :
  - Invité : Accueil · Tournois · Connexion.
  - Bénévole (ou orga en vue bénévole) : Accueil (« Créneaux ») · Tournois · Compte.
  - Organisateur : Accueil · Mes tournois · Tournois · Compte.
  - Super admin : Accueil · Mes tournois · Admin · Compte (public « Tournois » retiré pour rester à 4 onglets).
  - `isActive` durci : `path === href || path.startsWith(href + '/')` pour éviter que `/tournois` matche `/tournois-publics`.
- **Top bar épurée** (`Navbar.svelte`) : marque **« ACGB »** (au lieu de « Bénévoles ACGB »), plus de hamburger ni panneau déroulant. Nav horizontale visible **desktop uniquement** (`lg:flex`). Bouton compte à droite à toutes les tailles.
- **Menu compte** (`components/nav/AccountMenu.svelte`) : bouton rond `User` haut-droite → panneau (identité `name`/`email`, rôle, **switch de vue** orga/bénévole, lien Mon compte, **Déconnexion**). Ferme au clic extérieur / Escape / navigation. Invité → lien « Connexion ». Réutilise les forms POST `/set-view` et `/logout` inchangés.
- **Layout** : `<BottomNav>` rendu sous `<main>` ; padding bas `pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6` pour ne pas masquer le contenu.
- **`app.html`** : viewport `viewport-fit=cover` (indispensable pour `env(safe-area-inset-bottom)` en PWA standalone).

**Prochain :** validation manuelle Jonathan (rendu mobile/tablette/desktop, PWA installée = safe-area, switch de vue met à jour les onglets). Aucun changement serveur.

**Pièges :** `check` + `build` verts. Le switch `md:` → `lg:` déplace la bascule nav à 1024px (iPad portrait garde la bottom bar).

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

- `src/lib/components/nav/Navbar.svelte` — top bar « ACGB » + nav horizontale desktop (`lg:flex`) + `<AccountMenu>`.
- `src/lib/components/nav/BottomNav.svelte` — bottom bar mobile/tablette (`lg:hidden`), onglets dérivés du rôle/vue.
- `src/lib/components/nav/AccountMenu.svelte` — bouton compte + menu session (identité, rôle, switch de vue, Mon compte, déconnexion).
- `src/routes/+layout.svelte` — shell + `contentMax(path)` + `<BottomNav>` + padding bas safe-area.
- `src/app.html` — meta viewport `viewport-fit=cover`.
- Grilles : `tournois/+page.svelte`, `tournois-publics/+page.svelte`, `admin/tournois/+page.svelte`.

## Pièges / à surveiller au test

- `resolve()` de `$app/paths` exige des **routes typées** : les hrefs passés à un snippet doivent être résolus au call-site (`navLink(resolve('/x'), …)`), pas dans le snippet.
- `/tournois/[id]` (gestion) et `/t/[token]` gardés en `max-w-3xl` (conçus mobile-first) : un vrai layout desktop dédié reste à approfondir si besoin (colonnes, sidebar).
- `/suivi` inchangée (déjà desktop-only, largeur gérée en interne).
- Build + `npm run check` verts après livraison.
