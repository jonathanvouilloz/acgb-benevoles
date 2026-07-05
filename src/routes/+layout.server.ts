import { isPrototype } from '$lib/server/prototype';
import { getViewMode } from '$lib/server/view-mode';
import { getMyUpcomingShifts } from '$lib/server/services/signup-service';
import type { LayoutServerLoad } from './$types';

/** Fenêtre « imminent » : un créneau `available` qui commence dans les 48 h. */
const IMMINENT_MS = 48 * 60 * 60 * 1000;
/** Nombre de créneaux affichés dans le panneau cloche (les plus proches). */
const AGENDA_PREVIEW = 3;

/**
 * Expose au shell : l'utilisateur courant (état connecté / déconnexion), le flag
 * prototype, le mode de vue, et l'agenda perso partagé par la nav — les prochains
 * créneaux (panneau cloche) + le compteur de créneaux imminents (badge « rappel »).
 */
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const base = {
		user: locals.user,
		prototype: isPrototype,
		viewMode: getViewMode(cookies, locals.user?.role)
	};

	if (!locals.user) {
		return { ...base, upcomingShifts: [], imminentCount: 0 };
	}

	const all = await getMyUpcomingShifts(locals.user.id);
	const now = Date.now();
	const imminentCount = all.filter(
		(s) =>
			s.status === 'available' &&
			s.startsAt.getTime() > now &&
			s.startsAt.getTime() <= now + IMMINENT_MS
	).length;

	return { ...base, upcomingShifts: all.slice(0, AGENDA_PREVIEW), imminentCount };
};
