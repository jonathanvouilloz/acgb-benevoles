# Epic 5 — Suivi du remplissage (orga)

**Complexité** : S → M (élargi : édition orga, contacts, export xlsx, notes)
**Statut** : DONE (validé par Jonathan le 2026-06-24)

## Etat session 2026-06-24 (matrice UX : popovers + largeur)

**Fait :**

- **Matrice consultable** (`RecapMatrix.svelte`) : clic sur une cellule occupée → **popover ancré** (bits-ui, portalé) avec statut, créneau, **téléphone cliquable**, note, et bouton explicite « Déplacer / échanger… » qui arme la sélection → **sépare consulter / éditer** (fin du clic surchargé qui partait directement en swap).
- **Carte contact bénévole** : clic sur le **nom** (en-tête de ligne, icône œil au survol) → popover listant le tél + **tous ses créneaux** (poste, jour/heure, statut, note). Popover généralisé en union `cell` | `volunteer` ; créneaux collectés dans la map `volunteers` (pas de `Map` en plus).
- **Largeur** (`+layout.svelte`) : la navbar ne s'étire plus sur `/suivi` (chrome contraint `max-w-5xl`, contenu dans un wrapper séparé) ; matrice ramenée de pleine largeur → **`~90vw`** (un peu d'air). Grille bornée (`max-h-[78vh]` + `thead sticky top` + colonne noms figée + `border-separate` anti-bug bordures) conservée.
- **Sélection bénévole `/t/[token]`** refondue (Epic 4, commit séparé) : barre de filtres collante (jour, tranche matin/aprem/soir, poste, places dispo, mes créneaux), bascule regroupement Temps↔Poste, lignes compactes dépliables, helpers purs `volunteer-shifts.ts`.
- **Auth** (Epic 2, commit séparé) : déconnexion côté serveur (`/logout`), `baseURL` déduit de la requête en dev (port-agnostique 5173–5176) + redirection prototype relative ; `PROTOTYPE_MODE=1` activé en `.env` local.
- `npm run check` vert ; lint = uniquement les 3 `prefer-svelte-reactivity` préexistantes.

**Prochain :** Validation manuelle Jonathan (popovers cellule + nom, navbar contrainte + matrice 90vw, sélection filtrable sur `/t/[token]`). Une fois confirmé → Epic 5 DONE.

**Pièges :** la matrice est en `overflow:auto` → tout popover **doit être portalé** (`Popover.Portal` + `customAnchor`) sinon il est clipé. Le popover de cellule ne s'ouvre **que hors mode armé** (sinon le clic exécute l'échange). Sticky `thead` viable car desktop-only (`lg:`).

**Commit :** [9088805] feat(suivi): popover de consultation (cellule + carte bénévole) et largeur matrice

---

## Etat session 2026-06-24 (suivi v2 + v2.1)

**Fait :**

- **Contacts & téléphone** : tel **obligatoire** au signup/compte (Zod + Better Auth `required`), garde-fou pour comptes existants sans tel (bandeau + blocage inscription) ; relation `tournament.organizer` → carte contact orga sur `/t/[token]` ; l'orga voit les tel des bénévoles (option `organizerView` anti-fuite dans `mapTournamentRow`).
- **Recherche réparée** (la matrice ignorait `search`/`statusFilter` → set `visibleVolunteerIds`) ; **3e vue « Par bénévole »** (`RecapByVolunteer.svelte`) ; icônes matrice plus grosses/franches.
- **Édition orga (swap/move)** : services `moveSignup`/`swapSignups` (ownership + capacité + anti-doublon, swap atomique 1 UPDATE), actions `move`/`swap`, matrice interactive clic→clic→`AssignmentDialog` (modale récap).
- **Export Excel** (`exceljs`) : modale `ExportDialog` 4 formats (par poste / matrice colorée / par créneau / contacts) ; `Imprimer ▾` en dropdown (fin du faux bouton) ; PDF enrichi (coordonnées orga + annexe contacts).
- **Note par inscription** (`signup.note`, migration `0004`) : saisie/édition bénévole (textarea + action `setNote`), orga lecture seule partout (matrice tooltip+pastille, par bénévole, tableau, mobile, impression « nom (note) », export) ; visible publiquement pour orga + propriétaire seulement.
- **Impression robuste** : matrice imprimée **par jour** (1 bloc/jour, plus de crop sur 43 créneaux) ; « par poste » se coupe proprement entre pages (thead répété).
- **Seed démo** `scripts/seed-demo.ts` (3 jours, 9 postes, 43 créneaux, 56 bénévoles, ~96 inscriptions + notes d'exemple) pour éprouver la charge. `npm run check` + `npm run build` verts.

**Prochain :** Validation manuelle Jonathan sur le tournoi démo (swap/move, tooltip note matrice, aperçu PDF matrice par jour + coupure par poste, export xlsx). Une fois confirmé → Epic 5 DONE.

**Pièges :** `mapTournamentRow` est partagé orga/public → `organizerView` filtre tel **et** notes d'autrui (ne jamais fuiter vers `/t/[token]`). `exceljs` génère le `.xlsx` **côté navigateur** (import dynamique) : SSR/build OK mais à éprouver au runtime (polyfill `Buffer` éventuel). `npm run lint` reste rouge mais **préexistant** (règles `prefer-svelte-reactivity` sur les `Map` dans deriveds, conformes au code existant) — le gate du repo est `check`.

**Commit :** feat(suivi): édition orga (swap/move), contacts, export xlsx, notes, impression robuste

---

## Etat session 2026-06-24

**Fait :**

- Vue suivi transformée en outil **planning** : helper `planningByPoste(t, {positionId, day})` dans `recap.ts` (postes → créneaux, noms séparés `available` / `maybe`, capacité, `remaining`).
- **Mobile** : nouvelle vue empilée `PlanningList.svelte` (carte par créneau, places X/Y colorées) — bascule auto `< lg` ; le desktop garde la matrice plein écran.
- **Matrice** enrichie (`RecapMatrix.svelte`) : ligne d'en-tête « places X/Y » colorée par état, colonne des noms figée au scroll horizontal, légende.
- **Impression A4 paysage** `PrintPlanning.svelte`, deux formats au choix (par poste / matrice) via `window.print()` ; `@page { size: A4 landscape }` dans `layout.css`, chrome masqué par `print:hidden`, `print-color-adjust: exact` pour garder les couleurs.
- CSV export déjà en place (`toCsv`). `npm run check` vert (0 erreur / 0 warning). Aucune migration, aucun changement serveur.

**Prochain :** Validation manuelle Jonathan (rendu impression « par poste » sur aperçu PDF + bascule mobile). Une fois confirmé → Epic 5 DONE.

**Pièges :** le format **matrice imprimé** peut déborder si beaucoup de créneaux (choix assumé — « par poste » est le format robuste sans crop). Sticky vertical des en-têtes matrice abandonné (3 rangées d'en-tête) → seule la colonne des noms est figée.

**Commit :** [758d3f1] feat(suivi): planning organisateur lisible + impression A4 paysage

---

## Etat session 2026-06-23

**Fait :**

- Service `getTournamentSignupsForOrganizer(id, organizerId)` : lecture du suivi gardée par **ownership** (404 si pas le propriétaire). Refactor de `signup-service.ts` → helpers partagés `findTournamentRow(where)` (arborescence `with` centralisée, type inféré) + `mapTournamentRow(row, userId)` (compteurs). `getTournamentByShareToken` réutilise les deux, comportement inchangé.
- Route lecture seule `/tournois/[id]/suivi` : `+page.server.ts` gardé par `requireOrganizer`, vue avec **bandeau de synthèse** (places pourvues / capacité + nb créneaux à compléter) + postes → créneaux.
- Composant `TrackingShiftRow.svelte` (calqué sur `VolunteerShiftRow`, sans actions) : ratio `pourvues/capacité`, bordure gauche warning + libellé « N places à pourvoir » / « Personne d'inscrit » sur les créneaux non remplis, `maybe` affichés mais non comptés, noms des inscrits.
- Bouton « Voir le suivi » ajouté sur la page de gestion (`/tournois/[id]`).
- `npm run check` (0 erreur) et `npm run build` verts. Aucune migration DB.

**Prochain :** Test manuel validé par Jonathan (parcours orga). Une fois confirmé → passer Epic 5 DONE et démarrer Epic 6 (Push notifications & rappels).

**Pièges :** `and(...)` (drizzle) renvoie `SQL | undefined` → non-null assertion `!` requise pour le passer à `findTournamentRow(where: SQL)`. La mise en évidence « non rempli » se base sur `isFull` (donc sur `availableCount >= capacity`) : les `maybe` ne comptent jamais.

**Commit :** feat(tracking): add organizer fill-tracking view

---

## Description

Vue organisateur : voir qui s'est inscrit où, avec quel statut, et repérer d'un coup d'œil les créneaux non pourvus.

## Tâches

- [x] Vue par tournoi → postes → créneaux avec inscrits.
- [x] Affichage « X / Y places » par créneau.
- [x] Distinction visuelle `disponible` vs `peut-être`.
- [x] Mise en évidence des créneaux non remplis.
- [x] (Optionnel) export simple de la liste. _(CSV — fait)_
- [x] Vue empilée mobile (carte par créneau).
- [x] Matrice desktop avec places X/Y + colonne des noms figée.
- [x] Impression A4 paysage (par poste / matrice).
- [x] Téléphone obligatoire + contact orga visible bénévoles + tel bénévoles côté orga.
- [x] Recherche réparée + vue « par bénévole ».
- [x] Édition orga : swap / déplacement (matrice interactive + modale récap).
- [x] Export Excel multi-format (`exceljs`) + dropdown impression.
- [x] Note libre par inscription (saisie bénévole, affichage orga + impression + export).
- [x] Impression robuste : matrice par jour + « par poste » sécable.
- [x] Seed démo réaliste (`scripts/seed-demo.ts`).

## Carte du code

> Mise à jour : 2026-06-24 (popovers + largeur)

| Fichier                                                  | Rôle                                                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/+layout.svelte`                              | Largeur `/suivi` : chrome (navbar) `max-w-5xl`, contenu matrice `~90vw` — wrappers de largeur séparés.                                                                                   |
| `src/lib/server/services/signup-service.ts`              | Lecture (`findTournamentRow`/`mapTournamentRow` + flag `organizerView` pour tel & notes) ; mutations orga `moveSignup`/`swapSignups` ; note `setSignupNote` + `note` dans create/change. |
| `src/routes/tournois/[id]/suivi/+page.server.ts`         | `load` gardé `requireOrganizer` + actions `move`/`swap`.                                                                                                                                 |
| `src/routes/tournois/[id]/suivi/+page.svelte`            | Orchestration : filtres, 3 vues desktop, `visibleVolunteerIds`, modales swap (`AssignmentDialog`) et export (`ExportDialog`).                                                            |
| `src/routes/t/[token]/+page.server.ts` · `+page.svelte`  | Actions `signup`/`changeStatus`/`setNote` (note) + garde-fou tel ; carte contact orga + bandeau « compléter tel ».                                                                       |
| `src/lib/recap.ts`                                       | `flattenTournament` (RecapRow + `note`) ; `planningByPoste` (inscrits = `{name, note}`).                                                                                                 |
| `src/lib/export-xlsx.ts`                                 | Export `.xlsx` `exceljs` (4 formats), import dynamique client, « nom (note) ».                                                                                                           |
| `src/lib/components/tracking/RecapToolbar.svelte`        | Recherche, filtres, sélecteur 3 vues, `Excel` + `Imprimer ▾` (bits-ui DropdownMenu).                                                                                                     |
| `src/lib/components/tracking/RecapMatrix.svelte`         | Matrice : grille bornée (en-têtes/noms figés), édition clic→clic swap/move, **popover portalé** de consultation (cellule : statut/tél/note + échange ; nom : carte contact + créneaux).  |
| `src/lib/components/tracking/RecapByVolunteer.svelte`    | 3e vue : carte par bénévole (tel + affectations + note).                                                                                                                                 |
| `src/lib/components/tracking/AssignmentDialog.svelte`    | Modale récap échange/déplacement → POST `?/swap`/`?/move`.                                                                                                                               |
| `src/lib/components/tracking/ExportDialog.svelte`        | Modale choix de format d'export Excel.                                                                                                                                                   |
| `src/lib/components/tracking/PrintPlanning.svelte`       | Impression A4 paysage : par-poste sécable + matrice **par jour** + en-tête orga + annexe contacts.                                                                                       |
| `src/lib/components/tournament/VolunteerShiftRow.svelte` | Inscription + textarea note (hidden inputs) + bouton « Enregistrer la note ».                                                                                                            |
| `src/lib/schemas/{signup,assignment}.ts`                 | `noteSchema`/`noteUpdateSchema` ; `moveSchema`/`swapSchema`.                                                                                                                             |
| `src/lib/server/db/schema.ts`                            | `signup.note` (migration `0004`) + relation `tournament.organizer`.                                                                                                                      |
| `scripts/seed-demo.ts`                                   | Seed démo (3 j, 9 postes, 43 créneaux, 56 bénévoles, notes) — `npx tsx`.                                                                                                                 |

### Décisions clés

- Suivi passé de **lecture seule → éditable** : swap/move bornés aux inscriptions existantes, gardés ownership, identifiés par `(shiftId, userId)` (pas d'exposition de `signup.id`).
- `mapTournamentRow` **partagé** orga/public → `organizerView` filtre **tel ET notes d'autrui** (jamais vers `/t/[token]` ; un bénévole ne voit que sa propre note).
- **Pas de TanStack** (la matrice est un cross-tab bespoke avec interaction ; à notre échelle TanStack n'apporte rien). **`exceljs`** plutôt que SheetJS (styles de cellules).
- Téléphone obligatoire **en validation** (pas de `NOT NULL` DB → garde-fou applicatif pour les comptes existants).
- Impression : matrice **par jour** (sinon crop horizontal sur beaucoup de créneaux) ; par-poste sécable (thead répété).
- Matrice **consulter vs éditer** séparés : clic cellule = popover info, échange via bouton explicite. Popover **portalé** obligatoire (grille en `overflow:auto` → un popover `absolute` serait clipé).

## Notes & edge cases

- `npm run lint` rouge mais **préexistant** (règles `prefer-svelte-reactivity` sur `Map` dans deriveds, conformes au code existant) ; gate = `check` (vert).
- `exceljs` côté navigateur : à éprouver au runtime (polyfill `Buffer` éventuel sous Vite).
- Org-edit des notes d'autrui = hors scope (orga lecture seule sur les notes).
