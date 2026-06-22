# Epic 3 — Tournois, postes & créneaux (orga)

**Complexité** : L
**Statut** : TODO

## Description

Côté organisateur : créer un tournoi (multi-jours), y ajouter des postes (couleur auto-assignée), et attacher à chaque poste des créneaux flexibles (plage horaire + nombre de places). C'est le cœur de l'outil — la création doit être rapide et simple.

## Tâches

- [ ] Tables `Tournament`, `Position`, `Shift` (Drizzle).
- [ ] Schémas Zod de validation.
- [ ] Service de gestion tournoi/postes/créneaux.
- [ ] Création tournoi : nom, lieu, date début / fin (multi-jours) + génération `share_token` unique.
- [ ] CRUD postes : ajout/édition/suppression, **couleur auto-assignée** depuis une palette.
- [ ] CRUD créneaux par poste : plage horaire + capacité (nb de places).
- [ ] UI orga fluide pour empiler les créneaux d'un poste (ex. Buvette 7h-9h, 9h-12h…).

## Décisions techniques

- _(à remplir)_

## Notes & edge cases

- Créneaux qui se chevauchent → autorisés (postes différents).
- Capacité 0 ou plage invalide (fin < début) → refusé avec message.
- Palette de couleurs auto : prévoir N couleurs distinctes, cycle si plus de postes.
