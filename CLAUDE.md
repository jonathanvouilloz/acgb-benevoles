## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, tailwindcss

---

# CLAUDE.md — Bénévoles ACGB

## Résumé du projet

PWA de gestion de bénévoles pour les tournois de l'Association Cantonale Genevoise de Badminton (ACGB). L'organisateur crée un tournoi, définit des postes et des créneaux flexibles (plage horaire + nombre de places), partage un lien, et les bénévoles s'inscrivent eux-mêmes avec un statut `disponible` / `peut-être`. Notifications push pour les rappels. Objectif : remplacer Excel/WhatsApp par un outil simple et gratuit.

Source de vérité produit : `docs/PRD.md`.

## Stack technique

- **Framework** : SvelteKit (PWA — manifest + service worker)
- **DB** : Neon (Postgres) + Drizzle ORM
- **Auth** : Better Auth (magic link / passwordless)
- **Email** : Resend (envoi des magic links)
- **Notifications** : Web Push API (VAPID) + service worker
- **Cron** : Vercel Cron (rappels avant créneau)
- **Hosting** : Vercel
- **Styling** : Tailwind CSS + shadcn-svelte

## Commandes utiles

```bash
npm run dev      # serveur de dev (NE PAS lancer — voir Dev Preferences)
npm run build    # build de production
npm run preview  # preview du build
npm run check    # svelte-check (types)
npx drizzle-kit generate   # générer les migrations
npx drizzle-kit migrate    # appliquer les migrations
```

## Architecture

6 entités + logique de réservation → couche services légère :

```
src/lib/server/services/   ← logique métier (réservation, capacité, rappels)
src/lib/server/db/         ← schéma + queries Drizzle
src/lib/schemas/           ← validation Zod
src/routes/+page.server.ts ← orchestration uniquement
src/service-worker.ts      ← PWA + réception push
```

## Conventions de code

- Validation systématique des entrées via Zod (`src/lib/schemas/`).
- Logique métier dans les services, pas dans les `+page.server.ts` (qui orchestrent).
- Queries DB centralisées dans `src/lib/server/db/`.
- Design : suivre `docs/DESIGN.md` et les tokens CSS. Thème **light only**, densité **sparse**, mobile-first.
- Détails de style/nommage : `docs/STYLEGUIDE.md`.

## Conventions de commits (Conventional Commits)

`feat:` · `fix:` · `docs:` · `style:` · `refactor:` · `test:` · `chore:`
Exemple : `feat(auth): add magic link login`

## Fichiers de contexte

- `docs/PRD.md` — spécification produit (source de vérité)
- `docs/PLAN.md` — plan d'exécution maître (epics + statuts)
- `docs/HANDOFF.md` — index léger des features actives
- `docs/features/*.md` — mémoire complète par feature
- `docs/DESIGN.md` — socle design (créé par /init-design)
- `docs/DECISIONS.md` — log des décisions techniques
- `docs/STYLEGUIDE.md` — conventions code & design

## Cycle de travail

```
1. /resume-project   → lit HANDOFF.md (index) + fichier feature actif uniquement
2. Travail sur l'epic (code, commits, checkboxes dans docs/features/[nom].md)
3. /wrap-session     → prepend bloc "État session" dans le fichier feature
                       + rafraîchit l'index HANDOFF.md + commit
4. /clear            → nouvelle session propre
```

**Règle d'or : ne JAMAIS /clear sans /wrap-session.**

## État actuel

Projet initialisé (boot-project). Aucun code applicatif encore. Prochaine étape : Epic 1 — Socle technique & design.

## Dev Preferences

- **Ne JAMAIS lancer `npm run dev`, `bun dev`, `pnpm dev` ou tout autre serveur de développement**
- Le développeur maintient un serveur actif en permanence — pas besoin de le relancer
- Coder proprement selon les guidelines, puis attendre la validation manuelle
- Si un test nécessite de voir le rendu : indiquer "prêt à tester" et laisser le développeur valider

## Décisions par défaut à confirmer (depuis le PRD)

- Les inscriptions `maybe` (peut-être) sont affichées mais **ne réservent pas** de place (seules les `available` comptent dans la capacité).
- Le rappel push part **X heures avant** le créneau (délai exact à définir).
