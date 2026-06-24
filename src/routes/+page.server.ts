import { getMyTournaments } from '$lib/server/services/signup-service';
import type { PageServerLoad } from './$types';

/** Accueil : pour un bénévole connecté, on charge ses tournois inscrits (« Mes inscriptions »). */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user && !locals.user.isOrganizer) {
		return { myTournaments: await getMyTournaments(locals.user.id) };
	}
	return { myTournaments: [] };
};
