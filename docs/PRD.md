---
project_name: 'Bénévoles ACGB'
project_type: app
rigor: quick
stack:
  framework: sveltekit
  database: neon-postgres
  orm: drizzle
  auth: better-auth
  auth_method: magic-link
  hosting: vercel
  styling: tailwind + shadcn-svelte
  email: resend
  notifications: web-push-vapid
  pwa: true
ui: true
dev_server: manual
design:
  vibe: institutionnel-acgb
  motion: 5
  theme: light
  density: sparse
  brand_reference: https://acgb.ch
created: 2026-06-22
---

# PRD — Bénévoles ACGB

Application de gestion de bénévoles pour les tournois de l'Association Cantonale Genevoise de Badminton (ACGB).

---

## 1. Vision

### Problème

Gérer les bénévoles sur des tournois sportifs multi-jours est aujourd'hui pénible : ça se fait au tableur Excel ou en groupe WhatsApp. Les solutions logicielles existantes sont **trop chères** et **surchargées** de fonctionnalités inutiles pour ce besoin précis. Il manque un outil **simple et gratuit** centré sur l'essentiel : qui tient quel poste, à quel moment.

### Solution

Une **PWA simple** où l'organisateur crée un tournoi, définit des **créneaux** et des **postes** à pourvoir, partage un lien, et où les **bénévoles s'inscrivent eux-mêmes**. Notifications push pour les rappels.

### Utilisateurs

- **Organisateur** : staff du club / de l'ACGB. Crée le tournoi, les postes, les créneaux, suit le remplissage.
- **Bénévole** : membre d'un club. Consulte les créneaux disponibles et s'inscrit lui-même.

Pas de rôle intermédiaire. Le bénévole s'inscrit de façon autonome (aucune assignation manuelle par l'orga).

### Échelle

Destiné à l'ACGB : plusieurs clubs, potentiellement beaucoup de personnes. L'app reste volontairement simple, mais le volume d'utilisateurs est réel — à garder en tête pour l'UX (friction minimale à l'inscription).

### Définition du succès

Un tournoi entier géré sans Excel ni WhatsApp : l'orga crée la structure, partage, et les créneaux se remplissent tout seuls. Fluide des deux côtés — l'orga voit le remplissage en temps réel, le bénévole s'inscrit en quelques taps.

---

## 2. Scope

### Features IN (MVP)

1. **Authentification magic link** — connexion sans mot de passe par email.
2. **Création d'un tournoi** — nom, lieu, dates (multi-jours).
3. **Postes & créneaux** — l'orga crée des postes (ex. Buvette, Arbitre, Accueil) et leur attache des créneaux flexibles (plage horaire + nombre de places). Couleur de poste **auto-assignée**.
4. **Partage** — lien partageable vers le tournoi pour les bénévoles.
5. **Inscription bénévole** — le bénévole s'inscrit créneau par créneau avec un statut : **`disponible`** ou **`peut-être`**.
6. **Vue de suivi (orga)** — qui s'est inscrit où, ce qui reste à pourvoir.
7. **Push notifications** — rappel avant le créneau (le vrai intérêt du PWA : éviter les oublis).

### Features OUT (pas dans le MVP)

- Historique & statistiques détaillées.
- Gestion de rôles / permissions fines.
- Assignation manuelle des bénévoles par l'orga.
- Échange de créneaux entre bénévoles.

### V2 (gardé en mémoire)

- **Intégration / SSO WordPress ACGB** — réutiliser les comptes existants de acgb.ch (« j'ai déjà un compte sur le site de la CGB »). Argument fort, prioritaire pour la suite. Le MVP reste en magic link.
- **Import CSV ponctuel** des utilisateurs WordPress au lancement (optionnel, 1 script, 1 fois — pas de synchro continue).
- **Historique + statistiques** des bénévoles.

---

## 3. User Stories

### Story : Connexion bénévole (magic link)

**En tant que** bénévole **je veux** me connecter avec juste mon email **afin de** ne pas avoir à créer/retenir un mot de passe.

**Flow :**

1. Le bénévole ouvre le lien d'un tournoi.
2. Pour s'inscrire, on lui demande son email (+ nom au premier usage).
3. Il reçoit un email avec un lien de connexion (Resend).
4. Il clique → il est connecté, la PWA reste connectée sur son téléphone.

**Critères d'acceptation :**

- [ ] Saisie email → email envoyé en < 30s.
- [ ] Le lien connecte et crée le compte léger (nom + email) au premier usage.
- [ ] La session persiste (reconnexion non nécessaire à chaque visite).

**Edge cases :**

- Email déjà connu → connexion sans recréer de compte.
- Lien expiré → message clair + possibilité de renvoyer.

### Story : Création d'un tournoi

**En tant qu'** organisateur **je veux** créer un tournoi avec ses dates **afin de** poser le cadre de l'événement.

**Flow :**

1. L'orga se connecte, clique « Nouveau tournoi ».
2. Saisit nom, lieu, date de début / fin.
3. Le tournoi est créé avec un lien de partage unique.

**Critères d'acceptation :**

- [ ] Un tournoi multi-jours peut être créé (start_date ≠ end_date).
- [ ] Un `share_token` unique est généré.

### Story : Création des postes et créneaux

**En tant qu'** organisateur **je veux** créer des postes et leur attacher des créneaux flexibles **afin de** définir précisément les besoins.

**Flow :**

1. Dans un tournoi, l'orga ajoute un poste (ex. « Buvette »). Couleur auto-assignée.
2. Sur ce poste, il ajoute autant de créneaux qu'il veut : plage horaire + nombre de places.
   - Ex. Buvette : 7h-9h (2 pers.), 9h-12h (1 pers.), 12h-14h (2 pers.).
3. Répète pour chaque poste.

**Critères d'acceptation :**

- [ ] Un poste peut avoir N créneaux indépendants.
- [ ] Chaque créneau a sa propre plage horaire et sa propre capacité.
- [ ] La création est rapide et simple (priorité UX organisateur).

**Edge cases :**

- Créneaux qui se chevauchent → autorisé (postes différents).
- Capacité 0 ou plage invalide (fin < début) → refusé avec message.

### Story : Inscription d'un bénévole

**En tant que** bénévole **je veux** m'inscrire sur les créneaux qui me conviennent **afin de** participer.

**Flow :**

1. Via le lien partagé, le bénévole voit le tournoi : postes et créneaux, avec les places restantes.
2. Il choisit un créneau et indique son statut : `disponible` ou `peut-être`.
3. Confirmation visuelle (feedback animé léger).

**Critères d'acceptation :**

- [ ] Un bénévole voit en temps réel les places restantes par créneau.
- [ ] Il peut s'inscrire sur plusieurs créneaux.
- [ ] Il peut changer son statut ou se désinscrire.
- [ ] Un même bénévole ne peut pas s'inscrire deux fois au même créneau (unicité).

**Edge cases :**

- Créneau complet → inscription bloquée (les `peut-être` ne consomment pas forcément une place — à arbitrer en implémentation : on compte les `disponible` pour la capacité).
- Désinscription → la place se libère.

### Story : Suivi du remplissage (orga)

**En tant qu'** organisateur **je veux** voir qui s'est inscrit et ce qui manque **afin de** relancer si besoin.

**Flow :**

1. L'orga ouvre son tournoi.
2. Vue par poste/créneau : inscrits (avec statut) + places restantes.
3. Repère d'un coup d'œil les créneaux non pourvus.

**Critères d'acceptation :**

- [ ] Affichage clair « X / Y places » par créneau.
- [ ] Distinction visuelle `disponible` vs `peut-être`.
- [ ] Mise en évidence des créneaux non remplis.

### Story : Rappel push avant un créneau

**En tant que** bénévole inscrit **je veux** recevoir un rappel avant mon créneau **afin de** ne pas l'oublier.

**Flow :**

1. À l'inscription (ou via réglages), le bénévole autorise les notifications (abonnement push enregistré).
2. Un job planifié (cron Vercel) envoie un rappel X heures avant le créneau.

**Critères d'acceptation :**

- [ ] Le bénévole peut autoriser/refuser les notifs.
- [ ] Un rappel est envoyé avant le créneau aux inscrits `disponible`.

**Edge cases :**

- Notifs refusées / non supportées → l'app fonctionne quand même (dégradation gracieuse).

---

## 4. Modèle de données

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌──────────────┐     ┌────────────┐
│    User     │     │  Tournament  │ 1─* │  Position  │ 1─* │    Shift     │ 1─* │   Signup   │
└─────────────┘     └──────────────┘     └────────────┘     └──────────────┘     └────────────┘
       │ 1                  ▲                                                          *│
       │                    │ organizer_id                                             │ user_id
       │                    └──────────────────────────────────────────────────────────┘
       │ 1
       │ *
┌──────────────────┐
│ PushSubscription │
└──────────────────┘
```

| Entité                   | Champs                                                                                          | Notes                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **User**                 | id, email (unique), name, is_organizer (bool), created_at                                       | Compte léger.                             |
| **Tournament**           | id, name, location, start_date, end_date, organizer_id → User, share_token (unique), created_at | Multi-jours. `share_token` = lien public. |
| **Position** (poste)     | id, tournament_id → Tournament, name, description?, color, created_at                           | `color` auto-assignée depuis une palette. |
| **Shift** (créneau)      | id, position_id → Position, starts_at, ends_at, capacity, created_at                            | Unité flexible de staffing.               |
| **Signup** (inscription) | id, shift_id → Shift, user_id → User, status (`available` \| `maybe`), created_at               | Unique (shift_id + user_id).              |
| **PushSubscription**     | id, user_id → User, endpoint, p256dh, auth, created_at                                          | Web Push (VAPID).                         |

**Règle de capacité :** les inscriptions `available` comptent pour le remplissage de la capacité ; les `maybe` sont affichées mais ne réservent pas de place (à confirmer en implémentation).

---

## 5. Stack

```
Framework :   SvelteKit  (PWA : manifest + service worker)
Database :    Neon (Postgres) + Drizzle ORM
Auth :        Better Auth  (magic link / passwordless)
Email :       Resend  (envoi des magic links)
Notifs :      Web Push API (VAPID) + service worker
Cron :        Vercel Cron  (rappels avant créneau)
Hosting :     Vercel
Styling :     Tailwind CSS + shadcn-svelte
```

**Déviations par rapport au default App :**

- **Auth method = magic link** (au lieu de mot de passe) : public non-technique, friction minimale, cohérent PWA.
- **Email = Resend** (choix explicite).
- **PWA + Web Push + Vercel Cron** : ajoutés car les notifications de rappel sont dans le scope MVP.

Pas de TanStack add-on : CRUD classique, `load` + `invalidate` de SvelteKit suffisent.

---

## 6. Architecture

Le projet a 6 entités et une vraie logique de réservation (capacité, statuts, unicité). On part donc sur une **couche services légère** plutôt que tout dans les `+page.server.ts` :

```
src/lib/server/services/   ← logique métier (réservation, capacité, rappels)
src/lib/server/db/         ← schéma + queries Drizzle
src/lib/schemas/           ← validation Zod
src/routes/+page.server.ts ← orchestration uniquement
src/service-worker.ts      ← PWA + réception push
```

---

## 7. Design Intent

- **Vibe :** institutionnel ACGB — aligné sur l'identité de l'association, sérieux et rassurant. Charte couleurs/logo à extraire de **acgb.ch** lors de `/init-design`.
- **Motion :** modéré (5/10) — animations de feedback (inscription confirmée, etc.), rien d'excessif.
- **Thème :** light uniquement (plus simple pour le MVP).
- **Densité :** sparse — aéré, gros boutons, pensé pour usage au pouce sur mobile.
- **Cible d'usage :** majoritairement mobile (bénévoles en déplacement), PWA installable.

---

## 8. Dev Preferences

- `dev_server: manual` — Jonathan garde un serveur dev actif et teste lui-même. Claude ne lance pas le serveur pour valider.

---

## Post-Init Checklist

Après avoir sauvegardé ce fichier en `docs/PRD.md` :

- [ ] `/boot-project` — orchestre l'init complète (recommandé)

Ou étape par étape :

- [ ] `/init-project` — structure + CLAUDE.md + plan d'exécution
- [ ] `/init-design` — extraire la charte ACGB depuis acgb.ch (palette, logo)
- [ ] `/init-identity` — si composante contenu/marketing
- [ ] `/init-moodboard` — si génération d'images prévue
