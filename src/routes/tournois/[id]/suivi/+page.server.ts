import { error } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import { getTournamentSignupsForOrganizer } from '$lib/server/services/signup-service';
import type { PageServerLoad } from './$types';

/** Suivi du remplissage (lecture seule, réservé à l'organisateur propriétaire du tournoi). */
export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireOrganizer(locals);
	const tournament = await getTournamentSignupsForOrganizer(params.id, user.id);
	if (!tournament) throw error(404, 'Tournoi introuvable.');

	return { tournament };
};
