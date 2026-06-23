import { requireOrganizer } from '$lib/server/auth-guard';
import { listTournamentsByOrganizer } from '$lib/server/services/tournament-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireOrganizer(locals);
	const tournaments = await listTournamentsByOrganizer(user.id);
	return { tournaments };
};
