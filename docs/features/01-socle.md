# Epic 1 — Socle technique & design

**Complexité** : M
**Statut** : DONE (socle complet, build vert, 6 tables migrées sur Neon)

## Etat session 2026-06-22

**Fait :** Scaffold SvelteKit 5 + Tailwind v4 + ESLint/Prettier · DB Drizzle/Neon avec schéma complet 6 tables, migration générée ET appliquée sur Neon (vérifiée) · PWA native (manifest + service worker avec stubs push) · design system câblé (tokens ACGB réels scrapés d'acgb.ch → `@theme`, primitives Button/StatusBadge, page `/styleguide`) · `check` + `build` verts.
**Prochain :** Démarrer l'Epic 2 — Auth magic link (Better Auth + Resend). Fichier : `docs/features/02-auth.md`. Better Auth générera les tables `session`/`account`/`verification` + colonnes user via son CLI ; la table `user` existante est l'ancre des FK.
**Pieges :** `@vite-pwa/sveltekit` incompatible avec ce SvelteKit récent (config dans `vite.config.ts`, pas de `svelte.config.js`) → pivot vers SW natif. Le CLI `sv create` coerce `docker:no/none` de l'add-on drizzle en `false` → drizzle installé manuellement. `DATABASE_URL` partagée en clair dans le chat (à régénérer côté Neon si rigueur souhaitée).
**Commit :** f01c9d1 chore: init projet Bénévoles ACGB + Epic 1 socle technique & design

---

## Carte du code

> Mise à jour : 2026-06-22

| Fichier | Rôle |
|---------|------|
| `src/lib/server/db/schema.ts` | Schéma Drizzle des 6 tables + enum `signup_status` + types inférés |
| `src/lib/server/db/index.ts` | Client Drizzle sur Neon HTTP (`$env/dynamic/private`) |
| `drizzle.config.ts` | Config drizzle-kit (migrations `./drizzle`) |
| `src/styles/tokens.css` | Design tokens ACGB (couleurs, typo, espacement, motion) |
| `src/routes/layout.css` | Import Tailwind v4 + mapping tokens → `@theme` |
| `src/routes/+layout.svelte` | Shell mobile-first + fonte Manrope Variable |
| `src/service-worker.ts` | SW PWA natif : precache + stubs push/notificationclick (Epic 6) |
| `static/manifest.webmanifest` | Manifest PWA (theme marine, icône) |
| `src/lib/components/ui/button/Button.svelte` | Primitive bouton (4 variantes + états) |
| `src/lib/components/ui/status-badge/StatusBadge.svelte` | Badge statut inscription (dispo/peut-être/complet) |
| `src/routes/styleguide/+page.svelte` | Styleguide live noindex (palette, typo, primitives, motion) |

### Décisions clés
- PWA = service worker **natif SvelteKit**, pas `@vite-pwa/sveltekit` (incompat config-in-vite).
- PK domaine en `uuid`, `user.id` en `text` pour compat Better Auth (Epic 2) — ne pas créer ici `session`/`account`/`verification`.
- Pas de shadcn-svelte : primitives en Svelte 5 pur + tokens.
- Couleur de poste auto-assignée (à implémenter Epic 3) ; statut `maybe` ne consomme pas de capacité (à confirmer Epic 4).

---

## Description

Poser les fondations du projet : scaffold SvelteKit, base de données, styling, configuration PWA, et le socle design (DESIGN.md + tokens + /styleguide). Aucun composant métier ne doit être codé avant ce socle.

## Tâches

- [x] Scaffold SvelteKit (Svelte 5 + TypeScript, Vite 8) via `sv create`.
- [x] Tailwind v4 installé + ESLint + Prettier. Tokens mappés en `@theme` (`src/routes/layout.css`).
- [x] Neon (Postgres) + Drizzle ORM : `drizzle.config.ts`, client `src/lib/server/db/index.ts`, scripts npm `db:*`.
- [x] **Schéma complet** des 6 tables (`src/lib/server/db/schema.ts`) + migration générée (`drizzle/0000_*.sql`).
- [x] Migration appliquée sur Neon (`npm run db:migrate`) — 6 tables vérifiées.
- [x] Variables d'environnement : `.env.example` (`DATABASE_URL` + placeholders Resend/Better Auth/VAPID).
- [x] PWA : `static/manifest.webmanifest` + `src/service-worker.ts` (squelette + stubs push commentés pour Epic 6) + `static/icon.svg`.
- [x] Structure de dossiers (`src/lib/server/services/`, `src/lib/server/db/`, `src/lib/schemas/`, `src/lib/components/ui/`).
- [x] `/init-design` → `docs/DESIGN.md` + `src/styles/tokens.css` (charte ACGB extraite de acgb.ch : marine #020E71, teal #2AC5A1, périwinkle #6F76DE, fonte Euclid Flex / fallback Manrope).
- [x] Primitives UI : `Button` (4 variantes + états), `StatusBadge` (disponible/peut-être/complet).
- [x] Page live `/styleguide` (noindex) : palette, typo, boutons, badges, démo motion fade-up.
- [x] Layout de base (light only, sparse, mobile-first) + fonte Manrope Variable.
- [x] `npm run check` (0 erreur) + `npm run build` (OK).
- [~] Déploiement Vercel : **reporté** (décision : hors Epic 1).

## Décisions techniques

- **PWA** : pivot de `@vite-pwa/sveltekit` → **service worker natif SvelteKit** (`src/service-worker.ts`). Raison : ce SvelteKit récent met la config dans `vite.config.ts` (pas de `svelte.config.js`), ce qui rend `@vite-pwa/sveltekit` fragile. Le SW natif répond exactement au besoin (SW custom pour brancher le push en Epic 6), sans dépendance.
- **shadcn-svelte non initialisé** : primitives écrites en Svelte 5 pur + Tailwind/tokens (plus léger pour le MVP). On pourra ajouter shadcn-svelte plus tard si un composant complexe le justifie.
- **PK** : `uuid` pour les tables domaine, `user.id` en `text` (compat Better Auth Epic 2).
- **Migration drizzle** : générée à froid sans `DATABASE_URL` ; l'apply attend la connection string Neon.

## Notes & edge cases

- Thème **light only**, densité **sparse**, **mobile-first** (bénévoles sur téléphone).
- Charte couleurs/logo extraite de **acgb.ch** (thème WordPress) — palette réelle, pas une supposition.
- Icône PWA : `static/icon.svg` (vectoriel placeholder). Des PNG 192/512 + maskable pourront être ajoutés en polish.
