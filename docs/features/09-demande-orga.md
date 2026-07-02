# Epic 9 — Demande de promotion organisateur (bénévole)

**Complexité** : S
**Statut** : À VALIDER (livré 2026-07-02)

## Livré

- `/compte` : un bénévole peut demander à devenir organisateur (formulaire message optionnel).
- Affichage du statut : demande `pending` (bandeau « en attente »), `rejected` (peut resoumettre).
- Traitement côté super admin dans `/admin/utilisateurs` (epic 8).

## Carte du code

- `src/lib/server/services/organizer-request-service.ts` — getMyLatestRequest, createOrganizerRequest (refuse si une demande `pending` existe déjà).
- `src/routes/compte/+page.server.ts` — action `requestOrganizer` (bénévole uniquement) + load de la dernière demande.
- `src/routes/compte/+page.svelte` — bloc « Type de compte » + demande.

## Notes

- Anti-doublon applicatif : une seule demande `pending` par utilisateur.
- L'approbation (epic 8) passe le rôle à `organizer` et scelle la demande (`reviewedBy`/`reviewedAt`).
