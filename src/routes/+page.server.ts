import { getMyTournaments, getMyUpcomingShifts } from '$lib/server/services/signup-service';
import type { PageServerLoad } from './$types';

/**
 * Accueil bénévole connecté : l'agenda de ses prochains créneaux (tous tournois confondus)
 * + la liste de ses tournois inscrits (« Mes inscriptions »).
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user && !locals.user.isOrganizer) {
		const [myShifts, myTournaments] = await Promise.all([
			getMyUpcomingShifts(locals.user.id),
			getMyTournaments(locals.user.id)
		]);
		return { myShifts, myTournaments };
	}
	return { myShifts: [], myTournaments: [] };
};
