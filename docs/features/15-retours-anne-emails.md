# Epic 15 — Retours Anne #2 : emails de confirmation, lisibilité, brouillons

**Complexité** : L
**Statut** : À VALIDER — code livré, migration `0011` générée (non appliquée), QA manuelle restante
**Origine** : retour d'Anne (client ACGB) du 2026-08-19, après test en conditions réelles.

## État session 2026-08-19

**Fait :**

- **Cause racine des 3 retours « pas de notification »** trouvée : l'app n'envoyait **aucun email
  transactionnel** hors magic link. Tout passait par le Web Push, qui n'arrive que si le bénévole a
  activé les notifications sur son appareil — aucun testeur ne l'avait fait, donc `notifyUser()`
  renvoyait `0` en silence. Ni Zoé ni Noélie ne pouvaient recevoir quoi que ce soit.
- **T1/T2/T6** (commit `9dba5ce`) : `position.description` remontée jusqu'au bénévole (elle se
  perdait dans `flattenShifts`), groupement par poste par défaut, tri alphabétique des postes des
  deux côtés, presets alignés sur le vocabulaire ACGB réel.
- **T3/T4** (commit `a30d744`, migration `0011`) : `tournament.published` (brouillon absent du
  listing public mais lien de partage actif) et `updateManagedVolunteer` (corriger nom / tél /
  email d'une fiche qu'on a créée — le cas « Préjbanu »).
- **T5** : récap email groupé différé, rappel 24 h par email, prévenance sur créneau supprimé ou
  déplacé. Socle QStash extrait en `qstash.ts` et partagé avec les rappels.
- `npm run check` 0 erreur, `npm run build` OK, eslint **15 erreurs = baseline exacte** (mesurée par
  `git stash` avant/après — la mention « 14 » de l'epic 14 était périmée).

**Prochain :** appliquer la migration `0011` sur Neon prod **puis le backfill `published`** (cf.
§ Déploiement), régler `DIGEST_DELAY_MIN=1` sur un preview et dérouler les 10 parcours du
§ Vérification. En priorité le n°1 (5 changements → 1 seul email) : c'est lui qui valide le
debounce, et le seul qui attrape le piège `excluded.revision`.

**Pièges :**

- **Backfill obligatoire** après la migration : `published` vaut `false` par défaut, donc **tous les
  tournois existants disparaissent du listing public** tant que le `UPDATE` n'est pas passé.
- Le récap n'est **pas testable en local** : QStash n'atteint pas `localhost`, et `enqueueDigest`
  sort avant toute écriture quand `QSTASH_TOKEN` est absent. Le script `scripts/digest-check.ts`
  prévu au plan **n'a pas été livré** — cf. § Écart assumé.
- `deduplicationId` : séparateur `_`, jamais `:` (QStash renvoie 400). Centralisé dans `safeDedupId`.
- `notified` a **changé de sens** : il vaut désormais vrai dès qu'un email peut partir, pas
  seulement quand un push est délivré. C'est voulu — l'ancien sens produisait un faux négatif.

**Commits :** `9dba5ce`, `a30d744`, + celui de T5.

---

## Le mécanisme de debounce (le point à comprendre avant de toucher au code)

Anne voulait une confirmation d'inscription. Un email par clic aurait donné 5 emails à un bénévole
qui coche 5 créneaux. On envoie donc **un récap groupé, ~10 minutes après le dernier changement**.

Aucun timer n'existe côté serveur. On transpose la doctrine déjà en place pour les rappels —
*planifier, jamais annuler, re-valider à la livraison* — d'un horodatage de créneau vers un
**compteur de révision** par `(bénévole, tournoi)` :

1. chaque changement fait `revision = revision + 1` et publie un message différé portant cette
   valeur ;
2. à l'échéance, `processDigest` ne l'envoie que si le message porte **encore** la révision
   courante.

Cinq changements en trois minutes publient cinq messages ; quatre arrivent périmés et meurent en
200 ; **un seul email part**, et son contenu est relu en base à cet instant.

Trois choses ne sont pas négociables, chacune commentée à son emplacement :

| Règle | Ce qui casse sinon |
|---|---|
| `signupDigest.revision + 1`, jamais `excluded.revision` | la révision reste bloquée à 1, tous les messages se croient frais → **un email par clic**, le bug qu'on voulait éviter |
| bump **avant** publish | le message peut être livré avant que sa révision soit visible → il se croit périmé → **aucun email** |
| claim par CAS (`revision = $rev AND sent_revision < $rev`) dans **un seul** `UPDATE` | QStash est at-least-once ; un `SELECT` de contrôle laisserait deux livraisons concurrentes envoyer **deux emails** |

Deux garde-fous contre l'email fantôme :

- **`empty-first`** : un premier récap vide ne part pas. Sinon un organisateur qui ajoute puis
  retire quelqu'un dans la même fenêtre lui annonce « tu n'es plus inscrit·e » alors qu'il n'a
  jamais rien reçu.
- **`.returning()`** sur `deleteSignup` et `setSignupNote` : un double-submit ne brûle pas une
  révision sur une écriture qui n'a rien changé.

---

## Carte du code

> Mise à jour : 2026-08-19

| Fichier | Rôle |
|---|---|
| `src/lib/server/db/schema.ts` | `tournament.published` ; table `signup_digest` (PK composite, 2 FK cascade). |
| `drizzle/0011_graceful_dragon_man.sql` | Migration correspondante. **Non appliquée.** |
| `src/lib/server/services/qstash.ts` | **Nouveau.** Socle partagé : `getQstashClient`, `publicUrl`, `safeDedupId`. Consommé par les deux planificateurs. |
| `src/lib/server/services/digest-scheduler.ts` | **Nouveau.** `enqueueDigest` (bump + publish, best-effort) et `enqueueDigestForShift`. `DIGEST_DELAY_MIN`. |
| `src/lib/server/services/digest-service.ts` | **Nouveau.** `processDigest` : claim atomique, `empty-first`, politique d'échec (refus Resend → garde le claim ; panne réseau → rend le claim et 500). |
| `src/routes/api/qstash/digest/+server.ts` | **Nouveau.** Récepteur signé. Endpoint distinct obligatoire (`Receiver.verify` contrôle l'URL). |
| `src/lib/server/services/email.ts` | `emailLayout` + `esc` extraits ; `sendSignupDigestEmail`, `sendShiftReminderEmail` ; `EMAIL_REJECTED` distingue un refus définitif d'une panne réseau. |
| `src/lib/server/services/signup-service.ts` | 6 points de câblage du récap ; `getShift` renvoie `tournamentId` ; `isEditable` sur `VolunteerSignup` ; `notified` = push **ou** email. |
| `src/lib/server/services/reminder-service.ts` | Le palier 24 h envoie aussi un email (le palier court reste push seul). |
| `src/lib/server/services/shift-service.ts` | `deleteShift` / `updateShift` préviennent les inscrits. |
| `src/lib/server/services/volunteer-directory.ts` | `updateManagedVolunteer`, gardée par `createdBy`. |
| `src/lib/server/services/tournament-service.ts` | `listPublicTournaments` filtre sur `published` ; `setPublished`. |
| `src/lib/volunteer-shifts.ts` | `positionDescription` sur `FlatShift`, `description` sur `PositionGroup`. |
| `src/lib/components/tracking/EditVolunteerDialog.svelte` | **Nouveau.** Nom + tél + email d'une fiche qu'on a créée. |
| `src/routes/t/[token]/+page.svelte` | Groupement par poste par défaut, description du poste, bandeau brouillon. |
| `src/routes/tournois/[id]/+page.{server.ts,svelte}` | Action `togglePublished`, badge et bouton de publication. |
| `src/routes/tournois/[id]/suivi/+page.{server.ts,svelte}` | Action `updateVolunteer` (double garde ownership + inscrit sur ce tournoi). |

### Décisions clés

- **Debounce par révision + CAS**, pas d'annulation QStash : un `DELETE` de message peut échouer ou
  arriver trop tard, il faudrait de toute façon re-valider à la livraison. On paierait un appel
  réseau et une race de plus pour zéro garantie supplémentaire.
- **Un email par (bénévole, tournoi)**, jamais un récap global : le contenu est tournoi-scopé
  (consignes, lien de partage, coordonnées de l'organisateur, qui diffèrent d'un tournoi à l'autre).
  Ne pas « corriger » ça plus tard par erreur.
- **Édition de fiche discriminée par `createdBy`**, pas par `emailPlaceholder` : c'est précisément
  la garde `emailPlaceholder` d'`attachEmail` qui rendait la faute de frappe de Noélie définitive.
- **Le rappel court reste push seul** : un email 30 minutes avant arrive trop tard pour servir.
- **Un brouillon garde son lien de partage actif** : c'est ce qui permet de tester à quelques-uns.

---

## Écart assumé au plan

Le plan prévoyait `scripts/digest-check.ts` pour vérifier le récap en local. **Non livré.**
`scripts/seed-demo.ts` évite délibérément toute dépendance SvelteKit (il lit `DATABASE_URL` et
ouvre son propre client Drizzle), alors que `digest-service` importe `$lib/server/db` et
`$env/dynamic/private`. Le rendre exécutable depuis un script nu demanderait un loader d'alias de
modules ou une duplication de la logique — les deux pires que l'alternative.

Conséquence : la vérification passe par un **preview Vercel avec `DIGEST_DELAY_MIN=1`**, qui a
l'avantage de tester le vrai chemin, signature QStash comprise — ce qu'un script local ne peut de
toute façon pas faire.

---

## Déploiement

1. `npx drizzle-kit migrate` sur Neon prod (migration `0011`).
2. **Backfill immédiat**, sinon tous les tournois existants sortent du listing public :
   ```sql
   UPDATE tournament SET published = true;
   ```
3. Anne repasse ses tournois de test en brouillon, ou les supprime.
4. Optionnel : `DIGEST_DELAY_MIN` sur Vercel (défaut 10 ; mettre 1 sur le preview de test).
5. Vérifier que `BETTER_AUTH_URL` vaut bien `https://benevoles.acgb.ch` — sans ça, zéro email et
   aucune erreur visible.

---

## Vérification

Sur un preview avec `DIGEST_DELAY_MIN=1`. Chaque point se contrôle à trois endroits : la boîte de
réception, la table `signup_digest` (`revision` / `sent_revision`), et les logs QStash.

- [ ] 1. 5 changements en 40 s → **un seul** email, contenu = état final. `revision = sent_revision = 5`, 4 messages en 200 `stale`.
- [ ] 2. Inscription puis désinscription totale avant le premier envoi → aucun email (`empty-first`).
- [ ] 3. Inscription → email reçu → désinscription totale → email « Inscription annulée » (`sent-empty`).
- [ ] 4. Rejouer le message gagnant depuis la console QStash → 200 `stale`, **aucun second email**.
- [ ] 5. Fiche **sans** email inscrite depuis la matrice → aucune ligne `signup_digest`, aucun message publié, **zéro tentative vers `@benevoles.acgb.local` dans Resend**.
- [ ] 6. Inscription par l'organisateur → email au ton « l'organisateur a modifié ton planning », et le toast n'annonce plus « non prévenu·e » si la personne a un email réel.
- [ ] 7. Statut `maybe` seul → l'email existe et marque le « peut-être ».
- [ ] 8. Même bénévole touché sur deux tournois dans la même minute → 2 lignes, 2 emails distincts.
- [ ] 9. Rappel 24 h : le push **et** l'email partent ; rejouer le message → aucun second envoi.
- [ ] 10. Non-régression rappels (après le refactor `qstash.ts`) : une nouvelle inscription publie toujours ses 2 messages `rem_*` avec le bon `notBefore`.

Côté interface :

- [ ] 11. Description de poste visible sur `/t/[token]` (sous le titre du groupe, et dans le détail déplié en vue par horaire).
- [ ] 12. La page s'ouvre sur « Par poste », postes en ordre alphabétique, même ordre côté gestion.
- [ ] 13. Nouveau tournoi → absent de `/tournois-publics`, accessible par son lien avec bandeau ; publier → apparaît ; repasser en brouillon → disparaît.
- [ ] 14. Corriger le nom d'une fiche créée par soi → à jour dans la matrice, le planning imprimé et l'export xlsx.
- [ ] 15. Ouvrir la carte contact d'un bénévole qui a son **propre** compte → aucun bouton « Modifier la fiche ».
