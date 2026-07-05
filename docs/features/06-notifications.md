# Epic 6 — Push notifications & rappels

**Complexité** : M
**Statut** : DONE (migré vers QStash le 2026-07-05)

## État session 2026-07-05 (délai du 2e rappel : 2h → 30min)

**Fait :** 2ᵉ palier de rappel passé de **2h → 30min** avant le créneau (24h conservé). `kind` renommé `'2h'` → `'30min'` dans `reminder-scheduler.ts`, `reminder-service.ts` et l'endpoint QStash ; paliers exprimés en minutes (1440 / 30). Colonne `reminder_2_sent_at` **conservée** comme flag d'idempotence (aucune migration). Libellé push : « Dans 30 min : … ». `check` + `build` verts.
**Prochain :** test bout-en-bout du timing 30min sur preview (env QStash + `BETTER_AUTH_URL`).
**Pièges :** les messages QStash déjà planifiés en `kind:'2h'` droppent proprement à la livraison (endpoint → 200 « invalid ») ; le 30min ne vaut que pour les inscriptions créées/déplacées après déploiement.
**Commit :** [a2967de] feat(reminders): 2e palier de rappel 2h → 30min avant le créneau

---

## État session 2026-07-05 (migration cron Vercel → QStash, événementiel)

**Fait :**

- **Passage du cron poll (15 min) à une planification événementielle QStash.** Au moment d'une inscription `available` (ou d'un déplacement de créneau), on publie 2 messages différés (24h + 2h avant `shift.startsAt`, `notBefore` absolu) livrés à l'heure pile. Zero-idle hors tournoi, précision à la seconde.
- **Aucune annulation, aucune migration DB.** Chaque message porte `expectedStartsAtMs` ; l'endpoint récepteur re-valide à la livraison (existe / `available` / `startsAt` inchangé / palier pas déjà envoyé) et **drop** sinon. Couvre gratuitement désinscription, passage en `maybe`, suppressions en cascade, déplacements. Idempotence via les colonnes existantes `reminder24SentAt`/`reminder2SentAt` (QStash = at-least-once).
- **`reminder-scheduler.ts`** (nouveau) : `scheduleForSignup` / `scheduleForShift` — client QStash lazy (no-op sans token), best-effort (n'échoue jamais l'action), reset des flags avant planif, `deduplicationId = rem:{signupId}:{kind}:{startsAtMs}`, `baseUrl = QSTASH_URL`.
- **`reminder-service.ts`** : + `processSignupReminder(signupId, kind, expectedStartsAtMs)` (réutilise `buildPayload`/`sendPush`). `sendDueReminders`/`findDue` conservés (sweep manuel dormant).
- **`api/qstash/reminder/+server.ts`** (nouveau) : POST, vérif signature `Receiver` (current/next signing keys), toujours 200 sauf 401 (signature)/503 (non configuré).
- **Câblage sur 5 points de mutation** : `createSignup`, promotion `maybe→available`, `moveSignup`, `swapSignups`, `updateShift`. Aucun câblage sur les suppressions (drop à la livraison).
- **`vercel.json`** : cron `*/15` **retiré**. Endpoint `/api/cron/reminders` gardé en sweep manuel dormant. `check` + `build` verts.

**Prochain :** régler les 4 vars QStash + `BETTER_AUTH_URL` (HTTPS public) sur Vercel, puis **test bout-en-bout sur un preview Vercel** (QStash n'atteint pas localhost) : inscription → 2 messages au dashboard → push « 2h » à l'heure pile ; tester déplacement (ancien droppe) et désinscription (aucun push).

**Pièges :** (1) En local `BETTER_AUTH_URL=localhost` → QStash ne peut pas livrer, les inscriptions locales créent des messages « failed » (commenter `QSTASH_TOKEN` en local pour un no-op). (2) Plan QStash **pay-as-you-go** requis (horizon 1 an ; le gratuit plafonne à 7 j — trop court pour une inscription précoce). (3) **Bascule** : les inscriptions faites avant ce déploiement n'ont aucun message planifié et le cron est retiré → prévoir un backfill one-shot si un tournoi avec inscrits existants approche.

**Commit :** [b0efc02] feat(reminders): migration cron Vercel → QStash (rappels événementiels)

---

## État session 2026-06-23 (validation)

**Fait :** Migration `0002` appliquée par Jonathan. Parcours testé OK (opt-in `/t/[token]`, souscription enregistrée, envoi via `/api/cron/reminders`, idempotence). Epic 6 **DONE** → MVP fonctionnellement complet.
**Prochain :** Au déploiement : régler les vars VAPID/`CRON_SECRET` sur Vercel et soigner l'onboarding « installer la PWA » (iOS). Epics restants non bloquants : 2 (domaine Resend prod), 5 (test manuel suivi).
**Pièges :** RAS.
**Commit :** _(voir ci-dessous)_

---

## État session 2026-06-23

**Fait :**

- Clés VAPID générées (`npx web-push generate-vapid-keys`) ; `web-push` + `@types/web-push` installés. Vars dans `.env` et `.env.example` : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUBLIC_VAPID_KEY`, `CRON_SECRET`.
- Schéma : `signup.reminder_24_sent_at` / `reminder_2_sent_at` (idempotence) + unique sur `push_subscription.endpoint` (upsert). Migration `0002_complex_texas_twister.sql` générée — **non appliquée**.
- `push-service.ts` : save (upsert endpoint) / delete / `sendPush` (web-push, nettoyage auto sur 404/410). `reminder-service.ts` : `sendDueReminders(now)` — deux paliers **24h + 2h**, requêtes `available` + non-notifié + `startsAt ∈ ]now, now+Xh]`, push multi-appareils, marquage idempotent même sans souscription.
- Endpoints : `POST/DELETE /api/push/subscribe` (gardé `locals.user`, Zod) et `GET /api/cron/reminders` (gardé `Bearer $CRON_SECRET`).
- `service-worker.ts` : handlers `push` (showNotification) + `notificationclick` (focus/navigate ou openWindow) activés.
- Client : `EnableNotifications.svelte` (support-guard, permission, subscribe, POST) intégré en bandeau sur `/t/[token]` (connecté uniquement). Dégradation gracieuse si refusé/non supporté.
- `vercel.json` : cron `*/15 * * * *` (Vercel **Pro** → cron natif sans déclencheur externe). Envois push **parallélisés** (`Promise.all`). Bandeau iOS « Ajouter à l'écran d'accueil » dans `EnableNotifications` (le Web Push iOS n'existe qu'en PWA installée). `npm run check` (0 erreur) + `npm run build` verts.

**Prochain (manuel, Jonathan) :**

1. **Appliquer la migration** : `npm run db:migrate` (les colonnes/contrainte doivent exister avant tout test).
2. Tester le parcours : `/t/[token]` connecté → « Activer » → vérifier une ligne `push_subscription` ; forcer un envoi via `curl -H "Authorization: Bearer <CRON_SECRET>" .../api/cron/reminders` avec un créneau de test dans la fenêtre → notif reçue, `reminder_2_sent_at` renseigné, 2ᵉ appel sans doublon.
3. Si OK → Epic 6 DONE, MVP complet.

**Déploiement (résolu) :** compte **Vercel Pro** → le cron natif descend sous l'heure ; `*/15` fonctionne directement, pas besoin de déclencheur externe. L'endpoint reste agnostique (protégé `CRON_SECRET`) si on veut migrer un jour. Approche **polling** conservée (vs queue/scheduling) : relit l'état courant à chaque tick → une désinscription ou un passage en `maybe` annule le rappel gratuitement.

**Pièges :** `Palier.col` typé `AnyPgColumn` (les deux colonnes ont des types littéraux distincts). `applicationServerKey` (Uint8Array) casté `as BufferSource` (strictness DOM lib). `PUBLIC_VAPID_KEY` doit être **identique** à `VAPID_PUBLIC_KEY`.

---

## Description

Notifications push (PWA) pour rappeler aux bénévoles leurs créneaux à venir. Le vrai intérêt du PWA : éviter les oublis. Dégradation gracieuse si les notifs sont refusées ou non supportées.

## Tâches

- [x] Génération des clés VAPID + config Web Push.
- [x] Table `PushSubscription` (déjà au schéma ; + unique endpoint pour upsert).
- [x] Demande d'autorisation + enregistrement de l'abonnement (bandeau sur `/t/[token]`).
- [x] Réception des push dans `src/service-worker.ts`.
- [x] Vercel Cron : job qui envoie un rappel **24h + 2h** avant chaque créneau aux inscrits `available`.
- [x] Gestion des abonnements expirés/invalides (nettoyage auto sur 404/410).

## Carte du code

> Mise à jour : 2026-07-05

| Fichier                                              | Rôle                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/lib/schemas/push.ts`                            | Zod `pushSubscriptionSchema` (forme `PushSubscription.toJSON()`).                                              |
| `src/lib/server/services/push-service.ts`            | `savePushSubscription` (upsert endpoint) / `deletePushSubscription` / `sendPush` (web-push + cleanup 404/410). |
| `src/lib/server/services/reminder-scheduler.ts`      | **QStash** : `scheduleForSignup`/`scheduleForShift` — publie les 2 messages différés (client lazy, best-effort). |
| `src/lib/server/services/reminder-service.ts`        | `processSignupReminder` (par inscription, appelé par QStash) + `sendDueReminders` (sweep manuel dormant).       |
| `src/routes/api/qstash/reminder/+server.ts`          | **Récepteur QStash** : POST, vérif signature `Receiver`, délègue à `processSignupReminder`, toujours 200.       |
| `src/lib/server/services/signup-service.ts`          | Mutations inscription — appelle `scheduleForSignup` (create / promotion / move / swap).                        |
| `src/lib/server/services/shift-service.ts`           | `updateShift` → `scheduleForShift` (reprogramme les inscrits `available` du créneau déplacé).                  |
| `src/routes/api/push/subscribe/+server.ts`           | `POST`/`DELETE` souscription (gardé `locals.user`).                                                            |
| `src/routes/api/cron/reminders/+server.ts`           | `GET` sweep de secours **dormant** (plus programmé), gardé `Bearer $CRON_SECRET`.                              |
| `src/service-worker.ts`                              | Handlers `push` + `notificationclick`.                                                                         |
| `src/lib/components/push/EnableNotifications.svelte` | Opt-in client (support-guard, subscribe, POST) — détection via `$lib/pwa`.                                     |
| `src/lib/server/db/schema.ts`                        | Colonnes rappels + unique endpoint (inchangées — QStash ne nécessite aucune migration).                       |
| `vercel.json`                                        | Cron **retiré** (planification déportée sur QStash).                                                           |

## Décisions techniques

- **Délai** : deux rappels par inscription — **24h** puis **30min** avant le créneau (le palier de proximité était à 2h jusqu'au 2026-07-05).
- **Idempotence** : horodatage par palier sur `signup` (`reminder_24/2_sent_at`), marqué après traitement même sans souscription → un seul envoi quelle que soit la fréquence du cron.
- **Opt-in** : bandeau sur `/t/[token]` (pas de page réglages dédiée au MVP).
- **Cron agnostique du déclencheur** (cf. contrainte Vercel Hobby ci-dessus).
- **Événementiel QStash (2026-07-05)** : remplace le polling. Planification à l'inscription (précision seconde, zero-idle). Choix « fire-and-forget avec re-validation à la livraison » plutôt que « planifier + annuler » → aucune logique d'annulation, aucune migration. Contrepartie assumée : pas de filet (le sweep cron dormant reste déclenchable à la main).

## Notes & edge cases

- Notifs refusées / non supportées → l'app fonctionne quand même (le bandeau ne s'affiche pas, ou message « bloquées »).
- Un user peut avoir plusieurs abonnements (plusieurs appareils) → push envoyé à toutes ses souscriptions.
- Un bénévole qui s'inscrit à moins de 24h reçoit le rappel 24h au prochain tick (acceptable MVP).
- `startsAt > now` : jamais de rappel sur un créneau passé.
