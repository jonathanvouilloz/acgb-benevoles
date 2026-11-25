import { requireSuperAdmin } from '$lib/server/auth-guard';
import { getStats } from '$lib/server/services/admin-service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// La garde du layout ne suffit pas : `__data.json` peut ne rejouer que le load de la page.
	requireSuperAdmin(locals);
	const stats = await getStats();
	return { stats };
};
