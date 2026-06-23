# Epic 5 — Suivi du remplissage (orga)

**Complexité** : S
**Statut** : EN COURS (code complet — prêt à tester)

## Etat session 2026-06-23

**Fait :**

- Service `getTournamentSignupsForOrganizer(id, organizerId)` : lecture du suivi gardée par **ownership** (404 si pas le propriétaire). Refactor de `signup-service.ts` → helpers partagés `findTournamentRow(where)` (arborescence `with` centralisée, type inféré) + `mapTournamentRow(row, userId)` (compteurs). `getTournamentByShareToken` réutilise les deux, comportement inchangé.
- Route lecture seule `/tournois/[id]/suivi` : `+page.server.ts` gardé par `requireOrganizer`, vue avec **bandeau de synthèse** (places pourvues / capacité + nb créneaux à compléter) + postes → créneaux.
- Composant `TrackingShiftRow.svelte` (calqué sur `VolunteerShiftRow`, sans actions) : ratio `pourvues/capacité`, bordure gauche warning + libellé « N places à pourvoir » / « Personne d'inscrit » sur les créneaux non remplis, `maybe` affichés mais non comptés, noms des inscrits.
- Bouton « Voir le suivi » ajouté sur la page de gestion (`/tournois/[id]`).
- `npm run check` (0 erreur) et `npm run build` verts. Aucune migration DB.

**Prochain :** Test manuel validé par Jonathan (parcours orga). Une fois confirmé → passer Epic 5 DONE et démarrer Epic 6 (Push notifications & rappels).

**Pièges :** `and(...)` (drizzle) renvoie `SQL | undefined` → non-null assertion `!` requise pour le passer à `findTournamentRow(where: SQL)`. La mise en évidence « non rempli » se base sur `isFull` (donc sur `availableCount >= capacity`) : les `maybe` ne comptent jamais.

**Commit :** feat(tracking): add organizer fill-tracking view

---

## Description

Vue organisateur : voir qui s'est inscrit où, avec quel statut, et repérer d'un coup d'œil les créneaux non pourvus.

## Tâches

- [x] Vue par tournoi → postes → créneaux avec inscrits.
- [x] Affichage « X / Y places » par créneau.
- [x] Distinction visuelle `disponible` vs `peut-être`.
- [x] Mise en évidence des créneaux non remplis.
- [ ] (Optionnel) export simple de la liste. _(reporté — hors scope MVP, confirmé)_

## Carte du code

> Mise à jour : 2026-06-23

| Fichier | Rôle |
| --- | --- |
| `src/lib/server/services/signup-service.ts` | `getTournamentSignupsForOrganizer` (lecture gardée ownership) + helpers partagés `findTournamentRow` / `mapTournamentRow` (mutualisés avec la lecture publique bénévole). |
| `src/routes/tournois/[id]/suivi/+page.server.ts` | `load` lecture seule, gardé `requireOrganizer`, 404 si non propriétaire. |
| `src/routes/tournois/[id]/suivi/+page.svelte` | Vue suivi : en-tête tournoi, bandeau de synthèse (agrégat tous créneaux), postes → créneaux. |
| `src/lib/components/tournament/TrackingShiftRow.svelte` | Ligne créneau read-only : ratio pourvues/capacité, mise en évidence des non-remplis, liste des inscrits. |
| `src/routes/tournois/[id]/+page.svelte` | Bouton « Voir le suivi » vers la route de suivi. |

### Décisions clés

- Page **dédiée** `/tournois/[id]/suivi` (séparée du CRUD) plutôt qu'intégrée à la page de gestion : sépare édition et lecture.
- Réutilisation de la couche compteurs de l'Epic 4 plutôt qu'une requête SQL d'agrégation dédiée : `availableCount`/`maybeCount`/`isFull` déjà calculés côté métier.
- Mise en évidence basée sur `isFull` → seules les places `available` comptent (les `maybe` n'ont jamais d'effet sur le « à pourvoir »).

## Décisions techniques

- **Page dédiée** lecture seule `/tournois/[id]/suivi` (pas d'intégration dans la page de gestion).
- **Ownership** appliqué dans le service (`and(id, organizerId)`) → 404 uniforme si tournoi inconnu ou appartenant à un autre orga.
- **Export CSV** marqué optionnel dans la spec : reporté (hors scope MVP).

## Notes & edge cases

- Lecture seule pour le MVP (pas d'assignation manuelle — hors scope).
