import { error, json } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import { isTournamentOwner } from '$lib/server/services/ownership';
import { searchVolunteers } from '$lib/server/services/volunteer-directory';
import type { RequestHandler } from './$types';

/**
 * Recherche de bénévoles à la frappe, pour la modale « Inscrire un bénévole » (Epic 14).
 * Un endpoint dédié plutôt qu'une action de `+page.server.ts` : l'appel part à chaque touche.
 *
 * **Double garde.** `requireOrganizer` ne suffit pas : n'importe quel organisateur pourrait
 * sonder l'annuaire complet. On exige donc aussi la propriété du tournoi passé en query — la
 * recherche n'est ouverte qu'à quelqu'un qui a une raison légitime d'affecter sur CE tournoi.
 * Le service, lui, ne renvoie jamais l'email d'un tiers.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	const organizer = requireOrganizer(locals);

	const tournamentId = url.searchParams.get('tournamentId') ?? '';
	const query = url.searchParams.get('q') ?? '';
	if (!tournamentId) throw error(400, 'Tournoi manquant.');
	if (!(await isTournamentOwner(tournamentId, organizer.id))) {
		throw error(403, 'Tournoi non autorisé.');
	}

	// < 2 caractères → le service renvoie une liste vide (pas de scan de tout l'annuaire).
	return json({ results: await searchVolunteers(query, tournamentId) });
};
