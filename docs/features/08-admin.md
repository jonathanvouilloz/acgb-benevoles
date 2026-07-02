# Epic 8 — Espace super admin (`/admin`)

**Complexité** : L
**Statut** : À VALIDER (livré 2026-07-02, dépend de l'application des migrations epic 7)

## Livré

- Garde `requireSuperAdmin` sur tout `/admin` (`+layout.server.ts`) + sous-nav admin (`+layout.svelte`).
- **Dashboard** (`/admin`) : stats via `getStats()` — utilisateurs par rôle, tournois par phase, inscriptions, taux de remplissage (available/capacité), demandes en attente.
- **Utilisateurs** (`/admin/utilisateurs`) : liste (nb tournois organisés / inscriptions), changement de rôle (interdit sur soi-même), création/promotion d'un compte organisateur par email, traitement des demandes (approuver/refuser).
- **Tournois** (`/admin/tournois`) : tous les tournois avec organisateur, phase, nb inscriptions ; lien vers `/t/[token]`.

## Carte du code

- `src/lib/server/services/admin-service.ts` — listUsers, setUserRole, createOrganizer, getStats, listAllTournaments, listOrganizerRequests, approve/rejectOrganizerRequest.
- `src/lib/schemas/admin.ts` — roleSchema, createOrganizerSchema.
- `src/routes/admin/**` — layout + 3 pages.
- `src/lib/tournament-status.ts` — phase par dates (partagé epic 11).
- `src/lib/components/ui/phase-badge/` — badge de phase (partagé epic 11).

## Notes

- `createOrganizer` : email connu → promotion ; inconnu → nouveau `user` (id `crypto.randomUUID()`, `emailVerified:false`), activé à la 1re connexion magic link.
- Stats : requêtes agrégées en parallèle ; phases calculées en JS via `tournamentPhase`.
- Lien « Admin » dans la navbar réservé au super_admin (masqué en vue bénévole).
