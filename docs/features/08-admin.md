# Epic 8 — Espace super admin (`/admin`)

**Complexité** : L
**Statut** : À VALIDER (livré 2026-07-02, déployé en prod le 2026-08-04)

## Etat session 2026-08-04 (suppression de tournoi cross-compte)

**Fait :** Jonathan ne pouvait pas supprimer ses tournois de test — ils appartenaient à 4 comptes différents (créés pendant les essais multi-rôles) et `deleteTournament` filtrait silencieusement par `organizerId` sans jamais signaler l'échec. Ajout de `deleteTournamentAsAdmin` (sans filtre de propriétaire, réservé `super_admin`) + action et bouton « Supprimer » sur `/admin/tournois`, pour nettoyer n'importe quel tournoi tous comptes confondus. Correctif au passage sur l'action organisateur (`/tournois/[id]`, epic 3) qui ignorait le retour du service et redirigeait comme un succès même à 0 ligne supprimée.

**Prochain :** Jonathan teste la suppression sur ses tournois de test restants (`Ladys bad`, `Tournoi ACGB`, `Tournoi du Jet d'Eau`).

**Pièges :** la cascade DB (postes → créneaux → inscriptions) était déjà correcte depuis la migration initiale — ne pas la reconfondre avec le vrai problème (filtre de propriétaire + absence de feedback d'échec).

**Commit :** [721a2cc] fix(tournois): suppression admin cross-compte + feedback silencieux

---

## Livré

- Garde `requireSuperAdmin` sur tout `/admin` (`+layout.server.ts`) + sous-nav admin (`+layout.svelte`).
- **Dashboard** (`/admin`) : stats via `getStats()` — utilisateurs par rôle, tournois par phase, inscriptions, taux de remplissage (available/capacité), demandes en attente.
- **Utilisateurs** (`/admin/utilisateurs`) : liste (nb tournois organisés / inscriptions), changement de rôle (interdit sur soi-même), création/promotion d'un compte organisateur par email, traitement des demandes (approuver/refuser).
- **Tournois** (`/admin/tournois`) : tous les tournois avec organisateur, phase, nb inscriptions ; lien vers `/t/[token]` ; **suppression cross-compte** (2026-08-04, cascade postes/créneaux/inscriptions).

## Carte du code

- `src/lib/server/services/admin-service.ts` — listUsers, setUserRole, createOrganizer, getStats, listAllTournaments, **deleteTournamentAsAdmin**, listOrganizerRequests, approve/rejectOrganizerRequest.
- `src/lib/schemas/admin.ts` — roleSchema, createOrganizerSchema.
- `src/routes/admin/**` — layout + 3 pages (dont l'action `deleteTournament` sur `/admin/tournois`).
- `src/lib/tournament-status.ts` — phase par dates (partagé epic 11).
- `src/lib/components/ui/phase-badge/` — badge de phase (partagé epic 11).

### Décisions clés
- `deleteTournamentAsAdmin` ne filtre pas par propriétaire (contrairement à `deleteTournament` côté organisateur) — la garde `requireSuperAdmin` au niveau route est la seule protection, cohérent avec le reste de l'espace admin.

## Notes

- `createOrganizer` : email connu → promotion ; inconnu → nouveau `user` (id `crypto.randomUUID()`, `emailVerified:false`), activé à la 1re connexion magic link.
- Stats : requêtes agrégées en parallèle ; phases calculées en JS via `tournamentPhase`.
- Lien « Admin » dans la navbar réservé au super_admin (masqué en vue bénévole).
