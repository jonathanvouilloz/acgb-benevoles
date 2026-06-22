# Epic 4 — Inscription bénévole

**Complexité** : M
**Statut** : TODO

## Description

Côté bénévole : via le lien partagé, voir le tournoi (postes, créneaux, places restantes) et s'inscrire créneau par créneau avec un statut `disponible` / `peut-être`. Pouvoir changer de statut ou se désinscrire.

## Tâches

- [ ] Table `Signup` (id, shift_id, user_id, status, created_at) + unicité (shift_id + user_id).
- [ ] Page publique tournoi via `share_token` (lecture).
- [ ] Affichage temps réel des places restantes par créneau.
- [ ] Inscription : choix créneau + statut (`available` / `maybe`).
- [ ] Inscription sur plusieurs créneaux.
- [ ] Changement de statut + désinscription (libère la place).
- [ ] Connexion requise pour s'inscrire (magic link — cf. Epic 2).

## Décisions techniques

- **À confirmer** : les `maybe` sont affichées mais ne consomment pas de place ; seules les `available` comptent dans la capacité.

## Notes & edge cases

- Créneau complet (places `available` atteintes) → inscription `available` bloquée.
- Désinscription → place libérée immédiatement.
- Un même bénévole ne peut pas s'inscrire deux fois au même créneau.
