# Epic 16 — Journal d'activité du tournoi

**Complexité** : L
**Statut** : À VALIDER — code livré, migrations `0012` + `0013` **appliquées et vérifiées** (7 lignes d'historique conservées), QA manuelle restante
**Origine** : demande de Jonathan (2026-08-27) — « un journal d'audit pour les organisateurs, afin de tracer tout ce qui est fait ».

## Etat session 2026-08-27

**Fait :**

- **Généralisation de `assignment_log` en `activity_log`** (epic 14 → 16) : la brique existait déjà et était bien conçue (libellés dénormalisés, écriture best-effort, garde d'ownership par jointure) ; seul son périmètre a changé. `target_type` (enum PG) + `action` (text) + `actor_role` ajoutés, `volunteer_name` devient nullable, index `(tournament_id, created_at desc)` créé — il manquait déjà à l'epic 14.
- **Migration en deux fichiers, create → copy → drop** (`0012_activity_log_create` + `0013_assignment_log_drop`) au lieu du rename prévu au plan : `drizzle-kit generate` exige un TTY pour arbitrer un drop+create simultané, et l'environnement n'en a pas. Un `INSERT … SELECT` ajouté à la main en fin de `0012` reprend l'historique (`add`→`assign`, `remove`→`unassign`, `target_type='signup'`, `actor_role='organizer'`). Même contournement que les migrations `0005`/`0006`, déjà acté en 2026-07-02.
- **17 points de mutation instrumentés**, tous **dans les services** et jamais dans les routes : tournoi (create/update/publish/unpublish), poste (create/update/delete), créneau (create/update/delete), affectations orga (assign/unassign/move/swap, déjà tracées), gestes bénévoles (`self_join` / `self_status` / `self_note` / `self_leave`) et fiches bénévoles (create/update).
- **Les gardes d'ownership retournent désormais le contexte** au lieu de `void` (`assertPositionOwner`, `assertShiftOwner`, `getShift`) : le `tournamentId` et les libellés sortent des jointures qu'elles faisaient déjà — zéro requête supplémentaire.
- **Page `/tournois/[id]/journal`** + **layout à onglets** (Gestion · Suivi · Journal) calqué sur `/admin`, et aperçu des 10 dernières entrées conservé en bas de `/suivi`.
- `npm run check` : 0 erreur. eslint : 15 erreurs, **toutes préexistantes** (vérifié fichier par fichier ; les 3 `no-navigation-without-resolve` restantes sont dans `BottomNav`, `Navbar`, `compte/+page.svelte`, non touchés).

**Prochain :** QA manuelle du § Vérification, à partir du parcours n°4 (parcours orga complet : les 6 événements doivent apparaître avec les bons libellés). Les parcours 1 à 3 sont faits.

**Pièges :**

- **`drizzle-kit generate` n'a pas de TTY ici.** Toute future migration impliquant un rename produira un `DROP TABLE` + `CREATE TABLE` silencieux si on ne regarde pas le SQL généré. Réflexe : lire le `.sql` avant de l'appliquer, et découper en create → copy → drop.
- **`shiftLabel` existait déjà** dans `signup-service.ts` (ligne ~655) avec le format `10:00–14:00`. Une seconde version a été écrite puis supprimée : deux formats dans un même journal seraient incohérents avec l'historique déjà écrit. Sa signature a été élargie de `OrganizerShift` à `{ positionName; startsAt; endsAt }`.
- **`formatDateTime` est le seul helper de `format.ts` sans `timeZone: 'UTC'`**, volontairement : `created_at` est un vrai instant, pas une heure murale. Ne pas « corriger » cette incohérence apparente — elle décalerait tout le journal.
- Le repo **n'est pas prettier-clean** (62 fichiers hors norme avant cette session). Ne formater que les fichiers touchés — piège déjà documenté en epic 14.
- `tournament.delete` n'est **pas** tracé, et c'est voulu : le journal cascade avec le tournoi.

**Commit :** _(à faire)_

---

## Carte du code

> Mise à jour : 2026-08-27

| Fichier | Rôle |
| --- | --- |
| `src/lib/server/db/schema.ts` | `activityLog` + enum `activityTarget` remplacent `assignmentLog` / `assignmentAction`. Index `(tournament_id, created_at desc)`. |
| `drizzle/0012_activity_log_create.sql` | Crée la table + reprend l'historique de l'epic 14 (`INSERT … SELECT` écrit à la main). |
| `drizzle/0013_assignment_log_drop.sql` | Supprime `assignment_log` et son enum, **après** la copie. |
| `src/lib/activity-log.ts` | **Nouveau, client-safe.** Types `ActivityAction` / `ActivityTargetType` / `ActivityLogRow`, table `META` des libellés (clé `target.action`, fallback silencieux), options de filtres. |
| `src/lib/server/services/activity-log-service.ts` | **Remplace `assignment-log-service.ts`.** `logActivity` (best-effort), `getActor` (nom + rôle figés), `listActivityLog` (garde d'ownership par `innerJoin`). |
| `src/lib/server/services/tournament-service.ts` | `trace()` privé ; create / update (diff des champs) / publish / unpublish. `deleteTournament` non tracé. |
| `src/lib/server/services/position-service.ts` | `assertPositionOwner` retourne le contexte ; create / update (diff) / delete (compte les créneaux emportés **avant** la cascade). |
| `src/lib/server/services/shift-service.ts` | `assertPositionOwner` / `assertShiftOwner` retournent le contexte ; create / update (diff horaire + capacité) / delete. |
| `src/lib/server/services/signup-service.ts` | `getShift` enrichi (poste + horaires) ; `traceSelf` pour les 4 gestes bénévoles ; `traceAndNotify` bascule sur `logActivity`, vocabulaire `add`→`assign`, `remove`→`unassign`. |
| `src/lib/server/services/volunteer-directory.ts` | `tournamentId` ajouté aux 3 signatures (`createManagedVolunteer`, `attachEmail`, `updateManagedVolunteer`) : une fiche n'appartient à aucun tournoi, c'est le contexte d'où l'orga agit qui donne au journal son lecteur. |
| `src/lib/format.ts` | `formatDateTime` — horodatage du journal, sans `timeZone: 'UTC'` (cf. Pièges). |
| `src/routes/tournois/[id]/+layout.server.ts` | **Nouveau.** `requireOrganizer` seul, sans requête : chaque page charge le tournoi à sa profondeur et porte sa garde de propriété. |
| `src/routes/tournois/[id]/+layout.svelte` | **Nouveau.** Onglets Gestion · Suivi · Journal. `resolve()` appelé littéralement dans le template (exigence de la règle eslint `no-navigation-without-resolve`). |
| `src/routes/tournois/[id]/journal/+page.server.ts` | **Nouveau.** `isTournamentOwner` → 404 explicite, puis `listActivityLog(limit + 1)` pour connaître `hasMore` sans COUNT. `?limit=` plafonné à 500. |
| `src/routes/tournois/[id]/journal/+page.svelte` | **Nouveau.** Recherche + filtres catégorie/auteur côté client, « Charger 100 de plus » par l'URL (sans JS). |
| `src/lib/components/tracking/ActivityLogList.svelte` | **Nouveau.** Rendu d'une ligne, partagé par la page et l'aperçu. Ne nomme la personne concernée que si elle diffère de l'acteur. |
| `src/lib/components/tracking/ActivityHistoryPreview.svelte` | **Remplace `AssignmentHistory.svelte`.** 10 dernières entrées repliées en bas de `/suivi` + lien vers le journal. Le type ne vient plus d'un module serveur. |
| `src/routes/tournois/[id]/+page.svelte` | Bouton « Voir le suivi » retiré (redondant avec les onglets). |

### Décisions clés

- **Généraliser plutôt que créer à côté.** Deux journaux auraient imposé de lire et fusionner deux sources à chaque affichage. La table de l'epic 14 était déjà « audit-shaped » : il manquait un type de cible, un rôle d'acteur et un index.
- **`action` en `text`, pas en `pgEnum`.** Un journal d'audit s'enrichit à chaque epic ; ajouter un événement tracé ne doit pas coûter une migration. Le typage vit dans `src/lib/activity-log.ts` et n'est vérifié qu'à la compilation — c'est le prix assumé. `target_type` reste un enum PG : ses 5 valeurs sont structurelles.
- **Instrumentation dans les services, jamais dans les routes.** Une même action tracée depuis deux appelants produirait deux libellés différents, ou zéro. Corollaire : `volunteer-directory` reçoit un `tournamentId` en paramètre plutôt que de laisser la route écrire la trace.
- **Les gestes bénévoles ont leurs propres verbes (`self_*`).** Sans eux, l'organisateur ne peut pas distinguer une place libérée par un désistement d'une place qu'il a libérée lui-même — c'est l'information la plus utile du journal.
- **`tournament.delete` non tracé, audit hors-tournoi hors périmètre.** Le journal est scopé par tournoi et cascade avec lui : la trace de sa suppression n'aurait aucun lecteur. Les changements de rôle et les actions `/admin` n'ont pas de tournoi parent — ils demanderaient un second journal, non demandé.
- **Filtrage client, pagination par l'URL.** La fenêtre chargée (100) tient en mémoire et un aller-retour par frappe rendrait la recherche poussive ; « Charger plus » est un simple lien, donc sans JS et partageable.

---

## Déploiement

**Fait sur la base de `DATABASE_URL` le 2026-08-27** : `0011` y était déjà appliquée avec son backfill
(4/4 tournois publiés, constaté avant d'agir — le HANDOFF de l'epic 15 était périmé sur ce point),
puis `0012` et `0013` ont été passées par `npx drizzle-kit migrate`.

**Sur toute autre base**, l'ordre reste impératif :

1. `0011`, suivie **immédiatement** de `UPDATE tournament SET published = true;` — sans ce backfill,
   tous les tournois existants disparaissent du listing public.
2. `0012` puis `0013` : la copie de l'historique vit dans `0012` (`INSERT … SELECT`), la suppression
   de l'ancienne table dans `0013`. Les inverser perd l'historique de l'epic 14.
3. Contrôle : `npx tsx scripts/check-activity-log.ts` (lecture seule) — comptages, vocabulaire, index,
   et alerte si aucun tournoi n'est publié.

---

## Vérification

1. `npm run check` — 0 erreur. ✅ fait
2. **Migration avec données** (le point de non-retour). ✅ fait — `npx tsx scripts/check-activity-log.ts` : 7 lignes avant, 7 après, `signup.assign` ×4 + `signup.unassign` ×3, aucun `add`/`remove` résiduel.
3. Index `activity_log_tournament_created_idx` présent. ✅ fait (même script).
4. Parcours orga : créer un poste, un créneau, modifier son horaire, publier le tournoi, affecter puis retirer un bénévole avec motif → 6 lignes dans `/tournois/[id]/journal`, dans le bon ordre, libellés justes.
5. Parcours bénévole (navigation privée, `/t/[token]`) : s'inscrire, passer en « peut-être », modifier sa note, se désinscrire → 4 lignes de plus, visibles sous le filtre auteur « Bénévoles ».
6. **Isolation** : avec un second compte organisateur, ouvrir `/tournois/[id-du-premier]/journal` → 404, jamais de contenu.
7. Filtres et pagination : recherche par nom, filtre catégorie, filtre auteur, puis `?limit=200`.
8. `/suivi` : l'aperçu montre 10 entrées au maximum et le lien mène au journal complet.
9. **Best-effort** : renommer temporairement `activity_log` en base, affecter un bénévole → l'affectation réussit, une erreur `[activity-log]` apparaît en console. Le journal ne doit jamais casser le métier.
