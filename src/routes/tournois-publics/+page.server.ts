import { listPublicTournaments } from '$lib/server/services/tournament-service';
import type { PageServerLoad } from './$types';

/** Listing public : accessible à tous (aucune garde), y compris visiteurs non connectés. */
export const load: PageServerLoad = async () => {
	const tournaments = await listPublicTournaments();
	return { tournaments };
};
