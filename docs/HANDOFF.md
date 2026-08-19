# HANDOFF — 2026-08-19

## Features actives

| Feature | Fichier | Statut |
| --- | --- | --- |
| Retours Anne #2 : emails, lisibilité, brouillons (epic 15) | docs/features/15-retours-anne-emails.md | **À VALIDER** — livré, migration `0011` **non appliquée** |
| Affectations orga : inscrire, retirer, tracer (epic 14) | docs/features/14-affectations-orga.md | À VALIDER — livré, migration `0010` appliquée |
| Retours Anne : consignes, chevauchements, places restantes (epic 13) | docs/features/13-retours-anne-lisibilite.md | À VALIDER — livré, migration `0009` appliquée |
| Fondation rôles + admin + responsive (épics 7-12) | docs/features/07-roles.md à 12-responsive.md | À VALIDER — QA manuelle restante |

## Reprendre ici

Epic 15 — **déploiement d'abord** : appliquer la migration `0011` sur Neon prod, puis
immédiatement le backfill `UPDATE tournament SET published = true;` (sans lui, tous les tournois
existants disparaissent du listing public).

Ensuite QA sur un preview avec `DIGEST_DELAY_MIN=1`, en priorité le parcours n°1 du § Vérification :
5 changements en 40 s doivent produire **un seul** email. C'est lui qui valide le debounce.

Commit : voir `git log` (3 commits : `9dba5ce`, `a30d744`, + T5).
