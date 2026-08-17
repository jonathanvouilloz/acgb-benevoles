# Epic 14 — Affectations organisateur : inscrire, retirer, tracer

**Complexité** : L
**Statut** : À VALIDER — code livré, migration `0010` appliquée, QA manuelle restante
**Origine** : retour d'Anne (client ACGB) du 2026-08-17 — les 3 points qui touchent au modèle d'affectation.

## Etat session 2026-08-17

**Fait :**

- **T1 → T4 livrés en un bloc** (une seule migration `0010`, appliquée sur Neon et vérifiée : colonnes présentes, table créée, enum à 4 valeurs, 0 fiche existante).
- **Modèle à 3 niveaux** tranché et implémenté : compte existant · fiche avec vrai email (inerte jusqu'à la 1re connexion puis **rétroactive**) · fiche sans email (visible de l'organisateur seul). `signup.userId` reste `NOT NULL`.
- **Rattachement d'email** ajouté hors plan initial (`AttachEmailDialog` + action `attachEmail`) : une fiche inerte redevient un compte connectable sans perdre ses affectations. C'est la réponse au « la personne ne peut pas se connecter, elle ne voit pas ses trucs ».
- **Notification push sur les 4 opérations** (décision de Jonathan : « dans tous les cas »). `notifyUser` extrait de `reminder-service.ts:184-188` → un seul chemin d'envoi. Chaque action remonte `notified` ; l'UI dit « non prévenu·e, appelez-le·la » au lieu d'annoncer un faux succès.
- **Gardes email en profondeur** ajoutées hors plan : `sendMagicLinkEmail` et `/login` (2 modes) refusent le domaine généré.
- Commité et poussé. `npm run check` 0 erreur, `npm run build` OK, eslint inchangé vs baseline (14 erreurs, toutes préexistantes — vérifié en comparant `signup-service.ts` à sa version HEAD).

**Prochain :** QA manuelle des 9 parcours listés en fin de fichier (§ Vérification), en priorité le **parcours 3** (inscrire avec un vrai email → se connecter depuis une autre session → retrouver ses créneaux) : c'est lui qui valide le cas 2 du modèle. Puis statut `DONE` et réponse à Anne sur la date de test.

**Pièges :**

- **`prettier --write "src/**/*"` est à proscrire ici** : le repo n'est pas prettier-clean (34 fichiers hors norme au départ) et l'écriture change les fins de ligne (`core.autocrlf=true`) → ~98 fichiers apparaissent modifiés dans `git status` alors que `git diff` n'en voit que les vrais. Formater **uniquement les fichiers touchés**.
- `git status` peut mentir après un formatage massif (cache stat périmé). `git diff --name-only` fait foi.
- La ligne d'`orderBy` de `searchVolunteers` doit viser `"alreadyInTournament"` **par nom**, pas par ordinal — l'ordinal `3` désigne `phone` (bug corrigé en session).
- L'erreur eslint `preserve-caught-error` sur `signup-service.ts` est **préexistante** (même `catch` dans `createSignup` avant refactor), ne pas la traiter comme une régression.
- La fusion de comptes n'existe pas : un bénévole hors app qui crée plus tard son compte avec un email **différent** aura deux identités. Le rattachement est le contournement, pas le correctif.

**Commit :** [3edb0e2] feat(affectations): inscrire, retirer et tracer depuis la matrice

---

## Carte du code

> Mise à jour : 2026-08-17

| Fichier                                                     | Rôle                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/db/schema.ts`                               | `user.createdBy` + `user.emailPlaceholder` ; table `assignmentLog` + enum `assignmentAction` (libellés dénormalisés).           |
| `src/lib/server/services/volunteer-directory.ts`            | **Nouveau.** Recherche annuaire (email jamais renvoyé, tél masqué), `createManagedVolunteer`, `attachEmail`.                    |
| `src/lib/server/services/assignment-log-service.ts`         | **Nouveau.** `logAssignment` (best-effort, ne fait jamais échouer l'action métier) et `listAssignmentLog`.                      |
| `src/lib/server/services/ownership.ts`                      | **Nouveau.** `assertTournamentOwner` / `isTournamentOwner`, extraits de `position-service.ts` (2 nouveaux consommateurs).       |
| `src/lib/server/services/signup-service.ts`                 | Cœur : `insertSignupAtomic` (partagé), `assignVolunteer`, `removeAssignment`, `traceAndNotify` branché sur les 4 opérations.    |
| `src/lib/server/services/push-service.ts`                   | `notifyUser(userId, payload)` → nb d'envois réussis. `0` = personne prévenu, l'information remonte jusqu'au toast.              |
| `src/lib/server/services/email.ts`                          | `MANAGED_EMAIL_DOMAIN` + `isManagedEmail` ; garde dure dans `sendMagicLinkEmail`.                                              |
| `src/lib/server/services/admin-service.ts`                  | `listUsers` remonte `isManaged` ; `getStats` exclut les fiches du compteur d'utilisateurs et les compte à part.                 |
| `src/lib/schemas/assignment.ts`                             | `assignSchema` (union discriminée `existing`/`new`), `removeSchema`, `attachEmailSchema`.                                       |
| `src/routes/api/volunteers/search/+server.ts`               | **Nouveau.** Recherche à la frappe, double garde `requireOrganizer` + propriété du tournoi.                                     |
| `src/routes/tournois/[id]/suivi/+page.server.ts`            | Actions `assign` / `remove` / `attachEmail` ; le `load` renvoie `history`.                                                     |
| `src/routes/login/+page.server.ts`                          | Rejette le domaine généré dans les 2 modes (sinon « lien envoyé » pour un email qui n'arrive jamais, ou appropriation de fiche). |
| `src/lib/components/tracking/AssignVolunteerDialog.svelte`  | **Nouveau.** 2 onglets, email poussé en premier avec sa conséquence écrite, alerte créneau complet avant soumission.            |
| `src/lib/components/tracking/RemoveAssignmentDialog.svelte` | **Nouveau.** Confirmation nommée + motif ; le toast dit si le bénévole n'a pas été prévenu.                                     |
| `src/lib/components/tracking/AttachEmailDialog.svelte`      | **Nouveau.** Rattachement d'un vrai email à une fiche.                                                                         |
| `src/lib/components/tracking/AssignmentHistory.svelte`      | **Nouveau.** Section repliable en bas de `/suivi`, `print:hidden`.                                                             |
| `src/lib/components/tracking/RecapMatrix.svelte`            | 3ᵉ état dans `clickCell` (cellule vide), bouton « Retirer », badge « hors app », `+N` cliquable, « Ajouter son email ».         |
| `src/lib/components/tracking/assignment-types.ts`           | `AssignRequest` étendu (`remove`, `assign`) + `MoveOrSwapRequest` pour garder le narrowing exhaustif.                           |
| `src/routes/admin/utilisateurs/+page.svelte`                | Badge « ajouté par un organisateur » ; affiche « Pas d'email » au lieu de l'adresse générée.                                   |

### Décisions clés

- **`signup.userId` reste `NOT NULL`.** Le rendre nullable aurait cassé matrice, récap, export, rappels, `getMyTournaments`, `getMyUpcomingShifts` — tous indexés par `userId`. On crée un compte géré à la place, sur le motif éprouvé de `admin-service.createOrganizer` (insertion directe hors Better Auth).
- **Un compte sans email est une fiche, pas un utilisateur.** Complète côté organisateur, volontairement inerte côté bénévole. Acceptable parce que la demande d'Anne est « que Noélie soit dans le tableau », pas « que Noélie voie ses créneaux ».
- **Le cas « fiche avec vrai email » marche par construction** : `signup.userId` ne bouge jamais, donc à la 1re connexion Better Auth signe dans le compte existant et retrouve les affectations. D'où l'UI qui **pousse** l'email au lieu de le traiter comme un champ optionnel neutre.
- **`insertSignupAtomic` est partagé** entre `createSignup` et `assignVolunteer` : dupliquer l'INSERT conditionnel, c'est dupliquer la garantie de capacité en concurrence (neon-http n'a pas de transaction interactive).
- **Aucune annulation QStash au retrait** : le récepteur re-valide l'état à la livraison et drop (`reminder-scheduler.ts:16-19`, `reminder-service.ts:178`).
- **Trace dénormalisée** (`actorName`, `volunteerName`, `detail` figés à l'écriture) : l'historique doit rester lisible après suppression d'un poste, d'un créneau ou d'un compte. Seul le tournoi cascade.
- **Écriture de log best-effort** : une erreur d'audit ne doit jamais annuler une action métier déjà commitée.

---

## Objectif

Donner à l'organisateur la main complète sur la matrice : aujourd'hui il peut **déplacer** et
**échanger**, il doit aussi pouvoir **inscrire** et **retirer** un bénévole, avec une trace de
ce qui a été modifié et par qui.

## Périmètre

| Demande d'Anne                                                                        | Traitée ici |
| ------------------------------------------------------------------------------------- | ----------- |
| « qu'on puisse également éliminer une tâche (en gardant une trace) »                   | ✅ T2 + T3  |
| « est-ce possible pour l'organisateur d'inscrire des bénévoles directement dans la matrice ? » | ✅ T1 + T4  |
| « des postes qu'on préfère donner à quelqu'un d'avance (Noélie / annonce des matchs) » | ✅ T1       |

**Le point « Noélie » est résolu par T1** : l'organisateur inscrit Noélie sur le créneau avant
d'envoyer le lien ; la place est consommée, le créneau reste visible dans le tableau (contrairement
à la suppression du poste), et personne d'autre ne peut la prendre si la capacité est atteinte.

---

## T1 — Inscrire un bénévole (organisateur) ✅

- [x] `schema.ts` — `user.createdBy`, `user.emailPlaceholder`.
- [x] Migration `0010_demonic_bastion.sql` (générée **et appliquée** sur Neon).
- [x] `services/email.ts` — `MANAGED_EMAIL_DOMAIN`, `isManagedEmail`, garde dans `sendMagicLinkEmail` (log + return, pas d'exception).
- [x] `schemas/assignment.ts` — `assignSchema`, union discriminée sur `mode`.
- [x] `services/volunteer-directory.ts` — `searchVolunteers`, `createManagedVolunteer`.
- [x] `services/signup-service.ts` — `assignVolunteer` (ownership, capacité atomique, `scheduleForSignup`, log, notif).
- [x] `suivi/+page.server.ts` — action `assign` ; `api/volunteers/search/+server.ts` gardé par `requireOrganizer` **et** ownership.
- [x] `AssignVolunteerDialog.svelte` — 2 onglets, bandeau explicite sans email.
- [x] `RecapToolbar.svelte` — bouton « Inscrire un bénévole ».
- [x] **Hors plan initial** — `/login` refuse le domaine généré dans les 2 modes.
- [x] **Hors plan initial** — `attachEmail` + `AttachEmailDialog` : rendre une fiche connectable.
- [x] **Hors plan initial** — badge « hors app » en matrice, badge admin, exclusion des stats.

## T2 — Retirer un bénévole d'un créneau ✅

- [x] `schemas/assignment.ts` — `removeSchema` (motif max 280).
- [x] `services/signup-service.ts` — `removeAssignment` (lecture avant DELETE pour la trace).
- [x] `suivi/+page.server.ts` — action `remove`, `assignError` étendu.
- [x] `RecapMatrix.svelte` — bouton « Retirer du créneau » dans le popover de cellule.
- [x] `RemoveAssignmentDialog.svelte` — confirmation nommée + motif facultatif.
- [x] **Décision tranchée (Jonathan, 2026-08-17)** : oui, on prévient le bénévole retiré — et les 4 opérations notifient.

## T3 — Trace des modifications (`assignment_log`) ✅

- [x] `schema.ts` — `assignmentAction` + `assignmentLog`, fusionnés dans la migration `0010`.
- [x] `services/assignment-log-service.ts` — `logAssignment` (best-effort), `listAssignmentLog`.
- [x] `signup-service.ts` — `traceAndNotify` branché sur `moveSignup`, `swapSignups` (2 entrées), `assignVolunteer`, `removeAssignment`.
- [x] `suivi/+page.server.ts` — le `load` renvoie `history`.
- [x] `AssignmentHistory.svelte` — section repliable, `print:hidden`.

## T4 — Inscrire depuis la matrice ✅

- [x] `RecapMatrix.svelte` — clic sur cellule **vide** hors mode armé → popover « Inscrire {nom} ici » (3ᵉ état, sans toucher à la branche `if (selected)`).
- [x] `RecapMatrix.svelte` — le `+N` de la ligne « À pourvoir » ouvre la modale avec le créneau pré-sélectionné.

## T5 — Verrouiller les places restantes ⛔ hors périmètre

Seul item qui toucherait le parcours bénévole `/t/[token]`. À rouvrir **uniquement** si Anne le
redemande après avoir testé T1 — le plan initial le disait déjà.

- [ ] `shift.locked` + `LOCKED` dans `createSignup` / `changeSignupStatus`.
- [ ] `/t/[token]` : créneau « Réservé par l'organisateur », non cliquable.
- [ ] Interrupteur dans `ShiftRow.svelte`.

---

## Vérification (QA manuelle restante)

Serveur de dev déjà actif en permanence — ne pas le relancer.

1. **Inscrire un compte existant** → apparaît en matrice, `X/Y` incrémenté, `+N` décrémenté, notification reçue si abonné.
2. **Inscrire sans email** → fiche créée, badge « hors app », présente dans l'export « Bénévoles & contacts », **aucun email parti** (vérifier les logs Resend), toast précisant qu'elle n'a pas été prévenue.
3. **Inscrire avec un vrai email**, puis se connecter avec cet email depuis une autre session → la personne retrouve **ses créneaux déjà attribués**. ⚠️ **C'est le test qui valide le cas 2 du modèle.**
4. **Rattachement** : « Ajouter son email » sur une fiche → même vérification qu'au point 3. Réessayer avec un email déjà pris → message `EMAIL_TAKEN`.
5. **Retirer** → disparaît, place rendue, `+N` réapparaît, notification reçue, entrée d'historique créée.
6. **Erreurs** : créneau complet → « créneau complet » ; deux fois le même bénévole → « déjà inscrit ».
7. **Trace** : enchaîner déplacement, échange, inscription, retrait → 4 entrées antéchronologiques ; supprimer ensuite le poste → **les entrées restent lisibles**.
8. **Non-régression matrice** : move et swap fonctionnent toujours, `Échap` annule la sélection, les filtres (poste / jour / statut / recherche) ne cassent pas les nouveaux clics.
9. **Garde login** : se connecter avec une adresse `@benevoles.acgb.local` → message explicite, aucun email envoyé.

## Risques / points d'attention

- **RGPD** : l'organisateur saisit le nom et le téléphone d'un tiers. Déjà le cas dans l'Excel actuel, mais **à mentionner à Anne** — ces personnes doivent être prévenues qu'elles sont inscrites. (Consigné dans les tâches Jonathan.)
- **Fusion de comptes** : pas au programme. Contournement = saisir le vrai email dès la création, ou le rattacher ensuite.
- **Concurrence** : un organisateur inscrit pendant qu'un bénévole s'inscrit → capacité garantie par l'INSERT conditionnel atomique partagé.
