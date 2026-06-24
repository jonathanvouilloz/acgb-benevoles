# Epic 5 — Suivi du remplissage (orga)

**Complexité** : S
**Statut** : EN COURS (code complet — prêt à tester)

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

## Carte du code

> Mise à jour : 2026-06-24

| Fichier | Rôle |
| --- | --- |
| `src/lib/server/services/signup-service.ts` | `getTournamentSignupsForOrganizer` (lecture gardée ownership) + helpers `findTournamentRow` / `mapTournamentRow`. |
| `src/routes/tournois/[id]/suivi/+page.server.ts` | `load` lecture seule, gardé `requireOrganizer`, 404 si non propriétaire. |
| `src/routes/tournois/[id]/suivi/+page.svelte` | Orchestration : filtres, bascule mobile (cartes) / desktop (Tableau \| Matrice), déclenchement impression. |
| `src/lib/recap.ts` | `flattenTournament` (lignes table + CSV) et `planningByPoste` (groupé postes → créneaux, source mobile + print). |
| `src/lib/components/tracking/RecapToolbar.svelte` | Recherche, filtres, toggle de vue (desktop), boutons CSV + Imprimer (par poste / matrice). |
| `src/lib/components/tracking/RecapTable.svelte` | Tableau plat triable (desktop). |
| `src/lib/components/tracking/RecapMatrix.svelte` | Matrice bénévoles × créneaux : ligne places X/Y, colonne des noms figée. |
| `src/lib/components/tracking/PlanningList.svelte` | Vue empilée mobile : carte par créneau (places, noms dispo / peut-être). |
| `src/lib/components/tracking/PrintPlanning.svelte` | Planning imprimable A4 paysage, 2 formats (par poste / matrice), `hidden print:block`. |
| `src/routes/layout.css` · `src/routes/+layout.svelte` | `@page` A4 paysage + masquage du chrome à l'impression (`print:hidden`). |

### Décisions clés

- Page **dédiée** `/tournois/[id]/suivi` (lecture seule), tout dérivé côté client à partir des compteurs Epic 4 — **aucun changement serveur/DB**.
- **Impression = `window.print()`** (→ « Enregistrer en PDF »), sans dépendance ; format « par poste » garanti sans crop, « matrice » compact mais peut déborder.
- Mise en évidence « à pourvoir » basée sur `isFull` (`available >= capacity`) → les `maybe` ne comptent jamais.

## Décisions techniques

- **Page dédiée** lecture seule `/tournois/[id]/suivi` (pas d'intégration dans la page de gestion).
- **Ownership** appliqué dans le service (`and(id, organizerId)`) → 404 uniforme si tournoi inconnu ou appartenant à un autre orga.
- **Export CSV** marqué optionnel dans la spec : reporté (hors scope MVP).

## Notes & edge cases

- Lecture seule pour le MVP (pas d'assignation manuelle — hors scope).
