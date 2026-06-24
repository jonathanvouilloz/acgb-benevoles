# Epic 2 — Auth magic link

**Complexité** : M
**Statut** : EN COURS

## Etat session 2026-06-24 (déconnexion serveur + dev port-agnostique)

**Fait :**

- **Déconnexion côté serveur** : `POST /logout` (`src/routes/logout/+server.ts`) via `auth.api.signOut` (en-têtes d'effacement cookie → 303). Fiable même si l'origine diffère de `BETTER_AUTH_URL` (preview Vercel). `lib/auth-client.ts` supprimé (plus aucun import).
- **Connexion locale port-agnostique** : en dev, `baseURL` est **déduit de la requête** (Host) → le port (5173/5174/…) n'impacte plus les liens magic-link ni les redirections. `trustedOrigins` = localhost 5173–5176.
- **Mode prototype en local** : `PROTOTYPE_MODE=1` dans `.env` (connexion instantanée sans email) ; la redirection de vérification est rendue **relative** (same-origin) pour passer quel que soit le port.

**Prochain :** inchangé côté prod — vérifier un domaine sur Resend pour envoyer à tout email.

**Pièges :** le correctif port a remplacé l'ancien piège « `BETTER_AUTH_URL` doit matcher le port » (ci-dessous, **obsolète en dev**). `.env` relu au redémarrage du serveur uniquement.

**Commit :** [cf7a943] fix(auth): déconnexion côté serveur + connexion locale port-agnostique

---

## Etat session 2026-06-23

**Fait :** Better Auth + plugin magic link configurés (`src/lib/server/auth.ts`) ; service email Resend (client lazy) ; tables `session`/`account`/`verification` + colonne `user.image` migrées sur Neon ; routes `/login`, `/login/sent`, header connecté/déconnexion ; flow magic link **testé OK** (login → lien → session).
**Prochain :** Vérifier déconnexion + passage `is_organizer = true` en DB (`npm run db:studio`). Côté prod : vérifier un domaine sur Resend pour envoyer à tout email. Puis attaquer Epic 3 (tournois/postes/créneaux).
**Pieges :** En dev, le magic link est loggé dans la **console serveur** (domaine Resend non vérifié). `BETTER_AUTH_URL` doit correspondre au port réel du serveur dev (actuellement **5174**) sinon `INVALID_TOKEN`. Le `.env` n'est relu qu'au **redémarrage** du serveur.
**Commit :** [36ebdfe] feat(auth): magic link login (Better Auth + Resend)

---

## Carte du code

> Mise a jour : 2026-06-23

| Fichier                                           | Role                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/auth.ts`                          | Instance Better Auth : drizzleAdapter, plugin magic link, session 30 j, `isOrganizer` en `input:false`. Log le lien en dev. |
| `src/lib/server/services/email.ts`                | Envoi du magic link via Resend (client instancié à la demande, email HTML FR).                                              |
| `src/hooks.server.ts`                             | Peuple `locals.session`/`locals.user` + `svelteKitHandler` (intercepte `/api/auth/*`).                                      |
| `src/lib/auth-client.ts`                          | Client Better Auth navigateur (déconnexion).                                                                                |
| `src/lib/schemas/auth.ts`                         | Validation Zod prénom/nom/email + `fullName()`.                                                                             |
| `src/routes/login/+page.server.ts`                | Action : valide via Zod → `auth.api.signInMagicLink` → redirige vers `/login/sent`.                                         |
| `src/routes/login/+page.svelte`                   | Formulaire prénom/nom/email, gestion `?error=expired`.                                                                      |
| `src/routes/login/sent/+page.svelte`              | Confirmation « lien envoyé » + renvoi.                                                                                      |
| `src/routes/+layout.server.ts` / `+layout.svelte` | Expose `locals.user` ; header état connecté + bouton déconnexion.                                                           |
| `src/lib/server/db/schema.ts`                     | Ajout `user.image` + tables `session`/`account`/`verification`.                                                             |
| `drizzle/0001_wakeful_johnny_storm.sql`           | Migration appliquée (colonne image + 3 tables auth).                                                                        |

### Decisions cles

- `is_organizer` promu **manuellement en DB** (`input:false` côté client, non falsifiable).
- Prénom + nom saisis au login → `user.name`. Connexion = action serveur (Zod), déconnexion = client (`authClient.signOut()` pour gérer le cookie via `svelteKitHandler`).
- `BETTER_AUTH_URL` couplé au port du serveur dev → garder synchro (5174 actuellement).

## Description

Authentification sans mot de passe via magic link (Better Auth + Resend). Compte ultra-léger : email + nom au premier usage. La session doit persister (PWA reste connectée sur le téléphone).

## Tâches

- [x] Better Auth configuré avec le plugin magic link (`src/lib/server/auth.ts`).
- [x] Envoi des magic links via Resend (`src/lib/server/services/email.ts`).
- [x] Table `User` (+ colonne `image` Better Auth) + tables `session` / `account` / `verification`.
- [x] Flow : saisie prénom/nom/email → email envoyé → clic → connexion + création compte au 1er usage.
- [x] Persistance de session (cookie longue durée — 30 j, renouvelé chaque jour).
- [x] Distinction organisateur / bénévole (`is_organizer`, promotion manuelle en DB).
- [x] Page de connexion + page « lien envoyé » + gestion lien expiré (`errorCallbackURL` → `/login?error=expired`).

**Reste à faire avant DONE** (hors code) :

- [x] Migration `drizzle/0001_wakeful_johnny_storm.sql` appliquée sur Neon.
- [x] `RESEND_API_KEY` renseignée (domaine non encore vérifié → lien loggé en console en dev).
- [x] Flow de connexion testé OK (login → lien console → session).
- [ ] Vérifier déconnexion + passage `is_organizer = true` en DB.
- [ ] Prod : vérifier un domaine sur Resend (`EMAIL_FROM`) pour envoyer à tout email.

## Décisions techniques

- **`is_organizer` promu manuellement en DB** (drizzle-studio / SQL). Champ `additionalField`
  Better Auth en `input: false` → non modifiable côté client. Pas d'écran admin au MVP.
- **Prénom + nom saisis sur le formulaire de login**, combinés en `user.name = "Prénom Nom"`
  (`fullName()` dans `src/lib/schemas/auth.ts`). Pas d'écran de complétion de profil.
- **Session 30 jours**, `updateAge` 1 jour (PWA reste connectée). Magic link valable **15 min**.
- **Connexion via action serveur** (`/login/+page.server.ts`) pour valider prénom/nom/email avec Zod
  (conventions projet). **Déconnexion côté client** via `authClient.signOut()` (gestion correcte du
  cookie à travers `svelteKitHandler`).
- `svelteKitHandler` dans `hooks.server.ts` intercepte `/api/auth/*` — pas de route handler dédiée.

## Notes & edge cases

- Email déjà connu → connexion sans recréer de compte (le `name` n'est appliqué qu'à la création).
- Lien expiré / déjà utilisé → redirection `/login?error=expired` + message clair + renvoi.
- Le renvoi de lien repasse par `/login` (prénom + nom requis pour garantir `user.name` non nul).
- **V2 prioritaire** : SSO / réutilisation des comptes WordPress ACGB (acgb.ch). L'abstraction auth
  (Better Auth) reste propre pour brancher un provider externe plus tard.
