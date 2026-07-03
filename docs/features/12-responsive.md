# Epic 12 — Refonte responsive desktop/iPad

**Complexité** : L
**Statut** : À VALIDER (livré 2026-07-02)

## État session 2026-07-03 (redesign nav « pill flottante » + notifications créneaux)

**Fait :**

- **Bottom bar « pill flottante »** (`BottomNav.svelte` réécrite) : barre détachée des bords (`rounded-full`, `shadow-md`, `backdrop-blur-md`, centrée `justify-center`), safe-area conservée. Inactifs = **icône seule**, actif = pastille teintée **icône + label**. **Pastille active glissante** : `<span>` absolu unique mesuré sur l'onglet actif (`bind:this` sur les `<a>`, `offsetLeft`/`offsetWidth`), animé en `left`/`width` (`--dur-base` `--ease-drawer`). Recalcul sur `path`/`tabs`/`resize`. `prefers-reduced-motion` → pas de glisse. Label actif en fondu (`label-in`).
- **Modèle de nav partagé** `src/lib/nav-model.ts` : `isActive()` + `buildTabs()` + types `NavUser`/`ViewMode`/`NavTab`/`AgendaItem`. Supprime la duplication `isActive`/dérivation entre `BottomNav` et `Navbar`. La top bar garde ses liens desktop explicites (pas la contrainte 4-onglets du super admin), mais réutilise `isActive`.
- **Cloche notifications** (`NotificationBell.svelte`, calquée sur `AccountMenu`) à gauche du menu compte (top bar, connecté). Bouton rond `Bell`/`BellRing` + **badge** rouge (compte imminent). Panneau `w-72` : « Prochains créneaux » (jour, plage horaire, pastille poste + tournoi, `StatusBadge`, lien `/t/[token]`), empty state, séparateur, lien « Activer les rappels » → `/compte`. Pop d'ouverture + reduced-motion.
- **Badge « rappel »** = créneaux `status='available'` dont `startsAt ∈ ]now, now+48h]`. Calculé serveur dans `+layout.server.ts` (réutilise `getMyUpcomingShifts`, **zéro nouvelle query**), exposé partout via `imminentCount` (+ `upcomingShifts` slice 6 pour le panneau). Badge affiché sur l'onglet **Créneaux** (bottom bar, vue bénévole) **et** la cloche.
- **Layout** : props câblées vers `Navbar`/`BottomNav` ; padding bas `pb-[calc(5.5rem+env(safe-area-inset-bottom))]` (barre flottante plus haute).
- **Logo ACGB branché** : horizontal (`src/lib/assets/logo-acgb.png`, castor + « ACGB ») importé dans la top bar (`h-7`, lien accueil) → remplace le texte. Carré (`static/icon.png`, castor dans cercle) = **favicon + apple-touch + manifest PWA + icône/badge push** (repointés depuis l'ancien `/icon.svg`, supprimé avec `favicon.svg`). Manifest icon `197x198` `image/png` purpose `any`. `check` + `build` verts.

**Prochain :** validation manuelle Jonathan (glisse de la pastille, badge/cloche avec un créneau à <48h, switch de vue, safe-area PWA, rendu du logo top bar + favicon/PWA).

**Pièges :** la pastille glissante mesure la géométrie DOM — labels togglés **sans** transition de largeur sur l'onglet (seul l'indicateur anime `left/width`) pour éviter une mesure en cours d'animation.

- **Placement initial sans glissé** : la transition n'est appliquée (`.pill.animate`) qu'après le 1er placement (activée en `requestAnimationFrame`) → plus de glissé parasite depuis le bord au load.
- **Feedback optimiste** : `path` dérive de `navigating.to?.url.pathname ?? page.url.pathname` → la pastille glisse dès le tap, sans attendre le `load` de la page destination (fini le décalage au premier accès à une page pas encore chargée).

**Commit :** [c78424c] feat(nav): bottom bar pill flottante + cloche notifications créneaux + logo

---

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
> Mise à jour : 2026-07-03

| Fichier | Rôle |
|---------|------|
| `src/lib/nav-model.ts` | Source unique nav : `isActive()`, `buildTabs()` (rôle/vue, contrainte 4-onglets super admin), types `NavTab`/`AgendaItem`. Client-safe. |
| `src/lib/components/nav/BottomNav.svelte` | Bottom bar « pill flottante » (`lg:hidden`) : pastille active glissante mesurée + badge imminent + feedback optimiste (`navigating.to`). |
| `src/lib/components/nav/Navbar.svelte` | Top bar sticky : logo `logo-acgb.png` (lien accueil) + liens desktop (`lg:flex`) + `<NotificationBell>` + `<AccountMenu>`. |
| `src/lib/components/nav/NotificationBell.svelte` | Cloche + badge imminent + panneau « Prochains créneaux » (`/t/[token]`, « Activer les rappels »). Connecté uniquement. |
| `src/lib/components/nav/AccountMenu.svelte` | Bouton compte + menu session (identité, rôle, switch de vue, déconnexion). Inchangé. |
| `src/routes/+layout.server.ts` | Agenda perso partagé : `imminentCount` (48 h) + `upcomingShifts` (slice 6), via `getMyUpcomingShifts` (zéro nouvelle query). |
| `src/routes/+layout.svelte` | Shell + `contentMax(path)` + câblage props nav + padding bas barre flottante. |
| `static/icon.png` · `src/app.html` · `static/manifest.webmanifest` · `src/service-worker.ts` | Icône carrée ACGB = favicon / apple-touch / manifest PWA / icône+badge push (remplace `icon.svg`). |

### Décisions clés
- **Indicateur glissant mesuré** (pas de largeurs de tabs égales) : onglets à largeur variable (inactif = icône, actif = icône+label), donc la pastille lit `offsetLeft`/`offsetWidth` de l'onglet actif. Labels togglés **sans** transition de largeur (seule la pastille anime `left/width`) pour éviter une mesure en cours d'animation.
- **Transition activée après le 1er placement** (`.pill.animate` posé en `requestAnimationFrame`) → aucun glissé parasite au chargement.
- **Feedback optimiste** : `path` = `navigating.to?.url.pathname ?? page.url.pathname` → la pastille suit la cible dès le tap, avant la fin du `load`.
- **`nav-model.ts` client-safe** : type `AgendaItem` local (pas d'import du type serveur `MyAgendaShift`) pour ne pas tirer `$lib/server` côté client.
- **Manifest icon `purpose: any`** (pas `maskable`) : le castor déborderait de la zone de sécurité du masque adaptatif Android.

## Pièges / à surveiller au test

- `resolve()` de `$app/paths` exige des **routes typées** : les hrefs passés à un snippet doivent être résolus au call-site (`navLink(resolve('/x'), …)`), pas dans le snippet.
- `/tournois/[id]` (gestion) et `/t/[token]` gardés en `max-w-3xl` (conçus mobile-first) : un vrai layout desktop dédié reste à approfondir si besoin (colonnes, sidebar).
- `/suivi` inchangée (déjà desktop-only, largeur gérée en interne).
- Build + `npm run check` verts après livraison.
