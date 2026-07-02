# Epic 7 — Fondation rôles (super_admin / organizer / volunteer)

**Complexité** : M
**Statut** : À VALIDER (livré 2026-07-02)

## État session 2026-07-02 (livraison chantier rôles+accès+desktop, épics 7→12)

**Fait (epic 7) :**

- Migrations `0005_roles_add` (enum `user_role`, colonne `user.role`, table `organizer_request`, + **UPDATE data** `is_organizer=true → 'organizer'`) et `0006` (drop `is_organizer`). Générées en 2 passes pour éviter le prompt de rename (pas de TTY).
- `auth.ts` : additionalField `role` (input:false). `auth-guard` : `requireOrganizer` (organizer|super_admin) + `requireSuperAdmin`. Helper pur `src/lib/roles.ts` (hasOrganizerAccess/isSuperAdmin/roleLabel).
- Refactor de tous les call-sites `isOrganizer` (layout, accueil, compte) ; retrait du `toggleRole` libre.

**Prochain :** étapes manuelles Jonathan (cf. `docs/PLAN.md`) : `npx drizzle-kit migrate`, puis `UPDATE "user" SET role='super_admin' WHERE email='jonathan.vouilloz@gmail.com';`, puis test manuel des 6 épics. Une fois validé → passer les statuts 7-12 en DONE.

**Pièges :** la migration ne doit être appliquée qu'après les 2 fichiers (0005 avant 0006). `check` + `build` verts. Commits : un par epic (7→12).

## Carte du code
> Mise à jour : 2026-07-02

| Fichier | Rôle |
|---------|------|
| `src/lib/server/db/schema.ts` | Enum `userRole`, colonne `user.role`, table `organizerRequest` + relations |
| `drizzle/0005_roles_add.sql` | Ajout `role`/table demandes + UPDATE data `is_organizer→role` |
| `drizzle/0006_roles_drop_is_organizer.sql` | Drop de `is_organizer` |
| `src/lib/roles.ts` | Helpers purs client-safe : `hasOrganizerAccess`, `isSuperAdmin`, `roleLabel` |
| `src/lib/server/auth-guard.ts` | `requireOrganizer` (role-based) + `requireSuperAdmin` |
| `src/lib/server/auth.ts` | additionalField `role` (input:false) |

### Décisions clés
- 3 rôles ; `organizer` = accès orga **et** bénévole (même compte). Promotion via demande validée par super admin.
- 1er super admin promu **manuellement en DB** (pas de code de seed).
- Migration en 2 passes (add puis drop) pour éviter le prompt de rename de drizzle-kit (pas de TTY).

---

> Prérequis des épics 8 (admin), 9 (demande orga), 10 (navbar/switch). À livrer avant eux.

## Objectif

Remplacer le booléen `user.isOrganizer` par un vrai modèle de rôles à 3 niveaux, et
poser la table des demandes de promotion organisateur. Aucune UI riche ici (c'est
l'affaire des épics 8-10) : on livre le modèle de données, l'auth, les gardes, et le
refactor des call-sites existants pour que rien ne casse.

## Décisions (validées 2026-07-02)

- **3 rôles** : `super_admin` · `organizer` · `volunteer` (enum Postgres `user_role`).
  - `volunteer` (défaut) : bénévole uniquement.
  - `organizer` : accès orga **et** bénévole (même compte, cf. switch de vue epic 10).
  - `super_admin` : tout + espace `/admin`.
- **1er super admin** : promotion **manuelle en DB**, une seule fois. Pas de code de seed.
  - SQL à exécuter une fois en base :
    `UPDATE "user" SET role = 'super_admin' WHERE email = 'jonathan.vouilloz@gmail.com';`
- La promotion `volunteer → organizer` passe par une **demande** (table `organizer_request`)
  validée par le super admin (épics 8-9). On retire donc le `toggleRole` libre.

## Tâches

### Schéma & migration

- [ ] `schema.ts` : `userRole = pgEnum('user_role', ['volunteer','organizer','super_admin'])`.
- [ ] Colonne `user.role`: `userRole('role').notNull().default('volunteer')`.
- [ ] Table `organizer_request` : `id uuid`, `userId text → user`, `status pgEnum('organizer_request_status', ['pending','approved','rejected']) default 'pending'`, `message text` (nullable), `createdAt`, `reviewedBy text → user` (nullable), `reviewedAt timestamp` (nullable). Relation `user`.
- [ ] `npx drizzle-kit generate` puis **éditer la migration générée** : insérer avant le `DROP COLUMN is_organizer` un `UPDATE "user" SET role='organizer' WHERE is_organizer = true;` (préserver les orga existants).
- [ ] Retirer `user.isOrganizer` du schéma (une fois la data migrée).
- [ ] Appliquer (`npx drizzle-kit migrate`) — **côté Jonathan** (pas de dev auto).

### Auth & gardes

- [ ] `auth.ts` : remplacer `additionalFields.isOrganizer` par `role: { type: 'string', input: false, defaultValue: 'volunteer' }`. Mettre à jour le commentaire (promotion via demande, plus « manuellement en DB »).
- [ ] `app.d.ts` : le type `User` suit Better Auth (`role` exposé automatiquement).
- [ ] `auth-guard.ts` :
  - `requireOrganizer` → accepte `role === 'organizer' || role === 'super_admin'`.
  - Nouveau `requireSuperAdmin(locals)` → 403 si pas `super_admin`.
  - Helper `hasOrganizerAccess(user)` (booléen partagé UI/serveur).

### Refactor des call-sites `isOrganizer`

- [ ] `src/routes/+layout.svelte` (lien « Mes tournois »).
- [ ] `src/routes/+page.server.ts` + `+page.svelte` (branche orga vs bénévole).
- [ ] `src/routes/compte/+page.server.ts` + `+page.svelte` : retirer l'action `toggleRole` et le bloc « Mode démo — rôle » (remplacé par la demande orga en epic 9 + switch de vue en epic 10). Exposer `role` à la page.
- [ ] `grep -r isOrganizer src/` → 0 résultat en fin d'epic.

### Nettoyage prototype

- [ ] `prototype.ts` : le mode démo garde la connexion sans email, mais **plus** de bascule de rôle libre (la remplacer, en démo, par une éventuelle promotion via `/admin` en epic 8).

## Vérif de sortie

- [ ] `npm run check` vert.
- [ ] `grep -r isOrganizer src/` vide.
- [ ] Un compte existant marqué orga en DB reste orga après migration.

## Pièges connus

- Better Auth `additionalFields` en enum : le typer en `string` (pas d'enum natif) et
  valider les valeurs applicativement.
- La migration Drizzle générée fera `ADD role` puis `DROP is_organizer` dans le **même**
  fichier : l'`UPDATE` de bascule des données doit être inséré **entre** les deux, sinon
  on perd l'info orga. Ne pas lancer `migrate` avant d'avoir édité le SQL.
- `mapTournamentRow` / services : vérifier qu'aucun n'attend `isOrganizer` en argument.
