import { requireSuperAdmin } from '$lib/server/auth-guard';
import type { LayoutServerLoad } from './$types';

/** Tout l'espace `/admin` est réservé au super admin. */
export const load: LayoutServerLoad = async ({ locals }) => {
	requireSuperAdmin(locals);
	return {};
};
