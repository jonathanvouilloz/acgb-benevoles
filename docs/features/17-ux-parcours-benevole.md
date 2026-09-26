# Epic 17 — UX du parcours bénévole (1re inscription)

**Complexité** : M
**Statut** : EN COURS — points 1-2 + 4 « D'abord » livrés et testés E2E ; reste le magic link en dev et les 5 points « Ensuite »
**Origine** : audit UX demandé par Jonathan (2026-09-26) — « le parcours utilisateur le plus simple et logique possible, tout du long ». Constat : l'app est solide une fois inscrit, c'est le premier passage (lien WhatsApp → 1re inscription) qui perd du monde.

## Etat session 2026-09-26 (2)

**Fait :**

- **Login email-first** : un seul champ, le serveur choisit l'étape ; email inconnu → « Bienvenue ! Encore 3 infos » (retour de succès, pas de bandeau rouge), bouton « changer ».
- **Champs 16px sous 640px** : règle globale hors `@layer` dans `layout.css` (plus de zoom iOS au focus).
- **Code à 6 chiffres** dans le mail du magic link (plugin `emailOTP`, haché, 5 essais, 15 min), saisi sur `/login/sent` → connecte la PWA iOS. `pending-phone` → `pending-profile` (nom + tél, les deux chemins).
- **Renvoi** depuis `/login/sent` : garde email + `redirect`.
- E2E Playwright verts (prototype + code avec clé Resend factice) ; données de test nettoyées ; poussé sur `master`.

**Prochain :** points « Ensuite » (UX/UI de `/t/[token]`), en commençant par la barre de filtres sticky (~40 % de l'écran mobile) → jours + bouton « Filtres » ouvrant un sheet. Le point « magic link en `npm run dev` » reste ouvert, non prioritaire.

**Pieges :**

- `signInEmailOTP` exige `phone` (champ requis) **dans le body**, avant le hook `user.create.before` : l'action lit le profil avec `peekPendingProfile` et le passe. Sans ça : « phone is required », code brûlé.
- Les cookies de session d'un `auth.api.*` appelé depuis une action ne passent que grâce à `sveltekitCookies(getRequestEvent)`, **dernier plugin**.
- Tester le code sans email : preview avec `PROTOTYPE_MODE=0 RESEND_API_KEY=re_invalid_test`, puis remplacer en base la valeur de `sign-in-otp-<email>` par `sha256(code) base64url + ':0'`.
- Mail réel jamais vu : test iPhone réel ajouté aux tâches de Jonathan.

**Commit :** 0b9e08b style(login): lien de renvoi au format resolve() + query du repo

---

## Etat session 2026-09-26

**Fait :**

- **Audit UX** du parcours bénévole (`/t/[token]`, login, compte, rappels, nav, gate PWA) — points classés ci-dessous.
- **Point 1 — téléphone inline** : bannière `needsPhone` remontée sous l'en-tête et transformée en formulaire (action `savePhone`), plus de renvoi vers `/compte` (bloqué par le gate PWA sur mobile).
- **Cause racine trouvée** : le plugin magic link Better Auth ne transmet que `name` à la création → **tout nouveau compte naissait sans téléphone**. Relais via la table `verification` (`pending-phone:<email>`, 15 min) appliqué par le hook `user.create.before`.
- **Point 2 — intention conservée** : « Dispo » / « Peut-être » visibles non connecté → `/login?redirect=/t/x?prendre=<id>[&statut=maybe]` → au retour, inscription soumise d'office (garde de chevauchement comprise), URL nettoyée, onglet « Mes créneaux ».
- **Tests E2E Playwright** (iPhone 13, build `preview`) : nouveau compte + Dispo, nouveau compte + Peut-être, compte sans téléphone (validation puis auto-inscription), reload sans réinscription. Comptes de test supprimés de la base.

**Prochain :** point « D'abord n°1 » — `src/routes/login/+page.svelte` + `+page.server.ts` : login email-first (un seul champ, le serveur décide ; si inconnu → « Bienvenue ! Encore 3 infos » sans bandeau rouge), en gardant `redirect`.

**Pieges :**

- **Magic link cassé en `npm run dev`** : `baseURL` vide en dev → `auth.api.signInMagicLink` lève `Invalid URL` (« Impossible d'envoyer le lien »). Tester l'auth via `npm run build && npm run preview -- --port 5174` (= `BETTER_AUTH_URL`). À corriger (point D'abord n°5).
- `trustedOrigins` dev = ports 5173-5176 seulement.
- `errorCallbackURL` ne doit jamais contenir de `?` imbriqué : Better Auth le re-décode à la vérification et invalide tout le lien → on n'y met que le chemin de la cible.
- L'intention attend `afterNavigate` (`routerReady`) : `replaceState`/`enhance` pendant l'hydratation lèvent `reading '$set'`.
- Les comptes créés avant `af58a1d` n'ont pas de téléphone → ils verront la bannière inline (voulu).

**Commit :** af58a1d feat(inscription): reprise du creneau apres connexion et telephone inline

---

## Carte du code
> Mise a jour : 2026-09-26 (2)

| Fichier | Role |
|---------|------|
| `src/routes/t/[token]/+page.svelte` | Bannière téléphone inline en tête, lecture de `?prendre`/`?statut`, soumission automatique de l'intention (form caché + garde chevauchement) |
| `src/routes/t/[token]/+page.server.ts` | Action `savePhone` ; message `needsPhone` pointant vers la bannière |
| `src/lib/components/tournament/VolunteerShiftRow.svelte` | Actions visibles non connecté : liens vers `/login` qui portent l'intention |
| `src/lib/server/services/pending-profile.ts` | Relais nom + téléphone entre formulaire de création et création du compte (table `verification`) ; `peek` pour la connexion par code |
| `src/lib/server/services/login-code.ts` | Relais en mémoire du code OTP vers l'email du magic link (même requête) |
| `src/routes/login/sent/` | Saisie du code (`signInEmailOTP`), renvoi qui garde email + cible |
| `src/lib/server/services/email.ts` | Email de connexion : bouton + code à 6 chiffres |
| `src/lib/server/auth.ts` | Plugins `magicLink` + `emailOTP` + `sveltekitCookies` ; hook `user.create.before` qui applique le profil en attente |
| `src/routes/login/+page.server.ts` | Email-first (`step` email → details) ; stash du profil + création du code avant envoi du lien ; `errorCallbackURL` sans query |
| `src/routes/login/+page.svelte` | Étape email puis « Bienvenue ! » (prénom, nom, tél), bouton « changer » |
| `src/routes/layout.css` | Règle non-layered : champs à 16px sous 640px |
| `src/lib/server/services/user-service.ts` | `setUserPhone` (utilisé par `savePhone`) |

### Decisions cles
- Intention portée par l'URL et soumise côté client, jamais par un `load` GET (un lien ne doit pas inscrire à lui seul) — cf. DECISIONS 2026-09-26.
- Téléphone relayé via `verification`, pas de pré-création de compte (squat d'email) — cf. DECISIONS 2026-09-26.
- Login email-first : l'étape « Bienvenue » est un retour de succès d'action, jamais un `fail` — cf. DECISIONS 2026-09-26.
- Un seul email lien + code ; route publique d'envoi de code désactivée (quotas) — cf. DECISIONS 2026-09-26.

## Tâches

### Livré
- [x] Point 1 — téléphone saisi sur `/t/[token]`, plus de cul-de-sac `/compte` mobile
- [x] Fix — téléphone perdu à la création de compte (relais `pending-phone`)
- [x] Point 2 — intention d'inscription conservée à travers le magic link
- [x] Fix — `errorCallbackURL` avec `?` imbriqué invalidait le lien

### D'abord (friction au premier passage)
- [x] Login email-first : un seul champ, branchement serveur, ton neutre pour un nouveau compte
- [x] Champs à 16px sur mobile (zoom iOS au focus) — règle globale dans `layout.css`
- [x] Code OTP 6 chiffres dans le mail en plus du lien (plugin `emailOTP`) — session PWA iOS isolée de Safari
- [x] `login/sent` : « renvoie-toi un lien » garde email + `redirect`
- [ ] Magic link en `npm run dev` : fournir un `baseURL` en dev (déduit de la requête)

### Ensuite (clarté de `/t/[token]`)
- [x] Barre de filtres sticky trop haute (~40 % de l'écran mobile) → jours + bouton « Filtres » ouvrant un sheet
- [ ] Opt-in push déplacé juste après la 1re inscription
- [x] Wording : « 2/8 dispo » → « 2 places libres », bouton « Dispo » → « Je prends »
- [x] « Peut-être » expliqué (« Ne bloque pas de place — confirme dès que tu sais »)
- [x] Champ « Précision » proposé après l'inscription (« + Ajouter une précision »)
