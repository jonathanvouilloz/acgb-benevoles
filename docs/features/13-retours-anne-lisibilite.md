# Epic 13 — Retours Anne : consignes, chevauchements, places restantes

**Complexité** : M
**Statut** : À VALIDER — code livré, migration `0009` appliquée en prod, QA manuelle restante
**Origine** : retour d'Anne (client ACGB) du 2026-08-17 — 3 des 6 points, ceux qui ne touchent pas au modèle d'affectation.

## État session 2026-08-17

**Fait :**

- T1 — `tournament.instructions` (migration `0009`, appliquée) : textarea à la création et à l'édition du tournoi, encart « À savoir avant de t'inscrire » sur `/t/[token]`, reprise en tête du planning imprimé.
- T2 — `src/lib/overlap.ts` : détection de chevauchement à bornes strictes, tous tournois confondus. Bandeau ambre visible sans déplier la ligne + confirmation avant inscription sur les 4 boutons d'engagement.
- T3 — correction du bug remonté par Anne : `flattenTournament` émet une ligne « À pourvoir » **par place libre** (au lieu d'une seule pour un créneau vide). Ligne « À pourvoir » ajoutée en bas de la matrice, colonne ajoutée aux exports xlsx.
- `npm run check` et `npm run build` verts ; commit `ea11417` poussé.

**Prochain :** QA manuelle des 3 parcours (cf. les blocs **Vérif** de chaque tâche ci-dessous), en particulier le rendu de la ligne « À pourvoir » de `RecapMatrix.svelte` sur large écran et la confirmation de chevauchement depuis le raccourci « Dispo ». Sans écart : statut → `DONE`, puis attaquer l'epic 14 (`docs/features/14-affectations-orga.md`).

**Pièges :**

- La confirmation de chevauchement passe par `onclick` + `preventDefault` + `form.requestSubmit(btn)` (motif de `ShiftRow.svelte:107`), **pas** par une interception dans `use:enhance` — le submitter doit être repassé à `requestSubmit` pour préserver le `formaction` des boutons partageant un formulaire.
- Clé du `{#each}` de `RecapTable.svelte` : plusieurs lignes vides coexistent désormais pour un même créneau → la clé inclut `row.slot`, ne pas la simplifier.
- `getMyUpcomingShifts` compare des heures murales UTC-naïves à `Date.now()` réel (décalage ~2 h l'été) : un créneau qui se termine dans les 2 h peut sortir de la liste des conflits. Comportement préexistant, non corrigé ici.

**Commit :** [ea11417] feat(tournois): consignes, alerte de chevauchement et places restantes

---

## Carte du code

> Mise à jour : 2026-08-17

| Fichier | Rôle |
|---------|------|
| `src/lib/overlap.ts` | **Nouveau** — `overlaps` (bornes strictes) et `findConflicts` ; type `BusyShift`. |
| `src/lib/recap.ts` | `flattenTournament` émet une ligne `empty` par place libre (`slot` en clé d'affichage). |
| `src/lib/server/db/schema.ts` | Colonne `tournament.instructions` (text, nullable). |
| `src/lib/schemas/tournament.ts` | Validation `instructions` (2000 car. max, optionnel). |
| `src/lib/server/services/tournament-service.ts` | Persistance de `instructions` (création + mise à jour). |
| `src/lib/server/services/signup-service.ts` | `instructions` exposé dans `VolunteerTournament` / `mapTournamentRow`. |
| `src/routes/t/[token]/+page.server.ts` | Charge `myOtherShifts` (créneaux pris sur les autres tournois) pour la détection de conflits. |
| `src/routes/t/[token]/+page.svelte` | Encart consignes + calcul de `busy` et `conflictsFor()` passés à chaque ligne. |
| `src/lib/components/tournament/VolunteerShiftRow.svelte` | Bandeau de chevauchement + garde `guardOverlap` sur les boutons d'inscription. |
| `src/lib/components/tracking/RecapMatrix.svelte` | Ligne « À pourvoir » (`+N` / coche) en bas de la grille. |
| `src/lib/components/tracking/RecapTable.svelte` | Clé du `{#each}` élargie aux lignes vides multiples. |
| `src/lib/export-xlsx.ts` | Colonne « À pourvoir » sur les formats « Par poste » et « Par créneau ». |
| `src/lib/components/tracking/PrintPlanning.svelte` | Consignes reprises dans l'en-tête du planning imprimé. |
| `src/routes/tournois/nouveau/+page.{server.ts,svelte}` · `src/routes/tournois/[id]/+page.{server.ts,svelte}` | Champ « Consignes aux bénévoles » (création et édition). |

### Décisions clés

- Le chevauchement **avertit sans bloquer** : aucune règle serveur, seulement l'UI. Un recouvrement peut être volontaire et l'organisateur doit pouvoir le forcer depuis la matrice (epic 14).
- Le bandeau de conflit s'affiche **aussi quand le bénévole est déjà inscrit** : c'est la relecture de son propre agenda, le point exact soulevé par Anne.
- `instructions` est du texte brut (ni markdown ni HTML), rendu en `whitespace-pre-line` — aucune surface XSS.
- Les `maybe` ne consomment pas de place : un `maybe` ne retire pas de ligne « À pourvoir » (règle de capacité du PRD, inchangée).

---

## Objectif

Rendre la page bénévole auto-portante (consignes de l'organisateur, alerte de chevauchement)
et corriger la disparition des places restantes dans le récap organisateur.

## Périmètre

| Demande d'Anne | Traitée ici |
| --- | --- |
| « une case pour que l'organisateur mette une explication du fonctionnement » | ✅ T1 |
| « je n'ai pas eu d'alerte si mes créneaux se chevauchent » | ✅ T2 |
| « quand une tâche est prise on ne voit pas s'il reste une place » | ✅ T3 |
| éliminer / ajouter / pré-affecter une tâche dans la matrice | ➡️ epic 14 |

---

## T1 — Consignes du tournoi (`tournament.instructions`)

Champ texte libre saisi par l'organisateur, affiché en évidence sur la page d'inscription.
Anne veut y écrire « minimum 6 heures », « laissez un commentaire », etc.

- [x] `src/lib/server/db/schema.ts` — ajouter `instructions: text('instructions')` sur `tournament` (nullable).
- [x] `npx drizzle-kit generate` → migration `0009_*` ; ne pas l'écrire à la main.
- [x] `src/lib/schemas/tournament.ts` — `instructions: z.string().trim().max(2000, 'Consignes trop longues').optional()`.
- [x] `src/lib/server/services/tournament-service.ts` — `createTournament` et `updateTournament` persistent `instructions` (`?.length ? … : null`, même traitement que `location`).
- [x] `src/lib/server/services/signup-service.ts` — exposer `instructions` dans `VolunteerTournament` + `mapTournamentRow` (sinon la page publique ne l'a pas).
- [x] `src/routes/tournois/nouveau/+page.svelte` et `+page.server.ts` — `<textarea name="instructions" rows="4">` (motif existant : `src/routes/compte/+page.svelte:122`), placeholder d'exemple : « Minimum 6 h par bénévole · précisez vos contraintes dans le commentaire ».
- [x] `src/routes/tournois/[id]/+page.svelte` et `+page.server.ts` — même champ dans le bloc d'édition du tournoi (action `updateTournament`, valeur pré-remplie).
- [x] `src/routes/t/[token]/+page.svelte` — encart consignes sous le bloc « Organisateur » (avant l'encart téléphone) : bordure `info`, titre « À savoir avant de t'inscrire », rendu `whitespace-pre-line` (retours à la ligne conservés, pas de markdown). Masqué si vide.
- [x] `src/lib/components/tracking/PrintPlanning.svelte` — reprendre les consignes en tête du planning imprimé (1 ligne, optionnel mais demandé implicitement : le planning circule en papier).

**Vérif** : `npm run check` + `npm run build` verts ; créer un tournoi avec consignes → visible sur `/t/[token]` ; éditer → mise à jour ; vider → l'encart disparaît.

---

## T2 — Alerte de chevauchement de créneaux (bénévole)

Aujourd'hui rien n'empêche ni ne signale l'inscription sur deux créneaux qui se recouvrent.
Choix produit : **on prévient, on ne bloque pas** (un chevauchement de 15 min peut être voulu).

- [x] `src/lib/overlap.ts` (nouveau) — `overlaps(a, b)` sur `{ startsAt, endsAt }` (strict : `a.start < b.end && b.start < a.end`) et `findConflicts(candidate, busy)` retournant les créneaux en conflit.
- [x] `src/routes/t/[token]/+page.server.ts` — le `load` ajoute `myOtherShifts` via `getMyUpcomingShifts(user.id)` (déjà dans `signup-service.ts`), filtré sur les créneaux **hors** tournoi courant (ceux du tournoi arrivent déjà par `myStatus`). Vide si non connecté.
- [x] `src/routes/t/[token]/+page.svelte` — construire `busy` = mes créneaux du tournoi (`myStatus !== null`) + `myOtherShifts` ; calculer `conflicts` par créneau affiché et le passer à `VolunteerShiftRow`.
- [x] `src/lib/components/tournament/VolunteerShiftRow.svelte` — prop `conflicts: BusyShift[]` :
  - bandeau ambre sous l'en-tête compact (donc visible **sans déplier**) dès qu'il y a conflit et que le créneau n'est pas passé : « Chevauche Buvette — sam. 12 avr. · 10:00–14:00 ». Affiché aussi quand le bénévole est déjà inscrit : c'est la relecture de son propre agenda, le point exact soulevé par Anne.
  - confirmation via `guardOverlap` : `onclick` → `preventDefault` → `confirmAction` → `form.requestSubmit(btn)`. Même motif que les suppressions (`ShiftRow.svelte:107`), plus sûr qu'une interception dans `use:enhance`. Branché sur les 4 boutons d'engagement : raccourci « Dispo », « Je suis dispo », « Peut-être », « Confirmer dispo ». Pas sur « Me retirer », « Passer en peut-être » ni « Enregistrer la note ».
- [x] Les conflits avec une inscription `maybe` sont signalés comme les autres (le libellé ne distingue pas le statut — le poste et l'horaire suffisent à comprendre).

**Vérif** : s'inscrire sur 10:00–14:00 puis tenter 12:00–16:00 → badge + confirmation ; deux créneaux jointifs (14:00–18:00 après 10:00–14:00) → aucune alerte ; conflit avec un autre tournoi → alerte mentionnant son nom.

---

## T3 — Places restantes visibles quand un créneau est partiellement pourvu

Bug identifié : `flattenTournament` (`src/lib/recap.ts:43`) n'émet une ligne « À pourvoir »
que si le créneau a **zéro** inscrit. Un créneau Buvette de capacité 2 avec 1 inscrit
disparaît donc du filtre « À pourvoir » du tableau récap et du CSV — exactement le cas décrit
par Anne.

- [x] `src/lib/recap.ts` — `flattenTournament` émet `Math.max(0, capacity - availableCount)` lignes `empty` par créneau, **en plus** des inscriptions réelles (les `maybe` ne consomment pas de place : règle de capacité du PRD inchangée). Ajouter un champ `slot: number` à `RecapRow` pour distinguer les lignes vides d'un même créneau.
- [x] `src/lib/components/tracking/RecapTable.svelte:86` — clé du `{#each}` : `row.shiftId + ':' + (row.userId || 'empty-' + row.slot)` (sinon collision de clés Svelte sur les nouvelles lignes vides).
- [x] `src/lib/components/tracking/RecapByVolunteer.svelte` — vérifier que le filtre `status === 'empty'` (ligne 20) suffit toujours (aucun changement attendu).
- [x] `src/lib/components/tracking/RecapMatrix.svelte` — ligne « À pourvoir » en bas du `<tbody>`, en-tête sticky comme les lignes bénévoles : par colonne, pastille ambre `+N` s'il reste des places, coche verte si le créneau est complet. C'est la lecture « il manque encore quelqu'un » directement dans la grille. (L'epic 14 rendra ces cases cliquables.)
- [x] `src/lib/export-xlsx.ts` — ajouter une colonne « À pourvoir » (= `capacity - availableCount`) aux formats `poste` (l. 68) et `shift` (l. 162), à côté de la colonne « Places ».
- [x] `src/lib/recap.ts` — `toCsv` hérite automatiquement des nouvelles lignes ; vérifier le rendu (`Bénévole` = `—`).

**Vérif** : tournoi de test avec un créneau capacité 2 et 1 inscrit `available` → le tableau récap affiche 1 ligne bénévole + 1 ligne « À pourvoir » ; filtre statut « À pourvoir » → la ligne apparaît ; matrice → ligne fantôme avec 1 case restante ; export xlsx → colonne « À pourvoir » = 1.

---

## Notes / décisions

- Le chevauchement **n'est pas bloqué** côté serveur : pas de règle métier, seulement une alerte UI. Si Anne veut un blocage dur, c'est un changement de décision produit à tracer dans `DECISIONS.md`.
- `instructions` est du texte brut (pas de markdown, pas de HTML) — pas de surface XSS, rendu via `whitespace-pre-line`.
- Aucune donnée existante impactée : la migration ajoute une colonne nullable.
