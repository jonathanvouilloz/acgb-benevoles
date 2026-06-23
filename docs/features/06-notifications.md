# Epic 6 — Push notifications & rappels

**Complexité** : M
**Statut** : DONE

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

> Mise à jour : 2026-06-23

| Fichier | Rôle |
| --- | --- |
| `src/lib/schemas/push.ts` | Zod `pushSubscriptionSchema` (forme `PushSubscription.toJSON()`). |
| `src/lib/server/services/push-service.ts` | `savePushSubscription` (upsert endpoint) / `deletePushSubscription` / `sendPush` (web-push + cleanup 404/410). |
| `src/lib/server/services/reminder-service.ts` | `sendDueReminders(now)` : paliers 24h/2h, idempotence via `reminder_24/2_sent_at`. |
| `src/routes/api/push/subscribe/+server.ts` | `POST`/`DELETE` souscription (gardé `locals.user`). |
| `src/routes/api/cron/reminders/+server.ts` | `GET` envoi des rappels, gardé `Bearer $CRON_SECRET`. |
| `src/service-worker.ts` | Handlers `push` + `notificationclick`. |
| `src/lib/components/push/EnableNotifications.svelte` | Opt-in client (support-guard, subscribe, POST). |
| `src/routes/t/[token]/+page.svelte` | Bandeau « Activer les rappels » (connecté). |
| `src/lib/server/db/schema.ts` | Colonnes rappels + unique endpoint. |
| `vercel.json` | Cron horaire. |

## Décisions techniques

- **Délai** : deux rappels par inscription — **24h** puis **2h** avant le créneau.
- **Idempotence** : horodatage par palier sur `signup` (`reminder_24/2_sent_at`), marqué après traitement même sans souscription → un seul envoi quelle que soit la fréquence du cron.
- **Opt-in** : bandeau sur `/t/[token]` (pas de page réglages dédiée au MVP).
- **Cron agnostique du déclencheur** (cf. contrainte Vercel Hobby ci-dessus).

## Notes & edge cases

- Notifs refusées / non supportées → l'app fonctionne quand même (le bandeau ne s'affiche pas, ou message « bloquées »).
- Un user peut avoir plusieurs abonnements (plusieurs appareils) → push envoyé à toutes ses souscriptions.
- Un bénévole qui s'inscrit à moins de 24h reçoit le rappel 24h au prochain tick (acceptable MVP).
- `startsAt > now` : jamais de rappel sur un créneau passé.
