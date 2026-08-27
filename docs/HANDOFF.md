# HANDOFF — 2026-08-27

## Features actives

| Feature | Fichier | Statut |
| --- | --- | --- |
| Journal d'activité du tournoi (epic 16) | docs/features/16-journal-activite.md | **À VALIDER** — livré, migrations `0012` + `0013` appliquées et vérifiées |
| Retours Anne #2 : emails, lisibilité, brouillons (epic 15) | docs/features/15-retours-anne-emails.md | À VALIDER — livré, migration `0011` appliquée (constaté le 2026-08-27), QA du debounce restante |
| Affectations orga : inscrire, retirer, tracer (epic 14) | docs/features/14-affectations-orga.md | À VALIDER — livré, migration `0010` appliquée |
| Retours Anne : consignes, chevauchements, places restantes (epic 13) | docs/features/13-retours-anne-lisibilite.md | À VALIDER — livré, migration `0009` appliquée |
| Fondation rôles + admin + responsive (épics 7-12) | docs/features/07-roles.md à 12-responsive.md | À VALIDER — QA manuelle restante |

## Reprendre ici

**Plus aucune migration en attente** : `0011` était déjà appliquée avec son backfill `published`
(4/4 tournois publiés), `0012` et `0013` sont passées le 2026-08-27 en conservant les 7 lignes
d'historique de l'epic 14. Contrôle rejouable à volonté : `npx tsx scripts/check-activity-log.ts`
(lecture seule).

Reste la **QA manuelle**, deux parcours prioritaires :

1. **Epic 16, parcours n°4** — créer un poste, un créneau, modifier son horaire, publier le tournoi,
   affecter puis retirer un bénévole avec motif : les 6 événements doivent apparaître dans
   `/tournois/[id]/journal` avec les bons libellés. Puis le parcours bénévole (n°5) et l'isolation (n°6).
2. **Epic 15, parcours n°1** — sur un preview avec `DIGEST_DELAY_MIN=1` : 5 changements en 40 s
   doivent produire **un seul** email. C'est lui qui valide le debounce.
