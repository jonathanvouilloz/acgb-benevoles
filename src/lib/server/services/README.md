# Services

Logique métier. Les `+page.server.ts` orchestrent (validation Zod, gardes, mapping d'erreur) ;
tout ce qui décide vit ici.

| Fichier | Rôle |
|---|---|
| `tournament-service.ts` | CRUD tournoi, listing public (filtré sur `published`), publication. |
| `position-service.ts` | Postes d'un tournoi (couleur auto-assignée). |
| `shift-service.ts` | Créneaux : création, horaire, capacité, suppression. |
| `signup-service.ts` | Cœur du domaine : lecture d'un tournoi (bénévole et organisateur), inscription, capacité atomique, affectations organisateur. |
| `volunteer-directory.ts` | Annuaire côté organisateur : recherche, fiche créée à la volée, correction de fiche. |
| `assignment-log-service.ts` | Trace des 4 opérations d'affectation (libellés dénormalisés). |
| `admin-service.ts` | Espace super admin : utilisateurs, rôles, tous les tournois, stats. |
| `organizer-request-service.ts` | Demandes de promotion organisateur. |
| `ownership.ts` · `rate-limit.ts` | Gardes transverses. |

## Envois et différés

Quatre fichiers forment la chaîne « prévenir un bénévole ». Ils partagent une doctrine :
**on planifie, on n'annule jamais ; le message porte de quoi vérifier sa propre fraîcheur, et le
récepteur le drop s'il est périmé.** Tous sont best-effort — aucun ne peut faire échouer la
mutation métier qui l'a déclenché.

| Fichier | Rôle |
|---|---|
| `qstash.ts` | Socle partagé : client mémoïsé, URL publique de callback, `deduplicationId` sûr. |
| `email.ts` | Resend : magic link, récap de créneaux, rappel de la veille. Garde `isManagedEmail` en tête de chaque envoi. |
| `push-service.ts` | Web Push (VAPID). `notifyUser` renvoie le nombre d'envois réussis — `0` = personne prévenu. |
| `reminder-scheduler.ts` / `reminder-service.ts` | Rappels de créneau : 2 paliers (24 h fixe + court réglable). Le 24 h part aussi par email. |
| `digest-scheduler.ts` / `digest-service.ts` | Récap groupé différé par (bénévole, tournoi). Debounce par révision + claim atomique. |

**Pourquoi deux canaux.** Le push ne part que si le bénévole a activé les notifications sur son
appareil — ce que presque personne ne fait. L'email est le canal fiable ; le push est le
complément. C'est pour ça que `AssignmentResult.notified` vaut vrai dès qu'un email peut partir.

**Le piège n°1.** Si `BETTER_AUTH_URL` ne correspond pas à l'URL déployée, `Receiver.verify()`
rejette tout en 401, les messages QStash partent en dead-letter, et il n'y a **aucune erreur
visible côté app** — juste zéro email. À vérifier en premier en cas de silence.
