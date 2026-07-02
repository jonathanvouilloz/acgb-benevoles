import { listAllTournaments } from '$lib/server/services/admin-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const tournaments = await listAllTournaments();
	return { tournaments };
};
