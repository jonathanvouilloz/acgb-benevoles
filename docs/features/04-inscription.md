# Epic 4 — Inscription bénévole

**Complexité** : M
**Statut** : DONE (testé et validé 2026-06-23) — vue « Mes créneaux » ajoutée 2026-06-30 (prêt à tester)

## Etat session 2026-06-30 (vue dédiée « Mes créneaux »)

**Fait :**

- Onglets **« Mes créneaux » / « S'inscrire »** sur `/t/[token]` : ouverture par défaut sur _Mes créneaux_ si déjà inscrit (sinon _S'inscrire_), reset auto via `$effect` sur `t.id` en changeant de tournoi.
- Onglet _Mes créneaux_ = agenda perso épuré (pas de filtres), groupé par jour/tranche, prochain créneau `featured`. Suppression du switch « Mes créneaux » (redondant) et du bloc « Ton prochain créneau » (fusionné dans l'agenda) ; créneaux passés restreints aux miens dans cet onglet.
- **Accueil bénévole** : agenda global de tous les créneaux à venir, tous tournois confondus (`getMyUpcomingShifts`), groupé par jour ; cartes « Mes tournois » conservées en complément.
- `npm run check` vert (0 erreur, 0 warning). Aucune migration DB.

**Prochain :** Validation Jonathan (3 parcours : déjà inscrit, pas inscrit, accueil global). Puis déploiement Vercel du prototype.

**Pièges :** `getMyUpcomingShifts` borne sur `endsAt > now` (cohérent avec `splitByTime`). L'onglet `browse` repart de tout `upcoming` (plus d'exclusion du « prochain »).

**Commit :** [03c39b9] feat(benevole): vue dediee "Mes creneaux" (onglet tournoi + agenda accueil)

---

## Etat session 2026-06-24 (sélection filtrable & compacte)

**Fait :**

- Refonte de `/t/[token]/+page.svelte` pour tenir le **volume** (postes × créneaux × jours) : barre de filtres collante (jour, tranche **matin/après-midi/soir**, poste color-codé, « places dispo », « mes créneaux ») + compteur de places à pourvoir.
- Bascule de **regroupement Temps ↔ Poste** (même surface, deux modèles mentaux) ; lignes compactes **dépliables** (`VolunteerShiftRow`) avec action « Dispo » en un tap, détail au dépliage.
- Helpers purs `src/lib/volunteer-shifts.ts` : `filterShifts`, `groupByTime`/`groupByPosition`, `timeSlotOf`, `distinctDays/Slots`, `presentPositionIds`.
- Intro guidée (« soft-chatbot ») **reportée** : ce sera juste un preset des filtres existants.

**Prochain :** Validation Jonathan sur le tournoi démo (filtres + dépliage). RAS sinon.

**Pièges :** `FlatShift` porte désormais `positionId` (filtre poste). Tranches = presets simples (start < 12h / < 18h / ≥ 18h en UTC mural), pas de slider.

**Commit :** [205e103] feat(benevole): sélection des créneaux filtrable et compacte

---

## Etat session 2026-06-23

**Fait :**

- Couche complète côté bénévole : `/t/[token]` (lecture publique) + inscription `available`/`maybe`, changement de statut, désinscription.
- `signup-service.ts` avec capacité **atomique** (INSERT/UPDATE conditionnel SQL — neon-http sans transactions).
- `requireLogin` + `safeRedirect` ajoutés ; flux `/login?redirect=…` threadé jusqu'au `callbackURL` du magic link (retour auto sur le créneau).
- Vue `+page.svelte` + `VolunteerShiftRow` : places restantes, **noms des inscrits**, badges StatusBadge, CTA déconnecté.
- `npm run check` (0 erreur) et `npm run build` verts. Aucune migration DB (table `signup` déjà migrée Epic 1).

**Prochain :** Test manuel par Jonathan (parcours bénévole de bout en bout, cf. Notes). Une fois validé → passer Epic 4 DONE et démarrer Epic 5 (Suivi du remplissage, orga).

**Pièges :** `db.execute(sql\`…\`)`neon-http renvoie un objet avec`.rows`(pas un array direct) — c'est ce qui porte le`RETURNING`. Le bouton « Me retirer » utilise `formaction="?/unregister"`à l'intérieur du form`?/changeStatus` (override du submitter).

**Commit :** [b9bd87f] docs: Epic 4 — code complet, prêt à tester

---

## Description

Côté bénévole : via le lien partagé, voir le tournoi (postes, créneaux, places restantes) et s'inscrire créneau par créneau avec un statut `disponible` / `peut-être`. Pouvoir changer de statut ou se désinscrire.

## Tâches

- [x] Table `Signup` (id, shift*id, user_id, status, created_at) + unicité (shift_id + user_id). *(déjà migrée Epic 1)\_
- [x] Page publique tournoi via `share_token` (lecture) — `/t/[token]`.
- [x] Affichage des places restantes par créneau (recalcul à chaque `load`).
- [x] Inscription : choix créneau + statut (`available` / `maybe`).
- [x] Inscription sur plusieurs créneaux.
- [x] Changement de statut + désinscription (libère la place).
- [x] Connexion requise pour s'inscrire (magic link — `requireLogin` + `redirect` vers /login).

## Décisions techniques

- **Confirmé** : les `maybe` sont affichées mais ne consomment pas de place ; seules les `available` comptent dans la capacité.
- **Noms visibles** : la page publique liste les prénoms/noms des inscrits sous chaque créneau (décision produit).
- **Capacité atomique** : INSERT/UPDATE conditionnel SQL en une requête (neon-http sans transactions) → impossible de surréserver la dernière place. Voir `src/lib/server/services/signup-service.ts`.
- **Retour après login** : `/t/[token]` → `/login?redirect=…` → `callbackURL` du magic link → retour sur le créneau. Helper `safeRedirect` anti open-redirect.

## Carte du code

> Mise à jour : 2026-06-30

| Fichier                                                  | Rôle                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/schemas/signup.ts`                              | Zod des actions d'inscription (`statusSchema`, `signupSchema`, `shiftId` + `status`).                                                                                    |
| `src/lib/server/services/signup-service.ts`              | Cœur de l'epic : lecture tournoi par `share_token` (compteurs + `myStatus` + noms), `createSignup` / `changeSignupStatus` / `deleteSignup`, et `getMyUpcomingShifts` (agenda cross-tournois pour l'accueil). |
| `src/lib/volunteer-shifts.ts`                            | Helpers purs : `flattenShifts`, `splitByTime`, `nextOwnShift`, `filterShifts`, `groupByTime`/`groupByPosition`, `dayKeyOf`.                                              |
| `src/routes/t/[token]/+page.server.ts`                   | `load` public (404 si token inconnu) + actions `signup` / `changeStatus` / `unregister` gardées par `requireLogin`.                                                      |
| `src/routes/t/[token]/+page.svelte`                      | Vue bénévole : onglets **Mes créneaux** (agenda perso) / **S'inscrire** (liste filtrable), créneaux passés.                                                              |
| `src/routes/+page.server.ts` + `+page.svelte`            | Accueil bénévole : agenda global des prochains créneaux (`getMyUpcomingShifts`) groupé par jour + cartes « Mes tournois ».                                               |
| `src/lib/components/tournament/VolunteerShiftRow.svelte` | Ligne créneau : places restantes, liste des inscrits (noms + statut), boutons d'action (mini-forms `enhance`).                                                           |
| `src/lib/server/auth-guard.ts`                           | `requireLogin(locals, redirectTo)` + `safeRedirect` (anti open-redirect).                                                                                                |
| `src/routes/login/+page.server.ts` + `.svelte`           | Lit `?redirect`, le valide, le passe en `callbackURL` du magic link.                                                                                                     |

### Décisions clés

- Seuls les `available` consomment une place ; `maybe` affiché mais ne réserve pas.
- Capacité appliquée par requête SQL conditionnelle (pas de transaction sur neon-http) → pas de surréservation.
- Noms des inscrits visibles publiquement (décision produit).
- « Mes créneaux » est une **vue dédiée** (onglet par tournoi + agenda global accueil), pas un simple filtre : le bénévole voit ses créneaux triés par horaire, séparés des créneaux ouverts.

## Notes & edge cases

- Créneau complet (places `available` atteintes) → inscription `available` bloquée.
- Désinscription → place libérée immédiatement.
- Un même bénévole ne peut pas s'inscrire deux fois au même créneau.
