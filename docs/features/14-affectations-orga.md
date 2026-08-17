# Epic 14 — Affectations organisateur : inscrire, retirer, tracer

**Complexité** : L
**Statut** : TODO
**Origine** : retour d'Anne (client ACGB) du 2026-08-17 — les 3 points qui touchent au modèle d'affectation.

## Objectif

Donner à l'organisateur la main complète sur la matrice : aujourd'hui il peut **déplacer** et
**échanger**, il doit aussi pouvoir **inscrire** et **retirer** un bénévole, avec une trace de
ce qui a été modifié et par qui.

## Périmètre

| Demande d'Anne | Traitée ici |
| --- | --- |
| « qu'on puisse également éliminer une tâche (en gardant une trace) » | ✅ T2 + T3 |
| « est-ce possible pour l'organisateur d'inscrire des bénévoles directement dans la matrice ? » | ✅ T1 + T4 |
| « des postes qu'on préfère donner à quelqu'un d'avance (Noélie / annonce des matchs) » | ✅ T5 |

**Le point « Noélie » est résolu par T1** : l'organisateur inscrit Noélie sur le créneau avant
d'envoyer le lien ; la place est consommée, le créneau reste visible dans le tableau (contrairement
à la suppression du poste), et personne d'autre ne peut la prendre si la capacité est atteinte.
T5 ne couvre que le cas capacité > 1 (verrouiller les places restantes).

---

## T1 — Inscrire un bénévole (organisateur)

Deux cas d'usage : la personne a déjà un compte (elle s'est inscrite ailleurs), ou elle n'en a
pas (Noélie, qui ne veut pas passer par l'app).

**Décision de modèle** : on **ne rend pas `signup.userId` nullable** (ça casserait matrice,
récap, exports, rappels, tous indexés par `userId`). On crée à la place un **compte bénévole créé
par l'organisateur**, avec email réel si connu, sinon email « placeholder » non routable. Toute la
chaîne existante fonctionne alors sans modification.

- [ ] `src/lib/server/db/schema.ts` — sur `user` :
  - `createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' })` — qui a créé ce compte (null = auto-inscription normale).
  - `emailPlaceholder: boolean('email_placeholder').notNull().default(false)` — l'email est généré, ne jamais y écrire.
- [ ] `npx drizzle-kit generate` → migration `0010_*`.
- [ ] `src/lib/server/services/email.ts` — garde dure : refuser tout envoi vers une adresse `@benevoles.acgb.local` (log + return, pas d'exception).
- [ ] `src/lib/schemas/assignment.ts` — `assignSchema` : `shiftId`, `status` (`available|maybe`), `note` (réutiliser `noteSchema`), et **soit** `userId` (compte existant) **soit** `{ name, phone, email? }` (nouveau bénévole). Discriminer sur un champ `mode: 'existing' | 'new'`.
- [ ] `src/lib/server/services/volunteer-directory.ts` (nouveau) —
  - `searchVolunteers(query, tournamentId)` : recherche par nom ou email (`ilike`, limite 10), en remontant d'abord les bénévoles **déjà inscrits sur ce tournoi**, puis les autres comptes. Ne jamais exposer l'email complet d'un tiers côté client : renvoyer `{ id, name, phoneMasked, alreadyInTournament }`.
  - `createManagedVolunteer({ name, phone, email }, createdBy)` : si `email` fourni et déjà connu → réutilise le compte existant (pas de doublon) ; sinon insère un `user` (`role: 'volunteer'`, `createdBy`, `emailPlaceholder: true` et email `manuel-${nanoid(8)}@benevoles.acgb.local` si aucun email). Motif existant à suivre : `admin-service.ts:72 createOrganizer`.
- [ ] `src/lib/server/services/signup-service.ts` — `assignVolunteer(organizerId, tournamentId, input)` :
  - garde d'ownership via `getOrganizerShift` (déjà présent, l. 465) ;
  - réutilise la logique de capacité atomique de `createSignup` (INSERT conditionnel) → `FULL` ;
  - `DUPLICATE` si le bénévole est déjà sur ce créneau ;
  - `await scheduleForSignup(...)` en fin (no-op sans push subscription) ;
  - écrit une entrée `assignment_log` (T3).
- [ ] `src/routes/tournois/[id]/suivi/+page.server.ts` — action `assign` + endpoint de recherche. Recherche : `+page.server.ts` ne suffit pas (appel à la frappe) → créer `src/routes/api/volunteers/search/+server.ts`, gardé par `requireOrganizer` **et** par l'ownership du tournoi passé en query.
- [ ] `src/lib/components/tracking/AssignVolunteerDialog.svelte` (nouveau) — modale : poste → créneau (avec « N à pourvoir ») → onglet « Bénévole existant » (champ de recherche, résultats cliquables) / « Nouveau bénévole » (nom + téléphone requis, email facultatif) → statut + note. Bandeau explicite quand l'email est absent : « ce bénévole ne recevra ni rappel ni notification ».
- [ ] `src/lib/components/tracking/RecapToolbar.svelte` — bouton « Inscrire un bénévole » (icône `UserPlus`), à côté de l'export.

**Vérif** : inscrire un compte existant sur un créneau → apparaît dans la matrice, `X/Y` incrémenté ; inscrire un nouveau bénévole sans email → compte créé, visible en matrice et dans l'export contacts, aucun email parti ; inscrire sur un créneau complet → message « créneau complet » ; deux fois le même → « déjà inscrit ».

---

## T2 — Retirer un bénévole d'un créneau

- [ ] `src/lib/schemas/assignment.ts` — `removeSchema` : `shiftId`, `userId`, `reason` (texte optionnel, max 280).
- [ ] `src/lib/server/services/signup-service.ts` — `removeAssignment(organizerId, tournamentId, { shiftId, userId }, reason?)` : ownership obligatoire, `NOT_FOUND` si l'inscription n'existe pas, `DELETE`, puis entrée `assignment_log`. **Aucune annulation QStash nécessaire** : le récepteur re-valide l'état à la livraison et drop (cf. `reminder-scheduler.ts:16`).
- [ ] `src/routes/tournois/[id]/suivi/+page.server.ts` — action `remove` (mapping d'erreurs via `assignError`, à étendre).
- [ ] `src/lib/components/tracking/RecapMatrix.svelte` — dans le popover de cellule, bouton « Retirer du créneau » (rouge, icône `UserMinus`) sous « Déplacer / échanger… ».
- [ ] `src/lib/components/tracking/RemoveAssignmentDialog.svelte` (nouveau) ou extension d'`AssignmentDialog.svelte` — confirmation nommée (« Retirer Marie de Buvette · sam. 10:00–14:00 ? ») + champ motif facultatif.
- [ ] **Décision à trancher avec Jonathan** : prévenir le bénévole retiré (push si abonné) ? Par défaut **non** au premier jet — l'organisateur appelle. À ouvrir en option plus tard.

**Vérif** : retirer un bénévole → disparaît de la matrice, place rendue (`X/Y` décrémenté, ligne « À pourvoir » réapparaît — cf. epic 13 T3), entrée d'historique créée.

---

## T3 — Trace des modifications (`assignment_log`)

« en gardant une trace peut-être » — on trace les **quatre** opérations, pas seulement la
suppression, sinon l'historique est borgne.

- [ ] `src/lib/server/db/schema.ts` —
  ```ts
  export const assignmentAction = pgEnum('assignment_action', ['add', 'remove', 'move', 'swap']);
  export const assignmentLog = pgTable('assignment_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id').notNull().references(() => tournament.id, { onDelete: 'cascade' }),
    action: assignmentAction('action').notNull(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    actorName: text('actor_name').notNull(),          // instantané
    volunteerId: text('volunteer_id').references(() => user.id, { onDelete: 'set null' }),
    volunteerName: text('volunteer_name').notNull(),  // instantané
    detail: text('detail').notNull(),                 // « Buvette · sam. 10:00–14:00 → Entrée · sam. 14:00–18:00 »
    reason: text('reason'),
    createdAt: timestamp('created_at').notNull().defaultNow()
  });
  ```
  Les libellés sont **dénormalisés** exprès : la trace doit survivre à la suppression d'un poste, d'un créneau ou d'un compte. Seul le tournoi cascade (si le tournoi disparaît, son historique n'a plus d'objet).
- [ ] `npx drizzle-kit generate` → migration `0011_*` (ou fusionnée avec T1 si les deux partent ensemble).
- [ ] `src/lib/server/services/assignment-log-service.ts` (nouveau) — `logAssignment(entry)` (best-effort : une erreur d'écriture de log ne doit jamais faire échouer l'action métier → `try/catch` + `console.error`) et `listAssignmentLog(tournamentId, organizerId, limit = 100)`.
- [ ] `src/lib/server/services/signup-service.ts` — brancher `logAssignment` dans `moveSignup`, `swapSignups`, `assignVolunteer`, `removeAssignment`. Les libellés se construisent à partir des données déjà lues (poste + créneau) ; ajouter au besoin une lecture des noms de poste dans `getOrganizerShift`.
- [ ] `src/routes/tournois/[id]/suivi/+page.server.ts` — le `load` renvoie `history`.
- [ ] `src/lib/components/tracking/AssignmentHistory.svelte` (nouveau) — section repliable en bas de `/suivi` : « Historique des modifications (N) », lignes `date · acteur · action · bénévole · détail · motif`. `print:hidden`.

**Vérif** : effectuer un déplacement, un échange, une inscription et un retrait → 4 entrées correctes, dans l'ordre antéchronologique ; supprimer le poste concerné → les entrées restent lisibles.

---

## T4 — Inscrire depuis la matrice (raccourci)

Rendre l'action naturelle là où Anne travaille, plutôt que dans une modale isolée.

- [ ] `src/lib/components/tracking/RecapMatrix.svelte` — clic sur une **cellule vide** d'un bénévole déjà présent en ligne, hors mode « armé » : popover « Inscrire {nom} ici » (statut disponible / peut-être) → action `assign` avec le `userId` connu. Aujourd'hui ce clic ne fait rien (`clickCell`, l. 139 : seules les cellules occupées ouvrent le popover).
- [ ] `src/lib/components/tracking/RecapMatrix.svelte` — la ligne fantôme « À pourvoir » ajoutée par l'epic 13 T3 devient cliquable : ouvre `AssignVolunteerDialog` avec le créneau **pré-sélectionné**.

**Vérif** : depuis une cellule vide d'une ligne existante → inscription en 2 clics ; depuis la ligne « À pourvoir » → modale pré-remplie sur le bon créneau.

---

## T5 — (Optionnel) Verrouiller les places restantes d'un créneau

Ne sert que si la capacité est > 1 et que l'organisateur veut garder les places pour des
personnes choisies. À ne faire que si Anne le redemande après avoir testé T1.

- [ ] `shift.locked: boolean('locked').notNull().default(false)`.
- [ ] `createSignup` / `changeSignupStatus` → `LOCKED` si `locked` et que l'appel vient du bénévole ; `assignVolunteer` (organisateur) ignore le verrou.
- [ ] `/t/[token]` — créneau verrouillé affiché « Réservé par l'organisateur », non cliquable.
- [ ] Interrupteur dans `ShiftRow.svelte` (gestion du tournoi).

---

## Carte du code (anticipée)

- `src/lib/server/db/schema.ts` — `user.createdBy`, `user.emailPlaceholder`, `assignment_log` (+ `shift.locked` si T5).
- `src/lib/server/services/volunteer-directory.ts` — **nouveau** (recherche + création de bénévole géré).
- `src/lib/server/services/assignment-log-service.ts` — **nouveau** (trace).
- `src/lib/server/services/signup-service.ts` — `assignVolunteer`, `removeAssignment`, logs sur move/swap.
- `src/lib/schemas/assignment.ts` — `assignSchema`, `removeSchema`.
- `src/routes/api/volunteers/search/+server.ts` — **nouveau** (recherche à la frappe, gardée).
- `src/routes/tournois/[id]/suivi/+page.{server.ts,svelte}` — actions `assign` / `remove` + historique.
- `src/lib/components/tracking/{AssignVolunteerDialog,RemoveAssignmentDialog,AssignmentHistory}.svelte` — **nouveaux**.
- `src/lib/components/tracking/{RecapMatrix,RecapToolbar}.svelte` — points d'entrée.

## Risques / points d'attention

- **Comptes fantômes** : chaque bénévole créé sans email pollue `/admin/utilisateurs` et les stats. Prévoir un badge « ajouté par un organisateur » dans la liste admin et exclure les `emailPlaceholder` du compteur d'utilisateurs actifs (`admin-service.ts:111 getStats`).
- **Fusion de comptes** : si Noélie crée plus tard son propre compte avec un vrai email, elle aura deux identités. Pas de fusion au premier jet — noter la limite ; contournement : l'organisateur saisit son vrai email dès la création, et le magic link rattache alors le même compte.
- **RGPD / consentement** : l'organisateur saisit le nom et le téléphone d'un tiers. C'est déjà le cas dans le fichier Excel actuel, mais à mentionner à Anne : ces personnes doivent être prévenues qu'elles sont inscrites.
- **Concurrence** : un organisateur inscrit pendant qu'un bénévole s'inscrit → la capacité reste garantie par l'INSERT conditionnel atomique déjà en place.
