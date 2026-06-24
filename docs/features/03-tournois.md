# Epic 3 — Tournois, postes & créneaux (orga)

**Complexité** : L
**Statut** : **DONE** (parcours orga validé le 2026-06-23 ; itérations UX création le 2026-06-24)

## Etat session 2026-06-24

**Fait :**

- Modale d'ajout de postes refondue : **puces presets multi-sélection** (`position-presets.ts` : Buvette, Arbitre, Rangement, Médaille, Photos ; puce déjà présente → grisée) + champ custom. Action serveur `createPosition` → **`createPositions`** (batch `form.getAll('names')`, validation par nom via `positionSchema`, couleurs séquentielles préservées).
- **Date picker clean** (bits-ui + @internationalized/date) : nouveau `DatePicker.svelte` (popover calendrier, locale fr-CH, lundi en tête) émettant un `<input hidden>` `YYYY-MM-DD` → contrat Zod/form **inchangé**. Remplace les `<input type="date">` natifs en création **et** édition.
- `TournamentDateFields.svelte` : calendrier de début + sélecteur de durée **1 jour / 2 jours / Autre** (fin dérivée ; « Autre » révèle un 2e calendrier `minValue = début`), durée auto-déduite en édition.
- 2 deps ajoutées (`bits-ui` 2.18, `@internationalized/date` 3.12). `npm run check` vert (0 / 0).

**Prochain :** RAS bloquant. Tester le rendu mobile du popover calendrier ; valider la création multi-postes en un clic.

**Pièges :** `Popover.Trigger` (bits-ui) rend un `<button>` → `type="button"` **obligatoire** sinon il soumet le form. Seed de `$state` depuis les props dans `TournamentDateFields` annoté `// svelte-ignore state_referenced_locally` (capture initiale voulue, props figées le temps du form).

**Commit :** [1255901] feat(tournoi): postes pré-remplis + date picker bits-ui + durée 1j/2j

---

## Etat session 2026-06-23

**Fait :** Couche complète orga livrée — schémas Zod (tournoi/poste/créneau), services CRUD avec gardes d'appartenance (`organizerId`), `share_token` (nanoid anti-collision), palette couleurs auto, `requireOrganizer`, helpers format FR ; dashboard `/tournois`, création `/tournois/nouveau`, page de gestion unique `/tournois/[id]` (8 actions nommées, postes/créneaux inline `use:enhance`). `check` + `lint` + `build` verts.
**Prochain :** Validation manuelle (serveur dev de Jonathan) : `is_organizer = true` sur le compte test, puis parcours création → 2 postes (couleurs distinctes) → empiler créneaux → refus (capacité 0 / fin ≤ début / jour hors plage) → édition/suppression cascade → accès 403 non-orga → copie du lien de partage. Ensuite marquer l'epic DONE et enchaîner Epic 4 (vue/inscription bénévole `/t/[token]`).
**Pieges :** Les 5 tables existaient déjà (Epic 1) → aucune migration ; seules des `relations()` drizzle ont été ajoutées. Heures de créneaux en **UTC-naïf** (suffixe `Z` au stockage, `timeZone:'UTC'` à l'affichage) — ne pas « corriger » en heure locale sous peine de dérive dev (CET) / prod (UTC). Le composant `Input` utilise `border-border` (le `border-surface-border` du formulaire login est un token inexistant, latent).
**Commit :** [293fa16] feat(orga): UI gestion tournois, postes & créneaux

---

## Carte du code

> Mise à jour : 2026-06-24

| Fichier                                          | Rôle                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/lib/schemas/{tournament,position,shift}.ts` | Validation Zod. `shift.ts` expose `toShiftTimestamps` (recompose jour + heures en UTC-naïf).  |
| `src/lib/poste-colors.ts`                        | Palette 8 couleurs + `assignPosteColor(existingCount)` (cycle).                              |
| `src/lib/position-presets.ts`                    | Postes courants proposés en puces (Buvette, Arbitre, Rangement, Médaille, Photos).          |
| `src/lib/format.ts`                              | Formatage FR `timeZone: 'UTC'` + helpers `toDateInputValue` / `toTimeInputValue`.            |
| `src/lib/server/auth-guard.ts`                   | `requireOrganizer(locals)` → redirect /login si anonyme, 403 si non-orga.                    |
| `src/lib/server/services/tournament-service.ts`  | CRUD tournoi + `shareToken` (nanoid 10, anti-collision) + requête imbriquée postes/créneaux. |
| `src/lib/server/services/position-service.ts`    | CRUD postes, couleur auto, gardes d'appartenance (join tournament.organizerId).              |
| `src/lib/server/services/shift-service.ts`       | CRUD créneaux, gardes d'appartenance (join position → tournament).                           |
| `src/lib/server/db/schema.ts`                    | Ajout des `relations()` drizzle (aucune migration) pour `db.query ... with`.                 |
| `src/routes/tournois/+page.*`                    | Dashboard : liste des tournois de l'orga + état vide.                                        |
| `src/routes/tournois/nouveau/+page.*`            | Création : `TournamentDateFields` (calendrier + durée).                                      |
| `src/routes/tournois/[id]/+page.*`               | Gestion unique : actions nommées (dont **`createPositions`** batch), modale presets, édition avec `TournamentDateFields`. |
| `src/lib/components/tournament/TournamentDateFields.svelte` | Date de début (`DatePicker`) + durée 1j/2j/Autre, fin dérivée (hidden `endDate`). |
| `src/lib/components/ui/date-picker/DatePicker.svelte` | Calendrier popover (bits-ui), `type="button"` sur le trigger, hidden input `YYYY-MM-DD`. |
| `src/lib/components/tournament/{PositionCard,ShiftRow}.svelte` | Présentation + édition inline d'un poste / créneau.                              |
| `src/lib/components/ui/input/Input.svelte`       | Champ réutilisable (`border-border`).                                                        |

## Description

Côté organisateur : créer un tournoi (multi-jours), y ajouter des postes (couleur auto-assignée), et attacher à chaque poste des créneaux flexibles (plage horaire + nombre de places). C'est le cœur de l'outil — la création doit être rapide et simple.

## Tâches

- [x] Tables `Tournament`, `Position`, `Shift` (Drizzle) — **déjà migrées à l'Epic 1** (`drizzle/0000`). Ajout des `relations()` (niveau applicatif, sans migration).
- [x] Schémas Zod de validation (`tournament` / `position` / `shift`).
- [x] Services de gestion tournoi/postes/créneaux (CRUD + gardes d'appartenance).
- [x] Création tournoi : nom, lieu, date début / fin (multi-jours) + génération `share_token` unique.
- [x] CRUD postes : ajout/édition/suppression, **couleur auto-assignée** depuis une palette.
- [x] CRUD créneaux par poste : plage horaire + capacité (nb de places).
- [x] UI orga fluide pour empiler les créneaux d'un poste (page de gestion unique, inline, `use:enhance`).

**Reste avant DONE** (hors code) :

- [x] Validation manuelle du parcours complet (création → postes → créneaux → édition → suppression → 403). **Validé le 2026-06-23.**
- [x] `is_organizer = true` sur le compte de test (`npm run db:studio`).

## Décisions techniques

- **Tables déjà en place** (Epic 1) : l'epic n'a ajouté que la couche Zod + services + routes + UI.
  Les `relations()` drizzle sont ajoutées dans `schema.ts` pour les requêtes imbriquées — **pas de migration**.
- **UI = page de gestion unique inline** (`/tournois/[id]`) : 8 actions nommées
  (`updateTournament` / `deleteTournament` / `create|update|deletePosition` / `create|update|deleteShift`),
  `use:enhance` partout pour ajout/suppression sans reload. Discrimination des erreurs par
  `form.action` (+ `positionId` / `shiftId`).
- **Heures « murales » en UTC-naïf** : les créneaux sont composés avec un suffixe `Z`
  (`toShiftTimestamps`) et affichés en `timeZone: 'UTC'` (`format.ts`) → aucune dérive entre
  le dev (CET) et la prod Vercel (UTC). Idem dates de tournoi (date-only parsées UTC).
- **`share_token`** = `nanoid(10)` avec boucle anti-collision sur la contrainte d'unicité DB.
- **Couleur de poste** auto-assignée par `assignPosteColor(nbPostesExistants)` (palette de 8, cycle),
  figée à la création (l'édition ne la change pas).
- **Autorisation** : `requireOrganizer` garde toutes les routes `/tournois*` ; les services
  re-vérifient l'appartenance (`tournament.organizerId`) via join → un orga n'agit que sur ses tournois.
- **Capacité** stockée telle quelle ; la règle « seules les `available` consomment une place »
  est repoussée à l'Epic 4/5 (côté inscription/suivi).

## Notes & edge cases

- Créneaux qui se chevauchent → autorisés (postes différents **et** même poste : non bloqué).
- Capacité < 1 ou plage invalide (fin ≤ début) → refusé avec message Zod inline.
- Jour du créneau borné à `[startDate, endDate]` du tournoi (attributs `min`/`max` + cohérence orga).
- Tournoi 1 jour autorisé (`endDate === startDate`).
- Palette de couleurs auto : 8 couleurs distinctes, cycle si plus de postes.
- Suppression cascade : tournoi → postes → créneaux → inscriptions (FK `onDelete: 'cascade'`).
