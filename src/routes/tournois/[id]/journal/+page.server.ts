import { error } from '@sveltejs/kit';
import { requireOrganizer } from '$lib/server/auth-guard';
import { listActivityLog } from '$lib/server/services/activity-log-service';
import { isTournamentOwner } from '$lib/server/services/ownership';
import type { PageServerLoad } from './$types';

/** Fenêtre initiale, et pas des plus petites : le journal se lit d'abord en diagonale. */
const DEFAULT_LIMIT = 100;
/** Plafond dur : `?limit=` est dans l'URL, donc modifiable par n'importe qui. */
const MAX_LIMIT = 500;

/** Journal d'activité d'un tournoi (réservé à l'organisateur propriétaire). */
export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = requireOrganizer(locals);

	// `listActivityLog` renverrait simplement `[]` à un non-propriétaire. On tranche AVANT pour que
	// la page ne soit pas ambiguë entre « ce tournoi n'est pas le tien » et « rien ne s'est passé ».
	if (!(await isTournamentOwner(params.id, user.id))) throw error(404, 'Tournoi introuvable.');

	const raw = Number(url.searchParams.get('limit'));
	const limit = Math.min(Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LIMIT, MAX_LIMIT);

	// `limit + 1` : une ligne de trop suffit à savoir s'il en reste, sans COUNT sur toute la table.
	const rows = await listActivityLog(params.id, user.id, limit + 1);

	return { entries: rows.slice(0, limit), hasMore: rows.length > limit, limit };
};
