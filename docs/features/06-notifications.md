# Epic 6 — Push notifications & rappels

**Complexité** : M
**Statut** : TODO

## Description

Notifications push (PWA) pour rappeler aux bénévoles leurs créneaux à venir. Le vrai intérêt du PWA : éviter les oublis. Dégradation gracieuse si les notifs sont refusées ou non supportées.

## Tâches

- [ ] Génération des clés VAPID + config Web Push.
- [ ] Table `PushSubscription` (id, user_id, endpoint, p256dh, auth, created_at).
- [ ] Demande d'autorisation + enregistrement de l'abonnement (à l'inscription ou dans les réglages).
- [ ] Réception des push dans `src/service-worker.ts`.
- [ ] Vercel Cron : job qui envoie un rappel X heures avant chaque créneau aux inscrits `available`.
- [ ] Gestion des abonnements expirés/invalides (nettoyage).

## Décisions techniques

- **À définir** : délai du rappel (X heures avant le créneau).

## Notes & edge cases

- Notifs refusées / non supportées → l'app fonctionne quand même.
- Un user peut avoir plusieurs abonnements (plusieurs appareils).
