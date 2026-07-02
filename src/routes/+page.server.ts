import { getMyTournaments, getMyUpcomingShifts } from '$lib/server/services/signup-service';
import { getViewMode } from '$lib/server/view-mode';
import type { PageServerLoad } from './$types';

/**
 * Accueil : agenda bénévole (prochains créneaux + « Mes inscriptions ») pour un bénévole,
 * ou pour un organisateur qui a basculé en vue bénévole. En vue organisateur → accueil orga.
 */
export const load: PageServerLoad = async ({ locals, cookies }) => {
	const asVolunteer = !!locals.user && getViewMode(cookies, locals.user.role) === 'volunteer';
	if (locals.user && asVolunteer) {
		const [myShifts, myTournaments] = await Promise.all([
			getMyUpcomingShifts(locals.user.id),
			getMyTournaments(locals.user.id)
		]);
		return { myShifts, myTournaments, volunteerView: true };
	}
	return { myShifts: [], myTournaments: [], volunteerView: false };
};
