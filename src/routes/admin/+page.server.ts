import { getStats } from '$lib/server/services/admin-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stats = await getStats();
	return { stats };
};
