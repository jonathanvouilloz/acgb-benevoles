# STYLEGUIDE — Bénévoles ACGB

Conventions de code & design.

## Nommage

- **Fichiers** : kebab-case (`shift-service.ts`, `tournament-card.svelte`).
- **Composants Svelte** : PascalCase pour le nom logique, fichier en kebab ou PascalCase selon convention shadcn-svelte.
- **Tables / colonnes DB** : snake_case (`share_token`, `is_organizer`).
- **Variables / fonctions** : camelCase.
- **Schémas Zod** : suffixe `Schema` (`createTournamentSchema`).

## Structure des fichiers

```
src/
  lib/
    server/
      db/         ← schéma Drizzle + queries
      services/   ← logique métier (réservation, capacité, rappels)
    schemas/      ← validation Zod (partagés client/serveur)
    components/   ← composants UI (shadcn-svelte + custom)
  routes/
    +page.server.ts  ← orchestration uniquement (pas de logique métier)
  service-worker.ts   ← PWA + push
  styles/
    tokens.css        ← design tokens (créé par /init-design)
```

## Patterns

- **Validation** : toute entrée passe par un schéma Zod avant la couche service.
- **Services** : pure logique métier, testables, sans dépendance au framework de route.
- **Routes** : `+page.server.ts` orchestre (auth check → validation → appel service → retour).
- **DB** : aucune query Drizzle dans les routes ; tout passe par `src/lib/server/db/`.

## Design

- Thème **light only**.
- Densité **sparse** : aéré, gros boutons, cibles tactiles confortables.
- **Mobile-first** : la majorité des bénévoles sont sur téléphone.
- Suivre les tokens de `src/styles/tokens.css` et `docs/DESIGN.md`. Pas de valeurs hex en dur.
- Motion modéré (~5/10) : transitions de feedback, rien d'excessif.

## Commits (Conventional Commits)

`feat:` · `fix:` · `docs:` · `style:` · `refactor:` · `test:` · `chore:`
Scope optionnel : `feat(auth): ...`, `fix(inscription): ...`.
